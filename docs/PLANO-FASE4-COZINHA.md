# Plano de Implementacao - Fase 4: Painel da Cozinha

> **Status:** ✅ 100% IMPLEMENTADO  
> **Data de conclusão:** 2026-01-08  
> **Próxima fase:** Deploy em produção

## Visao Geral

Permitir que a cozinha visualize pedidos confirmados e atualize o status de preparo em tempo real.

## Fluxo Completo (com Cozinha)

```
Cliente faz pedido (PENDING)
    ↓
Garçom confirma (CONFIRMED) ← Já implementado
    ↓
Cozinha vê pedido (CONFIRMED)
    ↓
Cozinha inicia preparo (PREPARING) ← Fase 4
    ↓
Cozinha finaliza (READY) ← Fase 4
    ↓
Garçom é notificado
    ↓
Garçom entrega (DELIVERED) ← Já implementado
```

---

## 1. Alteracoes no Banco de Dados (Prisma)

### Adicionar Role KITCHEN

```prisma
enum Role {
  WAITER
  ADMIN
  MANAGER
  KITCHEN  // NOVO
}
```

### Adicionar campos no Order (opcional)

```prisma
model Order {
  // ... campos existentes ...
  
  // Novos campos para rastreamento de cozinha
  preparing_at   DateTime?  // Quando iniciou preparo
  ready_at       DateTime?  // Quando ficou pronto
  prepared_by    String?    // ID do cozinheiro
  
  preparer User? @relation("PreparedBy", fields: [prepared_by], references: [id])
}
```

### Adicionar relacao no User

```prisma
model User {
  // ... campos existentes ...
  prepared_orders Order[] @relation("PreparedBy")  // NOVO
}
```

---

## 2. APIs Necessarias

### 2.1 PATCH /api/pedidos/[id]/preparar
**Autenticado (KITCHEN)** - Inicia preparo do pedido

Request: Nenhum body necessário

Response:
```json
{
  "id": "cuid",
  "status": "PREPARING",
  "preparing_at": "2026-01-08T10:30:00Z",
  "prepared_by": "kitchen-user-id"
}
```

Validacoes:
- Usuário deve ter role KITCHEN
- Pedido deve estar com status CONFIRMED
- Registra timestamp e quem iniciou

### 2.2 PATCH /api/pedidos/[id]/pronto
**Autenticado (KITCHEN)** - Marca pedido como pronto

Response:
```json
{
  "id": "cuid",
  "status": "READY",
  "ready_at": "2026-01-08T10:45:00Z"
}
```

Validacoes:
- Usuário deve ter role KITCHEN
- Pedido deve estar com status PREPARING

### 2.3 GET /api/pedidos/cozinha/stream
**Autenticado (KITCHEN)** - SSE para pedidos da cozinha

Retorna pedidos com status CONFIRMED, PREPARING ou READY em tempo real.

Diferenca do stream do garçom:
- Foco em CONFIRMED (novos para preparar)
- PREPARING (em andamento)
- READY (prontos para retirada)

---

## 3. Componentes da Cozinha

### 3.1 KitchenPage (Nova página)

Localização: `src/app/(dashboard)/cozinha/page.tsx`

Features:
- Layout similar ao painel do garçom
- Header com logo e info do usuário
- Área principal com pedidos

### 3.2 KitchenPanel (Novo componente)

Localização: `src/components/kitchen/kitchen-panel.tsx`

Features:
- Três colunas/seções:
  - **Novos** (CONFIRMED) - Pedidos aguardando início
  - **Preparando** (PREPARING) - Pedidos em andamento
  - **Prontos** (READY) - Aguardando retirada pelo garçom
- Cada card mostra:
  - Número da mesa
  - Itens do pedido com quantidades
  - Tempo desde criação
  - Observações do cliente
- Ações:
  - "Iniciar" (CONFIRMED → PREPARING)
  - "Pronto" (PREPARING → READY)
- Timer visual por pedido
- Cores de urgência (verde → amarelo → vermelho)
- Som de notificação para novos pedidos

### 3.3 KitchenOrderCard (Novo componente)

