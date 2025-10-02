# 🚀 Quick Start - Subscriptions Separadas

Guia rápido para começar a usar o sistema imediatamente.

## 1️⃣ Listar Subscriptions Ativas

```typescript
import { getAllCustomerSubscriptions } from '@/app/actions/stripe';

const { subscriptions } = await getAllCustomerSubscriptions();

subscriptions.forEach(sub => {
  console.log({
    id: sub.id,
    nome: sub.items[0].price.nickname,
    preco: sub.items[0].price.unit_amount / 100,
    vencimento: new Date(sub.current_period_end * 1000)
  });
});
```

## 2️⃣ Adicionar Storage

```typescript
import { getProductPrices, createStorageSubscription } from '@/app/actions/stripe';

// Listar opções
const { prices } = await getProductPrices('prod_T9AfZhzca9pgNW');

// Adicionar 1TB
const price1TB = prices.find(p => p.nickname?.includes('1TB'));
await createStorageSubscription(price1TB.id);
```

## 3️⃣ Adicionar InfoZap

```typescript
import { getProductPrices, createInfoZapSubscription } from '@/app/actions/stripe';

// Listar opções
const { prices } = await getProductPrices('prod_T9SqvByfpsLwI8');

// Adicionar plano mensal
const mensal = prices.find(p => p.recurring?.interval === 'month');
await createInfoZapSubscription(mensal.id);
```

## 4️⃣ Cancelar Subscription Específica

```typescript
import { cancelSpecificSubscription } from '@/app/actions/stripe';

await cancelSpecificSubscription('sub_xxx');
// Cancelado, válido até o vencimento
```

## 5️⃣ Cancelar TUDO

```typescript
import { cancelAllSubscriptions } from '@/app/actions/stripe';

const result = await cancelAllSubscriptions();
console.log(`${result.canceledCount} subscriptions canceladas`);
```

## 6️⃣ Reativar Subscription

```typescript
import { reactivateSpecificSubscription } from '@/app/actions/stripe';

await reactivateSpecificSubscription('sub_xxx');
// Reativada!
```

## 7️⃣ Mudar Plano

```typescript
import { updateSubscriptionPrice } from '@/app/actions/stripe';

// Trocar de 1TB para 2TB
await updateSubscriptionPrice('sub_storage', 'price_2tb_monthly');
```

---

## 📱 Usando React Hooks

```tsx
'use client';

import { useStorageManager } from '@/lib/useSubscriptions';

export default function MeuComponente() {
  const {
    hasStorage,    // boolean - tem storage?
    storageSub,    // objeto da subscription
    prices,        // array de preços disponíveis
    add,           // adicionar storage
    change,        // mudar plano
    remove         // cancelar storage
  } = useStorageManager();

  return (
    <div>
      {hasStorage ? (
        <>
          <p>Storage ativo!</p>
          <button onClick={() => change('price_2tb_monthly')}>
            Mudar para 2TB
          </button>
          <button onClick={remove}>Cancelar</button>
        </>
      ) : (
        <>
          <p>Adicionar storage:</p>
          {prices.map(p => (
            <button onClick={() => add(p.id)} key={p.id}>
              {p.nickname}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
```

---

## 🎯 Produtos e IDs

### Storage
```typescript
PRODUCT_ID: 'prod_T9AfZhzca9pgNW'

// Preços (exemplos):
// - price_storage_15gb_monthly (grátis)
// - price_storage_1tb_monthly
// - price_storage_2tb_monthly
```

### InfoZap
```typescript
PRODUCT_ID: 'prod_T9SqvByfpsLwI8'

// Preços (exemplos):
// - price_infozap_basic_monthly
// - price_infozap_pro_monthly
```

---

## ⚡ Exemplo Completo - Interface de Gerenciamento

```tsx
'use client';

import { useSubscriptionManager } from '@/lib/useSubscriptions';
import Swal from 'sweetalert2';

export default function Gerenciador() {
  const {
    subscriptions,
    loading,
    reload,
    actions,
    getPlanName,
    getPlanPrice,
    getNextBilling
  } = useSubscriptionManager();

  const handleCancelAll = async () => {
    const confirm = await Swal.fire({
      title: 'Cancelar tudo?',
      text: 'Todas as subscriptions serão canceladas',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      confirmButtonColor: '#d33'
    });

    if (confirm.isConfirmed) {
      await actions.cancelAll();
      Swal.fire('Cancelado!', 'Válidas até o vencimento', 'success');
      reload();
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Minhas Subscriptions</h1>

      <button
        onClick={handleCancelAll}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
      >
        Cancelar Tudo
      </button>

      <div className="grid gap-4">
        {subscriptions.map(sub => (
          <div key={sub.id} className="border p-4 rounded">
            <h3 className="font-bold">{getPlanName(sub)}</h3>
            <p>R$ {getPlanPrice(sub).toFixed(2)}/mês</p>
            <p className="text-sm text-gray-600">
              Vence em: {getNextBilling(sub).toLocaleDateString()}
            </p>
            {sub.cancel_at_period_end && (
              <span className="text-red-500">⚠️ Será cancelado</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔑 IDs Principais

```typescript
// Customer ID (configurar no .env)
STRIPE_CUSTOMER_ID=cus_xxx

// Product IDs
STORAGE: 'prod_T9AfZhzca9pgNW'
INFOZAP: 'prod_T9SqvByfpsLwI8'
PLANO_PRINCIPAL: 'prod_T9AmlVw7Z608Rm'
```

---

## 📋 Checklist de Implementação

- [ ] Configurar variáveis de ambiente (STRIPE_CUSTOMER_ID, etc.)
- [ ] Importar funções do `@/app/actions/stripe`
- [ ] Criar componente de gerenciamento
- [ ] Testar adicionar storage
- [ ] Testar adicionar infozap
- [ ] Testar cancelamento
- [ ] Testar reativação
- [ ] Adicionar SweetAlert2 para confirmações
- [ ] Customizar estilos

---

## 🎨 Componente Pronto para Usar

Copie e cole o arquivo **EXAMPLE_USAGE.tsx** diretamente na sua aplicação!

Ele já inclui:
- ✅ Listagem de subscriptions
- ✅ Adicionar/remover storage
- ✅ Adicionar/remover infozap
- ✅ Cancelar tudo
- ✅ Reativar
- ✅ Interface completa com Tailwind CSS

---

## 💡 Dicas

1. **Sempre recarregue** após mudanças:
   ```typescript
   await createStorageSubscription(priceId);
   reload(); // Recarrega a lista
   ```

2. **Use SweetAlert2** para confirmações:
   ```typescript
   const result = await Swal.fire({
     title: 'Confirmar?',
     showCancelButton: true
   });

   if (result.isConfirmed) {
     // fazer ação
   }
   ```

3. **Trate erros**:
   ```typescript
   try {
     await createStorageSubscription(priceId);
   } catch (error) {
     Swal.fire('Erro', error.message, 'error');
   }
   ```

---

## 🚀 Pronto!

Com isso você já pode começar a usar o sistema de subscriptions separadas!

**Arquivos importantes:**
- `src/app/actions/stripe.ts` - Funções principais
- `src/lib/useSubscriptions.ts` - React hooks
- `EXAMPLE_USAGE.tsx` - Componente exemplo completo
- `SUBSCRIPTIONS_SEPARADAS.md` - Documentação detalhada
