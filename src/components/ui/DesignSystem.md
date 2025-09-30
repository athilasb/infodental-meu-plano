# Krooa Design System

## Cores Principais
- **krooa-green**: #D8FE64 - Cor primária de destaque
- **krooa-blue**: #30578D - Cor secundária
- **krooa-dark**: #001F2B - Cor escura principal

## Componentes

### Button
```tsx
import { Button } from '@/components/ui';

// Variantes
<Button variant="primary">Ação Principal</Button>
<Button variant="secondary">Ação Secundária</Button>
<Button variant="danger">Ação Perigosa</Button>
<Button variant="ghost">Ação Sutil</Button>
<Button variant="outline">Ação com Borda</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>

// Largura total
<Button fullWidth>Largura Total</Button>
```

### Card
```tsx
import { Card, CardSection } from '@/components/ui';

// Card simples
<Card>
  Conteúdo do card
</Card>

// Card com título e ações
<Card
  title="Título do Card"
  actions={<Button size="sm">Ação</Button>}
>
  Conteúdo
</Card>

// Card com seções
<Card>
  <CardSection>Seção 1</CardSection>
  <CardSection>Seção 2</CardSection>
</Card>
```

### Modal
```tsx
import { Modal, ConfirmModal } from '@/components/ui';

// Modal básico
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título do Modal"
  size="md" // sm, md, lg, xl
  footer={
    <Button onClick={handleSave}>Salvar</Button>
  }
>
  Conteúdo do modal
</Modal>

// Modal de confirmação
<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirm}
  title="Confirmar ação"
  message="Tem certeza que deseja continuar?"
  confirmText="Sim, continuar"
  cancelText="Cancelar"
  variant="danger" // danger, warning, info
/>
```

### Input
```tsx
import { Input, Select, Textarea } from '@/components/ui';

// Input básico
<Input
  label="Nome"
  placeholder="Digite seu nome"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
/>

// Input com ícone
<Input
  label="Email"
  type="email"
  icon={<EmailIcon />}
  fullWidth
/>

// Select
<Select
  label="País"
  options={[
    { value: 'br', label: 'Brasil' },
    { value: 'us', label: 'Estados Unidos' }
  ]}
  value={country}
  onChange={(e) => setCountry(e.target.value)}
/>

// Textarea
<Textarea
  label="Descrição"
  rows={4}
  fullWidth
/>
```

### Badge
```tsx
import { Badge } from '@/components/ui';

// Variantes
<Badge variant="success">Ativo</Badge>
<Badge variant="warning">Pendente</Badge>
<Badge variant="error">Erro</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="neutral">Neutro</Badge>

// Com ícone
<Badge icon="✅" variant="success">Completo</Badge>

// Tamanhos
<Badge size="sm">Pequeno</Badge>
<Badge size="md">Médio</Badge>
```

### Table
```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHeaderCell>Nome</TableHeaderCell>
      <TableHeaderCell align="center">Status</TableHeaderCell>
      <TableHeaderCell align="right">Valor</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow onClick={() => handleRowClick(item)}>
      <TableCell>{item.name}</TableCell>
      <TableCell align="center">
        <Badge variant="success">Ativo</Badge>
      </TableCell>
      <TableCell align="right">R$ {item.value}</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs
```tsx
import { Tabs, TabPanel } from '@/components/ui';

const tabs = [
  { id: 'overview', label: 'Visão Geral', badge: 3 },
  { id: 'details', label: 'Detalhes', icon: '📊' },
  { id: 'settings', label: 'Configurações' }
];

<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  variant="default" // default, pills
/>

<TabPanel isActive={activeTab === 'overview'}>
  Conteúdo da visão geral
</TabPanel>
```

### Alert
```tsx
import { Alert } from '@/components/ui';

// Variantes
<Alert variant="info" title="Informação">
  Esta é uma mensagem informativa.
</Alert>

<Alert variant="success">
  Operação realizada com sucesso!
</Alert>

<Alert variant="warning" onClose={() => setShow(false)}>
  Atenção: verifique os dados.
</Alert>

<Alert variant="error" title="Erro">
  Ocorreu um erro ao processar a solicitação.
</Alert>
```

## Padrões de Estilo

### Bordas
- Sempre use `rounded-xl` ou `rounded-2xl` para bordas arredondadas
- Bordas padrão: `border border-neutral-200` ou `border border-gray-200`

### Sombras
- Cards e modais: `shadow-sm`
- Elementos elevados: `shadow-xl`

### Espaçamento
- Padding em cards: `p-5`
- Padding em seções: `px-5 py-4`
- Gap entre elementos: `gap-2`, `gap-3`, `gap-4`

### Transições
- Sempre adicione `transition-colors` para mudanças de cor
- Use `hover:` para estados de hover

### Tipografia
- Fonte principal: `font-manrope`
- Títulos: `font-semibold` ou `font-bold`
- Texto secundário: `text-gray-600` ou `text-neutral-600`
- Tamanhos: `text-sm`, `text-base`, `text-lg`, `text-xl`

## Boas Práticas

1. **Consistência**: Use sempre os mesmos componentes para manter consistência visual
2. **Acessibilidade**: Sempre adicione labels em inputs e aria-labels em botões de ícone
3. **Responsividade**: Use classes responsivas do Tailwind quando necessário
4. **Estados**: Implemente estados de hover, focus, disabled
5. **Validação**: Mostre erros de forma clara usando o prop `error` dos inputs
6. **Feedback**: Use Alerts e Badges para dar feedback ao usuário