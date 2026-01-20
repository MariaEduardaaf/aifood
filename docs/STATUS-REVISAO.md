# Status da Aplicacao (Codigo)

Atualizado em: 2026-01-20

## Fluxos por role (estado atual)

### Cliente (QR / Mesa)
- Acesso: `/mesa/[token]` valida mesa por `qr_token`.
- Acoes: chamar garcom, pedir conta, ver cardapio, carrinho e status de pedidos.
- Arquivos:
  - `app/src/app/(public)/mesa/[token]/page.tsx`
  - `app/src/components/client/client-table-page.tsx`
  - `app/src/components/client/menu-view.tsx`
  - `app/src/components/client/cart-modal.tsx`
  - `app/src/components/client/order-status-view.tsx`

### Garcom
- Login em `/login` e acesso a `/garcom`.
- Chamados via SSE e resolucao.
- Pedidos via SSE com confirmar/cancelar/entregar.
- Arquivos:
  - `app/src/app/(dashboard)/garcom/page.tsx`
  - `app/src/components/waiter/waiter-page.tsx`
  - `app/src/components/waiter/waiter-dashboard.tsx`
  - `app/src/components/waiter/orders-kanban.tsx`

### Cozinha
- Login e acesso a `/cozinha`.
- Kanban/lista de pedidos confirmados/preparando/prontos.
- Acoes: iniciar preparo e marcar pronto.
- Arquivos:
  - `app/src/app/(dashboard)/cozinha/page.tsx`
  - `app/src/components/kitchen/kitchen-page.tsx`
  - `app/src/components/kitchen/kitchen-kanban.tsx`
  - `app/src/components/kitchen/kitchen-panel.tsx`

### Admin/Gerente
- Login e acesso a `/admin` (redir para `/admin/mesas`).
- CRUD mesas, usuarios, cardapio, metricas, feedbacks, configuracoes.
- Arquivos:
  - `app/src/app/(dashboard)/admin/page.tsx`
  - `app/src/components/admin/dashboard-nav.tsx`
  - `app/src/components/admin/metrics-dashboard.tsx`

## Checklist de deploy/producao

### Infra
- PostgreSQL (Neon/Supabase/Railway)
- Vercel
- Cloudinary

### Variaveis de ambiente
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Passos
- `npm run build`
- `npx prisma db push`
- `npm run db:seed` (opcional)

## Riscos/bugs potenciais

1) Rotas publicas bloqueadas pelo middleware (corrigido)
- Ajustado para liberar `/api/cardapio`, `/api/pedidos` e `/api/avaliacao` publicamente.
- Arquivo: `app/src/middleware.ts`

2) Garcom faz fetch de `/api/pedidos` sem `tableId` (corrigido)
- Endpoint agora aceita uso autenticado sem `tableId` e retorna pedidos ativos.
- Arquivos:
  - `app/src/components/waiter/waiter-page.tsx`
  - `app/src/app/api/pedidos/route.ts`

3) Permissao frouxa nas acoes de pedidos (corrigido)
- `confirmar`, `entregar`, `cancelar` agora exigem role de garcom/admin/manager.
- Arquivos:
  - `app/src/app/api/pedidos/[id]/confirmar/route.ts`
  - `app/src/app/api/pedidos/[id]/entregar/route.ts`
  - `app/src/app/api/pedidos/[id]/cancelar/route.ts`

4) Entrega permite status nao esperado (corrigido)
- `entregar` agora aceita apenas `READY`.
- Arquivo: `app/src/app/api/pedidos/[id]/entregar/route.ts`
