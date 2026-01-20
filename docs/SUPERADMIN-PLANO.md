# Super Admin — Plano e Funcionamento

## Objetivo
Criar um painel Super Admin para controlar tudo o que ja existe hoje, mas no nivel multi-restaurante.

## Escopo (V1)

### 1) Restaurantes
- Criar, editar e desativar restaurantes.
- Campos: nome, slug, dominio, ativo.

### 2) Usuarios por restaurante
- Criar usuarios com roles existentes (ADMIN, MANAGER, WAITER, KITCHEN).
- Reset de senha (opcional).

### 3) Mesas por restaurante
- CRUD de mesas.
- Gerar QR por mesa.

### 4) Cardapio por restaurante
- CRUD de categorias.
- CRUD de itens.

### 5) Operacao
- Chamados e pedidos por restaurante (lista e status).

### 6) Metricas
- Metricas por restaurante.
- Visao agregada (todos os restaurantes).

## Como o painel funciona

- Rota: `/superadmin`.
- Acesso: role `SUPER_ADMIN`.
- Navegacao principal: Restaurantes, Usuarios, Mesas, Cardapio, Operacao, Metricas, Feedbacks.
- Seletor de restaurante fica no topo e aplica `restaurantId` na URL.
- Cada area usa o `restaurantId` para filtrar dados e evitar vazamento entre tenants.

## Fluxos principais

1) Criar restaurante
- Super Admin cria restaurante com nome, slug e dominio.
- Sistema cria settings padrao.

2) Criar admin do restaurante
- Super Admin cria usuario ADMIN vinculado ao restaurante.

3) Gerenciar mesas/cardapio
- Seleciona restaurante.
- CRUD igual ao painel atual, mas filtrado por tenant.

4) Monitorar operacao
- Lista chamados e pedidos por restaurante.
- Filtros por status e periodo.

5) Metricas
- KPIs do restaurante selecionado.
- Comparativo global (agregado).

## Etapas de implementacao

1) Backend
- Adicionar role `SUPER_ADMIN`.
- Criar APIs para CRUD de restaurantes.
- Permitir super admin consultar dados por `restaurant_id`.

2) Frontend
- Criar layout e pages em `/superadmin`.
- Implementar selects de restaurante e telas de cada area.

3) Seguranca
- Middleware bloqueia acesso nao autorizado.
- APIs validam `SUPER_ADMIN`.

4) Migracao
- Atualizar seed para criar um super admin.

## Observacoes
- Mantem o painel atual (admin do restaurante) separado e mais simples.
- Super Admin e exclusivo para operacao SaaS.
