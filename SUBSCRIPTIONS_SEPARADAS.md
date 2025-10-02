# Sistema de Subscriptions Separadas - Nova Estratégia

## 🎯 Estratégia

### ✅ Mudanças Principais

1. **Faturas Separadas**: Cada produto tem sua própria subscription
2. **Apenas Planos Mensais**: Storage e InfoZap só têm planos mensais
3. **Cancelamento em Cascata**: Cancelar plano principal cancela TODOS os produtos
4. **Vencimentos Independentes**: Cada subscription pode ter vencimento diferente

### 📋 Estrutura

```
Customer
├── Subscription 1 (Plano Principal)
│   └── Vencimento: dia 5
├── Subscription 2 (Storage)
│   └── Vencimento: dia 10
└── Subscription 3 (InfoZap)
    └── Vencimento: dia 15
```

## 🔧 Funções Implementadas

### 1. Listar Todas as Subscriptions

```typescript
import { getAllCustomerSubscriptions } from '@/app/actions/stripe';

const { subscriptions } = await getAllCustomerSubscriptions();

console.log(subscriptions);
// [
//   { id: 'sub_plano', items: [...], current_period_end: ... },
//   { id: 'sub_storage', items: [...], current_period_end: ... },
//   { id: 'sub_infozap', items: [...], current_period_end: ... }
// ]
```

### 2. Buscar Todos os Preços de um Produto

```typescript
import { getProductPrices } from '@/app/actions/stripe';

// Buscar preços do Storage
const storageData = await getProductPrices('prod_T9AfZhzca9pgNW');
console.log(storageData.prices);
// [
//   { id: 'price_storage_15gb_monthly', nickname: '15GB Mensal', unit_amount: 0, ... },
//   { id: 'price_storage_1tb_monthly', nickname: '1TB Mensal', unit_amount: 50000, ... },
//   ...
// ]

// Buscar preços do InfoZap
const infozapData = await getProductPrices('prod_T9SqvByfpsLwI8');
console.log(infozapData.prices);
```

### 3. Criar Subscription de Storage

```typescript
import { createStorageSubscription } from '@/app/actions/stripe';

// Criar subscription separada para storage
const result = await createStorageSubscription('price_storage_1tb_monthly');

console.log(result);
// {
//   success: true,
//   subscriptionId: 'sub_xxx',
//   current_period_end: 1234567890
// }
```

### 4. Criar Subscription de InfoZap

```typescript
import { createInfoZapSubscription } from '@/app/actions/stripe';

// Criar subscription separada para infozap
const result = await createInfoZapSubscription('price_infozap_monthly');

console.log(result);
// {
//   success: true,
//   subscriptionId: 'sub_xxx',
//   current_period_end: 1234567890
// }
```

### 5. Cancelar Subscription Específica

```typescript
import { cancelSpecificSubscription } from '@/app/actions/stripe';

// Cancelar apenas o storage
await cancelSpecificSubscription('sub_storage_id');

// Cancela no final do período (cancel_at_period_end: true)
```

### 6. Cancelar TODAS as Subscriptions

```typescript
import { cancelAllSubscriptions } from '@/app/actions/stripe';

// Cancela plano principal + storage + infozap
const result = await cancelAllSubscriptions();

console.log(result);
// {
//   success: true,
//   canceledCount: 3
// }
```

### 7. Reativar Subscription Cancelada

```typescript
import { reactivateSpecificSubscription } from '@/app/actions/stripe';

// Reativar storage que foi cancelado
await reactivateSpecificSubscription('sub_storage_id');
```

### 8. Atualizar Plano de uma Subscription

```typescript
import { updateSubscriptionPrice } from '@/app/actions/stripe';

// Trocar de 1TB para 2TB
await updateSubscriptionPrice('sub_storage_id', 'price_storage_2tb_monthly');
```

## 📊 Fluxos de Uso

### Fluxo 1: Cliente Adiciona Storage

```typescript
import { getProductPrices, createStorageSubscription } from '@/app/actions/stripe';

async function adicionarStorage() {
  // 1. Listar opções de storage
  const { prices } = await getProductPrices('prod_T9AfZhzca9pgNW');

  // 2. Usuário escolhe 1TB
  const selectedPrice = prices.find(p => p.nickname === '1TB Mensal');

  // 3. Criar subscription separada
  const result = await createStorageSubscription(selectedPrice.id);

  if (result.success) {
    console.log('✅ Storage adicionado com sucesso!');
    console.log(`Próximo vencimento: ${new Date(result.current_period_end * 1000)}`);
  }
}
```

