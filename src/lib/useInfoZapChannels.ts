/**
 * React Hook para gerenciamento integrado de canais InfoZap
 * Integra API InfoDental + Stripe
 */

import { useState, useEffect, useCallback } from 'react';
import {
  listInfoZapChannels,
  createInfoZapChannel,
  removeInfoZapChannel as removeInfoZapChannelAPI,
  reactivateInfoZapChannel,
  InfoZapChannel,
} from '@/app/actions/infodental';
import {
  getInfoZapSubscription,
  getIASubscription,
  addInfoZapChannel as addInfoZapChannelStripe,
  removeInfoZapChannel as removeInfoZapChannelStripe,
  addIAChannel,
  removeIAChannel,
  getInfoZapPrices,
  getIAPrices,
} from '@/app/actions/stripe';

export interface InfoZapChannelWithStatus extends InfoZapChannel {
  status: 'active' | 'cancelled' | 'pending';
}

/**
 * Hook principal para gerenciar canais InfoZap
 */
export function useInfoZapChannels() {
  const [channels, setChannels] = useState<InfoZapChannelWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Preços
  const [infozapPrices, setInfozapPrices] = useState<any[]>([]);
  const [iaPrices, setIaPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Subscriptions
  const [infozapSubscription, setInfozapSubscription] = useState<any>(null);
  const [iaSubscription, setIaSubscription] = useState<any>(null);

  /**
   * Carregar preços disponíveis
   */
  const loadPrices = useCallback(async () => {
    try {
      setLoadingPrices(true);
      const [infozapData, iaData] = await Promise.all([
        getInfoZapPrices(),
        getIAPrices(),
      ]);
      setInfozapPrices(infozapData.prices);
      setIaPrices(iaData.prices);
    } catch (err) {
      console.error('Erro ao carregar preços:', err);
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  /**
   * Carregar subscriptions do Stripe
   */
  const loadSubscriptions = useCallback(async () => {
    try {
      const [infozapData, iaData] = await Promise.all([
        getInfoZapSubscription(),
        getIASubscription(),
      ]);

      setInfozapSubscription(infozapData.hasSubscription ? infozapData.subscription : null);
      setIaSubscription(iaData.hasSubscription ? iaData.subscription : null);
    } catch (err) {
      console.error('Erro ao carregar subscriptions:', err);
    }
  }, []);

  /**
   * Carregar canais da API InfoDental
   */
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await listInfoZapChannels();

      // Determinar status de cada canal
      const channelsWithStatus: InfoZapChannelWithStatus[] = data.channels.map(channel => {
        // Canal está ativo se tem data de expiração futura ou não tem data (permanente)
        const hasExpiration = channel.infozap_stripe_expiration && channel.infozap_stripe_expiration !== '0000-00-00 00:00:00';
        const expirationDate = hasExpiration ? new Date(channel.infozap_stripe_expiration) : null;
        const isExpired = expirationDate ? expirationDate < new Date() : false;

        let status: 'active' | 'cancelled' | 'pending' = 'active';

        if (isExpired) {
          status = 'cancelled';
        } else if (!channel.infozap_stripe_si) {
          status = 'pending';
        }

        return {
          ...channel,
          status,
        };
      });
      
      setChannels(channelsWithStatus);
    } catch (err) {
      console.error('❌ Erro ao carregar canais:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Recarregar tudo
   */
  const reload = useCallback(async () => {
    await Promise.all([
      loadChannels(),
      loadSubscriptions(),
    ]);
  }, [loadChannels, loadSubscriptions]);

  /**
   * Carregar dados iniciais
   */
  useEffect(() => {
    loadPrices();
    reload();
  }, [loadPrices, reload]);

  /**
   * Adicionar novo canal
   */
  const addChannel = useCallback(async (params: {
    titulo: string;
    withIA: boolean;
  }) => {
    try {
      setLoading(true);

      // 1. Pegar o primeiro preço disponível (mensal)
      const infozapPriceId = infozapPrices.find(p => p.recurring?.interval === 'month')?.id;
      const iaPriceId = iaPrices.find(p => p.recurring?.interval === 'month')?.id;

      if (!infozapPriceId) {
        throw new Error('Preço InfoZap não encontrado');
      }

      if (params.withIA && !iaPriceId) {
        throw new Error('Preço IA não encontrado');
      }

      // 2. Adicionar no Stripe (incrementa quantidade)
      const infozapResult = await addInfoZapChannelStripe(infozapPriceId);

      let iaResult = null;
      if (params.withIA) {
        iaResult = await addIAChannel(iaPriceId);
      }

      // 3. Calcular data de expiração (próximo período)
      const infozapExpiration = new Date(infozapResult.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000);
      const iaExpiration = iaResult ? new Date(iaResult.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // 4. Criar canal na API InfoDental
      await createInfoZapChannel({
        id_infozap: String(channels.length), // Novo ID sequencial
        ia_stripe_si: params.withIA && iaResult ? iaResult.subscriptionId : '',
        ia_stripe_price: params.withIA && iaPriceId ? iaPriceId : '',
        ia_stripe_expiration: iaExpiration ? formatDate(iaExpiration) : '0000-00-00 00:00:00',
        infozap_stripe_si: infozapResult.subscriptionId,
        infozap_stripe_price: infozapPriceId,
        infozap_stripe_expiration: formatDate(infozapExpiration),
      });

      // 5. Recarregar canais
      await reload();

      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [infozapPrices, iaPrices, channels.length, reload]);

  /**
   * Remover canal
   */
  const removeChannel = useCallback(async (channelId: number, hasIA: boolean) => {
    try {
      setLoading(true);

      // 1. Remover no Stripe (decrementa quantidade)
      await removeInfoZapChannelStripe();

      if (hasIA) {
        await removeIAChannel();
      }

      // 2. Remover na API InfoDental
      await removeInfoZapChannelAPI(channelId);

      // 3. Recarregar canais
      await reload();

      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [reload]);

  /**
   * Reativar canal cancelado
   */
  const reactivateChannel = useCallback(async (params: {
    channelId: number;
    withIA: boolean;
  }) => {
    try {
      setLoading(true);

      // 1. Pegar preços
      const infozapPriceId = infozapPrices.find(p => p.recurring?.interval === 'month')?.id;
      const iaPriceId = iaPrices.find(p => p.recurring?.interval === 'month')?.id;

      if (!infozapPriceId) {
        throw new Error('Preço InfoZap não encontrado');
      }

      // 2. Adicionar no Stripe
      const infozapResult = await addInfoZapChannelStripe(infozapPriceId);

      let iaResult = null;
      if (params.withIA) {
        if (!iaPriceId) {
          throw new Error('Preço IA não encontrado');
        }
        iaResult = await addIAChannel(iaPriceId);
      }

      // 3. Calcular novas datas de expiração
      const infozapExpiration = new Date(infozapResult.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000);
      const iaExpiration = iaResult ? new Date(iaResult.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // 4. Reativar na API InfoDental
      await reactivateInfoZapChannel({
        id_infozap: params.channelId,
        infozap_stripe_si: infozapResult.subscriptionId,
        infozap_stripe_price: infozapPriceId,
        infozap_stripe_expiration: formatDate(infozapExpiration),
      });

      // 5. Recarregar canais
      await reload();

      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [infozapPrices, iaPrices, reload]);

  /**
   * Toggle IA em um canal existente
   */
  const toggleIA = useCallback(async (channelId: number, currentIAStatus: boolean) => {
    try {
      setLoading(true);

      const channel = channels.find(c => c.id === channelId);
      if (!channel) {
        throw new Error('Canal não encontrado');
      }

      if (currentIAStatus) {
        // Remover IA
        await removeIAChannel();

        await createInfoZapChannel({
          id_infozap: String(channelId),
          ia_stripe_si: '',
          ia_stripe_price: '',
          ia_stripe_expiration: '0000-00-00 00:00:00',
          infozap_stripe_si: channel.infozap_stripe_si,
          infozap_stripe_price: channel.infozap_stripe_price,
          infozap_stripe_expiration: channel.infozap_stripe_expiration,
        });
      } else {
        // Adicionar IA
        const iaPriceId = iaPrices.find(p => p.recurring?.interval === 'month')?.id;
        if (!iaPriceId) {
          throw new Error('Preço IA não encontrado');
        }

        const iaResult = await addIAChannel(iaPriceId);
        const iaExpiration = new Date(iaResult.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000);

        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        await createInfoZapChannel({
          id_infozap: String(channelId),
          ia_stripe_si: iaResult.subscriptionId,
          ia_stripe_price: iaPriceId,
          ia_stripe_expiration: formatDate(iaExpiration),
          infozap_stripe_si: channel.infozap_stripe_si,
          infozap_stripe_price: channel.infozap_stripe_price,
          infozap_stripe_expiration: channel.infozap_stripe_expiration,
        });
      }

      await reload();
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [channels, iaPrices, reload]);

  return {
    channels,
    loading: loading || loadingPrices,
    error,
    reload,
    addChannel,
    removeChannel,
    reactivateChannel,
    toggleIA,
    infozapSubscription,
    iaSubscription,
    infozapPrices,
    iaPrices,
  };
}
