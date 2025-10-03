# Integração InfoZap + Stripe

Este documento descreve como usar a integração entre a API InfoDental e o Stripe para gerenciar canais WhatsApp.

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env.local`:

```env
# InfoDental API
INFODENTAL_TOKEN=c20ef152b81e559ef400f564fd0e14651a4e6e76
INFODENTAL_INSTANCE=studiodentalcopy
```

### 2. Produtos Stripe

A integração usa os seguintes produtos:

- **InfoZap (Canais WhatsApp)**: `prod_T9SqvByfpsLwI8`
- **IA**: `prod_TA8gkanW3rgytK`

## Hook: useInfoZapChannels

### Importação

```typescript
import { useInfoZapChannels } from '@/lib/useInfoZapChannels';
```

### Uso Básico

```typescript
const {
  channels,           // Lista de canais
  loading,            // Estado de carregamento
  error,              // Erro (se houver)
  reload,             // Recarregar canais
  addChannel,         // Adicionar canal
  removeChannel,      // Remover canal
  reactivateChannel,  // Reativar canal
  toggleIA,           // Ativar/desativar IA
  infozapSubscription, // Subscription InfoZap no Stripe
  iaSubscription,      // Subscription IA no Stripe
} = useInfoZapChannels();
```

### Exemplos

#### 1. Listar Canais

```typescript
{channels.map(channel => (
  <div key={channel.id}>
    <h3>{channel.titulo}</h3>
    <p>IA Ativa: {channel.ia_ativa ? 'Sim' : 'Não'}</p>
    <p>Status: {channel.status}</p>
    <p>Expira em: {channel.infozap_stripe_expiration}</p>
  </div>
))}
```

#### 2. Adicionar Novo Canal

```typescript
const handleAddChannel = async () => {
  const success = await addChannel({
    titulo: 'Novo Canal',
    withIA: true, // Se deve incluir IA
  });

  if (success) {
    console.log('Canal adicionado com sucesso!');
  }
};
```

#### 3. Remover Canal

```typescript
const handleRemoveChannel = async (channelId: number, hasIA: boolean) => {
  const success = await removeChannel(channelId, hasIA);

  if (success) {
    console.log('Canal removido com sucesso!');
  }
};
```

#### 4. Reativar Canal

```typescript
const handleReactivateChannel = async (channelId: number) => {
  const success = await reactivateChannel({
    channelId,
    withIA: true, // Se deve reativar com IA
  });

  if (success) {
    console.log('Canal reativado com sucesso!');
  }
};
```

#### 5. Ativar/Desativar IA

```typescript
const handleToggleIA = async (channelId: number, currentStatus: boolean) => {
  const success = await toggleIA(channelId, currentStatus);

  if (success) {
    console.log(`IA ${currentStatus ? 'desativada' : 'ativada'} com sucesso!`);
  }
};
```

## Fluxo de Trabalho

### Adicionar Canal

1. Hook busca preço mensal do InfoZap no Stripe
2. Hook busca preço mensal da IA no Stripe (se necessário)
3. Hook incrementa quantidade na subscription do InfoZap (ou cria nova)
4. Hook incrementa quantidade na subscription da IA (ou cria nova, se necessário)
5. Hook calcula data de expiração baseada no período da subscription
6. Hook chama API InfoDental (`method: "criar"`) com dados do Stripe
7. Hook recarrega lista de canais

### Remover Canal

1. Hook decrementa quantidade na subscription do InfoZap
2. Hook decrementa quantidade na subscription da IA (se canal tinha IA)
3. Se quantidade chegar a 0, subscription é cancelada (cancel_at_period_end)
4. Hook chama API InfoDental (`method: "remover"`)
5. Hook recarrega lista de canais

### Reativar Canal

1. Hook incrementa quantidade na subscription do InfoZap
2. Hook incrementa quantidade na subscription da IA (se necessário)
3. Hook calcula nova data de expiração
4. Hook chama API InfoDental (`method: "reativar"`)
5. Hook recarrega lista de canais

## Server Actions Disponíveis

### API InfoDental (`src/app/actions/infodental.ts`)

- `listInfoZapChannels()` - Lista todos os canais
- `createInfoZapChannel(params)` - Cria/atualiza canal
- `removeInfoZapChannel(id)` - Remove canal
- `reactivateInfoZapChannel(params)` - Reativa canal

### Stripe (`src/app/actions/stripe.ts`)

- `getInfoZapSubscription()` - Busca subscription InfoZap
- `getIASubscription()` - Busca subscription IA
- `addInfoZapChannel(priceId)` - Incrementa quantidade InfoZap
- `removeInfoZapChannel()` - Decrementa quantidade InfoZap
- `addIAChannel(priceId)` - Incrementa quantidade IA
- `removeIAChannel()` - Decrementa quantidade IA
- `getInfoZapPrices()` - Lista preços InfoZap
- `getIAPrices()` - Lista preços IA

## Tipos

```typescript
interface InfoZapChannel {
  id: number;
  data: string;
  titulo: string;
  ia_ativa: 0 | 1;
  ia_stripe_si: string;
  ia_stripe_price: string;
  ia_stripe_expiration: string;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: string;
}

