/**
 * React Hooks para gerenciamento de subscriptions separadas
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllCustomerSubscriptions,
  getProductPrices,
  createStorageSubscription,
  createInfoZapSubscription,
  cancelSpecificSubscription,
  cancelAllSubscriptions,
  reactivateSpecificSubscription,
  updateSubscriptionPrice,
  addOrChangeStoragePlan,
  changeStoragePlan
} from '@/app/actions/stripe';

export interface Subscription {
  id: string;
  status: string;
  current_period_end: number;
  current_period_start: number;
  cancel_at_period_end: boolean;
  items: Array<{
    id: string;
    price: {
      id: string;
      product: any;
      unit_amount: number;
      recurring: any;
      nickname: string;
    };
    quantity: number;
  }>;
}

export interface Price {
  id: string;
  nickname: string | null;
  unit_amount: number;
  currency: string;
  recurring: any;
  metadata: any;
}

/**
 * Hook para listar todas as subscriptions do customer
 */
export function useAllSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { subscriptions: subs } = await getAllCustomerSubscriptions();
      setSubscriptions(subs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    subscriptions,
    loading,
    error,
    reload: load
  };
}

/**
 * Hook para buscar preços de um produto específico
 */
export function useProductPrices(productId: string) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductPrices(productId);
        setPrices(data.prices);
        setProduct(data.product);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      load();
    }
  }, [productId]);

  return {
    prices,
    product,
    loading,
    error
  };
}

/**
 * Hook para ações de gerenciamento de subscriptions
 */
export function useSubscriptionActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addStorage = useCallback(async (priceId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await createStorageSubscription(priceId);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const addInfoZap = useCallback(async (priceId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await createInfoZapSubscription(priceId);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (subscriptionId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await cancelSpecificSubscription(subscriptionId);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelAll = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await cancelAllSubscriptions();
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reactivate = useCallback(async (subscriptionId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await reactivateSpecificSubscription(subscriptionId);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePrice = useCallback(async (
    subscriptionId: string,
    newPriceId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await updateSubscriptionPrice(subscriptionId, newPriceId);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    addStorage,
    addInfoZap,
    cancel,
    cancelAll,
    reactivate,
    updatePrice,
    loading,
    error
  };
}

/**
 * Hook combinado para facilitar o uso
 */
export function useSubscriptionManager() {
  const { subscriptions, loading: subsLoading, reload } = useAllSubscriptions();
  const actions = useSubscriptionActions();

  // Funções auxiliares
  const getSubscriptionByProduct = useCallback((productId: string) => {
    return subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === productId
          : (item.price.product as any).id === productId
      )
    );
  }, [subscriptions]);

  const hasProduct = useCallback((productId: string) => {
    return !!getSubscriptionByProduct(productId);
  }, [getSubscriptionByProduct]);

  const getPlanName = (sub: Subscription) => {
    return sub.items[0]?.price?.nickname || 'Plano';
  };

  const getPlanPrice = (sub: Subscription) => {
    return (sub.items[0]?.price?.unit_amount || 0) / 100;
  };

  const getNextBilling = (sub: Subscription) => {
    return new Date(sub.current_period_end * 1000);
  };

  return {
    subscriptions,
    loading: subsLoading || actions.loading,
    error: actions.error,
    reload,
    actions,
    // Helpers
    getSubscriptionByProduct,
    hasProduct,
    getPlanName,
    getPlanPrice,
    getNextBilling
  };
}

/**
 * Hook para gerenciar Storage especificamente
 */
export function useStorageManager() {
  const { subscriptions, reload } = useAllSubscriptions();
  const { prices, loading: pricesLoading } = useProductPrices('prod_T9AfZhzca9pgNW');
  const { cancel, loading: actionLoading } = useSubscriptionActions();
  const [loading, setLoading] = useState(false);

  const storageSub = subscriptions.find(sub =>
    sub.items.some(item =>
      typeof item.price.product === 'string'
        ? item.price.product === 'prod_T9AfZhzca9pgNW'
        : (item.price.product as any).id === 'prod_T9AfZhzca9pgNW'
    )
  );

  const hasStorage = !!storageSub;

  // Adiciona ou altera (inteligente)
  const addOrChange = async (priceId: string) => {
    try {
      setLoading(true);
      await addOrChangeStoragePlan(priceId);
      await reload();
      return true;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Apenas adiciona (erro se já existe)
  const add = async (priceId: string) => {
    if (hasStorage) {
      console.warn('Storage já existe. Use addOrChange() ou change()');
      return false;
    }
    return await addOrChange(priceId);
  };

  // Apenas altera (erro se não existe)
  const change = async (newPriceId: string) => {
    if (!hasStorage) {
      console.warn('Storage não existe. Use addOrChange() ou add()');
      return false;
    }

    try {
      setLoading(true);
      await changeStoragePlan(newPriceId);
      await reload();
      return true;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!storageSub) return false;
    const success = await cancel(storageSub.id);
    if (success) await reload();
    return success;
  };

  return {
    storageSub,
    hasStorage,
    prices,
    loading: pricesLoading || actionLoading || loading,
    add,             // Adiciona (erro se já existe)
    change,          // Altera (erro se não existe)
    addOrChange,     // Inteligente: adiciona OU altera
    remove
  };
}

/**
 * Hook para gerenciar InfoZap especificamente
 */
export function useInfoZapManager() {
  const { subscriptions, reload } = useAllSubscriptions();
  const { prices, loading: pricesLoading } = useProductPrices('prod_T9SqvByfpsLwI8');
  const { addInfoZap, updatePrice, cancel, loading: actionLoading } = useSubscriptionActions();

  const infozapSub = subscriptions.find(sub =>
    sub.items.some(item =>
      typeof item.price.product === 'string'
        ? item.price.product === 'prod_T9SqvByfpsLwI8'
        : (item.price.product as any).id === 'prod_T9SqvByfpsLwI8'
    )
  );

  const hasInfoZap = !!infozapSub;

  const add = async (priceId: string) => {
    const success = await addInfoZap(priceId);
    if (success) await reload();
    return success;
  };

  const change = async (newPriceId: string) => {
    if (!infozapSub) return false;
    const success = await updatePrice(infozapSub.id, newPriceId);
    if (success) await reload();
    return success;
  };

  const remove = async () => {
    if (!infozapSub) return false;
    const success = await cancel(infozapSub.id);
    if (success) await reload();
    return success;
  };

  return {
    infozapSub,
    hasInfoZap,
    prices,
    loading: pricesLoading || actionLoading,
    add,
    change,
    remove
  };
}
