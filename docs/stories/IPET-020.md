---
story_id: IPET-020
status: Pending
epic: Painel Admin
priority: Medium
feature_section: F17 (Dashboard de Métricas)
acceptance_criteria:
  - Dashboard com KPIs principais
  - Gráficos de tendência
  - Rankings de pet shops e tutores
scope: Frontend
dependencies:
  - IPET-012
constraints:
  - "Queries agregadas no Supabase"
  - "Charts com Recharts ou Chart.js"
estimates_days: 2
---

# Admin — Metrics Dashboard — IPET-020

## Summary
Dashboard de métricas para o admin acompanhar a saúde da plataforma: agendamentos, receita, taxas de cancelamento/no-show, rankings.

## User Story
As the IPET admin,
I want to see platform-wide metrics and trends,
So that I can make data-driven decisions about the business.

## Acceptance Criteria
- [ ] Página `/admin/metricas` com cards de KPIs:
  - Total de agendamentos (hoje / semana / mês)
  - Receita total de comissões (10% de cada booking)
  - Taxa de cancelamento (% do total)
  - Taxa de no-show (% do total)
  - Pet shops ativos
  - Tutores cadastrados
- [ ] Gráfico de linha: agendamentos por dia (últimos 30 dias)
- [ ] Gráfico de linha: receita por semana (últimos 3 meses)
- [ ] Rankings:
  - Top 5 pet shops por agendamentos
  - Top 5 tutores mais ativos
  - Top 5 pet shops por nota média
- [ ] Filtro por período (7d, 30d, 90d, custom)

## Technical Details

### Aggregate Queries
```typescript
// Total bookings by period
const { count } = await supabaseAdmin
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startDate)
  .in('status', ['confirmed', 'completed', 'in_progress']);

// Cancellation rate
const { count: cancelled } = await supabaseAdmin
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'cancelled')
  .gte('created_at', startDate);

const cancellationRate = (cancelled / total) * 100;
```

### Charts (Recharts)
```bash
npm install recharts --workspace=web
```

### UI Structure
```
apps/web/src/app/(admin)/metricas/
├── page.tsx
└── components/
    ├── KPICards.tsx          — 6 cards de métricas
    ├── BookingsChart.tsx     — Gráfico agendamentos/dia
    ├── RevenueChart.tsx      — Gráfico receita/semana
    ├── RankingTable.tsx      — Rankings top 5
    └── PeriodFilter.tsx      — Filtro de período
```

## Testing
- [ ] KPIs mostram valores corretos
- [ ] Gráficos renderizam com dados reais
- [ ] Rankings ordenados corretamente
- [ ] Filtro de período atualiza todos os dados
- [ ] Zero data mostra estado vazio

## File List
*Auto-maintained*

## Related Stories
- Bloqueada por: IPET-012 (dados de bookings necessários)
