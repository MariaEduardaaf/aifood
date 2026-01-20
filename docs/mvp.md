# aiFood — Plano de Desenvolvimento

**Repositório:** https://github.com/MariaEduardaaf/aifood  
**Última atualização:** 2026-01-20

---

## Progresso Geral

| Fase | Status | Descrição |
|------|--------|-----------|
| MVP | ✅ 100% | Chamados + Garçom + Admin |
| Fase 1.5: Google Reviews | ✅ 100% | Avaliação inteligente |
| Fase 2: Cardápio Digital | ✅ 100% | Menu com fotos |
| Fase 3: Pedidos | ✅ 100% | Cliente faz pedido |
| Fase 4: Cozinha | ✅ 100% | Painel de preparo |
| Deploy | ⏳ Pendente | Vercel + PostgreSQL |

---

## Stack Tecnológica

| Aspecto | Tecnologia |
|---------|------------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Banco de Dados | PostgreSQL + Prisma v5 |
| Autenticação | NextAuth.js v5 (JWT + Credentials) |
| UI/Styling | Tailwind CSS v3 |
| Ícones | Lucide React |
| Internacionalização | next-intl (PT/ES/EN) |
| Validação | Zod |
| Tempo Real | Server-Sent Events (SSE) |
| Upload Imagens | Cloudinary |
| QR Codes | qrcode library |

---

## MVP Completo ✅

### Funcionalidades Entregues

**Cliente (via QR Code)**
- Chamar garçom / Pedir conta
- Rate limit 30s
- i18n (PT/ES/EN)
- Tema premium dark
- Interface 100% responsiva

**Garçom**
- Painel tempo real (SSE 2s)
- Timer por chamado
- Cores por urgência
- Som de notificação

**Admin**
- CRUD Mesas + QR Code
- CRUD Usuários + Gerar senha
- Métricas (SLA, rankings, gráficos)

### Credenciais de Teste

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Admin | admin@aifood.com | admin123 | ADMIN |
| Garçom | garcom@aifood.com | garcom123 | WAITER |

### Comandos

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run db:push      # Sync banco
npm run db:seed      # Popular dados
npm run db:studio    # Prisma Studio
```

---

## Fase 1.5: Google Reviews Inteligente ✅

> **Status:** 100% Implementado

### Fluxo Implementado
1. Cliente pede a conta
2. Garçom resolve o chamado
3. Sistema mostra modal de avaliação: "Como foi o atendimento?" (1-5 estrelas)
4. **Nota 4-5:** Redireciona para Google Reviews do restaurante
5. **Nota 1-3:** Feedback privado (salvo no banco, não vai pro Google)

### Funcionalidades
- [x] Model `Rating` no Prisma
- [x] API POST `/api/avaliacao`
- [x] API GET `/api/avaliacao?callId=xxx` (verificar se já avaliou)
- [x] Modal de avaliação (`rating-modal.tsx`)
- [x] Configuração do link Google Reviews por restaurante
- [x] Página de configurações no admin (`/admin/configuracoes`)
- [x] Métricas de avaliações no dashboard

### Schema Implementado
```prisma
model Rating {
  id          String   @id @default(cuid())
  call_id     String   @unique
  stars       Int      // 1-5
  feedback    String?  // comentário se nota baixa
  redirected  Boolean  @default(false)
  created_at  DateTime @default(now())
  
  call Call @relation(fields: [call_id], references: [id], onDelete: Cascade)
}

model Settings {
  id                  String  @id @default(cuid())
  google_reviews_url  String?
  min_stars_redirect  Int     @default(4)
  updated_at          DateTime @updatedAt
}
```

---

## Fase 2: Cardápio Digital ✅

> **Status:** 100% Implementado

### Funcionalidades
- [x] Categorias (Entradas, Pratos, Bebidas, Sobremesas)
- [x] Itens com foto, nome, descrição, preço
- [x] Tradução trilíngue (PT/ES/EN)
- [x] Admin: CRUD completo de categorias
- [x] Admin: CRUD completo de itens
- [x] Upload de imagens (Cloudinary)
- [x] Ordenação de categorias
- [x] Ativar/desativar categorias e itens
- [x] Filtro por categoria na visualização

### APIs Implementadas
- `GET /api/cardapio` - Menu público com categorias e itens
- `GET/POST /api/categorias` - CRUD categorias
- `GET/PATCH/DELETE /api/categorias/[id]` - Operações por ID
- `GET/POST /api/itens` - CRUD itens
- `GET/PATCH/DELETE /api/itens/[id]` - Operações por ID
- `POST /api/upload` - Upload de imagens (Cloudinary)

### Schema Implementado
```prisma
model Category {
  id        String   @id @default(cuid())
  name_pt   String
  name_es   String
  name_en   String
  order     Int      @default(0)
  active    Boolean  @default(true)
  
  items MenuItem[]
}

