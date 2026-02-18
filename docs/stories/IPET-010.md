---
story_id: IPET-010
status: Pending
epic: App Tutor
priority: Critical
feature_section: F4 (Agendamento)
acceptance_criteria:
  - Tutor seleciona 1+ pets e serviço para cada
  - Calendário mostra slots disponíveis
  - Slots consecutivos reservados para multi-pet
  - Resumo com preço total e tempo estimado
  - Botão "Agendar e Pagar" leva ao checkout
scope: Both
dependencies:
  - IPET-008
  - IPET-009
constraints:
  - "Usar RPC get_available_slots do IPET-008"
  - "Modelo carrinho: 1 booking com N booking_items"
  - "Não finalizar pagamento nesta story (IPET-011)"
estimates_days: 3
---

# Service Selection & Slot Booking Flow — IPET-010

## Summary
Fluxo completo de agendamento no app: selecionar pets, escolher serviços para cada um, ver calendário de slots disponíveis, e revisar resumo antes do pagamento.

## User Story
As a tutor,
I want to select my pets, choose services, pick a time slot, and review the booking,
So that I can proceed to payment and confirm the appointment.

## Acceptance Criteria
- [ ] **Step 1 — Selecionar Pets:** lista de pets do tutor com checkbox. Selecionar 1 ou mais
- [ ] **Step 2 — Escolher Serviços:** para cada pet selecionado, escolher serviço principal + add-ons opcionais
  - Preço atualiza conforme porte do pet
  - Add-ons (hidratação, tosa de unha) são toggles opcionais
- [ ] **Step 3 — Escolher Data:** calendário com próximos 14 dias. Dias sem slots disponíveis estão desabilitados
- [ ] **Step 4 — Escolher Horário:** lista de slots disponíveis para o dia selecionado
  - Para multi-pet, mostra apenas horários com slots consecutivos suficientes
  - Ex: 2 pets × 60min = precisa de 2 slots consecutivos de 60min
- [ ] **Step 5 — Resumo:** tela com todas as informações:
  - Pet shop: nome e endereço
  - Pets: nome + serviço + preço de cada um
  - Data e horário
  - Desconto multi-pet (se aplicável)
  - Preço total
  - Tempo total estimado
  - Política de cancelamento (texto resumido)
- [ ] Botão "Agendar e Pagar → R$ XX" navega para checkout (IPET-011/012)
- [ ] Booking é criado no banco com status 'pending_payment'

## Technical Details

### Booking Flow (5 Steps)
```
SelectPetsStep → SelectServicesStep → SelectDateStep → SelectTimeStep → ReviewStep → Checkout
```

### Multi-Pet Consecutive Slots
```typescript
// Calcular slots consecutivos necessários
function getConsecutiveSlots(availableSlots, totalDuration, slotDuration) {
  const slotsNeeded = Math.ceil(totalDuration / slotDuration);
  const validStarts = [];

  for (let i = 0; i <= availableSlots.length - slotsNeeded; i++) {
    const group = availableSlots.slice(i, i + slotsNeeded);
    const isConsecutive = group.every((slot, idx) => {
      if (idx === 0) return true;
      return slot.start_time === group[idx - 1].end_time;
    });
    if (isConsecutive) validStarts.push(group[0]);
  }
  return validStarts;
}
```

### Create Booking (pre-payment)
```typescript
async function createBooking(tutorId, petshopId, date, startTime, endTime, items, totalAmount) {
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      tutor_id: tutorId,
      petshop_id: petshopId,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      status: 'pending_payment',
      total_amount: totalAmount,
    })
    .select()
    .single();

  const bookingItems = items.map(item => ({
    booking_id: booking.id,
    pet_id: item.petId,
    service_id: item.serviceId,
    price: item.price,
    duration_minutes: item.duration,
  }));

  await supabase.from('booking_items').insert(bookingItems);
  return booking;
}
```

### Screen Structure
```
src/screens/booking/
├── BookingFlowScreen.tsx      — Container (step navigation)
├── steps/
│   ├── SelectPetsStep.tsx     — Lista de pets com checkbox
│   ├── SelectServicesStep.tsx — Serviço + add-ons por pet
│   ├── SelectDateStep.tsx     — Calendário 14 dias
│   ├── SelectTimeStep.tsx     — Slots disponíveis
│   └── ReviewStep.tsx         — Resumo final
├── components/
│   ├── PetCheckbox.tsx
│   ├── ServiceSelector.tsx
│   ├── DateCalendar.tsx
│   ├── TimeSlotList.tsx
│   ├── BookingSummary.tsx
│   └── CancellationPolicy.tsx
└── hooks/
    └── useBookingFlow.ts      — State management do fluxo
```

## Testing
- [ ] Selecionar 1 pet e 1 serviço funciona
- [ ] Selecionar 2 pets com serviços diferentes funciona
- [ ] Preço calculado corretamente por porte
- [ ] Add-ons adicionam ao preço total
- [ ] Desconto multi-pet aplicado corretamente (se configurado)
- [ ] Calendário mostra apenas dias com slots disponíveis
- [ ] Multi-pet mostra apenas slots com espaço consecutivo
- [ ] Resumo mostra todos os dados corretos
- [ ] Booking criado com status pending_payment
- [ ] Booking items criados com referência correta (pet + serviço)
- [ ] Back navigation funciona entre steps
- [ ] Validação: ao menos 1 pet selecionado, serviço obrigatório

## File List
*Auto-maintained*

## Notes
- State do fluxo: usar React Context ou Zustand (não prop drilling)
- Timeout: booking pending_payment por mais de 15min deve ser auto-cancelado (cron job ou Supabase function)
- Animação de transição entre steps para UX fluida
- Preço em centavos no cálculo, formatado em reais na UI

## Related Stories
- Bloqueada por: IPET-008 (Slots), IPET-009 (Profile)
- Bloqueador para: IPET-011 (Pagamento), IPET-012 (Confirmation)
