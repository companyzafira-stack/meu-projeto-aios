---
story_id: IPET-014
status: Pending
epic: Dashboard Pet Shop
priority: High
feature_section: F12 (Gestão de Agendamentos)
acceptance_criteria:
  - Lista de agendamentos por status em tabs
  - Botões de ação: iniciar, concluir, cancelar
  - Atualização em tempo real via Supabase Realtime
scope: Frontend
dependencies:
  - IPET-012
constraints:
  - "Status machine: confirmed → in_progress → completed"
  - "Supabase Realtime para updates sem refresh"
estimates_days: 3
---

# Booking Status Management (Dashboard) — IPET-014

## Summary
Página do dashboard para pet shop gerenciar todos os agendamentos. Tabs por status, botões de ação para mudar status, e atualização em tempo real.

## User Story
As a pet shop owner,
I want to see and manage all my bookings in one place,
So that I can track my daily operations efficiently.

## Acceptance Criteria
- [ ] Página "Agendamentos" com tabs: Hoje, Próximos, Concluídos, Cancelados
- [ ] Card de agendamento: nome do tutor, pet(s), serviço(s), data/hora, status, valor
- [ ] **Tab Hoje:** agendamentos do dia atual, ordenados por horário
- [ ] **Ações por status:**
  - `confirmed` → botão "Iniciar Atendimento" → muda para `in_progress` + push tutor
  - `in_progress` → botão "Concluir" (requer foto upload IPET-015) → muda para `completed`
  - Qualquer status → botão "Cancelar" → motivo obrigatório → reembolso + push tutor
- [ ] Novo agendamento aparece em tempo real (sem refresh) via Supabase Realtime
- [ ] Filtro por data (date picker)
- [ ] Detalhes do agendamento: clique expande card com info completa
- [ ] Contadores no header: "X agendamentos hoje | Y em andamento"

## Technical Details

### Supabase Realtime Subscription
```typescript
// Listen for new/updated bookings
useEffect(() => {
  const channel = supabase
    .channel('bookings-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `petshop_id=eq.${petshopId}`,
    }, (payload) => {
      // Refresh bookings list
      refetchBookings();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [petshopId]);
```

### Status Machine
```typescript
const validTransitions = {
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
  no_show: [],   // terminal (set by system)
};
```

### UI Structure
```
apps/web/src/app/(dashboard)/agendamentos/
├── page.tsx              — Container com tabs
├── components/
│   ├── BookingTabs.tsx    — Hoje | Próximos | Concluídos | Cancelados
│   ├── BookingCard.tsx    — Card com info + botões de ação
│   ├── BookingDetail.tsx  — Detalhes expandidos
│   ├── StatusBadge.tsx    — Badge colorido por status
│   ├── ActionButtons.tsx  — Iniciar | Concluir | Cancelar
│   └── DateFilter.tsx     — Filtro por data
```

## Testing
- [ ] Tabs mostram bookings filtrados corretamente
- [ ] "Iniciar Atendimento" muda status e envia push
- [ ] "Cancelar" exige motivo e processa reembolso
- [ ] Novo booking aparece em tempo real (sem refresh)
- [ ] Filtro por data funciona
- [ ] Contadores atualizam corretamente
- [ ] Status badge mostra cor correta
- [ ] Transições inválidas são bloqueadas

## File List
*Auto-maintained*

## Notes
- Supabase Realtime: billing based on connections (free tier = 200 concurrent)
- Usar optimistic updates para UX responsiva
- Cancelar pelo pet shop → sempre 100% reembolso ao tutor

## Related Stories
- Bloqueada por: IPET-012 (Confirmation)
- Bloqueador para: IPET-015 (Photos), IPET-016 (Reviews)
