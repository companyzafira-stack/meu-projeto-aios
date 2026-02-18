---
story_id: IPET-017
status: Pending
epic: Dashboard Pet Shop
priority: Medium
feature_section: F13 (Financeiro)
acceptance_criteria:
  - Dashboard financeiro com ganhos por período
  - Lista de transações com comissão IPET
  - Cards de resumo (total, ticket médio, bookings)
scope: Frontend
dependencies:
  - IPET-011
constraints:
  - "Dados de pagamento vêm do banco + Mercado Pago"
estimates_days: 2
---

# Pet Shop Financial Dashboard — IPET-017

## Summary
Página financeira no dashboard do pet shop mostrando ganhos, transações e métricas de receita.

## User Story
As a pet shop owner,
I want to see my earnings and transaction history,
So that I can track my business performance on IPET.

## Acceptance Criteria
- [ ] Página "Financeiro" com 3 cards no topo: Ganhos Hoje, Ganhos Semana, Ganhos Mês
- [ ] Valores mostram valor líquido (após comissão IPET de 10%)
- [ ] Tabela de transações: data, tutor, serviço(s), valor bruto, comissão (10%), valor líquido, status pagamento
- [ ] Filtro por período (últimos 7 dias, 30 dias, custom)
- [ ] Card resumo: total de bookings no período, receita total, ticket médio
- [ ] Link externo para dashboard Mercado Pago (detalhes financeiros avançados)
- [ ] Estado vazio: "Nenhuma transação no período selecionado"

## Technical Details

### Query
```typescript
const { data } = await supabase
  .from('bookings')
  .select('*, booking_items(*, services(name), pets(name)), profiles!tutor_id(display_name)')
  .eq('petshop_id', petshopId)
  .in('status', ['completed', 'confirmed', 'in_progress'])
  .gte('booking_date', startDate)
  .lte('booking_date', endDate)
  .order('booking_date', { ascending: false });
```

### Calculations
```typescript
const grossRevenue = bookings.reduce((sum, b) => sum + b.total_amount, 0);
const commission = grossRevenue * 0.10;
const netRevenue = grossRevenue - commission;
const avgTicket = grossRevenue / bookings.length;
```

### UI Structure
```
apps/web/src/app/(dashboard)/financeiro/
├── page.tsx
└── components/
    ├── RevenueCards.tsx       — 3 cards (hoje, semana, mês)
    ├── TransactionTable.tsx   — Tabela com detalhes
    ├── DateRangeFilter.tsx    — Seletor de período
    └── SummaryCard.tsx        — Total bookings, receita, ticket médio
```

## Testing
- [ ] Cards mostram valores corretos
- [ ] Comissão de 10% calculada corretamente
- [ ] Filtro por período funciona
- [ ] Transações ordenadas por data (mais recente primeiro)
- [ ] Estado vazio aparece quando não há transações
- [ ] Link para Mercado Pago funciona

## File List
*Auto-maintained*

## Related Stories
- Bloqueada por: IPET-011 (Mercado Pago)
