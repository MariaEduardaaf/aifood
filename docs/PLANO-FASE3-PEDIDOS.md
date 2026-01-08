# Plano de Implementacao - Fase 3: Sistema de Pedidos

> **Status:** ✅ 100% IMPLEMENTADO  
> **Data de conclusão:** 2026-01-07  
> **Próxima fase:** Ver [PLANO-FASE4-COZINHA.md](./PLANO-FASE4-COZINHA.md)

---

## Visao Geral

Permitir que o cliente faca pedidos diretamente pelo celular, sem precisar chamar o garcom.

## Fluxo do Usuario

```
Cliente escaneia QR
    -> Ve cardapio
    -> Adiciona itens ao carrinho
    -> Revisa pedido
    -> Envia pedido
    -> Garcom recebe em tempo real (SSE)
    -> Garcom confirma
    -> (Fase 4: Cozinha prepara)
    -> Garcom entrega
    -> Cliente pode ver status
```

---

## 1. Alteracoes no Banco de Dados (Prisma)

### Novos Enums

```prisma
enum OrderStatus {
  PENDING      // Aguardando confirmacao do garcom
  CONFIRMED    // Garcom confirmou, enviado para preparo
  PREPARING    // Cozinha preparando (Fase 4)
  READY        // Pronto para entrega (Fase 4)
  DELIVERED    // Entregue ao cliente
  CANCELLED    // Cancelado
}
```

### Novos Models

```prisma
model Order {
  id          String      @id @default(cuid())
  table_id    String
  status      OrderStatus @default(PENDING)
  total       Decimal     @db.Decimal(10, 2)
  notes       String?     // Observacoes gerais do pedido
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt
  confirmed_at DateTime?  // Quando garcom confirmou
  delivered_at DateTime?  // Quando foi entregue
  confirmed_by String?    // ID do garcom que confirmou

  table     Table       @relation(fields: [table_id], references: [id], onDelete: Cascade)
  confirmer User?       @relation("ConfirmedBy", fields: [confirmed_by], references: [id])
  items     OrderItem[]

  @@index([table_id])
  @@index([status])
  @@index([created_at])
}

model OrderItem {
  id           String  @id @default(cuid())
  order_id     String
  menu_item_id String
  quantity     Int
  unit_price   Decimal @db.Decimal(10, 2) // Preco no momento do pedido
  notes        String? // Ex: "sem cebola", "bem passado"

  order    Order    @relation(fields: [order_id], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menu_item_id], references: [id])

  @@index([order_id])
}
```

### Alteracoes em Models Existentes

```prisma
// Adicionar em MenuItem
model MenuItem {
  // ... campos existentes ...
  orderItems OrderItem[] // Nova relacao
}

// Adicionar em Table
model Table {
  // ... campos existentes ...
  orders Order[] // Nova relacao
}

// Adicionar em User
model User {
  // ... campos existentes ...
  confirmed_orders Order[] @relation("ConfirmedBy") // Nova relacao
}
```

---

## 2. APIs Necessarias

### 2.1 POST /api/pedidos
**Publico** - Cliente cria pedido

Request:
```json
{
  "tableId": "cuid",
  "items": [
    { "menuItemId": "cuid", "quantity": 2, "notes": "sem cebola" }
  ],
  "notes": "Tenho alergia a amendoim"
}
```

Response:
```json
{
  "id": "cuid",
  "status": "PENDING",
  "total": 89.90,
  "items": [...],
  "created_at": "..."
}
```

Validacoes:
- Mesa existe e esta ativa
- Todos os itens existem e estao ativos
- Quantidade > 0
- Rate limit por mesa (1 pedido a cada 10s)

### 2.2 GET /api/pedidos?tableId=xxx
**Publico** - Cliente ve seus pedidos da mesa

