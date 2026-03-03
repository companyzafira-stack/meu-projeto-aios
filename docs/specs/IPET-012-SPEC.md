# IPET-012 SPEC — Booking Confirmation & Payment Flow (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. IPET-001 to IPET-011 are implemented. This spec covers IPET-012: complete payment flow with Expo WebBrowser checkout, post-payment screens, push notifications, and auto-cancel of expired bookings.

**Tech stack (mobile):** Expo 51, React Native 0.74, TypeScript strict, React Navigation 6, TanStack React Query 5, Supabase JS 2.45, `expo-web-browser` (already installed).

**Tech stack (web/API):** Next.js 14 App Router, TypeScript strict, Supabase with service role key for server ops.

**Styling:** React Native `StyleSheet.create()`. Colors: `#FF6B6B` (primary), `#2ecc71` (success green), `#e74c3c` (error red), `#f39c12` (warning yellow), `#333` (text), `#666`/`#999` (muted), `#f0f0f0` (bg).

**Imports:** `@/` alias → `./src/`. Supabase from `@/lib/supabase`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checkout | Expo WebBrowser (in-app browser) | Already installed, better UX than external browser |
| Status updates | Supabase Realtime subscription | Instant, no polling overhead, cleaner than polling |
| Push notifications | Expo Push Notifications | Native Expo integration, free tier generous |
| Auto-cancel | pg_cron (Supabase) | Simple SQL, runs in DB, zero infra |
| Push from webhook | Expo Push API (HTTP) | No SDK needed server-side, just POST |

## Existing Schema (from IPET-011)

```sql
-- bookings (relevant columns after IPET-011 migration)
bookings: id, tutor_id, petshop_id, booking_date, start_time, end_time,
  status, total_amount, payment_id, payment_status, payment_method, paid_at,
  cancelled_by, cancelled_at, created_at

-- booking_items: id, booking_id, pet_id, service_id, price, duration_minutes

-- profiles: id, display_name, phone, avatar_url, role
-- (push_token NOT YET — needs migration)

-- petshops: id, owner_id, name, address, phone, mp_access_token, ...
```

## Files to Create

### 1. `supabase/migrations/20260225_002_add_push_token_and_autocanel.sql`

```sql
-- Add push_token to profiles for push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Allow users to update their own push_token
-- (existing RLS policy "Users can update own profile" already covers this)

-- Auto-cancel expired bookings (pending_payment > 15 minutes)
-- Uses pg_cron extension (enabled by default in Supabase)

-- Create the function first
CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_by = 'system',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending_payment'
    AND created_at < NOW() - INTERVAL '15 minutes';
END;
$$;

-- Schedule: run every 5 minutes
SELECT cron.schedule(
  'cancel-expired-bookings',
  '*/5 * * * *',
  'SELECT public.cancel_expired_bookings()'
);

-- Function to get booking details for notifications (used by webhook)
CREATE OR REPLACE FUNCTION public.get_booking_notification_data(p_booking_id UUID)
RETURNS TABLE (
  booking_id UUID,
  booking_date DATE,
  start_time TIME,
  tutor_name TEXT,
  tutor_push_token TEXT,
  pet_names TEXT,
  petshop_name TEXT,
  petshop_owner_push_token TEXT,
  service_names TEXT,
  total_amount DECIMAL
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    b.id AS booking_id,
    b.booking_date,
    b.start_time,
    tp.display_name AS tutor_name,
    tp.push_token AS tutor_push_token,
    STRING_AGG(DISTINCT p.name, ', ') AS pet_names,
    ps.name AS petshop_name,
    op.push_token AS petshop_owner_push_token,
    STRING_AGG(DISTINCT s.name, ', ') AS service_names,
    b.total_amount
  FROM public.bookings b
  JOIN public.profiles tp ON tp.id = b.tutor_id
  JOIN public.petshops ps ON ps.id = b.petshop_id
  JOIN public.profiles op ON op.id = ps.owner_id
  JOIN public.booking_items bi ON bi.booking_id = b.id
  JOIN public.pets p ON p.id = bi.pet_id
  JOIN public.services s ON s.id = bi.service_id
  WHERE b.id = p_booking_id
  GROUP BY b.id, b.booking_date, b.start_time, tp.display_name, tp.push_token,
           ps.name, op.push_token, b.total_amount;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_notification_data(UUID) TO service_role;
```

### 2. `apps/web/src/lib/push/expo-push.ts`

**Purpose:** Send push notifications via Expo Push API. Server-side only.