### Fluxo 2: Cliente Adiciona InfoZap

```typescript
import { getProductPrices, createInfoZapSubscription } from '@/app/actions/stripe';
import { createInfoZap } from '@/lib/infozapAPI';
import { infozapDB } from '@/lib/infozapDB';

async function adicionarInfoZap() {
  // 1. Listar opções de infozap
  const { prices } = await getProductPrices('prod_T9SqvByfpsLwI8');

  // 2. Escolher plano mensal
  const monthlyPrice = prices.find(p => p.recurring?.interval === 'month');

  // 3. Criar subscription no Stripe
  const stripeResult = await createInfoZapSubscription(monthlyPrice.id);

  if (stripeResult.success) {
    // 4. Calcular expiração
    const expiration = new Date(stripeResult.current_period_end * 1000);

    // 5. Criar via API Manager
    await createInfoZap({
      instance: 'studiodentalcopy',
      id_infozap: '1',
      infozap_stripe_si: stripeResult.subscriptionId,
      infozap_stripe_price: monthlyPrice.id,
      infozap_stripe_expiration: expiration.toISOString().slice(0, 19).replace('T', ' ')
    });

    // 6. Salvar no IndexedDB
    await infozapDB.save({
      id: 1,
      instancia: 'studiodentalcopy',
      infozap_stripe_si: stripeResult.subscriptionId,
      infozap_stripe_price: monthlyPrice.id,
      infozap_stripe_expiration: expiration,
      assinatura_status: 'contratado',
      // ... outros campos
    });

    console.log('✅ InfoZap configurado completamente!');
  }
}
```

### Fluxo 3: Cliente Cancela Tudo

```typescript
import { cancelAllSubscriptions } from '@/app/actions/stripe';
import Swal from 'sweetalert2';

async function cancelarTudo() {
  const result = await Swal.fire({
    title: 'Cancelar Tudo?',
    text: 'Isso cancelará seu plano, storage e InfoZap',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, cancelar tudo',
    confirmButtonColor: '#d33'
  });

  if (result.isConfirmed) {
    const cancelResult = await cancelAllSubscriptions();

    Swal.fire(
      'Cancelado!',
      `${cancelResult.canceledCount} subscriptions canceladas. Válidas até o vencimento.`,
      'success'
    );
  }
}
```

### Fluxo 4: Cliente Quer Trocar Storage

```typescript
import { getAllCustomerSubscriptions, updateSubscriptionPrice } from '@/app/actions/stripe';

async function trocarStorage() {
  // 1. Encontrar subscription de storage
  const { subscriptions } = await getAllCustomerSubscriptions();
  const storageSub = subscriptions.find(sub =>
    sub.items.some(item =>
      item.price.product === 'prod_T9AfZhzca9pgNW'
    )
  );

  if (!storageSub) {
    console.log('Storage não encontrado');
    return;
  }

  // 2. Atualizar para 2TB
  await updateSubscriptionPrice(storageSub.id, 'price_storage_2tb_monthly');

  console.log('✅ Storage atualizado para 2TB!');
}
```

### Fluxo 5: Visualizar Todos os Planos

```typescript
import { getAllCustomerSubscriptions } from '@/app/actions/stripe';

async function visualizarPlanos() {
  const { subscriptions } = await getAllCustomerSubscriptions();

  subscriptions.forEach(sub => {
    const productName = sub.items[0].price.nickname || 'Produto';
    const amount = (sub.items[0].price.unit_amount || 0) / 100;
    const nextBilling = new Date(sub.current_period_end * 1000);
    const willCancel = sub.cancel_at_period_end;

    console.log(`
      📦 ${productName}
      💰 R$ ${amount.toFixed(2)}/mês
      📅 Próximo vencimento: ${nextBilling.toLocaleDateString()}
      ${willCancel ? '⚠️ Será cancelado' : '✅ Ativo'}
    `);
  });
}
```

## 🎨 Exemplo de Componente React

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  getAllCustomerSubscriptions,
  getProductPrices,
  createStorageSubscription,
  createInfoZapSubscription,
  cancelSpecificSubscription,
  cancelAllSubscriptions
} from '@/app/actions/stripe';
import Swal from 'sweetalert2';

