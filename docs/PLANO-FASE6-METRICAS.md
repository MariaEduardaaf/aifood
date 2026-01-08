# Plano de Implementacao - Fase 6: Dashboard Admin com Metricas

> **Status:** Concluido  
> **Dependencias:** Fase 5 (UX) concluida  
> **Objetivo:** Fornecer insights em tempo real sobre performance do restaurante

---

## Visao Geral

Implementar um dashboard completo de métricas para o painel administrativo, permitindo que gerentes e administradores acompanhem KPIs do restaurante em tempo real.

---

## 1. Metricas Principais (KPIs)

### 1.1 Metricas de Pedidos

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Total de Pedidos | Quantidade de pedidos no período | COUNT(orders) |
| Pedidos por Status | Distribuição por status | GROUP BY status |
| Ticket Médio | Valor médio por pedido | AVG(total) |
| Receita Total | Faturamento no período | SUM(total) |
| Pedidos por Hora | Distribuição horária | GROUP BY HOUR(created_at) |
| Pedidos por Dia da Semana | Padrão semanal | GROUP BY DAYOFWEEK(created_at) |

### 1.2 Metricas de Tempo

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Tempo Médio de Confirmação | Garçom confirmar pedido | AVG(confirmed_at - created_at) |
| Tempo Médio de Preparo | Cozinha preparar | AVG(ready_at - preparing_at) |
| Tempo Médio Total | Pedido até entrega | AVG(delivered_at - created_at) |
| SLA de Preparo | % pedidos < 15 min | COUNT(< 15min) / COUNT(*) |
| Pedidos Atrasados | % pedidos > 20 min | COUNT(> 20min) / COUNT(*) |

### 1.3 Metricas de Produtos

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Itens Mais Vendidos | Top 10 produtos | GROUP BY menuItem ORDER BY SUM(quantity) |
| Categorias Mais Vendidas | Performance por categoria | GROUP BY category |
| Itens por Pedido | Média de itens | AVG(COUNT(order_items)) |
| Receita por Produto | Faturamento por item | SUM(quantity * unit_price) |

### 1.4 Metricas de Mesas

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Mesas Mais Ativas | Ranking de mesas | GROUP BY table ORDER BY COUNT(orders) |
| Ocupação por Horário | Padrão de uso | Mesas com pedidos ativos por hora |
| Ticket Médio por Mesa | Gasto médio por mesa | AVG(total) GROUP BY table |

### 1.5 Metricas de Atendimento

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Chamados por Tipo | WAITER vs BILL | GROUP BY call_type |
| Tempo Médio de Atendimento | Resposta aos chamados | AVG(resolved_at - created_at) |
| Chamados por Garçom | Performance individual | GROUP BY resolved_by |
| Taxa de Resolução | % chamados resolvidos | COUNT(resolved) / COUNT(*) |

### 1.6 Metricas de Cozinha

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Pedidos por Cozinheiro | Performance individual | GROUP BY prepared_by |
| Tempo Médio por Cozinheiro | Eficiência individual | AVG(ready_at - preparing_at) GROUP BY prepared_by |
| Pedidos Simultâneos | Pico de pedidos em preparo | MAX(COUNT(PREPARING)) |

### 1.7 Metricas de Satisfação

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| Nota Média | Avaliação dos clientes | AVG(rating) |
| Distribuição de Notas | Quantidade por estrela | GROUP BY rating |
| Taxa de Avaliação | % clientes que avaliam | COUNT(ratings) / COUNT(orders) |
| NPS (Net Promoter Score) | Promotores vs Detratores | (9-10) - (1-6) / total |

---

## 2. Estrutura do Banco de Dados

### 2.1 Campos Necessarios (Ja Existentes)

```prisma
model Order {
  id            String       @id @default(cuid())
  status        OrderStatus
  total         Decimal
  created_at    DateTime     @default(now())
  confirmed_at  DateTime?
  preparing_at  DateTime?
  ready_at      DateTime?
  delivered_at  DateTime?    // NOVO - precisa adicionar
  prepared_by   String?
  // ...
}

model Call {
  id           String    @id @default(cuid())
  call_type    CallType
  status       CallStatus
  created_at   DateTime  @default(now())
  resolved_at  DateTime?
  resolved_by  String?
  // ...
}

model Rating {
  id         String   @id @default(cuid())
  stars      Int
  feedback   String?
  created_at DateTime @default(now())
  // ...
}
```

### 2.2 Novo Campo Necessario

