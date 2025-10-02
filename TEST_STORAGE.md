# Teste - Função getStorageProduct()

## ✅ Correção Aplicada

A função `getStorageProduct()` agora retorna **TODOS os preços ativos** do produto de armazenamento, sem filtros.

### O que foi corrigido:

**Antes (com bug):**
- ❌ Filtrava apenas preços com `metadata.type === 'addon'`
- ❌ Filtrava apenas preços mensais
- ❌ Retornava array vazio se não tivesse metadata correto

**Agora (corrigido):**
- ✅ Retorna TODOS os preços ativos do produto
- ✅ Sem filtros de metadata
- ✅ Sem filtros de intervalo
- ✅ Funciona independente da configuração do Stripe

---

## 🧪 Como Testar

### Teste 1: Verificar se retorna preços

```typescript
import { getStorageProduct } from '@/app/actions/stripe';

const result = await getStorageProduct();

console.log('Produto:', result.product.name);
console.log('Descrição:', result.product.description);
console.log('Total de preços:', result.prices.length);

result.prices.forEach(price => {
  console.log({
    id: price.id,
    nome: price.nickname,
    valor: (price.unit_amount || 0) / 100,
    moeda: price.currency,
    intervalo: price.recurring?.interval,
    metadata: price.metadata
  });
});
```

**Resultado esperado:**
```
Produto: Armazenamento
Descrição: Plano de Armazenamento Flexível...
Total de preços: 3 (ou mais)

{
  id: 'price_xxx',
  nome: '2 GB',
  valor: 0,
  moeda: 'brl',
  intervalo: 'month',
  metadata: {...}
}
{
  id: 'price_yyy',
  nome: '15 GB',
  valor: 29.90,
  moeda: 'brl',
  intervalo: 'month',
  metadata: {...}
}
{
  id: 'price_zzz',
  nome: '1 TB',
  valor: 99.90,
  moeda: 'brl',
  intervalo: 'month',
  metadata: {...}
}
```

---

### Teste 2: Usar na interface

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getStorageProduct } from '@/app/actions/stripe';

export default function TesteStorage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getStorageProduct().then(setData);
  }, []);

  if (!data) return <p>Carregando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{data.product.name}</h1>
      <p className="text-gray-600 mb-4">{data.product.description}</p>

      <h2 className="text-xl font-semibold mb-2">
        Preços Disponíveis ({data.prices.length})
      </h2>

      <div className="grid gap-4">
        {data.prices.map(price => (
          <div key={price.id} className="border p-4 rounded">
            <h3 className="font-bold">{price.nickname || 'Sem nome'}</h3>
            <p className="text-2xl">
              R$ {((price.unit_amount || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Intervalo: {price.recurring?.interval || 'N/A'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Teste 3: Adicionar Storage

```typescript
import { getStorageProduct, createStorageSubscription } from '@/app/actions/stripe';

async function adicionarStorage() {
  // 1. Buscar preços
  const { prices } = await getStorageProduct();

  console.log(`✅ ${prices.length} preços encontrados`);

  // 2. Escolher o primeiro preço (exemplo)
  const selectedPrice = prices[0];

  console.log('Adicionando:', selectedPrice.nickname);

  // 3. Criar subscription
  const result = await createStorageSubscription(selectedPrice.id);

  console.log('Resultado:', result);
  // { success: true, subscriptionId: 'sub_xxx', current_period_end: ... }
}
```

---

## 🐛 Se Ainda Não Aparecer Preços

Se a função retornar `prices: []` (array vazio), o problema está no Stripe:

### Verificar no Dashboard do Stripe:

1. Acesse: https://dashboard.stripe.com/products
2. Busque o produto: `prod_T9AfZhzca9pgNW`
3. Verifique se há preços ativos
4. Verifique se os preços estão marcados como "Active"

### Se não houver preços ativos:

Crie os preços no Stripe:

```bash
# Via Stripe CLI
stripe prices create \
  --product prod_T9AfZhzca9pgNW \
  --unit-amount 0 \
  --currency brl \
  --recurring='{"interval":"month"}' \
  --nickname "2 GB"

stripe prices create \
  --product prod_T9AfZhzca9pgNW \
  --unit-amount 2990 \
  --currency brl \
  --recurring='{"interval":"month"}' \
  --nickname "15 GB"

stripe prices create \
  --product prod_T9AfZhzca9pgNW \
  --unit-amount 9990 \
  --currency brl \
  --recurring='{"interval":"month"}' \
  --nickname "1 TB"
```

---

## ✅ Checklist de Validação

- [ ] A função retorna o produto corretamente
- [ ] A função retorna array de preços (não vazio)
- [ ] Cada preço tem: id, nickname, unit_amount
- [ ] Consegue adicionar storage com `createStorageSubscription()`
- [ ] A interface mostra os preços corretamente

---

## 🔍 Debug Avançado

Se precisar debugar mais:

```typescript
import { getStorageProduct } from '@/app/actions/stripe';

async function debugStorage() {
  try {
    console.log('🔍 Iniciando debug...');

    const result = await getStorageProduct();

    console.log('📦 Produto:', {
      id: result.product.id,
      name: result.product.name,
      description: result.product.description?.substring(0, 50) + '...'
    });

    console.log('💰 Total de preços:', result.prices.length);

    if (result.prices.length === 0) {
      console.error('❌ NENHUM PREÇO ENCONTRADO!');
      console.error('Verifique no Stripe se há preços ativos para o produto');
      return;
    }

    result.prices.forEach((price, index) => {
      console.log(`\nPreço ${index + 1}:`, {
        id: price.id,
        nickname: price.nickname,
        amount: (price.unit_amount || 0) / 100,
        currency: price.currency,
        recurring: price.recurring
      });
    });

    console.log('\n✅ Debug completo');
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugStorage();
```

---

## 📝 Notas

1. **A função agora retorna TODOS os preços ativos**
2. **Não há mais filtros** de metadata ou intervalo
3. **Compatível** com qualquer configuração do Stripe
4. **As funções antigas** (`addStorageAddon`) foram atualizadas para usar a nova estratégia

Se ainda tiver problemas, verifique:
- Credenciais do Stripe (STRIPE_SECRET_KEY)
- Se o produto existe no Stripe
- Se há preços ativos cadastrados
