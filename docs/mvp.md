# aiFood — Plano de Desenvolvimento

**Repositório:** https://github.com/MariaEduardaaf/aifood  
**Última atualização:** 2026-01-06

---

## Progresso Geral

| Fase | Status | Descrição |
|------|--------|-----------|
| MVP | ✅ 100% | Chamados + Garçom + Admin |
| Deploy | ⏳ Pendente | Vercel + PostgreSQL |
| Fase 1.5: Google Reviews | ⏳ Pendente | Avaliação inteligente |
| Fase 2: Cardápio Digital | ⏳ Pendente | Menu com fotos |
| Fase 3: Pedidos | ⏳ Pendente | Cliente faz pedido |
| Fase 4: Cozinha | ⏳ Pendente | Painel de preparo |

---

## MVP Completo ✅

### Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS v3, next-intl
- **Backend:** Next.js API Routes, Prisma v5, PostgreSQL
- **Auth:** NextAuth.js v5
- **Tempo Real:** Server-Sent Events (SSE)

### Funcionalidades Entregues

**Cliente (via QR Code)**
- Chamar garçom / Pedir conta
- Rate limit 30s
- i18n (PT/ES/EN)
- Tema premium dark

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
| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@aifood.com | admin123 |
| Garçom | garcom@aifood.com | garcom123 |

### Comandos
```bash
npm run dev          # Desenvolvimento
npm run db:push      # Sync banco
npm run db:seed      # Popular dados
```

---

## Deploy (Pendente)

1. Criar PostgreSQL (Neon/Supabase/Railway)
2. Deploy no Vercel
3. Variáveis: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
4. Rodar `npx prisma db push` e `npm run db:seed`

---

## Fase 1.5: Google Reviews Inteligente

> **Objetivo:** Melhorar reputação online automaticamente

### Fluxo
1. Cliente pede a conta
2. Garçom resolve o chamado
3. Sistema mostra tela de avaliação: "Como foi o atendimento?" (1-5 estrelas)
4. **Nota 4-5:** Redireciona para Google Reviews do restaurante
5. **Nota 1-3:** Feedback privado (não vai pro Google)

### Tarefas
- [ ] Criar model `Rating` no Prisma
- [ ] API POST `/api/avaliacao`
- [ ] Tela de avaliação pós-chamado
- [ ] Config do link Google Reviews por restaurante
- [ ] Métricas de avaliações no admin

### Schema (adicionar)
```prisma
model Rating {
  id          String   @id @default(cuid())
  call_id     String   @unique
  stars       Int      // 1-5
  feedback    String?  // se nota baixa
  redirected  Boolean  @default(false) // foi pro Google?
  created_at  DateTime @default(now())
  
  call Call @relation(fields: [call_id], references: [id])
}
```

---

## Fase 2: Cardápio Digital

> **Objetivo:** Cliente vê o menu pelo celular

### Funcionalidades
- [ ] Categorias (Entradas, Pratos, Bebidas, Sobremesas)
- [ ] Itens com foto, nome, descrição, preço
- [ ] Tradução automática (PT/ES/EN)
- [ ] Admin: CRUD de categorias e itens
- [ ] Upload de imagens

### Schema (adicionar)
```prisma
model Category {
  id         String   @id @default(cuid())
  name_pt    String
  name_es    String
  name_en    String
  order      Int      @default(0)
  active     Boolean  @default(true)
  
  items MenuItem[]
}

model MenuItem {
  id          String   @id @default(cuid())
  category_id String
  name_pt     String
  name_es     String
  name_en     String
  description_pt String?
  description_es String?
  description_en String?
  price       Decimal
  image_url   String?
  active      Boolean  @default(true)
  
  category Category @relation(fields: [category_id], references: [id])
}
```

---

## Fase 3: Pedidos pelo App

> **Objetivo:** Cliente faz pedido sem chamar garçom

### Funcionalidades
- [ ] Cliente adiciona itens ao carrinho
- [ ] Envia pedido
- [ ] Garçom recebe pedido em tempo real
- [ ] Status do pedido (recebido, preparando, pronto, entregue)
- [ ] Histórico de pedidos por mesa

### Schema (adicionar)
```prisma
enum OrderStatus {
  RECEIVED
  PREPARING
  READY
  DELIVERED
}

model Order {
  id         String      @id @default(cuid())
  table_id   String
  status     OrderStatus @default(RECEIVED)
  total      Decimal
  created_at DateTime    @default(now())
  updated_at DateTime    @updatedAt
  
  table Table    @relation(fields: [table_id], references: [id])
  items OrderItem[]
}

model OrderItem {
  id          String @id @default(cuid())
  order_id    String
  menu_item_id String
  quantity    Int
  price       Decimal
  notes       String?
  
  order    Order    @relation(fields: [order_id], references: [id])
  menuItem MenuItem @relation(fields: [menu_item_id], references: [id])
}
```

---

## Fase 4: Painel da Cozinha

> **Objetivo:** Cozinha vê fila de preparo

### Funcionalidades
- [ ] Login role `KITCHEN`
- [ ] Tela `/cozinha` com pedidos em tempo real
- [ ] Botão "Iniciar preparo"
- [ ] Botão "Pronto" → notifica garçom
- [ ] Organização por tempo de espera
- [ ] Som para novo pedido

### Fluxo Completo
```
Cliente faz pedido → Garçom confirma → Cozinha prepara → Garçom entrega
```

---

## Prioridade de Implementação

1. **Deploy** - Colocar MVP no ar
2. **Google Reviews** - Gera valor imediato
3. **Cardápio Digital** - Base para pedidos
4. **Pedidos** - Feature principal
5. **Cozinha** - Completa o ciclo

---

## Métricas de Sucesso

| Fase | Métrica |
|------|---------|
| MVP | Tempo médio de atendimento < 3min |
| Google Reviews | +20% reviews positivas |
| Cardápio | 80% clientes visualizam |
| Pedidos | 50% pedidos via app |
| Cozinha | Tempo preparo rastreado |