Localização: `src/components/kitchen/kitchen-order-card.tsx`

Props:
```typescript
interface KitchenOrderCardProps {
  order: Order & { items: OrderItem[], table: Table }
  onStart?: () => void      // CONFIRMED → PREPARING
  onReady?: () => void      // PREPARING → READY
}
```

Features:
- Exibe mesa, itens, quantidades
- Agrupa itens iguais
- Mostra observações em destaque
- Timer colorido por urgência
- Botões de ação contextual

---

## 4. Modificacoes no Middleware

```typescript
// src/middleware.ts

// Adicionar /cozinha às rotas protegidas
const kitchenRoutes = ['/cozinha']

// Permitir apenas KITCHEN acessar /cozinha
if (kitchenRoutes.some(route => pathname.startsWith(route))) {
  if (token?.role !== 'KITCHEN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

## 5. Modificacoes no Seed

```typescript
// prisma/seed.ts

// Adicionar usuário de cozinha
{
  email: 'cozinha@aifood.com',
  password: await bcrypt.hash('cozinha123', 10),
  name: 'Cozinha',
  role: 'KITCHEN'
}
```

---

## 6. Traducoes (i18n)

### Adicionar em messages/pt.json
```json
{
  "kitchen": {
    "title": "Painel da Cozinha",
    "newOrders": "Novos Pedidos",
    "preparing": "Preparando",
    "ready": "Prontos",
    "startPreparing": "Iniciar Preparo",
    "markReady": "Marcar Pronto",
    "noOrders": "Nenhum pedido no momento",
    "table": "Mesa",
    "items": "Itens",
    "notes": "Observações",
    "waiting": "Aguardando há",
    "minutes": "minutos"
  }
}
```

### Adicionar em messages/es.json
```json
{
  "kitchen": {
    "title": "Panel de Cocina",
    "newOrders": "Nuevos Pedidos",
    "preparing": "Preparando",
    "ready": "Listos",
    "startPreparing": "Iniciar Preparación",
    "markReady": "Marcar Listo",
    "noOrders": "Sin pedidos en este momento",
    "table": "Mesa",
    "items": "Artículos",
    "notes": "Observaciones",
    "waiting": "Esperando hace",
    "minutes": "minutos"
  }
}
```

### Adicionar em messages/en.json
```json
{
  "kitchen": {
    "title": "Kitchen Panel",
    "newOrders": "New Orders",
    "preparing": "Preparing",
    "ready": "Ready",
    "startPreparing": "Start Preparing",
    "markReady": "Mark Ready",
    "noOrders": "No orders at the moment",
    "table": "Table",
    "items": "Items",
    "notes": "Notes",
    "waiting": "Waiting for",
    "minutes": "minutes"
  }
}
```

---

## 7. Fluxo de Status Atualizado

```
PENDING (Cliente enviou)
    ↓
CONFIRMED (Garçom confirmou)
    ↓ ← Cozinha vê aqui
PREPARING (Cozinha iniciou) ← NOVO na Fase 4
    ↓
READY (Cozinha finalizou) ← NOVO na Fase 4
    ↓ ← Garçom é notificado
DELIVERED (Garçom entregou)