Adicionar ao schema.prisma:

```prisma
model Order {
  // ... campos existentes ...
  delivered_at  DateTime?  // Quando foi entregue ao cliente
}
```

---

## 3. APIs de Metricas

### 3.1 GET /api/admin/metricas/resumo

Retorna resumo geral do período selecionado.

**Query Params:**
- `periodo`: today | week | month | custom
- `dataInicio`: ISO date (para custom)
- `dataFim`: ISO date (para custom)

**Response:**
```json
{
  "pedidos": {
    "total": 150,
    "confirmados": 145,
    "cancelados": 5,
    "taxaCancelamento": 3.33,
    "ticketMedio": 89.50,
    "receitaTotal": 13425.00
  },
  "tempos": {
    "mediaConfirmacao": 45,
    "mediaPreparo": 720,
    "mediaTotal": 1200,
    "slaPreparo": 92.5,
    "pedidosAtrasados": 7.5
  },
  "chamados": {
    "total": 85,
    "garcom": 60,
    "conta": 25,
    "tempoMedioAtendimento": 120
  },
  "satisfacao": {
    "notaMedia": 4.5,
    "totalAvaliacoes": 45,
    "taxaAvaliacao": 30
  }
}
```

### 3.2 GET /api/admin/metricas/pedidos/hora

Distribuição de pedidos por hora.

**Response:**
```json
{
  "dados": [
    { "hora": 11, "quantidade": 5, "receita": 450.00 },
    { "hora": 12, "quantidade": 25, "receita": 2250.00 },
    { "hora": 13, "quantidade": 30, "receita": 2700.00 },
    // ...
  ]
}
```

### 3.3 GET /api/admin/metricas/pedidos/dia-semana

Distribuição por dia da semana.

**Response:**
```json
{
  "dados": [
    { "dia": 0, "nome": "Domingo", "quantidade": 80, "receita": 7200.00 },
    { "dia": 1, "nome": "Segunda", "quantidade": 45, "receita": 4050.00 },
    // ...
  ]
}
```

### 3.4 GET /api/admin/metricas/produtos/top

Top produtos mais vendidos.

**Query Params:**
- `limite`: number (default: 10)
- `periodo`: today | week | month

**Response:**
```json
{
  "dados": [
    {
      "id": "cuid",
      "nome": "Picanha Premium",
      "categoria": "Carnes",
      "quantidade": 85,
      "receita": 7650.00,
      "percentual": 15.2
    },
    // ...
  ]
}
```

### 3.5 GET /api/admin/metricas/categorias

Performance por categoria.

**Response:**
```json
{
  "dados": [
    {
      "id": "cuid",
      "nome": "Carnes",
      "pedidos": 120,
      "itens": 250,
      "receita": 22500.00,
      "percentual": 45.0
    },
    // ...
  ]
}
```

### 3.6 GET /api/admin/metricas/mesas

Métricas por mesa.

**Response:**
```json
{
  "dados": [
    {
      "id": "cuid",
      "label": "Mesa 5",
      "pedidos": 25,
      "receita": 2250.00,
      "ticketMedio": 90.00
    },
    // ...
  ]
}
```

### 3.7 GET /api/admin/metricas/equipe/garcons

Performance dos garçons.

**Response:**
```json
{
  "dados": [
    {
      "id": "cuid",
      "nome": "João",
      "chamadosAtendidos": 45,
      "tempoMedioResposta": 95,
      "avaliacaoMedia": 4.7
    },
    // ...
  ]
}
```

### 3.8 GET /api/admin/metricas/equipe/cozinheiros

Performance da cozinha.

**Response:**
```json
{
  "dados": [
    {
      "id": "cuid",
      "nome": "Chef Maria",
      "pedidosPreparados": 85,
      "tempoMedioPreparo": 680,
      "taxaSLA": 95.3
    },
    // ...
  ]
}
```

### 3.9 GET /api/admin/metricas/tempo-real

Dados em tempo real para dashboard.

**Response:**
```json
{
  "pedidosAtivos": {
    "pendentes": 3,
    "confirmados": 5,
    "preparando": 4,
    "prontos": 2
  },
  "chamadosAbertos": 2,
  "mesasOcupadas": 12,
  "ultimosPedidos": [
    { "id": "cuid", "mesa": "Mesa 5", "total": 89.50, "status": "PREPARING", "tempo": 300 }
  ],
  "alertas": [
    { "tipo": "ATRASO", "mensagem": "Pedido Mesa 3 aguardando há 18 min" }
  ]
}
```