model MenuItem {
  id             String   @id @default(cuid())
  category_id    String
  name_pt        String
  name_es        String
  name_en        String
  description_pt String?
  description_es String?
  description_en String?
  price          Decimal  @db.Decimal(10, 2)
  image_url      String?
  active         Boolean  @default(true)
  
  category   Category    @relation(fields: [category_id], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
}
```

---

## Fase 3: Pedidos pelo App ✅

> **Status:** 100% Implementado

### Funcionalidades
- [x] Cliente adiciona itens ao carrinho
- [x] Carrinho com Context API (`cart-context.tsx`)
- [x] Modal do carrinho com resumo (`cart-modal.tsx`)
- [x] Observações por item e por pedido
- [x] Enviar pedido (rate limit 10s)
- [x] Garçom recebe pedido em tempo real (SSE)
- [x] Tabs no painel do garçom (Chamados | Pedidos)
- [x] Status do pedido (PENDING → CONFIRMED → DELIVERED)
- [x] Cliente acompanha status em tempo real
- [x] Histórico de pedidos por mesa
- [x] Cancelar pedido

### APIs Implementadas
- `GET /api/pedidos?tableId=xxx` - Listar pedidos da mesa
- `POST /api/pedidos` - Criar pedido (rate limit 10s)
- `GET /api/pedidos/stream` - SSE tempo real
- `PATCH /api/pedidos/[id]/confirmar` - Garçom confirma
- `PATCH /api/pedidos/[id]/entregar` - Garçom entrega
- `PATCH /api/pedidos/[id]/cancelar` - Cancelar pedido

### Fluxo de Status
```
PENDING (Cliente enviou)
    ↓
CONFIRMED (Garçom confirmou)
    ↓
PREPARING (Cozinha preparando - Fase 4)
    ↓
READY (Pronto para entrega - Fase 4)
    ↓
DELIVERED (Entregue ao cliente)

A qualquer momento: → CANCELLED
```

### Schema Implementado
```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  DELIVERED
  CANCELLED
}

model Order {
  id           String      @id @default(cuid())
  table_id     String
  status       OrderStatus @default(PENDING)
  total        Decimal     @db.Decimal(10, 2)
  notes        String?
  created_at   DateTime    @default(now())
  updated_at   DateTime    @updatedAt
  confirmed_at DateTime?
  delivered_at DateTime?
  confirmed_by String?

  table     Table       @relation(fields: [table_id], references: [id], onDelete: Cascade)
  confirmer User?       @relation("ConfirmedBy", fields: [confirmed_by], references: [id])
  items     OrderItem[]
}

model OrderItem {
  id           String  @id @default(cuid())
  order_id     String
  menu_item_id String
  quantity     Int
  unit_price   Decimal @db.Decimal(10, 2)
  notes        String?

  order    Order    @relation(fields: [order_id], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menu_item_id], references: [id])
}
```

---

## Deploy (Pendente)

### Requisitos
1. PostgreSQL na nuvem (Neon/Supabase/Railway)
2. Conta Cloudinary para imagens
3. Conta Vercel para deploy

### Variáveis de Ambiente
```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="gerar-com-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="https://seu-dominio.vercel.app"
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="sua-api-key"
CLOUDINARY_API_SECRET="seu-api-secret"
```

### Passos para Deploy
1. Criar banco PostgreSQL (recomendado: Neon)
2. Conectar repositório ao Vercel
3. Configurar variáveis de ambiente
4. Deploy automático
5. Rodar `npx prisma db push`
6. Rodar `npm run db:seed` (opcional)

---

## Fase 4: Painel da Cozinha ✅

> **Status:** 100% Implementado

### Objetivo
Cozinha vê fila de preparo e atualiza status dos pedidos.

### Funcionalidades Implementadas
- [x] Role `KITCHEN` adicionado ao enum
- [x] Página `/cozinha` criada
- [x] Componente `KitchenPanel` com layout Kanban
- [x] Visualizar pedidos CONFIRMED, PREPARING, READY
- [x] Botão "Iniciar preparo" → status PREPARING
- [x] Botão "Pronto" → status READY → notifica garçom
- [x] Organização por tempo de espera (mais antigo primeiro)
- [x] Som para novo pedido
- [x] Cores de urgência (verde → amarelo → vermelho)
- [x] Traduções PT/ES/EN

### Fluxo Completo (com Cozinha)
```
Cliente faz pedido (PENDING)
    ↓
Garçom confirma (CONFIRMED)
    ↓
Cozinha inicia preparo (PREPARING)
    ↓
Cozinha finaliza (READY)
    ↓
Garçom entrega (DELIVERED)
```

### Modificações Necessárias

Nenhuma. Implementacao concluida.

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── cardapio/
│   │   │   ├── configuracoes/
│   │   │   ├── mesas/
│   │   │   ├── metricas/
│   │   │   └── usuarios/
│   │   └── garcom/
│   ├── (public)/mesa/[token]/
│   └── api/
│       ├── auth/
│       ├── avaliacao/
│       ├── cardapio/
│       ├── categorias/
│       ├── chamados/
│       ├── itens/
│       ├── mesas/
│       ├── metricas/
│       ├── pedidos/
│       ├── settings/
│       ├── upload/
│       └── usuarios/
├── components/
│   ├── admin/
│   ├── client/
│   ├── waiter/
│   └── ui/
├── lib/
│   ├── auth/
│   ├── db/
│   └── i18n/
├── messages/ (pt.json, es.json, en.json)
└── middleware.ts
```

---

## Métricas de Sucesso

| Fase | Métrica | Alvo |
|------|---------|------|
| MVP | Tempo médio de atendimento | < 3min |
| Google Reviews | Aumento de reviews positivas | +20% |
| Cardápio | Clientes que visualizam | 80% |
| Pedidos | Pedidos via app | 50% |
| Cozinha | Tempo de preparo rastreado | 100% |

---

## Próximos Passos

### Prioridade 1: Deploy
- Configurar banco de dados na nuvem
- Deploy no Vercel
- Testar em ambiente de produção

### Prioridade 2: Melhorias
- Redis para rate limiting em produção
- WebSockets para melhor performance
- Push notifications
- Relatórios avançados
- Multi-restaurante