```typescript
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;          // Expo push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
}

// Send push notification via Expo Push API
// No SDK needed — just HTTP POST
export async function sendPushNotification(message: PushMessage): Promise<void> {
  if (!message.to || !message.to.startsWith('ExponentPushToken')) {
    console.warn('Invalid push token, skipping:', message.to);
    return;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      ...message,
      sound: message.sound ?? 'default',
    }),
  });

  if (!response.ok) {
    console.error('Push notification failed:', await response.text());
  }
}

// Send to multiple tokens at once (batch)
export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const validMessages = messages.filter(m => m.to?.startsWith('ExponentPushToken'));
  if (validMessages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(validMessages.map(m => ({ ...m, sound: m.sound ?? 'default' }))),
  });

  if (!response.ok) {
    console.error('Batch push failed:', await response.text());
  }
}
```

### 3. `apps/web/src/lib/push/booking-notifications.ts`

**Purpose:** Compose and send booking-related push notifications.

```typescript
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from './expo-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Format date as "24/02/2026"
function formatDate(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Format time as "08:00" (trim seconds)
function formatTime(time: string): string {
  return time.substring(0, 5);
}

export async function sendBookingConfirmedNotifications(bookingId: string): Promise<void> {
  // Fetch notification data via RPC
  const { data, error } = await supabaseAdmin
    .rpc('get_booking_notification_data', { p_booking_id: bookingId });

  if (error || !data || data.length === 0) {
    console.error('Failed to get booking notification data:', error);
    return;
  }

  const booking = data[0];
  const dateStr = formatDate(booking.booking_date);
  const timeStr = formatTime(booking.start_time);

  // Send to tutor
  if (booking.tutor_push_token) {
    await sendPushNotification({
      to: booking.tutor_push_token,
      title: 'Agendamento confirmado! ✅',
      body: `${booking.pet_names} em ${booking.petshop_name} dia ${dateStr} às ${timeStr}`,
      data: { type: 'booking_confirmed', bookingId },
    });
  }

  // Send to pet shop owner
  if (booking.petshop_owner_push_token) {
    await sendPushNotification({
      to: booking.petshop_owner_push_token,
      title: 'Novo agendamento recebido! 📋',
      body: `${booking.tutor_name} - ${booking.service_names} - ${dateStr} ${timeStr}`,
      data: { type: 'new_booking', bookingId },
    });
  }
}

export async function sendBookingExpiredNotification(bookingId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .rpc('get_booking_notification_data', { p_booking_id: bookingId });

  if (error || !data || data.length === 0) return;
  const booking = data[0];

  if (booking.tutor_push_token) {
    await sendPushNotification({
      to: booking.tutor_push_token,
      title: 'Agendamento expirado ⏰',
      body: 'Seu agendamento expirou por falta de pagamento. Agende novamente.',
      data: { type: 'booking_expired', bookingId },
    });
  }
}
```

### 4. `apps/mobile/src/hooks/usePushNotifications.ts`

**Purpose:** Register for push notifications and save token to profile.

```typescript
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user) return;

    // Register for push notifications
    registerForPushNotifications().then(token => {
      if (token) {
        setPushToken(token);
        // Save token to profile in Supabase
        supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Failed to save push token:', error);
          });
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground — handled by setNotificationHandler above
    });

    // Listen for notification taps (user interacts with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Handle navigation based on notification type
      // This will be expanded in IPET-013
      // For now, just log it
      console.log('Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  return { pushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  // Must be a physical device
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Android: set notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return tokenData.data; // "ExponentPushToken[...]"
}
```

### 5. `apps/mobile/src/screens/booking/BookingSuccessScreen.tsx`

**Purpose:** Confirmation screen with payment receipt after successful payment.

```
Route: 'BookingSuccess'
Params: { bookingId: string }

Implementation:
  Fetch booking with details:
    const { data } = useQuery({
      queryKey: ['booking-receipt', bookingId],
      queryFn: () => supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, total_amount,
          payment_method, payment_status, paid_at, status,
          petshops(name, address),
          booking_items(
            price, duration_minutes,
            pets(name, size),
            services(name)
          )
        `)
        .eq('id', bookingId)
        .single()
    });

