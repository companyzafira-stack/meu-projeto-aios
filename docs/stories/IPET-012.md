---
story_id: IPET-012
status: Pending
epic: App Tutor
priority: Critical
feature_section: F5 (Pagamento) + F4 (Agendamento)
acceptance_criteria:
  - Tutor taps "Agendar e Pagar" and is redirected to Mercado Pago checkout
  - After payment approved booking status changes to confirmed
  - Tutor receives push notification confirming booking
  - Pet shop receives push notification for new booking
  - Failed payment shows error and allows retry
  - Booking with pending_payment >15min auto-cancels
scope: Both
dependencies:
  - IPET-011
constraints:
  - "Mercado Pago checkout via WebBrowser (Expo)"
  - "Webhook must validate payment before confirming"
  - "Auto-cancel pending bookings after 15 minutes"
estimates_days: 2
---

# Booking Confirmation & Payment Flow — IPET-012

## Summary
Fluxo completo de pagamento no app mobile. Após a tela de resumo (IPET-010), o tutor é redirecionado ao checkout do Mercado Pago. Após pagamento aprovado, o status do booking muda para 'confirmed' e notificações push são enviadas ao tutor e ao pet shop.

## User Story
As a tutor,
I want to complete the payment for my booking through Mercado Pago,
So that my appointment is confirmed and both I and the pet shop are notified.

## Acceptance Criteria
- [ ] **Checkout Redirect:** Tutor taps "Agendar e Pagar" → redirected to Mercado Pago checkout (WebBrowser)
  - Loading indicator shown while preference is being created
  - Checkout opens in in-app browser (Expo WebBrowser)
- [ ] **Payment Success:** After payment approved → booking status = 'confirmed'
  - Webhook validates payment → updates booking status
  - Tutor is redirected back to app with success screen
- [ ] **Tutor Notification:** Push notification: "Agendamento confirmado! [Pet Name] em [Pet Shop] dia [Date] as [Time]"
- [ ] **Pet Shop Notification:** Push notification: "Novo agendamento recebido! [Tutor Name] - [Service] - [Date] [Time]"
- [ ] **Payment Receipt:** In-app receipt screen showing:
  - Booking ID
  - Pet shop name
  - Service(s) and pet(s)
  - Date and time
  - Payment method (Pix/Credit card)
  - Total paid
  - Status: Confirmado
- [ ] **Payment Failure:** Failed payment shows clear error message
  - "Pagamento nao aprovado. Tente novamente ou use outro metodo."
  - "Tentar Novamente" button recreates preference and redirects
  - "Cancelar" button cancels the booking
- [ ] **Auto-Cancel:** Booking with status 'pending_payment' for >15 minutes is automatically cancelled
  - Supabase cron function or Edge Function checks every 5 minutes
  - Cancelled bookings release the reserved time slots
  - Tutor receives push: "Seu agendamento expirou. Agende novamente."

## Technical Details

### Payment Flow Sequence
```
ReviewStep → "Agendar e Pagar" tap
  → Create booking (status: pending_payment) [IPET-010]
  → Create MP payment preference [IPET-011]
  → Open MP checkout via WebBrowser
  → Tutor completes payment on MP
  → MP redirects back to app (deep link)
  → Webhook fires → validates payment
  → Update booking status → confirmed
  → Send push notifications (tutor + pet shop)
  → Show success screen with receipt
```

### Expo WebBrowser Checkout
```typescript
import * as WebBrowser from 'expo-web-browser';

async function handlePayment(bookingId: string) {
  setLoading(true);

  // Create payment preference via API
  const { data: preference } = await api.post('/api/payments/create-preference', {
    bookingId,
  });

  setLoading(false);

  // Open MP checkout
  const result = await WebBrowser.openBrowserAsync(preference.init_point, {
    dismissButtonStyle: 'cancel',
    showTitle: true,
  });

  // After browser closes, check booking status
  const { data: booking } = await supabase
    .from('bookings')
    .select('status, payment_status')
    .eq('id', bookingId)
    .single();

  if (booking.status === 'confirmed') {
    navigation.navigate('BookingSuccess', { bookingId });
  } else if (booking.payment_status === 'rejected') {
    navigation.navigate('BookingPaymentFailed', { bookingId });
  } else {
    // Still pending — show waiting screen, poll status
    navigation.navigate('BookingPending', { bookingId });
  }
}
```

### Webhook → Status Update → Notifications
```typescript
// In webhook handler (extends IPET-011)
if (payment.status === 'approved') {
  // Update booking
  await supabase.from('bookings').update({
    status: 'confirmed',
    payment_status: 'approved',
    paid_at: new Date().toISOString(),
  }).eq('id', bookingId);

  // Get booking details for notifications
  const booking = await getBookingWithDetails(bookingId);

  // Send push to tutor
  await sendPushNotification(booking.tutor.push_token, {
    title: 'Agendamento confirmado!',
    body: `${booking.pet_name} em ${booking.petshop_name} dia ${booking.date} as ${booking.time}`,
    data: { type: 'booking_confirmed', bookingId },
  });

  // Send push to pet shop
  await sendPushNotification(booking.petshop.push_token, {
    title: 'Novo agendamento recebido!',
    body: `${booking.tutor_name} - ${booking.service_name} - ${booking.date} ${booking.time}`,
    data: { type: 'new_booking', bookingId },
  });
}
```

### Auto-Cancel Cron (Supabase Edge Function)
```sql
-- Supabase cron job: runs every 5 minutes
SELECT cron.schedule(
  'cancel-expired-bookings',
  '*/5 * * * *',
  $$
    UPDATE bookings
    SET status = 'cancelled', cancelled_reason = 'payment_timeout'
    WHERE status = 'pending_payment'
      AND created_at < NOW() - INTERVAL '15 minutes';
  $$
);
```

### Screen Structure
```
src/screens/booking/
├── BookingSuccessScreen.tsx      — Confirmation + receipt
├── BookingPaymentFailedScreen.tsx — Error + retry
├── BookingPendingScreen.tsx       — Polling status while waiting
└── components/
    ├── PaymentReceipt.tsx         — Receipt card
    └── PaymentStatusBadge.tsx     — Status indicator
```

## Testing
- [ ] "Agendar e Pagar" opens Mercado Pago checkout in WebBrowser
- [ ] Successful payment redirects to success screen
- [ ] Booking status changes to 'confirmed' after approved payment
- [ ] Tutor receives push notification with correct booking details
- [ ] Pet shop receives push notification with correct booking details
- [ ] Failed payment shows error screen with retry option
- [ ] Retry creates new preference and reopens checkout
- [ ] Cancel on failure screen cancels the booking
- [ ] Pending payment >15min auto-cancels booking
- [ ] Auto-cancelled booking releases time slots
- [ ] Tutor receives push for expired booking
- [ ] Receipt screen shows all correct information
- [ ] Deep link back to app works correctly on iOS and Android

## File List
*Auto-maintained*

## Notes
- WebBrowser.openBrowserAsync may behave differently on iOS vs Android; test both
- Deep linking: configure app scheme for MP redirect URLs
- Polling interval for pending status: every 3 seconds, max 60 seconds
- Consider Supabase Realtime subscription as alternative to polling for status updates
- Receipt data should be cached locally so it shows even offline

## Related Stories
- Bloqueada por: IPET-011 (Mercado Pago Integration)
- Bloqueador para: IPET-013 (Push Notifications), IPET-014 (Booking Management)
