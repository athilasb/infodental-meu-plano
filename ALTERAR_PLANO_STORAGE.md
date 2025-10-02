# ✅ Como Alterar Plano de Storage

## 3 Novas Funções Criadas

### 1. `changeStoragePlan(newPriceId)`
**Apenas altera** o plano de storage existente
```typescript
import { changeStoragePlan } from '@/app/actions/stripe';

// Alterar de 1TB para 2TB
await changeStoragePlan('price_storage_2tb_monthly');

// ❌ Erro se não existir storage
```

---

### 2. `addOrChangeStoragePlan(priceId)` ⭐ **RECOMENDADO**
**Inteligente**: Adiciona se não existe, altera se existe
```typescript
import { addOrChangeStoragePlan } from '@/app/actions/stripe';

// Se não tem storage: CRIA
// Se já tem storage: ALTERA
await addOrChangeStoragePlan('price_storage_1tb_monthly');

// ✅ Sempre funciona!
```

---

### 3. `createStorageSubscription(priceId)`
**Apenas cria** nova subscription (mantém erro se já existe)
```typescript
import { createStorageSubscription } from '@/app/actions/stripe';

// Criar nova subscription
await createStorageSubscription('price_storage_1tb_monthly');

// ❌ Erro se já existir storage
```

---

## 🎯 Uso Recomendado

### Na Interface do Usuário

Use **`addOrChangeStoragePlan()`** - é a mais inteligente!

```tsx
'use client';

import { useStorageManager } from '@/lib/useSubscriptions';
import Swal from 'sweetalert2';

export default function StorageSelector() {
  const { hasStorage, prices, addOrChange, loading } = useStorageManager();

  const handleSelectPlan = async (priceId: string) => {
    const success = await addOrChange(priceId);

    if (success) {
      Swal.fire({
        title: 'Sucesso!',
        text: hasStorage
          ? 'Plano de armazenamento alterado'
          : 'Armazenamento adicionado',
        icon: 'success'
      });
    } else {
      Swal.fire('Erro', 'Falha ao processar', 'error');
    }
  };

  return (
    <div>
      <h2>Escolha seu plano de armazenamento</h2>

      {loading && <p>Carregando...</p>}

      <div className="grid gap-4">
        {prices.map(price => (
          <div key={price.id} className="border p-4">
            <h3>{price.nickname}</h3>
            <p>R$ {((price.unit_amount || 0) / 100).toFixed(2)}/mês</p>
            <button
              onClick={() => handleSelectPlan(price.id)}
              disabled={loading}
            >
              {hasStorage ? 'Alterar para este plano' : 'Contratar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 Fluxos de Uso

### Fluxo 1: Cliente SEM storage (primeira vez)

```typescript
import { addOrChangeStoragePlan } from '@/app/actions/stripe';

// Cliente escolhe 1TB
await addOrChangeStoragePlan('price_storage_1tb_monthly');

// ✅ Cria nova subscription de storage
// ✅ Fatura separada
```

---

### Fluxo 2: Cliente JÁ TEM storage (quer mudar)

```typescript
import { addOrChangeStoragePlan } from '@/app/actions/stripe';

// Cliente quer mudar de 1TB para 2TB
await addOrChangeStoragePlan('price_storage_2tb_monthly');

// ✅ Altera a subscription existente
// ✅ Stripe calcula proração automaticamente
```

---

### Fluxo 3: Verificar antes de alterar

```typescript
import { getAllCustomerSubscriptions, changeStoragePlan } from '@/app/actions/stripe';

// 1. Verificar se tem storage
const { subscriptions } = await getAllCustomerSubscriptions();
const hasStorage = subscriptions.some(sub =>
  sub.items.some(item => item.price.product === 'prod_T9AfZhzca9pgNW')
);

if (hasStorage) {
  // 2. Alterar plano
  await changeStoragePlan('price_storage_2tb_monthly');
  console.log('✅ Plano alterado!');
} else {
  console.log('❌ Cliente não tem storage');
}
```

---

## 🎨 Exemplo Completo com SweetAlert2

```tsx
'use client';

import { useStorageManager } from '@/lib/useSubscriptions';
import Swal from 'sweetalert2';

export default function StorageManager() {
  const {
    hasStorage,
    storageSub,
    prices,
    addOrChange,
    remove,
    loading
  } = useStorageManager();

  const handleChangePlan = async () => {
    const { value: priceId } = await Swal.fire({
      title: hasStorage ? 'Alterar Plano' : 'Escolher Plano',
      html: `
        <select id="price-select" class="swal2-select">
          ${prices.map(p => `
            <option value="${p.id}">
              ${p.nickname} - R$ ${((p.unit_amount || 0) / 100).toFixed(2)}/mês
            </option>
          `).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: hasStorage ? 'Alterar' : 'Contratar',
      preConfirm: () => {
        return (document.getElementById('price-select') as HTMLSelectElement).value;
      }
    });

    if (priceId) {
      Swal.fire({
        title: 'Processando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const success = await addOrChange(priceId);

      if (success) {
        Swal.fire({
          title: 'Sucesso!',
          text: hasStorage
            ? 'Plano alterado com sucesso. Você será cobrado proporcionalmente.'
            : 'Armazenamento contratado com sucesso!',
          icon: 'success'
        });
      } else {
        Swal.fire('Erro', 'Falha ao processar', 'error');
      }
    }
  };

  const handleRemove = async () => {
    const result = await Swal.fire({
      title: 'Cancelar Armazenamento?',
      text: 'Será cancelado no final do período',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      const success = await remove();
      if (success) {
        Swal.fire('Cancelado!', 'Válido até o vencimento', 'success');
      }
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Armazenamento</h1>

      {hasStorage && storageSub && (
        <div className="bg-blue-50 p-4 rounded mb-4">
          <h3 className="font-semibold">Plano Atual</h3>
          <p>{storageSub.items[0].price.nickname}</p>
          <p>R$ {((storageSub.items[0].price.unit_amount || 0) / 100).toFixed(2)}/mês</p>
          <p className="text-sm text-gray-600">
            Próximo vencimento: {new Date(storageSub.current_period_end * 1000).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleChangePlan}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {hasStorage ? 'Alterar Plano' : 'Contratar Armazenamento'}
        </button>

        {hasStorage && (
          <button
            onClick={handleRemove}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Cancelar
          </button>
        )}
      </div>

      {!hasStorage && (
        <div className="mt-6 grid gap-4">
          <h3 className="font-semibold">Planos Disponíveis</h3>
          {prices.map(price => (
            <div key={price.id} className="border p-4 rounded">
              <h4 className="font-bold">{price.nickname}</h4>
              <p className="text-2xl">
                R$ {((price.unit_amount || 0) / 100).toFixed(2)}
                <span className="text-sm text-gray-600">/mês</span>
              </p>
              <button
                onClick={() => addOrChange(price.id)}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
              >
                Contratar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Resumo

| Função | Quando Usar | Comportamento |
|--------|-------------|---------------|
| `addOrChangeStoragePlan()` | ⭐ **SEMPRE** (recomendado) | Cria OU altera (inteligente) |
| `changeStoragePlan()` | Apenas alterar | Erro se não existir |
| `createStorageSubscription()` | Apenas criar | Erro se já existir |

---

## ✅ Hook `useStorageManager()`

Agora retorna 3 funções:

```typescript
const {
  add,         // Adiciona (erro se já existe)
  change,      // Altera (erro se não existe)
  addOrChange  // ⭐ Inteligente (sempre funciona)
} = useStorageManager();
```

**Use `addOrChange()` na maioria dos casos!**