Layout (ScrollView):
  - Success animation area (top):
    - Large green checkmark circle: width 80, height 80, borderRadius 40, backgroundColor #2ecc71
    - "✓" text inside: fontSize 40, color #fff, fontWeight 700
    - Title: "Agendamento Confirmado!" fontSize 22, fontWeight 700, color #333, marginTop 16
    - Subtitle: "Seu pagamento foi aprovado" fontSize 14, color #666

  - Receipt card (backgroundColor #f9f9f9, borderRadius 12, padding 20, marginTop 24, marginHorizontal 16):
    - Header: "Comprovante" fontSize 16, fontWeight 700, borderBottomWidth 1, borderBottomColor #eee, paddingBottom 12

    - Row: "Booking ID" → "#{bookingId.substring(0,8)}" fontSize 12, color #999
    - Row: "Pet Shop" → petshops.name, fontWeight 600
    - Row: "Endereço" → petshops.address, fontSize 13, color #666
    - Divider
    - Row: "Data" → formatted booking_date (DD/MM/YYYY)
    - Row: "Horário" → "{start_time} - {end_time}"
    - Divider
    - Section: "Serviços"
      For each booking_item:
        Row: "{pets.name} ({pets.size})" → "{services.name}" → "R$ {price}"
    - Divider
    - Row: "Pagamento" → payment_method label (Pix, Cartão de Crédito)
    - Row BOLD: "Total Pago" → "R$ {total_amount}" fontSize 18, fontWeight 700, color #FF6B6B

  - Status badge: "Confirmado" backgroundColor #2ecc71, color #fff, borderRadius 20, paddingH 16, paddingV 8, alignSelf center, marginTop 16

  - Bottom buttons (marginTop 24, paddingHorizontal 16):
    - "Ver Meus Agendamentos" → primary button (backgroundColor #FF6B6B)
      onPress: navigation.navigate('Home') // TODO: IPET-014 will add BookingList screen
    - "Voltar ao Início" → outline button (borderColor #ddd, color #666)
      onPress: navigation.navigate('Home')

Payment method labels:
  'pix' → 'Pix'
  'credit_card' → 'Cartão de Crédito'
  'debit_card' → 'Cartão de Débito'
  default → method string
```

### 6. `apps/mobile/src/screens/booking/BookingPaymentFailedScreen.tsx`

**Purpose:** Error screen with retry option after failed payment.

```
Route: 'BookingPaymentFailed'
Params: { bookingId: string }

Implementation:
  const { createPreference, openCheckout, isCreating } = usePayment();

  handleRetry:
    1. Create new MP preference for same booking
    2. Open checkout again via WebBrowser
    3. After browser closes, check status → navigate accordingly

  handleCancel:
    1. Update booking status to 'cancelled', cancelled_by: 'tutor'
    2. Navigate to Home

Layout:
  - Error icon: large red X circle (width 80, height 80, borderRadius 40, backgroundColor #FEE2E2)
    - "✕" text: fontSize 40, color #e74c3c, fontWeight 700
  - Title: "Pagamento não aprovado" fontSize 22, fontWeight 700, color #333, marginTop 16
  - Message: "O pagamento não foi aprovado. Tente novamente com outro método de pagamento." fontSize 14, color #666, textAlign center, paddingHorizontal 24

  - Buttons (marginTop 32, paddingHorizontal 16, gap 12):
    - "Tentar Novamente" → primary button (backgroundColor #FF6B6B)
      - Shows ActivityIndicator if isCreating
      - onPress: handleRetry
    - "Cancelar Agendamento" → outline button (borderColor #e74c3c, color #e74c3c)
      - onPress: Alert.alert('Cancelar?', 'Tem certeza que deseja cancelar o agendamento?',
          [{ text: 'Não' }, { text: 'Sim, cancelar', style: 'destructive', onPress: handleCancel }])
```

### 7. `apps/mobile/src/screens/booking/BookingPendingScreen.tsx`

**Purpose:** Waiting screen while payment is being processed (Pix pending, etc.)

```
Route: 'BookingPending'
Params: { bookingId: string }

Implementation:
  Subscribe to booking status via Supabase Realtime:

  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === 'confirmed') {
          navigation.replace('BookingSuccess', { bookingId });
        } else if (newStatus === 'cancelled') {
          navigation.replace('BookingPaymentFailed', { bookingId });
        }
      })
      .subscribe();

    // Timeout: after 60 seconds, offer manual check
    const timeout = setTimeout(() => setShowManualCheck(true), 60000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [bookingId]);

  Manual check fallback:
    Fetch booking status from DB directly if Realtime doesn't fire.

Layout:
  - Container: flex 1, justifyContent center, alignItems center, padding 24
  - ActivityIndicator: size large, color #FF6B6B
  - Title: "Processando pagamento..." fontSize 20, fontWeight 700, color #333, marginTop 24
  - Message: "Aguardando confirmação do Mercado Pago. Isso pode levar alguns segundos." fontSize 14, color #666, textAlign center, marginTop 8
  - Progress dots animation (optional): 3 dots pulsing

  - If showManualCheck (after 60s):
    - Text: "Está demorando mais que o esperado" fontSize 14, color #999
    - Button: "Verificar Status" outline, onPress: manually fetch booking status
    - Button: "Voltar ao Início" text link, onPress: navigation.navigate('Home')
```

## Files to Modify

### 8. `apps/web/src/app/api/webhooks/mercadopago/route.ts`

**Changes:** Add push notification sending after payment approved.

Add import at top:
```typescript
import { sendBookingConfirmedNotifications } from '@/lib/push/booking-notifications';
```

After the booking update succeeds and status is 'confirmed', add:
```typescript
// After: const { error } = await supabaseAdmin.from('bookings').update(updateData).eq('id', bookingId);

if (!error && bookingStatus === 'confirmed') {
  // Send push notifications asynchronously (don't block webhook response)
  sendBookingConfirmedNotifications(bookingId).catch(err =>
    console.error('Failed to send push notifications:', err)
  );
}
```

### 9. `apps/mobile/src/screens/booking/steps/ReviewStep.tsx`

**Changes:** Replace IPET-011 temporary flow with WebBrowser checkout.

Replace the payment handling with:
```typescript
import * as WebBrowser from 'expo-web-browser';
// Remove: import { useBookingStatus } from '@/hooks/useBookingStatus';
// Remove: polling logic, waitingPayment state

async function handleConfirmBooking() {
  try {
    // 1. Create booking
    const booking = await createBooking({ ...params });

    // 2. Create MP preference
    const preference = await createPreference(booking.id);

    // 3. Open MP checkout in WebBrowser (in-app browser)
    const result = await WebBrowser.openBrowserAsync(
      __DEV__ ? preference.sandboxInitPoint : preference.initPoint,
      { dismissButtonStyle: 'cancel', showTitle: true }
    );

    // 4. After browser closes, check booking status
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('status, payment_status')
      .eq('id', booking.id)
      .single();

    if (updatedBooking?.status === 'confirmed') {
      navigation.navigate('BookingSuccess', { bookingId: booking.id });
    } else if (updatedBooking?.payment_status === 'rejected') {
      navigation.navigate('BookingPaymentFailed', { bookingId: booking.id });
    } else {
      // Payment still processing (Pix pending, etc.)
      navigation.navigate('BookingPending', { bookingId: booking.id });
    }
  } catch (err: any) {
    Alert.alert('Erro', err.message || 'Não foi possível iniciar o pagamento.');
  }
}
```

### 10. `apps/mobile/src/hooks/usePayment.ts`

**Changes:** Remove Linking.openURL, the WebBrowser call is now in ReviewStep directly. Simplify to just createPreference.

Keep only the `createPreference` mutation. Remove `openCheckout` function since WebBrowser is called directly in the screen.

### 11. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:** Add new screens.

1. Import:
```typescript
import { BookingSuccessScreen } from '../screens/booking/BookingSuccessScreen';
import { BookingPaymentFailedScreen } from '../screens/booking/BookingPaymentFailedScreen';
import { BookingPendingScreen } from '../screens/booking/BookingPendingScreen';
```

2. Add to `MainStackParamList`:
```typescript
BookingSuccess: { bookingId: string };
BookingPaymentFailed: { bookingId: string };
BookingPending: { bookingId: string };
```

3. Add screens to `MainNavigator`:
```tsx
<MainStack.Screen name="BookingSuccess" component={BookingSuccessScreen}
  options={{ headerTitle: 'Agendamento Confirmado', headerBackVisible: false }} />
<MainStack.Screen name="BookingPaymentFailed" component={BookingPaymentFailedScreen}
  options={{ headerTitle: 'Pagamento', headerBackVisible: false }} />
<MainStack.Screen name="BookingPending" component={BookingPendingScreen}
  options={{ headerTitle: 'Processando', headerBackVisible: false }} />
```

Note: `headerBackVisible: false` — user should not go back to payment flow after completing.

### 12. `apps/mobile/App.tsx`

**Changes:** Initialize push notifications on app start.

Add at root level (inside providers, before navigation):
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Inside App component, add:
function AppContent() {
  usePushNotifications(); // Register on mount
  return <RootNavigator />;
}
```

## Dependencies to Install

```bash
# Mobile — push notifications
cd apps/mobile
npx expo install expo-notifications expo-device
```

Add to `app.json` (inside `expo` config):
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF6B6B"
        }
      ]
    ]
  }
}
```

## Environment Variables

Add to `apps/mobile/.env` (or app.json extra):
```
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

