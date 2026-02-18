---
story_id: IPET-023
status: Pending
epic: App Tutor
priority: High
feature_section: F5.2 (No-Show Policy)
acceptance_criteria:
  - No-show registrado quando booking não é atendido
  - Contagem de no-shows por tutor
  - Penalidade progressiva aplicada automaticamente
  - Tutor notificado sobre consequências
scope: Both
dependencies:
  - IPET-012
constraints:
  - "1-2 no-shows: aviso. 3+: restrição 48h antecedência"
  - "Reset de contagem após 90 dias sem no-show"
estimates_days: 1
---

# No-Show Policy & Penalties — IPET-023

## Summary
Sistema de detecção e penalização de no-show (tutor que não comparece). Contagem progressiva com penalidades automáticas para reduzir taxa de não-comparecimento.

## User Story
As a pet shop owner,
I want tutors who don't show up to face progressive consequences,
So that my time slots are respected and my business isn't harmed.

## Acceptance Criteria
- [ ] **Detecção de no-show:** pet shop marca booking como "no-show" via dashboard (botão em bookings com status 'confirmed' após horário passar)
- [ ] Booking atualizado: `status = 'no_show'`, `no_show_at = timestamp`
- [ ] **Sem reembolso:** no-show = 0% reembolso (conforme política de cancelamento <2h)
- [ ] **Contagem por tutor:** campo `no_show_count` no profile (últimos 90 dias)
- [ ] **Penalidades progressivas:**
  - 1º no-show: Push "Você não compareceu. Próximo no-show terá consequências."
  - 2º no-show: Push "2º não-comparecimento. Próximo resultará em restrição."
  - 3º+ no-show: Restrição ativada — tutor só pode agendar com 48h+ de antecedência
- [ ] **Restrição de agendamento:** quando `no_show_count >= 3`, bloquear slots com menos de 48h
  - Mensagem: "Devido a não-comparecimentos, agendamentos requerem 48h de antecedência."
- [ ] **Reset automático:** após 90 dias sem novo no-show, contador volta a 0
- [ ] Push ao tutor quando marcado no-show: "Você não compareceu ao agendamento em [Pet Shop]. Isso foi registrado."
- [ ] Push ao pet shop: "No-show registrado. Slot liberado."

## Technical Details

### No-Show Detection
```typescript
// API route: POST /api/bookings/[id]/no-show
async function markNoShow(bookingId: string, petshopId: string) {
  const booking = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('petshop_id', petshopId)
    .eq('status', 'confirmed')
    .single();

  if (!booking.data) throw new Error('Booking não encontrado ou já processado');

  // Verify booking time has passed
  const bookingTime = new Date(`${booking.data.booking_date}T${booking.data.start_time}`);
  if (new Date() < bookingTime) throw new Error('Horário do booking ainda não passou');

  // Update booking
  await supabase.from('bookings').update({
    status: 'no_show',
    no_show_at: new Date().toISOString(),
  }).eq('id', bookingId);

  // Increment tutor no-show count
  await supabase.rpc('increment_no_show_count', { tutor_id: booking.data.tutor_id });

  // Get updated count for penalty logic
  const { data: profile } = await supabase
    .from('profiles')
    .select('no_show_count')
    .eq('id', booking.data.tutor_id)
    .single();

  // Send appropriate notification
  await sendNoShowNotification(booking.data.tutor_id, profile.no_show_count);
}
```

### No-Show Count (Supabase RPC)
```sql
-- Function to increment and manage no-show count
CREATE OR REPLACE FUNCTION increment_no_show_count(tutor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    no_show_count = COALESCE(no_show_count, 0) + 1,
    last_no_show_at = NOW()
  WHERE id = tutor_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset no-show count (run via pg_cron daily)
CREATE OR REPLACE FUNCTION reset_old_no_shows()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET no_show_count = 0, last_no_show_at = NULL
  WHERE no_show_count > 0
    AND last_no_show_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

### Booking Restriction Check
```typescript
// In booking flow (IPET-010), before confirming slot selection
function canBookSlot(tutorProfile: Profile, slotDateTime: Date): boolean {
  if (tutorProfile.no_show_count >= 3) {
    const hoursUntilSlot = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilSlot < 48) {
      return false; // Restricted: must book 48h+ in advance
    }
  }
  return true;
}
```

### Penalty Notifications
```typescript
async function sendNoShowNotification(tutorId: string, count: number) {
  const messages: Record<number, string> = {
    1: 'Você não compareceu ao agendamento. Próximo no-show terá consequências.',
    2: '2º não-comparecimento registrado. Próximo resultará em restrição de agendamento.',
  };

  const message = count >= 3
    ? `${count}º não-comparecimento. Seus agendamentos agora requerem 48h de antecedência.`
    : messages[count] || messages[1];

  await sendPushNotification(tutorId, 'Não-comparecimento registrado', message);
}
```

## Testing
- [ ] Pet shop consegue marcar no-show em booking passado
- [ ] Não consegue marcar no-show em booking futuro
- [ ] Contador de no-show incrementa corretamente
- [ ] 1º no-show: aviso enviado, sem restrição
- [ ] 2º no-show: aviso mais forte enviado
- [ ] 3º+ no-show: restrição de 48h ativada
- [ ] Tutor restrito não consegue agendar slots <48h
- [ ] Reset após 90 dias funciona
- [ ] Push notifications enviadas corretamente

## File List
*Auto-maintained*

## Notes
- No-show count é baseado em janela rolante de 90 dias
- Pet shop só pode marcar no-show APÓS horário do booking passar
- No-show = sem reembolso (alinhado com política de cancelamento <2h)
- Considerar: auto-detect no-show se pet shop não marcar "em andamento" em 30min

## Related Stories
- Bloqueada por: IPET-012 (Confirmation/Payment)
- Relacionada: IPET-022 (Cancelamento/Reembolso)