export default function SubscriptionsManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [storageOptions, setStorageOptions] = useState([]);
  const [infozapOptions, setInfozapOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Carregar subscriptions ativas
    const { subscriptions: subs } = await getAllCustomerSubscriptions();
    setSubscriptions(subs);

    // Carregar opções de storage
    const storage = await getProductPrices('prod_T9AfZhzca9pgNW');
    setStorageOptions(storage.prices);

    // Carregar opções de infozap
    const infozap = await getProductPrices('prod_T9SqvByfpsLwI8');
    setInfozapOptions(infozap.prices);

    setLoading(false);
  };

  const handleAddStorage = async () => {
    const { value: priceId } = await Swal.fire({
      title: 'Escolha um plano de armazenamento',
      input: 'select',
      inputOptions: storageOptions.reduce((acc, price) => {
        acc[price.id] = `${price.nickname} - R$ ${(price.unit_amount / 100).toFixed(2)}/mês`;
        return acc;
      }, {}),
      showCancelButton: true
    });

    if (priceId) {
      try {
        await createStorageSubscription(priceId);
        Swal.fire('Sucesso!', 'Storage adicionado', 'success');
        loadData();
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    }
  };

  const handleAddInfoZap = async () => {
    const { value: priceId } = await Swal.fire({
      title: 'Escolha um plano InfoZap',
      input: 'select',
      inputOptions: infozapOptions.reduce((acc, price) => {
        acc[price.id] = `${price.nickname} - R$ ${(price.unit_amount / 100).toFixed(2)}/mês`;
        return acc;
      }, {}),
      showCancelButton: true
    });

    if (priceId) {
      try {
        await createInfoZapSubscription(priceId);
        Swal.fire('Sucesso!', 'InfoZap adicionado', 'success');
        loadData();
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    }
  };

  const handleCancelSubscription = async (subId: string) => {
    const result = await Swal.fire({
      title: 'Cancelar?',
      text: 'A subscription será cancelada no final do período',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      await cancelSpecificSubscription(subId);
      Swal.fire('Cancelado!', 'Válido até o vencimento', 'success');
      loadData();
    }
  };

  const handleCancelAll = async () => {
    const result = await Swal.fire({
      title: 'Cancelar TUDO?',
      text: 'Todas as suas subscriptions serão canceladas',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar tudo',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      const { canceledCount } = await cancelAllSubscriptions();
      Swal.fire('Cancelado!', `${canceledCount} subscriptions canceladas`, 'success');
      loadData();
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Minhas Subscriptions</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={handleAddStorage} className="btn btn-primary">
          Adicionar Storage
        </button>
        <button onClick={handleAddInfoZap} className="btn btn-primary">
          Adicionar InfoZap
        </button>
        <button onClick={handleCancelAll} className="btn btn-danger">
          Cancelar Tudo
        </button>
      </div>

      <div className="grid gap-4">
        {subscriptions.map(sub => (
          <div key={sub.id} className="border p-4 rounded">
            <h3 className="font-semibold">
              {sub.items[0].price.nickname || 'Plano'}
            </h3>
            <p>R$ {((sub.items[0].price.unit_amount || 0) / 100).toFixed(2)}/mês</p>
            <p>Próximo vencimento: {new Date(sub.current_period_end * 1000).toLocaleDateString()}</p>

            {sub.cancel_at_period_end ? (
              <span className="text-red-500">⚠️ Será cancelado</span>
            ) : (
              <button
                onClick={() => handleCancelSubscription(sub.id)}
                className="btn btn-sm btn-danger mt-2"
              >
                Cancelar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## ⚠️ Observações Importantes

1. **Faturas Separadas**: Cada subscription gera sua própria fatura
2. **Vencimentos Independentes**: Cada produto pode vencer em dias diferentes
3. **Cancelamento**: Sempre usa `cancel_at_period_end: true` (válido até o vencimento)
4. **Apenas Mensal**: Storage e InfoZap só têm planos mensais
5. **Cancelamento em Cascata**: Ao cancelar o plano principal, cancelar todos os outros

## 🎉 Pronto para Uso!

Todas as funções estão implementadas e prontas para serem usadas na interface!