interface InfoZapChannelWithStatus extends InfoZapChannel {
  status: 'active' | 'cancelled' | 'pending';
}
```

## Tratamento de Erros

O hook retorna um objeto `error` quando ocorre algum problema:

```typescript
const { error } = useInfoZapChannels();

useEffect(() => {
  if (error) {
    console.error('Erro ao carregar canais:', error.message);
    // Exibir mensagem de erro para o usuário
  }
}, [error]);
```

## Exemplo Completo com SweetAlert2

```typescript
'use client';

import { useInfoZapChannels } from '@/lib/useInfoZapChannels';
import { Button } from '@/components/ui/Button';
import Swal from 'sweetalert2';

export default function CanaisWhatsApp() {
  const {
    channels,
    loading,
    addChannel,
    removeChannel,
    toggleIA,
  } = useInfoZapChannels();

  const handleAdd = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Novo Canal WhatsApp',
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nome do canal">
        <label>
          <input type="checkbox" id="swal-input2" class="swal2-checkbox">
          Incluir IA
        </label>
      `,
      focusConfirm: false,
      preConfirm: () => ({
        titulo: (document.getElementById('swal-input1') as HTMLInputElement).value,
        withIA: (document.getElementById('swal-input2') as HTMLInputElement).checked,
      }),
    });

    if (formValues) {
      const success = await addChannel(formValues);

      if (success) {
        await Swal.fire('Sucesso!', 'Canal adicionado', 'success');
      } else {
        await Swal.fire('Erro!', 'Não foi possível adicionar o canal', 'error');
      }
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Canais WhatsApp</h2>
      <Button onClick={handleAdd}>Adicionar Canal</Button>

      {channels.map(channel => (
        <div key={channel.id}>
          <h3>{channel.titulo}</h3>
          <span>{channel.status}</span>
          <Button onClick={() => toggleIA(channel.id, channel.ia_ativa === 1)}>
            {channel.ia_ativa ? 'Desativar IA' : 'Ativar IA'}
          </Button>
          <Button
            variant="danger"
            onClick={() => removeChannel(channel.id, channel.ia_ativa === 1)}
          >
            Remover
          </Button>
        </div>
      ))}
    </div>
  );
}
```

## Notas Importantes

1. **Subscriptions Separadas**: InfoZap e IA são subscriptions separadas no Stripe
2. **Quantidade**: Cada canal incrementa a quantidade na subscription
3. **Proration**: Mudanças geram créditos/débitos proporcionais
4. **Cancelamento**: Ao remover último canal, subscription é cancelada no final do período
5. **Expiração**: Datas são sincronizadas entre InfoDental e Stripe

## Troubleshooting

### Erro: "Customer ID não configurado"
- Verificar se `STRIPE_CUSTOMER_ID` está no `.env.local`

### Erro: "Credenciais InfoDental não configuradas"
- Verificar se `INFODENTAL_TOKEN` e `INFODENTAL_INSTANCE` estão no `.env.local`

### Erro: "Preço não encontrado"
- Verificar se os produtos têm preços ativos no Stripe
- Produtos devem ter ao menos um preço mensal (`interval: 'month'`)