Response:
```json
[
  {
    "id": "cuid",
    "status": "CONFIRMED",
    "total": 89.90,
    "items": [
      {
        "id": "cuid",
        "quantity": 2,
        "unit_price": 29.90,
        "notes": "sem cebola",
        "menuItem": {
          "name_pt": "Hamburguer",
          "image_url": "..."
        }
      }
    ],
    "created_at": "..."
  }
]
```

### 2.3 GET /api/pedidos/stream
**Autenticado (Garcom)** - SSE para pedidos em tempo real

Retorna pedidos com status PENDING ou CONFIRMED em tempo real.

### 2.4 PATCH /api/pedidos/[id]/confirmar
**Autenticado (Garcom)** - Confirma pedido

Response:
```json
{
  "id": "cuid",
  "status": "CONFIRMED",
  "confirmed_at": "...",
  "confirmed_by": "garcom-id"
}
```

### 2.5 PATCH /api/pedidos/[id]/entregar
**Autenticado (Garcom)** - Marca como entregue

### 2.6 PATCH /api/pedidos/[id]/cancelar
**Autenticado (Garcom/Admin)** - Cancela pedido

---

## 3. Componentes do Cliente

### 3.1 CartContext (Novo)
Contexto global para gerenciar o carrinho.

```typescript
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}
```

### 3.2 MenuView (Modificar)
Adicionar botao "+" em cada item para adicionar ao carrinho.

Mudancas:
- Receber `tableId` como prop
- Botao "Adicionar" em cada item
- Badge com quantidade no header
- Botao flutuante "Ver Carrinho" quando tem itens

### 3.3 CartModal (Novo)
Modal para revisar e enviar pedido.

Features:
- Lista de itens com quantidade editavel
- Campo de observacao por item
- Campo de observacao geral
- Total do pedido
- Botao "Enviar Pedido"
- Feedback de sucesso/erro

### 3.4 OrderStatusView (Novo)
Tela para cliente acompanhar status dos pedidos.

Features:
- Lista de pedidos da mesa
- Status visual (cores/icones)
- Timer desde criacao
- Botao "Fazer novo pedido"

### 3.5 ClientTablePage (Modificar)
Adicionar botao "Meus Pedidos" e integrar carrinho.

---

## 4. Componentes do Garcom

### 4.1 OrdersPanel (Novo)
Painel de pedidos em tempo real (similar ao WaiterDashboard).

Features:
- Lista de pedidos PENDING e CONFIRMED
- Ordenado por tempo (mais antigo primeiro)
- Timer por pedido
- Cores de urgencia
- Botao "Confirmar" (PENDING -> CONFIRMED)
- Botao "Entregue" (CONFIRMED -> DELIVERED)
- Expandir para ver itens
- Som de notificacao para novos pedidos

### 4.2 WaiterDashboard (Modificar)
Adicionar tabs ou secao para pedidos.

Opcoes:
A) Tabs: "Chamados" | "Pedidos"
B) Tela unificada com duas secoes
C) Menu lateral para alternar

Recomendacao: Tabs simples

---

## 5. Fluxo de Status

```
PENDING (Cliente enviou)
    |
    v
CONFIRMED (Garcom confirmou)
    |
    v
DELIVERED (Garcom entregou)

A qualquer momento antes de DELIVERED:
    -> CANCELLED (Garcom/Admin cancelou)
```

Nota: PREPARING e READY serao usados na Fase 4 (Cozinha)

---

## 6. Ordem de Implementacao

### Etapa 1: Backend Base
1. [x] Atualizar schema.prisma com novos models
2. [x] Rodar prisma db push
3. [x] Criar POST /api/pedidos
4. [x] Criar GET /api/pedidos?tableId=xxx

### Etapa 2: Cliente - Carrinho
5. [x] Criar CartContext
6. [x] Modificar MenuView para adicionar itens
7. [x] Criar CartModal
8. [x] Integrar carrinho no ClientTablePage

