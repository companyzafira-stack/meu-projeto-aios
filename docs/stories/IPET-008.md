---
story_id: IPET-008
status: Pending
epic: Dashboard Pet Shop
priority: Critical
feature_section: F11 (Gestão de Agenda)
acceptance_criteria:
  - Pet shop define horário de funcionamento por dia da semana
  - Configura duração de slot e atendimentos simultâneos
  - Pode bloquear horários de última hora
  - Calendário visual mostra agenda da semana
scope: Both
dependencies:
  - IPET-004
constraints:
  - "Slots em intervalos fixos (30/45/60 min)"
  - "Inatividade 7 dias = alerta, 14 dias = oculto"
estimates_days: 2
---

# Pet Shop Schedule & Slots Management — IPET-008

## Summary
Dashboard para pet shop configurar horário de funcionamento, duração dos slots e capacidade de atendimento simultâneo. Inclui bloqueios de última hora e visualização em calendário.

## User Story
As a pet shop owner,
I want to configure my working hours and appointment slots,
So that tutors can book available times through the app.

## Acceptance Criteria
- [ ] Página "Agenda" com duas seções: Configuração + Visualização
- [ ] **Configuração de Horários:** para cada dia da semana (seg-sáb), definir:
  - Horário de início (ex: 08:00)
  - Horário de fim (ex: 18:00)
  - Toggle ativo/inativo (ex: domingo = inativo)
- [ ] **Configuração de Slots:**
  - Duração do slot: dropdown (30min, 45min, 60min, 90min)
  - Atendimentos simultâneos: input numérico (1-5)
- [ ] **Bloqueio de Horários:** botão "Bloquear Horário" para bloquear data/horário específico
  - Form: data, horário início, horário fim, motivo (opcional)
  - Se houver agendamento no horário bloqueado, mostrar aviso antes de confirmar
- [ ] **Visualização Calendário:** semana atual com slots ocupados vs disponíveis
  - Cores: verde (disponível), azul (agendado), vermelho (bloqueado)
  - Clique no slot mostra detalhes do agendamento (se houver)
- [ ] **Regra de Inatividade:** se pet shop não atualizar slots por 7 dias, campo "última atualização" fica amarelo. Se 14 dias, pet shop fica hidden no app

## Technical Details

### UI Components
```
apps/web/src/app/(dashboard)/agenda/
├── page.tsx              — Container principal (2 seções)
├── components/
│   ├── WeeklyScheduleForm.tsx  — Config horários por dia
│   ├── SlotConfigForm.tsx      — Duração + simultâneos
│   ├── BlockSlotModal.tsx      — Modal para bloquear horário
│   ├── WeekCalendar.tsx        — Calendário visual da semana
│   └── SlotCell.tsx            — Célula individual (disponível/agendado/bloqueado)
```

### Slot Generation Logic
```typescript
// Gerar slots disponíveis para um dia
function generateSlots(schedule, blocks, bookings, date) {
  const slots = [];
  let current = schedule.start_time;

  while (current < schedule.end_time) {
    const slotEnd = addMinutes(current, schedule.slot_duration_minutes);
    const isBlocked = blocks.some(b => overlaps(b, current, slotEnd));
    const bookedCount = bookings.filter(b => overlaps(b, current, slotEnd)).length;
    const isAvailable = !isBlocked && bookedCount < schedule.max_concurrent;

    slots.push({
      start: current,
      end: slotEnd,
      status: isBlocked ? 'blocked' : isAvailable ? 'available' : 'booked',
      bookings: bookings.filter(b => overlaps(b, current, slotEnd)),
    });

    current = slotEnd;
  }
  return slots;
}
```

### Supabase RPC: Available Slots
```sql
-- Function used by mobile app to get available slots for a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_petshop_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  available_spots INT
) AS $$
DECLARE
  v_schedule RECORD;
  v_slot_start TIME;
  v_slot_end TIME;
  v_booked INT;
  v_blocked BOOLEAN;
BEGIN
  SELECT * INTO v_schedule FROM schedules
    WHERE petshop_id = p_petshop_id
    AND day_of_week = EXTRACT(DOW FROM p_date)
    AND is_active = TRUE;

  IF NOT FOUND THEN RETURN; END IF;

  v_slot_start := v_schedule.start_time;
  WHILE v_slot_start < v_schedule.end_time LOOP
    v_slot_end := v_slot_start + (v_schedule.slot_duration_minutes || ' minutes')::INTERVAL;

    SELECT EXISTS(
      SELECT 1 FROM schedule_blocks
      WHERE petshop_id = p_petshop_id AND block_date = p_date
      AND start_time <= v_slot_start AND end_time >= v_slot_end
    ) INTO v_blocked;

    IF NOT v_blocked THEN
      SELECT COUNT(*) INTO v_booked FROM bookings
        WHERE petshop_id = p_petshop_id AND booking_date = p_date
        AND start_time = v_slot_start AND status IN ('confirmed', 'in_progress');

      IF v_booked < v_schedule.max_concurrent THEN
        start_time := v_slot_start;
        end_time := v_slot_end;
        available_spots := v_schedule.max_concurrent - v_booked;
        RETURN NEXT;
      END IF;
    END IF;

    v_slot_start := v_slot_end;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Testing
- [ ] Configurar horário segunda-sábado funciona
- [ ] Domingo desativado não gera slots
- [ ] Duração de slot gera intervalos corretos (60min = 8:00, 9:00, 10:00...)
- [ ] Atendimentos simultâneos permite N bookings no mesmo slot
- [ ] Bloquear horário marca slot como indisponível
- [ ] Bloqueio com agendamento existente mostra aviso
- [ ] Calendário visual mostra cores corretas
- [ ] Function get_available_slots retorna slots corretos

## File List
*Auto-maintained*

## Notes
- Slots são gerados dinamicamente (não armazenados como linhas no banco)
- O banco armazena: horários de funcionamento + bloqueios + bookings
- A function calcula slots disponíveis em real-time
- Considerar timezone (Brasil = UTC-3, Supabase default = UTC)

## Related Stories
- Bloqueada por: IPET-004 (Dashboard Shell)
- Bloqueador para: IPET-010 (Booking Flow)