A qualquer momento: → CANCELLED
```

---

## 8. Notificacoes

### Para a Cozinha
- Som quando novo pedido chega (CONFIRMED)
- Alerta visual (badge com contador)

### Para o Garçom
- Som quando pedido fica READY
- Destaque na lista de pedidos
- Badge indicando "Pronto para retirada"

---

## 9. Ordem de Implementacao

### Etapa 1: Backend
1. [x] Adicionar `KITCHEN` ao enum Role no schema.prisma
2. [x] Adicionar campos `preparing_at`, `ready_at`, `prepared_by` ao Order
3. [x] Adicionar relação `PreparedBy` no User
4. [x] Rodar `prisma db push`
5. [x] Criar API `PATCH /api/pedidos/[id]/preparar`
6. [x] Criar API `PATCH /api/pedidos/[id]/pronto`
7. [x] Criar/modificar `GET /api/pedidos/stream` para filtrar por role

### Etapa 2: Middleware e Auth
8. [x] Atualizar middleware para rota `/cozinha`
9. [x] Atualizar seed com usuário KITCHEN
10. [x] Rodar seed novamente

### Etapa 3: Interface da Cozinha
11. [x] Criar página `/cozinha`
12. [x] Criar componente `KitchenPanel`
13. [x] Criar componente `KitchenOrderCard` (integrado no KitchenPanel)
14. [x] Implementar SSE para tempo real
15. [x] Adicionar som de notificação

### Etapa 4: Notificações para Garçom
16. [x] Modificar `OrdersPanel` para destacar pedidos READY
17. [x] Adicionar som quando pedido fica READY
18. [x] Adicionar badge/indicador visual

### Etapa 5: Traduções e Ajustes
19. [x] Adicionar traduções PT/ES/EN
20. [x] Testar fluxo completo (TypeScript OK)
21. [x] Ajustes de UX

---

## 10. Estrutura de Arquivos (Novos)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── cozinha/
│   │       └── page.tsx              # Página da cozinha
│   └── api/
│       └── pedidos/
│           └── [id]/
│               ├── preparar/
│               │   └── route.ts      # PATCH preparar
│               └── pronto/
│                   └── route.ts      # PATCH pronto
└── components/
    └── kitchen/
        ├── kitchen-panel.tsx         # Painel principal
        └── kitchen-order-card.tsx    # Card de pedido
```

---

## 11. Metricas (Adicionar ao Dashboard Admin)

Após implementar, adicionar métricas:
- Tempo médio de preparo (CONFIRMED → READY)
- Pedidos por período
- Pratos mais preparados
- Performance por cozinheiro (se múltiplos)
- Taxa de pedidos atrasados (> X minutos)

---

## 12. Consideracoes de UX

### Layout Kanban
Três colunas para visualização clara:
```
┌─────────────┬─────────────┬─────────────┐
│   NOVOS     │ PREPARANDO  │   PRONTOS   │
│  (amarelo)  │  (laranja)  │   (verde)   │
├─────────────┼─────────────┼─────────────┤
│  Pedido 5   │  Pedido 3   │  Pedido 1   │
│  Mesa 7     │  Mesa 2     │  Mesa 4     │
│  3 itens    │  2 itens    │  1 item     │
│  [Iniciar]  │  [Pronto]   │  Aguardando │
├─────────────┼─────────────┼─────────────┤
│  Pedido 6   │  Pedido 4   │  Pedido 2   │
│  Mesa 1     │  Mesa 8     │  Mesa 3     │
│  ...        │  ...        │  ...        │
└─────────────┴─────────────┴─────────────┘
```

### Cores de Urgência
- **Verde** (< 5 min): Tempo normal
- **Amarelo** (5-10 min): Atenção
- **Vermelho** (> 10 min): Urgente

### Sons
- Novo pedido: Som curto de notificação
- Configarável: Permitir silenciar/ajustar volume

---

## 13. Credenciais de Teste (Após Implementação)

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Admin | admin@aifood.com | admin123 | ADMIN |
| Garçom | garcom@aifood.com | garcom123 | WAITER |
| Cozinha | cozinha@aifood.com | cozinha123 | KITCHEN |

---

## 14. Decisoes de Design

### Por que separar PREPARING de READY?

1. **Visibilidade**: Garçom sabe se deve esperar ou se já pode ir buscar
2. **Métricas**: Medir tempo de preparo separadamente
3. **Organização**: Cozinha pode ter vários pedidos "em andamento"

### Por que não mostrar READY automaticamente para o garçom?

Na verdade, vamos mostrar! O garçom verá pedidos READY destacados na sua lista, permitindo que ele vá buscar na cozinha no momento certo.

### Por que armazenar preparing_at e ready_at?

Para calcular:
- Tempo de espera do pedido (created_at → confirmed_at)
- Tempo de preparo (preparing_at → ready_at)
- Tempo total (created_at → delivered_at)

---

## Aprovacao

Este plano cobre todos os aspectos da Fase 4.
Implementar após deploy em produção para validar fluxo atual primeiro.