### 3.10 GET /api/admin/metricas/comparativo

Comparação entre períodos.

**Query Params:**
- `periodoAtual`: today | week | month
- `periodoAnterior`: yesterday | lastWeek | lastMonth

**Response:**
```json
{
  "atual": {
    "pedidos": 150,
    "receita": 13425.00,
    "ticketMedio": 89.50
  },
  "anterior": {
    "pedidos": 130,
    "receita": 11050.00,
    "ticketMedio": 85.00
  },
  "variacao": {
    "pedidos": 15.38,
    "receita": 21.49,
    "ticketMedio": 5.29
  }
}
```

---

## 4. Componentes do Dashboard

### 4.1 Estrutura de Paginas

```
src/app/(dashboard)/admin/
├── page.tsx                    # Dashboard principal (existente - modificar)
├── metricas/
│   ├── page.tsx               # Página de métricas detalhadas
│   ├── pedidos/
│   │   └── page.tsx           # Análise detalhada de pedidos
│   ├── produtos/
│   │   └── page.tsx           # Análise de produtos
│   ├── equipe/
│   │   └── page.tsx           # Performance da equipe
│   └── satisfacao/
│       └── page.tsx           # Métricas de satisfação
```

### 4.2 Componentes de Metricas

```
src/components/admin/metrics/
├── metrics-overview.tsx        # Cards de resumo (KPIs principais)
├── metrics-charts.tsx          # Gráficos gerais
├── orders-by-hour-chart.tsx    # Gráfico de pedidos por hora
├── orders-by-day-chart.tsx     # Gráfico por dia da semana
├── top-products-chart.tsx      # Top produtos (bar chart)
├── categories-chart.tsx        # Categorias (pie/donut chart)
├── time-metrics-card.tsx       # Tempos médios
├── team-performance.tsx        # Performance da equipe
├── real-time-panel.tsx         # Painel tempo real
├── comparison-card.tsx         # Comparativo de períodos
├── alerts-panel.tsx            # Alertas e notificações
├── date-range-picker.tsx       # Seletor de período
└── export-button.tsx           # Exportar dados (CSV/PDF)
```

### 4.3 MetricsOverview Component

Arquivo: `src/components/admin/metrics/metrics-overview.tsx`

```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType;
  color: "gold" | "green" | "red" | "blue";
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10`}>
          <Icon className={`h-6 w-6 text-${color}-500`} />
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {change >= 0 ? <TrendingUp /> : <TrendingDown />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
      {changeLabel && (
        <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
      )}
    </div>
  );
}

export function MetricsOverview({ data, periodo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total de Pedidos"
        value={data.pedidos.total}
        change={data.variacao?.pedidos}
        changeLabel="vs período anterior"
        icon={ShoppingBag}
        color="gold"
      />
      <MetricCard
        title="Receita Total"
        value={`R$ ${data.pedidos.receitaTotal.toLocaleString()}`}
        change={data.variacao?.receita}
        icon={DollarSign}
        color="green"
      />
      <MetricCard
        title="Ticket Médio"
        value={`R$ ${data.pedidos.ticketMedio.toFixed(2)}`}
        change={data.variacao?.ticketMedio}
        icon={Receipt}
        color="blue"
      />
      <MetricCard
        title="Avaliação Média"
        value={data.satisfacao.notaMedia.toFixed(1)}
        icon={Star}
        color="gold"
      />
    </div>
  );
}
```

### 4.4 OrdersByHourChart Component

Arquivo: `src/components/admin/metrics/orders-by-hour-chart.tsx`

```typescript
"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OrdersByHourData {
  hora: number;
  quantidade: number;
  receita: number;
}

export function OrdersByHourChart({ data }: { data: OrdersByHourData[] }) {
  const chartData = useMemo(() => {
    // Preencher todas as horas (0-23)
    const fullData = Array.from({ length: 24 }, (_, i) => {
      const found = data.find((d) => d.hora === i);
      return {
        hora: `${i.toString().padStart(2, "0")}:00`,
        quantidade: found?.quantidade || 0,
        receita: found?.receita || 0,
      };
    });
    return fullData;
  }, [data]);

  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Pedidos por Hora</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="hora"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              stroke="hsl(38 92% 50%)"
              fill="url(#colorQtd)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.5 TopProductsChart Component

Arquivo: `src/components/admin/metrics/top-products-chart.tsx`

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopProductData {
  nome: string;
  quantidade: number;
  receita: number;
}

export function TopProductsChart({ data }: { data: TopProductData[] }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Top 10 Produtos</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              type="category"
              dataKey="nome"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={120}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                name === "quantidade" ? `${value} vendidos` : `R$ ${value.toFixed(2)}`,
                name === "quantidade" ? "Quantidade" : "Receita",
              ]}
            />
            <Bar dataKey="quantidade" fill="hsl(38 92% 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.6 CategoriesChart Component

