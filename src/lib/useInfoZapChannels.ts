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
  includeIAInChannel,
  removeIAFromChannel,
  updateSubscriptionStatus,
  InfoZapChannel,
} from '@/app/actions/infodental';
import {
  checkSubscriptionStatus,
  createIndividualSubscription,
  removeIASubscriptionItem,
  cancelChannelSubscription,
  hasActivePlan,
} from '@/app/actions/stripe';

// Configuração de produtos e preços por canal
const CHANNEL_CONFIG = {
  infozap: [
    { id_canal: "0", id_produto: "", id_preco: "" },
    { id_canal: "1", id_produto: "prod_T9SqvByfpsLwI8", id_preco: "price_1SECzfFU8GiWtc93h3ZHje9i" },
    { id_canal: "2", id_produto: "prod_T9SqvByfpsLwI8", id_preco: "price_1SECzWFU8GiWtc93KoJzqJvQ" },
    { id_canal: "3", id_produto: "prod_T9SqvByfpsLwI8", id_preco: "price_1SECyjFU8GiWtc93YNXqE9Qm" },
    { id_canal: "4", id_produto: "prod_T9SqvByfpsLwI8", id_preco: "price_1SD9uaFU8GiWtc93T6iUCup3" },
  ],
  ia_infozap: [
    { id_canal: "0", id_produto: "prod_TA8gkanW3rgytK", id_preco: "price_1SED1wFU8GiWtc93OiluGKYr" },
    { id_canal: "1", id_produto: "prod_TA8gkanW3rgytK", id_preco: "price_1SED1nFU8GiWtc934qG3BqOM" },
    { id_canal: "2", id_produto: "prod_TA8gkanW3rgytK", id_preco: "price_1SED1fFU8GiWtc93fg1q7D1s" },
    { id_canal: "3", id_produto: "prod_TA8gkanW3rgytK", id_preco: "price_1SED1XFU8GiWtc93TSAyazvz" },
    { id_canal: "4", id_produto: "prod_TA8gkanW3rgytK", id_preco: "price_1SDoOjFU8GiWtc93gKzuVhk6" },
  ],
};

/**
 * Formata timestamp Unix para formato MySQL datetime
 */
