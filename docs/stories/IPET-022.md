---
story_id: IPET-022
status: Pending
epic: App Tutor
priority: Critical
feature_section: F5 (Cancelamento e Reembolso)
acceptance_criteria:
  - Tutor pode cancelar agendamento conforme política
  - Reembolso automático via Mercado Pago API
  - Pet shop pode cancelar (100% reembolso)
  - Política exibida claramente antes de cancelar
scope: Both
dependencies:
  - IPET-011
  - IPET-012
constraints:
  - "Reembolso 100% automático via API"
  - "Política: >12h=100%, 2-12h=50%, <2h=0%"
estimates_days: 2
---

# Cancellation & Refund System — IPET-022

## Summary
Sistema de cancelamento e reembolso automático seguindo a política definida no PRD. Reembolsos processados via API Mercado Pago sem intervenção manual.

## User Story
As a tutor,
I want to cancel a booking and receive an automatic refund based on the cancellation policy,
So that I feel safe booking services knowing I can cancel if needed.

## Acceptance Criteria
- [ ] **App tutor:** botão "Cancelar Agendamento" disponível em bookings com status 'confirmed'
- [ ] Ao tocar, modal mostra política:
  - "Mais de 12h antes: reembolso integral (100%)"
  - "Entre 2h e 12h antes: reembolso parcial (50%)"
  - "Menos de 2h ou não comparecimento: sem reembolso"
- [ ] Calcula automaticamente qual regra se aplica baseado no horário atual vs horário do booking
- [ ] Mostra valor exato do reembolso antes de confirmar
- [ ] Após confirmar: booking.status = 'cancelled', booking.cancelled_by = 'tutor'
- [ ] Reembolso processado automaticamente via Mercado Pago Refund API
  - Pix: instantâneo
  - Cartão: 7-15 dias úteis (informar ao tutor)
- [ ] Push ao tutor: "Agendamento cancelado. Reembolso de R$ XX processado."
- [ ] Push ao pet shop: "Agendamento cancelado pelo tutor. Slot liberado."
- [ ] **Dashboard pet shop:** botão "Cancelar" em qualquer booking
  - Pet shop cancela → 100% reembolso ao tutor (sempre)
  - Motivo obrigatório
  - Push ao tutor: "Pet shop cancelou. Reembolso integral processado." + sugestão de alternativas
- [ ] **Contagem de cancelamentos:** pet shop com 3+ cancelamentos em 30 dias recebe alerta

## Technical Details

### Cancellation Policy Logic
```typescript
function calculateRefund(bookingDate: string, bookingTime: string, totalAmount: number) {
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
  const now = new Date();
  const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 12) return { percent: 100, amount: totalAmount, rule: '>12h' };
  if (hoursUntil > 2)  return { percent: 50,  amount: totalAmount * 0.5, rule: '2-12h' };
  return { percent: 0, amount: 0, rule: '<2h' };
}
```

### Mercado Pago Refund
```typescript
async function processRefund(paymentId: string, amount: number) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }), // partial or full
    }
  );
  return response.json();
}
```

### Cancel Booking (Server-side)
```typescript
// API route: POST /api/bookings/[id]/cancel
async function cancelBooking(bookingId, cancelledBy, reason?) {
  const booking = await getBooking(bookingId);
  const refund = cancelledBy === 'petshop'
    ? { percent: 100, amount: booking.total_amount }
    : calculateRefund(booking.booking_date, booking.start_time, booking.total_amount);

  // Process refund
  if (refund.amount > 0 && booking.payment_id) {
    await processRefund(booking.payment_id, refund.amount);
  }

  // Update booking
  await supabase.from('bookings').update({
    status: 'cancelled',
    cancelled_by: cancelledBy,
    cancelled_at: new Date().toISOString(),
    refund_amount: refund.amount,
  }).eq('id', bookingId);

  // Send notifications
  await sendPushNotification(booking.tutor_id, 'Agendamento cancelado', `Reembolso de R$ ${refund.amount}`);
  if (cancelledBy === 'tutor') {
    await sendPushNotification(petshopOwnerId, 'Agendamento cancelado pelo tutor', 'Slot liberado');
  }
}
```

## Testing
- [ ] Cancelar >12h antes: 100% reembolso
- [ ] Cancelar 2-12h antes: 50% reembolso
- [ ] Cancelar <2h antes: 0% reembolso
- [ ] Pet shop cancela: sempre 100% reembolso
- [ ] Reembolso processado via API Mercado Pago
- [ ] Push enviado a ambas as partes
- [ ] Booking status atualizado para 'cancelled'
- [ ] Slot liberado no calendário
- [ ] Contagem de cancelamentos do pet shop funciona

## File List
*Auto-maintained*

## Notes
- Mercado Pago Refund API: POST /v1/payments/{id}/refunds
- Refund parcial: enviar campo `amount` com valor parcial
- Pix refund é instantâneo, cartão segue prazo da bandeira
- Timezone: calcular horas baseado em BRT (UTC-3)

## Related Stories
- Bloqueada por: IPET-011 (Pagamento), IPET-012 (Confirmation)
- Relacionada: IPET-023 (No-Show)