Arquivo: `src/components/admin/metrics/categories-chart.tsx`

```typescript
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(38 92% 50%)",   // Gold
  "hsl(142 76% 36%)",  // Green
  "hsl(217 91% 60%)",  // Blue
  "hsl(0 84% 60%)",    // Red
  "hsl(280 65% 60%)",  // Purple
  "hsl(45 93% 47%)",   // Yellow
  "hsl(180 65% 45%)",  // Cyan
  "hsl(320 65% 52%)",  // Pink
];

interface CategoryData {
  nome: string;
  receita: number;
  percentual: number;
}

export function CategoriesChart({ data }: { data: CategoryData[] }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Receita por Categoria</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="receita"
              nameKey="nome"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
              paddingAngle={2}
              label={({ nome, percentual }) => `${percentual.toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={entry.nome} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `R$ ${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.7 TimeMetricsCard Component

Arquivo: `src/components/admin/metrics/time-metrics-card.tsx`

```typescript
"use client";

import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeMetrics {
  mediaConfirmacao: number;  // segundos
  mediaPreparo: number;      // segundos
  mediaTotal: number;        // segundos
  slaPreparo: number;        // percentual
  pedidosAtrasados: number;  // percentual
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function TimeMetricsCard({ data }: { data: TimeMetrics }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Tempos de Atendimento
      </h3>

      <div className="space-y-4">
        {/* Tempo de Confirmação */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confirmação</span>
          <span className="font-mono font-medium">
            {formatTime(data.mediaConfirmacao)}
          </span>
        </div>

        {/* Tempo de Preparo */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Preparo</span>
          <span className="font-mono font-medium">
            {formatTime(data.mediaPreparo)}
          </span>
        </div>

        {/* Tempo Total */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <span className="text-sm font-medium">Tempo Total</span>
          <span className="font-mono font-bold text-lg">
            {formatTime(data.mediaTotal)}
          </span>
        </div>

        {/* SLA */}
        <div className="mt-4 p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              SLA (&lt; 15 min)
            </span>
            <span className={cn(
              "font-bold",
              data.slaPreparo >= 90 ? "text-green-500" :
              data.slaPreparo >= 75 ? "text-yellow-500" : "text-red-500"
            )}>
              {data.slaPreparo.toFixed(1)}%
            </span>
          </div>

          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                data.slaPreparo >= 90 ? "bg-green-500" :
                data.slaPreparo >= 75 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${data.slaPreparo}%` }}
            />
          </div>
        </div>

        {/* Pedidos Atrasados */}
        {data.pedidosAtrasados > 5 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {data.pedidosAtrasados.toFixed(1)}% dos pedidos atrasados
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.8 TeamPerformance Component

Arquivo: `src/components/admin/metrics/team-performance.tsx`

```typescript
"use client";

import { User, ChefHat, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaiterData {
  id: string;
  nome: string;
  chamadosAtendidos: number;
  tempoMedioResposta: number;
  avaliacaoMedia: number;
}

interface ChefData {
  id: string;
  nome: string;
  pedidosPreparados: number;
  tempoMedioPreparo: number;
  taxaSLA: number;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function TeamPerformance({
  garcons,
  cozinheiros,
}: {
  garcons: WaiterData[];
  cozinheiros: ChefData[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Garçons */}
      <div className="card-premium p-6 rounded-xl">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Performance dos Garçons
        </h3>

        <div className="space-y-3">
          {garcons.map((garcom, index) => (
            <div
              key={garcom.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 ? "bg-yellow-500 text-yellow-950" :
                  index === 1 ? "bg-gray-400 text-gray-950" :
                  index === 2 ? "bg-amber-600 text-amber-950" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                <span className="font-medium">{garcom.nome}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold">{garcom.chamadosAtendidos}</p>
                  <p className="text-xs text-muted-foreground">chamados</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{formatTime(garcom.tempoMedioResposta)}</p>
                  <p className="text-xs text-muted-foreground">tempo médio</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{garcom.avaliacaoMedia.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cozinheiros */}
      <div className="card-premium p-6 rounded-xl">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          Performance da Cozinha
        </h3>

        <div className="space-y-3">
          {cozinheiros.map((chef, index) => (
            <div
              key={chef.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 ? "bg-yellow-500 text-yellow-950" :
                  index === 1 ? "bg-gray-400 text-gray-950" :
                  index === 2 ? "bg-amber-600 text-amber-950" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                <span className="font-medium">{chef.nome}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold">{chef.pedidosPreparados}</p>
                  <p className="text-xs text-muted-foreground">pedidos</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{formatTime(chef.tempoMedioPreparo)}</p>
                  <p className="text-xs text-muted-foreground">tempo médio</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-bold",
                  chef.taxaSLA >= 90 ? "bg-green-500/20 text-green-500" :
                  chef.taxaSLA >= 75 ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {chef.taxaSLA.toFixed(0)}% SLA
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4.9 RealTimePanel Component

Arquivo: `src/components/admin/metrics/real-time-panel.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealTimeData {
  pedidosAtivos: {
    pendentes: number;
    confirmados: number;
    preparando: number;
    prontos: number;
  };
  chamadosAbertos: number;
  mesasOcupadas: number;
  alertas: Array<{
    tipo: string;
    mensagem: string;
  }>;
}

export function RealTimePanel() {
  const [data, setData] = useState<RealTimeData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/metricas/tempo-real");
      if (res.ok) {
        setData(await res.json());
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Atualiza a cada 5s

    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const totalPedidosAtivos =
    data.pedidosAtivos.pendentes +
    data.pedidosAtivos.confirmados +
    data.pedidosAtivos.preparando +
    data.pedidosAtivos.prontos;

  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-500 animate-pulse" />
        Tempo Real
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-yellow-500/10">
          <p className="text-2xl font-bold text-yellow-500">
            {data.pedidosAtivos.pendentes}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-500/10">
          <p className="text-2xl font-bold text-blue-500">
            {data.pedidosAtivos.confirmados}
          </p>
          <p className="text-xs text-muted-foreground">Confirmados</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-500/10">
          <p className="text-2xl font-bold text-orange-500">
            {data.pedidosAtivos.preparando}
          </p>
          <p className="text-xs text-muted-foreground">Preparando</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-500/10">
          <p className="text-2xl font-bold text-green-500">
            {data.pedidosAtivos.prontos}
          </p>
          <p className="text-xs text-muted-foreground">Prontos</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{data.mesasOcupadas}</strong> mesas ocupadas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{data.chamadosAbertos}</strong> chamados abertos
          </span>
        </div>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="space-y-2">
          {data.alertas.map((alerta, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{alerta.mensagem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.10 DateRangePicker Component

Arquivo: `src/components/admin/metrics/date-range-picker.tsx`

```typescript
"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "today" | "yesterday" | "week" | "month" | "custom";

interface DateRangePickerProps {
  value: Period;
  onChange: (period: Period, dates?: { start: Date; end: Date }) => void;
}

const PERIODS = [
  { value: "today" as const, label: "Hoje" },
  { value: "yesterday" as const, label: "Ontem" },
  { value: "week" as const, label: "Esta Semana" },
  { value: "month" as const, label: "Este Mês" },
  { value: "custom" as const, label: "Personalizado" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = PERIODS.find((p) => p.value === value)?.label || "Selecionar";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedLabel}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 z-50 w-48 p-2 rounded-xl bg-card border border-border shadow-xl">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => {
                  onChange(period.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  value === period.value
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### 4.11 ExportButton Component

Arquivo: `src/components/admin/metrics/export-button.tsx`

```typescript
"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  onExport: (format: "csv" | "pdf") => void;
}

export function ExportButton({ onExport }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="text-sm font-medium">Exportar</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 z-50 w-40 p-2 rounded-xl bg-card border border-border shadow-xl">
            <button
              onClick={() => {
                onExport("csv");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel (CSV)
            </button>
            <button
              onClick={() => {
                onExport("pdf");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 5. Biblioteca de Graficos

### 5.1 Dependencia

Instalar Recharts (biblioteca de gráficos para React):

```bash
npm install recharts
```

### 5.2 Tipos para Recharts

Adicionar em `src/types/recharts.d.ts`:

```typescript
declare module 'recharts' {
  export * from 'recharts';
}
```

---

## 6. Traducoes

### 6.1 Adicionar em messages/pt.json

```json
{
  "metrics": {
    "title": "Métricas",
    "overview": "Visão Geral",
    "orders": "Pedidos",
    "products": "Produtos",
    "team": "Equipe",
    "satisfaction": "Satisfação",
    "realTime": "Tempo Real",
    "totalOrders": "Total de Pedidos",
    "totalRevenue": "Receita Total",
    "avgTicket": "Ticket Médio",
    "avgRating": "Avaliação Média",
    "ordersByHour": "Pedidos por Hora",
    "ordersByDay": "Pedidos por Dia",
    "topProducts": "Produtos Mais Vendidos",
    "categories": "Categorias",
    "timeMetrics": "Tempos de Atendimento",
    "confirmationTime": "Tempo de Confirmação",
    "preparationTime": "Tempo de Preparo",
    "totalTime": "Tempo Total",
    "sla": "SLA",
    "delayedOrders": "Pedidos Atrasados",
    "teamPerformance": "Performance da Equipe",
    "waiters": "Garçons",
    "kitchen": "Cozinha",
    "callsHandled": "Chamados Atendidos",
    "avgResponseTime": "Tempo Médio de Resposta",
    "ordersHandled": "Pedidos Preparados",
    "avgPrepTime": "Tempo Médio de Preparo",
    "pending": "Pendentes",
    "confirmed": "Confirmados",
    "preparing": "Preparando",
    "ready": "Prontos",
    "occupiedTables": "Mesas Ocupadas",
    "openCalls": "Chamados Abertos",
    "alerts": "Alertas",
    "today": "Hoje",
    "yesterday": "Ontem",
    "thisWeek": "Esta Semana",
    "thisMonth": "Este Mês",
    "custom": "Personalizado",
    "export": "Exportar",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs período anterior",
    "noData": "Sem dados para o período selecionado"
  }
}
```

### 6.2 Adicionar em messages/es.json

```json
{
  "metrics": {
    "title": "Métricas",
    "overview": "Visión General",
    "orders": "Pedidos",
    "products": "Productos",
    "team": "Equipo",
    "satisfaction": "Satisfacción",
    "realTime": "Tiempo Real",
    "totalOrders": "Total de Pedidos",
    "totalRevenue": "Ingresos Totales",
    "avgTicket": "Ticket Promedio",
    "avgRating": "Calificación Promedio",
    "ordersByHour": "Pedidos por Hora",
    "ordersByDay": "Pedidos por Día",
    "topProducts": "Productos Más Vendidos",
    "categories": "Categorías",
    "timeMetrics": "Tiempos de Atención",
    "confirmationTime": "Tiempo de Confirmación",
    "preparationTime": "Tiempo de Preparación",
    "totalTime": "Tiempo Total",
    "sla": "SLA",
    "delayedOrders": "Pedidos Retrasados",
    "teamPerformance": "Rendimiento del Equipo",
    "waiters": "Camareros",
    "kitchen": "Cocina",
    "callsHandled": "Llamadas Atendidas",
    "avgResponseTime": "Tiempo Promedio de Respuesta",
    "ordersHandled": "Pedidos Preparados",
    "avgPrepTime": "Tiempo Promedio de Preparación",
    "pending": "Pendientes",
    "confirmed": "Confirmados",
    "preparing": "Preparando",
    "ready": "Listos",
    "occupiedTables": "Mesas Ocupadas",
    "openCalls": "Llamadas Abiertas",
    "alerts": "Alertas",
    "today": "Hoy",
    "yesterday": "Ayer",
    "thisWeek": "Esta Semana",
    "thisMonth": "Este Mes",
    "custom": "Personalizado",
    "export": "Exportar",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs período anterior",
    "noData": "Sin datos para el período seleccionado"
  }
}
```

### 6.3 Adicionar em messages/en.json

```json
{
  "metrics": {
    "title": "Metrics",
    "overview": "Overview",
    "orders": "Orders",
    "products": "Products",
    "team": "Team",
    "satisfaction": "Satisfaction",
    "realTime": "Real Time",
    "totalOrders": "Total Orders",
    "totalRevenue": "Total Revenue",
    "avgTicket": "Average Ticket",
    "avgRating": "Average Rating",
    "ordersByHour": "Orders by Hour",
    "ordersByDay": "Orders by Day",
    "topProducts": "Top Selling Products",
    "categories": "Categories",
    "timeMetrics": "Service Times",
    "confirmationTime": "Confirmation Time",
    "preparationTime": "Preparation Time",
    "totalTime": "Total Time",
    "sla": "SLA",
    "delayedOrders": "Delayed Orders",
    "teamPerformance": "Team Performance",
    "waiters": "Waiters",
    "kitchen": "Kitchen",
    "callsHandled": "Calls Handled",
    "avgResponseTime": "Avg Response Time",
    "ordersHandled": "Orders Handled",
    "avgPrepTime": "Avg Prep Time",
    "pending": "Pending",
    "confirmed": "Confirmed",
    "preparing": "Preparing",
    "ready": "Ready",
    "occupiedTables": "Occupied Tables",
    "openCalls": "Open Calls",
    "alerts": "Alerts",
    "today": "Today",
    "yesterday": "Yesterday",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "custom": "Custom",
    "export": "Export",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs last period",
    "noData": "No data for selected period"
  }
}
```

---

## 7. Ordem de Implementacao

### Etapa 1: Banco de Dados (1 tarefa)
1. [ ] Adicionar campo `delivered_at` ao modelo Order no schema.prisma

### Etapa 2: APIs de Metricas (10 tarefas)
2. [ ] Criar `GET /api/admin/metricas/resumo`
3. [ ] Criar `GET /api/admin/metricas/pedidos/hora`
4. [ ] Criar `GET /api/admin/metricas/pedidos/dia-semana`
5. [ ] Criar `GET /api/admin/metricas/produtos/top`
6. [ ] Criar `GET /api/admin/metricas/categorias`
7. [ ] Criar `GET /api/admin/metricas/mesas`
8. [ ] Criar `GET /api/admin/metricas/equipe/garcons`
9. [ ] Criar `GET /api/admin/metricas/equipe/cozinheiros`
10. [ ] Criar `GET /api/admin/metricas/tempo-real`
11. [ ] Criar `GET /api/admin/metricas/comparativo`

### Etapa 3: Dependencias (1 tarefa)
12. [ ] Instalar `recharts` e adicionar tipos

### Etapa 4: Componentes Base (4 tarefas)
13. [ ] Criar `date-range-picker.tsx`
14. [ ] Criar `export-button.tsx`
15. [ ] Criar `metrics-overview.tsx`
16. [ ] Criar `time-metrics-card.tsx`

### Etapa 5: Componentes de Graficos (4 tarefas)
17. [ ] Criar `orders-by-hour-chart.tsx`
18. [ ] Criar `orders-by-day-chart.tsx`
19. [ ] Criar `top-products-chart.tsx`
20. [ ] Criar `categories-chart.tsx`

### Etapa 6: Componentes de Equipe e Tempo Real (3 tarefas)
21. [ ] Criar `team-performance.tsx`
22. [ ] Criar `real-time-panel.tsx`
23. [ ] Criar `alerts-panel.tsx`

### Etapa 7: Paginas (2 tarefas)
24. [ ] Atualizar pagina principal do admin com metricas
25. [ ] Criar pagina `/admin/metricas` com dashboard completo

### Etapa 8: Traducoes e Testes (3 tarefas)
26. [ ] Adicionar traducoes de metrics em PT/ES/EN
27. [ ] Testar todas as APIs
28. [ ] Testar todos os componentes

---

## 8. Estrutura de Arquivos (Novos)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       ├── page.tsx                    # Modificar
│   │       └── metricas/
│   │           └── page.tsx                # NOVO
│   └── api/
│       └── admin/
│           └── metricas/
│               ├── resumo/
│               │   └── route.ts            # NOVO
│               ├── pedidos/
│               │   ├── hora/
│               │   │   └── route.ts        # NOVO
│               │   └── dia-semana/
│               │       └── route.ts        # NOVO
│               ├── produtos/
│               │   └── top/
│               │       └── route.ts        # NOVO
│               ├── categorias/
│               │   └── route.ts            # NOVO
│               ├── mesas/
│               │   └── route.ts            # NOVO
│               ├── equipe/
│               │   ├── garcons/
│               │   │   └── route.ts        # NOVO
│               │   └── cozinheiros/
│               │       └── route.ts        # NOVO
│               ├── tempo-real/
│               │   └── route.ts            # NOVO
│               └── comparativo/
│                   └── route.ts            # NOVO
└── components/
    └── admin/
        └── metrics/
            ├── metrics-overview.tsx        # NOVO
            ├── time-metrics-card.tsx       # NOVO
            ├── orders-by-hour-chart.tsx    # NOVO
            ├── orders-by-day-chart.tsx     # NOVO
            ├── top-products-chart.tsx      # NOVO
            ├── categories-chart.tsx        # NOVO
            ├── team-performance.tsx        # NOVO
            ├── real-time-panel.tsx         # NOVO
            ├── alerts-panel.tsx            # NOVO
            ├── date-range-picker.tsx       # NOVO
            └── export-button.tsx           # NOVO
```

---

## 9. Consideracoes Tecnicas

### 9.1 Performance

- Usar `useMemo` para cálculos pesados de métricas
- Implementar cache nas APIs (revalidate a cada 1 minuto)
- Usar `React.lazy` para carregar componentes de gráficos
- Limitar período máximo de consulta (90 dias)

### 9.2 Seguranca

- Todas as APIs protegidas para ADMIN e MANAGER
- Validar datas de entrada
- Sanitizar parâmetros de query

### 9.3 Mobile

- Gráficos responsivos com `ResponsiveContainer`
- Cards em grid adaptável (1 coluna em mobile)
- Touch-friendly para seleção de período

### 9.4 Acessibilidade

- Cores com contraste adequado
- Labels em gráficos
- Tooltips descritivos

---

## 10. Exportacao de Dados

### 10.1 CSV

```typescript
function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) => Object.values(row).join(","));
  const csv = [headers, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}
```

### 10.2 PDF (usando jsPDF)

```bash
npm install jspdf jspdf-autotable
```

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  autoTable(doc, {
    head: [Object.keys(data[0])],
    body: data.map((row) => Object.values(row)),
    startY: 30,
  });

  doc.save(`${title}.pdf`);
}
```

---

## 11. Mockup do Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Métricas                        [Hoje ▼]  [Exportar ▼]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ 🛒 150      │ │ 💰 R$13.4k  │ │ 🎫 R$89.50  │ │ ⭐ 4.5      ││
│  │ Pedidos     │ │ Receita     │ │ Ticket Médio│ │ Avaliação   ││
│  │ ↑ 15.4%     │ │ ↑ 21.5%     │ │ ↑ 5.3%      │ │             ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 📈 Pedidos por Hora         │ │ 🥧 Categorias               ││
│  │                             │ │                             ││
│  │     ▄▄▄▄▄▄▄                 │ │      ████  Carnes 45%      ││
│  │   ▄▄█████████▄▄             │ │    ██░░██  Bebidas 25%     ││
│  │ ▄▄██████████████▄▄          │ │   ██░░░░██ Sobremesas 15%  ││
│  │ ─────────────────────       │ │   ██░░░░░░██ Outros 15%    ││
│  │ 09 10 11 12 13 14 15 16     │ │                             ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 🏆 Top Produtos              │ │ ⏱️ Tempos                   ││
│  │                             │ │                             ││
│  │ 1. Picanha Premium ████ 85  │ │ Confirmação:     45s       ││
│  │ 2. Cerveja Artesa  ███  72  │ │ Preparo:         12m       ││
│  │ 3. Petit Gateau    ██   58  │ │ Total:           20m       ││
│  │ 4. Costela BBQ     ██   45  │ │ ──────────────────────     ││
│  │ 5. Caipirinha      █    38  │ │ SLA (< 15min):   92.5%     ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👥 Performance da Equipe                                    │ │
│  │                                                              │ │
│  │ Garçons                      │ Cozinha                      │ │
│  │ ─────────────────────────────┼─────────────────────────────│ │
│  │ 🥇 João   45 chamados  ⭐4.7 │ 🥇 Maria  85 pedidos  95% SLA│ │
│  │ 🥈 Pedro  38 chamados  ⭐4.5 │ 🥈 Carlos 72 pedidos  92% SLA│ │
│  │ 🥉 Ana    32 chamados  ⭐4.8 │ 🥉 José   65 pedidos  88% SLA│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⚡ Tempo Real                                               │ │
│  │                                                              │ │
│  │ [3 Pend] [5 Conf] [4 Prep] [2 Prontos]  🪑 12 mesas  📞 2  │ │
│  │                                                              │ │
│  │ ⚠️ Pedido Mesa 3 aguardando há 18 min                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Aprovacao

Este plano cobre todas as métricas e componentes necessários para um dashboard administrativo completo.

Total de tarefas: 28
Dependências: recharts, jspdf (opcional)

Pronto para implementação após aprovação.