function formatDate(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) {
    console.error('❌ Invalid timestamp:', timestamp);
    return '';
  }
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) {
    console.error('❌ Invalid date from timestamp:', timestamp);
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export interface InfoZapChannelWithStatus extends InfoZapChannel {
  status: 'active' | 'cancelled' | 'pending' | 'acontratar';
  // Informações adicionais do Stripe
  infozap_active_in_stripe?: boolean;
  ia_active_in_stripe?: boolean;
  cancel_at_period_end?: boolean;
  cancel_at?: number; // Timestamp Unix de quando será cancelado
  assinatura_status: 'acontratar' | 'contratado' | 'cancelado';
}

/**
 * Hook principal para gerenciar canais InfoZap
 */
export function useInfoZapChannels() {
  const [channels, setChannels] = useState<InfoZapChannelWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Verificar se canal tem dados Stripe preenchidos
   */
  const hasStripeData = (channel: InfoZapChannel) => {
    const hasInfoZap = channel.infozap_stripe_si &&
                      channel.infozap_stripe_price &&
                      channel.infozap_stripe_expiration &&
                      channel.infozap_stripe_expiration !== '0000-00-00 00:00:00' &&
                      channel.infozap_stripe_expiration !== '';

    const hasIA = channel.ia_stripe_si &&
                 channel.ia_stripe_price &&
                 channel.ia_stripe_expiration &&
                 channel.ia_stripe_expiration !== '0000-00-00 00:00:00' &&
                 channel.ia_stripe_expiration !== '';

    // Canal 0: apenas verifica IA
    if (channel.id === 0) {
      return hasIA;
    }

    // Outros canais: verifica InfoZap (IA é opcional)
    return hasInfoZap;
  };

  /**
   * Carregar canais da API InfoDental
   */
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Listar canais existentes na API
      const data = await listInfoZapChannels();
      const apiChannels = data.channels;

      // 2. Criar lista de todos os canais possíveis (0-4)
      const allChannelsPromises = CHANNEL_CONFIG.infozap.map(async (channelConfig) => {
        const channelId = Number(channelConfig.id_canal);
        const isIAOnlyChannel = channelId === 0;

        // Buscar canal na API
        const apiChannel = apiChannels.find(c => c.id === channelId);

        // Canal 0 sempre existe (é gratuito)
        if (channelId === 0) {
          if (!apiChannel) {
            // Canal 0 sem IA contratada
            return {
              id: 0,
              data: new Date().toISOString(),
              titulo: 'IA InfoZap',
              ia_ativa: 0 as 0 | 1,
              ia_stripe_si: '',
              ia_stripe_price: '',
              ia_stripe_expiration: '',
              infozap_stripe_si: '',
              infozap_stripe_price: '',
              infozap_stripe_expiration: '',
              assinatura_status: 'contratado' as 'acontratar' | 'contratado' | 'cancelado',
              status: 'active' as 'active' | 'cancelled' | 'pending' | 'acontratar',
              infozap_active_in_stripe: false,
              ia_active_in_stripe: false,
              cancel_at_period_end: false,
            };
          }
          // Canal 0 existe na API - verificar se tem dados da IA preenchidos
          const hasIAData = apiChannel.ia_stripe_si &&
                           apiChannel.ia_stripe_price &&
                           apiChannel.ia_stripe_expiration &&
                           apiChannel.ia_stripe_expiration !== '0000-00-00 00:00:00' &&
                           apiChannel.ia_stripe_expiration !== '';

          // Se tem dados da IA, consultar status no Stripe
          const iaStatus = hasIAData
            ? await checkSubscriptionStatus(apiChannel.ia_stripe_si)
            : { exists: false, active: false, cancel_at_period_end: false, current_period_end: null };

          // Determinar ia_ativa baseado no status real da subscription no Stripe
          const iaAtiva = iaStatus.active ? 1 : 0;

          return {
            ...apiChannel,
            ia_ativa: iaAtiva as 0 | 1,
            status: 'active' as const, // Canal 0 sempre ativo (é gratuito)
            infozap_active_in_stripe: false,
            ia_active_in_stripe: iaStatus.active,
            cancel_at_period_end: iaStatus.cancel_at_period_end,
            assinatura_status: 'contratado' as 'acontratar' | 'contratado' | 'cancelado',
          };
        }

        // Outros canais (1-4)
        // Se não existe na API, criar canal vazio com status 'acontratar'
        if (!apiChannel) {
          return {
            id: channelId,
            data: new Date().toISOString(),
            titulo: `Canal ${channelId}`,
            ia_ativa: 0 as 0 | 1,
            ia_stripe_si: '',
            ia_stripe_price: '',
            ia_stripe_expiration: '',
            infozap_stripe_si: '',
            infozap_stripe_price: '',
            infozap_stripe_expiration: '',
            assinatura_status: 'acontratar' as 'acontratar' | 'contratado' | 'cancelado',
            status: 'acontratar' as 'active' | 'cancelled' | 'pending' | 'acontratar',
            infozap_active_in_stripe: false,
            ia_active_in_stripe: false,
            cancel_at_period_end: false,
          };
        }

        // Canal existe na API - verificar se tem dados Stripe
        if (!hasStripeData(apiChannel)) {
          // Sem dados Stripe = disponível para contratar
          return {
            ...apiChannel,
            assinatura_status: 'acontratar' as 'acontratar' | 'contratado' | 'cancelado',
            status: 'acontratar' as 'active' | 'cancelled' | 'pending' | 'acontratar',
            infozap_active_in_stripe: false,
            ia_active_in_stripe: false,
            cancel_at_period_end: false,
          };
        }

        // Tem dados Stripe - verificar status
        const [infozapStatus, iaStatus] = await Promise.all([
          apiChannel.infozap_stripe_si
            ? checkSubscriptionStatus(apiChannel.infozap_stripe_si)
            : Promise.resolve({ exists: false, active: false, cancel_at_period_end: false, current_period_end: null }),
          apiChannel.ia_stripe_si
            ? checkSubscriptionStatus(apiChannel.ia_stripe_si)
            : Promise.resolve({ exists: false, active: false, cancel_at_period_end: false, current_period_end: null }),
        ]);

        const assinaturaStatus = apiChannel.assinatura_status || 'contratado';
        let status: 'active' | 'cancelled' | 'pending' | 'acontratar' = 'active';

        if (isIAOnlyChannel) {
          // Canal apenas IA (ID 0): verificar apenas status da IA no Stripe
          if (iaStatus.active) {
            status = 'active';
          } else {
            status = 'cancelled';
          }
        } else {
          // Canais normais: usar assinatura_status para controlar o canal WhatsApp
          if (assinaturaStatus === 'cancelado') {
            if (infozapStatus.active) {
              status = 'cancelled'; // Cancelado mas ainda ativo até fim do período
            } else {
              status = 'cancelled'; // Completamente cancelado
            }
          } else if (assinaturaStatus === 'acontratar') {
            status = 'acontratar';
          } else if (assinaturaStatus === 'contratado') {
            if (infozapStatus.active) {
              status = 'active';
            } else if (!apiChannel.infozap_stripe_si) {
              status = 'pending';
            } else {
              status = 'cancelled';
            }
          }
        }

        // Determinar ia_ativa baseado no status real da IA no Stripe (não no que veio da API)
        const iaAtiva = iaStatus.active ? 1 : 0;

        // Determinar data de cancelamento
        let cancelAt = null;
        if (infozapStatus.cancel_at_period_end && infozapStatus.cancel_at) {
          cancelAt = infozapStatus.cancel_at;
        } else if (iaStatus.cancel_at_period_end && iaStatus.cancel_at) {
          cancelAt = iaStatus.cancel_at;
        }

        return {
          ...apiChannel,
          ia_ativa: iaAtiva as 0 | 1, // Sobrescrever com o status real do Stripe
          status,
          infozap_active_in_stripe: infozapStatus.active,
          ia_active_in_stripe: iaStatus.active,
          cancel_at_period_end: infozapStatus.cancel_at_period_end || iaStatus.cancel_at_period_end,
          cancel_at: cancelAt,
          assinatura_status: assinaturaStatus as 'acontratar' | 'contratado' | 'cancelado',
        };
      });

      const channelsWithStatus = await Promise.all(allChannelsPromises);
      setChannels(channelsWithStatus);
    } catch (err) {
      console.error('❌ Erro ao carregar canais:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Recarregar canais
   */
  const reload = useCallback(async () => {
    await loadChannels();
  }, [loadChannels]);

  /**
   * Carregar dados iniciais
   */
  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Contratar canal (InfoZap e/ou IA)
   */
  const addChannel = useCallback(async (params: {
    channelId: number;
    titulo?: string;
    withIA: boolean;
  }) => {
    try {
      setLoading(true);

      // Verificar se tem plano principal ativo (exceto para canal 0 que é gratuito)
      if (params.channelId !== 0) {
        const hasPlan = await hasActivePlan();
        if (!hasPlan) {
          throw new Error('Você precisa ter um plano ativo para contratar canais WhatsApp');
        }
      }

      const channelConfig = CHANNEL_CONFIG.infozap.find(c => c.id_canal === String(params.channelId));
      const iaConfig = CHANNEL_CONFIG.ia_infozap.find(c => c.id_canal === String(params.channelId));

      if (!channelConfig || !iaConfig) {
        throw new Error('Configuração do canal não encontrada');
      }

      const isIAOnlyChannel = params.channelId === 0;

      // Para canal 0, apenas contratar IA usando incluir_ia
      if (isIAOnlyChannel) {
        if (!params.withIA) {
          throw new Error('Canal 0 requer IA');
        }

        // 1. Criar subscription da IA no Stripe
        const iaSubscription = await createIndividualSubscription({
          priceId: iaConfig.id_preco,
          metadata: {
            channel_id: String(params.channelId),
            type: 'ia',
          }
        });

        console.log('🔍 IA Subscription (Canal 0):', iaSubscription);

        // 2. Usar incluir_ia para canal 0 (canal gratuito)
        await includeIAInChannel({
          id_infozap: params.channelId,
          ia_stripe_si: iaSubscription.subscriptionId,
          ia_stripe_price: iaConfig.id_preco,
          ia_stripe_expiration: formatDate(iaSubscription.current_period_end),
        });
      } else {
        // Canais normais: contratar InfoZap e/ou IA
        if (!channelConfig.id_preco) {
          throw new Error('Preço InfoZap não configurado');
        }

        // 1. Criar subscription do InfoZap no Stripe
        const infozapSubscription = await createIndividualSubscription({
          priceId: channelConfig.id_preco,
          metadata: {
            channel_id: String(params.channelId),
            type: 'infozap',
          }
        });

        console.log('🔍 InfoZap Subscription Response:', infozapSubscription);
        console.log('🔍 current_period_end:', infozapSubscription.current_period_end);
        console.log('🔍 current_period_end type:', typeof infozapSubscription.current_period_end);

        if (!infozapSubscription.current_period_end) {
          throw new Error('Stripe não retornou current_period_end para InfoZap subscription');
        }

        // 2. Criar subscription da IA no Stripe (se necessário)
        let iaSubscription = null;
        if (params.withIA) {
          iaSubscription = await createIndividualSubscription({
            priceId: iaConfig.id_preco,
            metadata: {
              channel_id: String(params.channelId),
              type: 'ia',
            }
          });
          console.log('🔍 IA Subscription:', iaSubscription);
        }

        // 3. Criar canal na API InfoDental com os dados do Stripe
        await createInfoZapChannel({
          id: String(params.channelId),
          titulo: params.titulo || `Canal ${params.channelId}`,
          ia_stripe_si: iaSubscription ? iaSubscription.subscriptionId : '',
          ia_stripe_price: iaSubscription ? iaConfig.id_preco : '',
          ia_stripe_expiration: iaSubscription ? formatDate(iaSubscription.current_period_end) : '',
          infozap_stripe_si: infozapSubscription.subscriptionId,
          infozap_stripe_price: channelConfig.id_preco,
          infozap_stripe_expiration: formatDate(infozapSubscription.current_period_end),
          assinatura_status: 'contratado',
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
  }, [reload]);

  /**
   * Cancelar canal (InfoZap + IA juntos, agendado para fim do período)
   */
  const removeChannel = useCallback(async (channelId: number, hasIA: boolean) => {
    try {
      setLoading(true);

      // Buscar o canal para pegar os subscription item IDs
      const channel = channels.find(c => c.id === channelId);
      if (!channel) {
        throw new Error('Canal não encontrado');
      }

      // Cancelar canal completo (InfoZap + IA) no Stripe
      const result = await cancelChannelSubscription({
        infozapSubscriptionItemId: channel.infozap_stripe_si,
        iaSubscriptionItemId: hasIA && channel.ia_stripe_si ? channel.ia_stripe_si : undefined,
      });

      console.log(`✅ Canal cancelado no Stripe. Ativo até: ${new Date(result.cancel_at * 1000).toLocaleString()}`);

      // Usar método 'alterar_assinatura_status' para marcar como cancelado (não remove, apenas atualiza status)
      await updateSubscriptionStatus(channelId, 'cancelado');

      await reload();

      // Retornar a data de cancelamento
      return {
        success: true,
        cancel_at: result.cancel_at,
      };
    } catch (err) {
      setError(err as Error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [channels, reload]);

  /**
   * Reativar canal cancelado
   */
  const reactivateChannel = useCallback(async (params: {
    channelId: number;
    withIA: boolean;
  }) => {
    try {
      setLoading(true);

      const channelConfig = CHANNEL_CONFIG.infozap.find(c => c.id_canal === String(params.channelId));
      const iaConfig = CHANNEL_CONFIG.ia_infozap.find(c => c.id_canal === String(params.channelId));

      if (!channelConfig || !iaConfig) {
        throw new Error('Configuração do canal não encontrada');
      }

      // 1. Criar subscription do InfoZap no Stripe
      const infozapSubscription = await createIndividualSubscription({
        priceId: channelConfig.id_preco,
        metadata: {
          channel_id: String(params.channelId),
          type: 'infozap',
        }
      });

      // 2. Reativar canal na API InfoDental (método 'reativar' - só InfoZap)
      await reactivateInfoZapChannel({
        id_infozap: params.channelId,
        infozap_stripe_si: infozapSubscription.subscriptionId,
      });

      // 3. Se tiver IA, criar subscription da IA no Stripe e chamar incluir_ia
      if (params.withIA) {
        const iaSubscription = await createIndividualSubscription({
          priceId: iaConfig.id_preco,
          metadata: {
            channel_id: String(params.channelId),
            type: 'ia',
          }
        });

        // Incluir IA no canal (método 'incluir_ia')
        await includeIAInChannel({
          id_infozap: params.channelId,
          ia_stripe_si: iaSubscription.subscriptionId,
          ia_stripe_price: iaConfig.id_preco,
          ia_stripe_expiration: formatDate(iaSubscription.current_period_end),
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
  }, [reload]);

  /**
   * Toggle IA em um canal existente
   */
  const toggleIA = useCallback(async (channelId: number, currentIAStatus: boolean) => {
    try {
      setLoading(true);

      const iaConfig = CHANNEL_CONFIG.ia_infozap.find(c => c.id_canal === String(channelId));
      if (!iaConfig) {
        throw new Error('Configuração IA não encontrada');
      }

      if (currentIAStatus) {
        // Remover IA: deletar subscription item no Stripe e pegar data de expiração
        const channel = channels.find(c => c.id === channelId);
        if (!channel || !channel.ia_stripe_si) {
          throw new Error('Canal ou IA subscription não encontrada');
        }

        const result = await removeIASubscriptionItem(channel.ia_stripe_si);
        console.log(`✅ IA removida do Stripe. Ativa até: ${new Date(result.will_be_active_until * 1000).toLocaleString()}`);

        // Usar método 'remover_ia' ao invés de 'criar'
        await removeIAFromChannel(channelId);

        await reload();
        return {
          success: true,
          will_be_active_until: result.will_be_active_until,
        };
      } else {
        // 1. Adicionar IA: criar subscription no Stripe
        const iaSubscription = await createIndividualSubscription({
          priceId: iaConfig.id_preco,
          metadata: {
            channel_id: String(channelId),
            type: 'ia',
          }
        });

        // 2. Incluir IA no canal via API InfoDental
        await includeIAInChannel({
          id_infozap: channelId,
          ia_stripe_si: iaSubscription.subscriptionId,
          ia_stripe_price: iaConfig.id_preco,
          ia_stripe_expiration: formatDate(iaSubscription.current_period_end),
        });

        await reload();
        return {
          success: true,
        };
      }
    } catch (err) {
      setError(err as Error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [channels, reload]);

  return {
    channels,
    loading,
    error,
    reload,
    addChannel,
    removeChannel,
    reactivateChannel,
    toggleIA,
  };
}