The Expo project ID is from your Expo account (https://expo.dev). Required for push tokens.

## Implementation Order

1. **Migration:** `20260225_002_add_push_token_and_autocancel.sql`
2. **Dependencies:** Install expo-notifications + expo-device
3. **Server push lib:** `expo-push.ts` → `booking-notifications.ts`
4. **Webhook update:** Add push sending to `webhooks/mercadopago/route.ts`
5. **Mobile push hook:** `usePushNotifications.ts`
6. **App.tsx:** Initialize push registration
7. **Screens:** `BookingSuccessScreen` → `BookingPaymentFailedScreen` → `BookingPendingScreen`
8. **Navigation:** Update `RootNavigator.tsx`
9. **Wiring:** Update `ReviewStep.tsx` (WebBrowser flow) + simplify `usePayment.ts`

## Validation Rules

| Field | Rule |
|-------|------|
| push_token | Must start with "ExponentPushToken[" |
| bookingId | Required UUID for all post-payment screens |
| auto-cancel | Only bookings with status='pending_payment' AND created_at > 15min ago |
| WebBrowser result | Check booking status AFTER browser closes, regardless of result type |
| Realtime filter | Must use `id=eq.{bookingId}` filter for targeted subscription |

## Testing Checklist

After implementation, verify:
- [ ] "Agendar e Pagar" opens MP checkout via WebBrowser (in-app browser)
- [ ] Successful payment → BookingSuccessScreen with receipt
- [ ] Receipt shows: booking ID, pet shop, services, date, time, total, payment method
- [ ] Failed payment → BookingPaymentFailedScreen with retry button
- [ ] Retry creates new preference and reopens checkout
- [ ] Cancel on failure screen updates booking to cancelled
- [ ] Pending payment → BookingPendingScreen with Realtime listener
- [ ] Realtime detects status change to 'confirmed' and navigates to success
- [ ] Realtime detects status change to 'cancelled' and navigates to failure
- [ ] After 60s on pending screen, manual check button appears
- [ ] Push notification received by tutor on payment confirmed
- [ ] Push notification received by pet shop owner on new booking
- [ ] Push token saved to profiles table on app start
- [ ] Push permission request on first launch (physical device)
- [ ] Auto-cancel: booking pending > 15min becomes cancelled (test via SQL)
- [ ] Auto-cancelled booking releases time slots (status = cancelled)
- [ ] headerBackVisible=false on post-payment screens (no back button)
- [ ] Expo notifications configured in app.json
- [ ] TypeScript compiles: `cd apps/mobile && npx tsc --noEmit`

## Git Commit

```bash
git add supabase/migrations/20260225_002_add_push_token_and_autocancel.sql apps/web/src/lib/push/ apps/web/src/app/api/webhooks/mercadopago/route.ts apps/mobile/src/hooks/usePushNotifications.ts apps/mobile/src/hooks/usePayment.ts apps/mobile/src/hooks/useBookingStatus.ts apps/mobile/src/screens/booking/BookingSuccessScreen.tsx apps/mobile/src/screens/booking/BookingPaymentFailedScreen.tsx apps/mobile/src/screens/booking/BookingPendingScreen.tsx apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/screens/booking/steps/ReviewStep.tsx apps/mobile/App.tsx
git commit -m "feat: implement booking confirmation & payment flow IPET-012

- Expo WebBrowser checkout (in-app MP payment)
- Post-payment screens: success/receipt, failure/retry, pending/realtime
- Supabase Realtime subscription for instant status updates
- Push notifications via Expo Push API (tutor + pet shop)
- Push token registration and storage in profiles
- Auto-cancel expired bookings via pg_cron (15min timeout)
- RPC get_booking_notification_data for notification composition
- Migration: push_token column + cron job"
```

## Important Notes

- **expo-web-browser** already installed — no need to add
- **expo-notifications** + **expo-device** need `npx expo install` (not npm install)
- Push notifications ONLY work on **physical devices**, not simulators
- Expo project ID required for push tokens — create at expo.dev if not exists
- Supabase Realtime requires the `realtime` extension enabled (default in Supabase)
- pg_cron requires the `pg_cron` extension enabled in Supabase (Dashboard → Extensions)
- WebBrowser.openBrowserAsync returns after user dismisses — then check status
- `headerBackVisible: false` prevents user from going back to booking flow after payment
- Auto-cancel runs every 5 minutes — worst case a booking lives 20min before cancel
- Push from webhook is fire-and-forget (don't block webhook response)
- IPET-013 will expand notification handling (tap navigation, inbox, preferences)