### Etapa 3: Cliente - Acompanhamento
9. [x] Criar OrderStatusView
10. [x] Adicionar botao "Meus Pedidos" no ClientTablePage

### Etapa 4: Garcom - Tempo Real
11. [x] Criar GET /api/pedidos/stream (SSE)
12. [x] Criar PATCH /api/pedidos/[id]/confirmar
13. [x] Criar PATCH /api/pedidos/[id]/entregar
14. [x] Criar PATCH /api/pedidos/[id]/cancelar

### Etapa 5: Garcom - Interface
15. [x] Criar OrdersPanel
16. [x] Adicionar tabs no WaiterDashboard
17. [x] Som de notificacao

### Etapa 6: Traducoes e Polish
18. [x] Adicionar traducoes PT/ES/EN
19. [x] Testar fluxo completo
20. [x] Ajustes de UX

---

## 7. Consideracoes Tecnicas

### Rate Limiting
- Cliente: 1 pedido a cada 10 segundos por mesa
- Prevenir spam de pedidos

### Validacao
- Verificar se mesa esta ativa
- Verificar se itens estao ativos e disponiveis
- Verificar quantidade > 0
- Calcular total no backend (nao confiar no cliente)

### Seguranca
- Pedidos sao publicos (sem auth) - identificados por mesa
- Confirmacao/entrega requerem auth (garcom)
- Cancelamento requer auth (garcom/admin)

### Performance
- SSE com polling 2s (igual chamados)
- Indices no banco para queries frequentes
- Paginacao para historico de pedidos

---

## 8. Estrutura de Arquivos

```
src/
├── app/
│   └── api/
│       └── pedidos/
│           ├── route.ts              # GET (lista) e POST (criar)
│           ├── stream/
│           │   └── route.ts          # SSE tempo real
│           └── [id]/
│               ├── route.ts          # GET pedido especifico
│               ├── confirmar/
│               │   └── route.ts      # PATCH confirmar
│               ├── entregar/
│               │   └── route.ts      # PATCH entregar
│               └── cancelar/
│                   └── route.ts      # PATCH cancelar
├── components/
│   ├── client/
│   │   ├── cart-context.tsx          # Contexto do carrinho
│   │   ├── cart-modal.tsx            # Modal do carrinho
│   │   ├── menu-view.tsx             # (modificar)
│   │   ├── order-status-view.tsx     # Status dos pedidos
│   │   └── client-table-page.tsx     # (modificar)
│   └── waiter/
│       ├── orders-panel.tsx          # Painel de pedidos
│       └── waiter-dashboard.tsx      # (modificar)
└── messages/
    ├── pt.json                       # (adicionar traducoes)
    ├── es.json                       # (adicionar traducoes)
    └── en.json                       # (adicionar traducoes)
```

---

## 9. Metricas (Futuro)

Apos implementar, adicionar metricas:
- Total de pedidos por periodo
- Tempo medio de confirmacao
- Tempo medio de entrega
- Itens mais pedidos
- Ticket medio
- Taxa de cancelamento

---

## 10. Decisoes de Design

### Por que PENDING -> CONFIRMED -> DELIVERED?

1. **PENDING**: Cliente enviou, mas garcom ainda nao viu. Pode haver erro ou mesa errada.

2. **CONFIRMED**: Garcom validou que o pedido faz sentido. Agora vai para preparo.

3. **DELIVERED**: Garcom levou para a mesa. Ciclo completo.

### Por que nao tem "Adicionar ao pedido existente"?

Simplicidade. Cliente pode fazer varios pedidos. Na Fase 4, podemos agrupar por mesa na cozinha.

### Por que armazenar unit_price no OrderItem?

O preco do item pode mudar depois. Guardamos o preco no momento do pedido para historico correto.

---

## Aprovacao

Este plano cobre todos os aspectos da Fase 3.
Apos aprovacao, comecaremos pela Etapa 1 (Backend Base).
