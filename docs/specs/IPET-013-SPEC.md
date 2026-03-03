# IPET-013 SPEC — Push Notifications System (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. IPET-001 to IPET-012 are implemented. This spec covers IPET-013: full push notification system with in-app notification center, scheduled reminders, and navigation on tap.

**Already implemented in IPET-012:**
- `expo-notifications` + `expo-device` installed
- `usePushNotifications.ts` hook (token registration + save to profiles)
- `apps/web/src/lib/push/expo-push.ts` (send push via Expo API)
- `apps/web/src/lib/push/booking-notifications.ts` (booking confirmed + expired notifications)
- `profiles.push_token` column (migration done)
- Notification handler configured in usePushNotifications

**This spec adds:**
- `notifications` table (in-app notification storage)
- Notification Center screen (bell icon + badge + list)
- More event types (reminders 24h/2h, in_progress, completed, cancelled)
- Scheduled reminders via Next.js API cron
- Notification tap → deep navigation
- Mark as read + badge count

**Tech stack (mobile):** Expo 51, React Native 0.74, TypeScript, React Navigation 6, TanStack React Query 5, Supabase JS 2.45.

**Tech stack (web/API):** Next.js 14 App Router, TypeScript, Supabase service role.

**Styling:** React Native `StyleSheet.create()`. Colors: `#FF6B6B` primary, `#333` text, `#666`/`#999` muted, `#f0f0f0` bg.

## Files to Create

### 1. `supabase/migrations/20260225_003_add_notifications_table.sql`

```sql
-- Notifications table (in-app notification center)
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
    -- Types: booking_confirmed, booking_cancelled, booking_expired,
    --        reminder_24h, reminder_2h, booking_in_progress, booking_completed,
    --        new_booking (pet shop), new_review (pet shop)
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json JSONB DEFAULT '{}',
    -- Contains: { bookingId, petshopId, type }
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add reminder tracking columns to bookings (avoid sending duplicate reminders)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE;

-- pg_cron: schedule reminder check every 30 minutes
-- This calls a DB function that marks bookings needing reminders
-- The actual push sending is done by a Next.js API cron endpoint

CREATE OR REPLACE FUNCTION public.get_bookings_needing_reminder(p_type TEXT)
RETURNS TABLE (
  booking_id UUID,
  tutor_id UUID,
  tutor_push_token TEXT,
  tutor_name TEXT,
  pet_names TEXT,
  petshop_name TEXT,
  booking_date DATE,
  start_time TIME
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    b.id AS booking_id,
    b.tutor_id,
    p.push_token AS tutor_push_token,
    p.display_name AS tutor_name,
    STRING_AGG(DISTINCT pet.name, ', ') AS pet_names,
    ps.name AS petshop_name,
    b.booking_date,
    b.start_time
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.tutor_id
  JOIN public.petshops ps ON ps.id = b.petshop_id
  JOIN public.booking_items bi ON bi.booking_id = b.id
  JOIN public.pets pet ON pet.id = bi.pet_id
  WHERE b.status = 'confirmed'
    AND CASE
      WHEN p_type = '24h' THEN
        b.reminder_24h_sent = FALSE
        AND (b.booking_date = CURRENT_DATE + 1
          OR (b.booking_date = CURRENT_DATE + 1
            AND b.start_time >= CURRENT_TIME))
        AND b.booking_date AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '24 hours'
            <= NOW() AT TIME ZONE 'America/Sao_Paulo'
      WHEN p_type = '2h' THEN
        b.reminder_2h_sent = FALSE
        AND b.booking_date = CURRENT_DATE
        AND b.start_time <= (CURRENT_TIME + INTERVAL '2 hours 30 minutes')
        AND b.start_time >= (CURRENT_TIME + INTERVAL '1 hour 30 minutes')
      ELSE FALSE
    END
  GROUP BY b.id, b.tutor_id, p.push_token, p.display_name, ps.name, b.booking_date, b.start_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_bookings_needing_reminder(TEXT) TO service_role;
```

### 2. `apps/web/src/lib/push/notification-store.ts`

**Purpose:** Store notifications in DB before sending push. All push sends go through here.

```typescript
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from './expo-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationPayload {
  userId: string;
  pushToken: string | null;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Store in DB + send push in one call
export async function storeAndSendNotification(payload: NotificationPayload): Promise<void> {
  // 1. Store in notifications table (always, even if no push token)
  await supabaseAdmin.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data_json: payload.data || {},
  });

  // 2. Send push if token exists
  if (payload.pushToken) {
    await sendPushNotification({
      to: payload.pushToken,
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
    });
  }
}
```

### 3. `apps/web/src/lib/push/booking-events.ts`

**Purpose:** All booking event notification composers. Replaces/extends booking-notifications.ts.

```typescript
import { createClient } from '@supabase/supabase-js';
import { storeAndSendNotification } from './notification-store';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatDate(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

// Helper: fetch booking notification data via RPC
async function getBookingData(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .rpc('get_booking_notification_data', { p_booking_id: bookingId });
  if (error || !data?.length) return null;
  return data[0];
}

// --- Event Handlers ---

export async function onBookingConfirmed(bookingId: string): Promise<void> {
  const b = await getBookingData(bookingId);
  if (!b) return;

  // Notify tutor
  await storeAndSendNotification({
    userId: b.tutor_id || '',
    pushToken: b.tutor_push_token,
    type: 'booking_confirmed',
    title: 'Agendamento confirmado! ✅',
    body: `${b.pet_names} em ${b.petshop_name} dia ${formatDate(b.booking_date)} às ${formatTime(b.start_time)}`,
    data: { bookingId },
  });

  // Notify pet shop owner
  // Need to get petshop owner_id
  const { data: petshop } = await supabaseAdmin
    .from('petshops')
    .select('owner_id')
    .eq('name', b.petshop_name)
    .single();

  if (petshop) {
    await storeAndSendNotification({
      userId: petshop.owner_id,
      pushToken: b.petshop_owner_push_token,
      type: 'new_booking',
      title: 'Novo agendamento! 📋',
      body: `${b.tutor_name} - ${b.service_names} - ${formatDate(b.booking_date)} ${formatTime(b.start_time)}`,
      data: { bookingId },
    });
  }
}

export async function onBookingCancelled(bookingId: string, cancelledBy: string): Promise<void> {
  const b = await getBookingData(bookingId);
  if (!b) return;

  // Always notify tutor
  await storeAndSendNotification({
    userId: b.tutor_id || '',
    pushToken: b.tutor_push_token,
    type: 'booking_cancelled',
    title: 'Agendamento cancelado ❌',
    body: cancelledBy === 'system'
      ? 'Seu agendamento foi cancelado por falta de pagamento.'
      : `Agendamento em ${b.petshop_name} dia ${formatDate(b.booking_date)} foi cancelado.`,
    data: { bookingId },
  });

  // If cancelled by tutor, also notify pet shop
  if (cancelledBy === 'tutor') {
    const { data: petshop } = await supabaseAdmin
      .from('petshops')
      .select('owner_id')
      .eq('name', b.petshop_name)
      .single();

    if (petshop) {
      await storeAndSendNotification({
        userId: petshop.owner_id,
        pushToken: b.petshop_owner_push_token,
        type: 'booking_cancelled',
        title: 'Agendamento cancelado ❌',
        body: `${b.tutor_name} cancelou o agendamento de ${formatDate(b.booking_date)} ${formatTime(b.start_time)}`,
        data: { bookingId },
      });
    }
  }
}

export async function onBookingInProgress(bookingId: string): Promise<void> {
  const b = await getBookingData(bookingId);
  if (!b) return;

  await storeAndSendNotification({
    userId: b.tutor_id || '',
    pushToken: b.tutor_push_token,
    type: 'booking_in_progress',
    title: 'Atendimento iniciado! 🐾',
    body: `${b.pet_names} está sendo atendido em ${b.petshop_name}`,
    data: { bookingId },
  });
}

export async function onBookingCompleted(bookingId: string): Promise<void> {
  const b = await getBookingData(bookingId);
  if (!b) return;

  await storeAndSendNotification({
    userId: b.tutor_id || '',
    pushToken: b.tutor_push_token,
    type: 'booking_completed',
    title: 'Pronto! 🎉',
    body: `${b.pet_names} está pronto! Veja como ficou 🐾`,
    data: { bookingId },
  });
}

export async function sendReminder(
  bookingId: string, type: '24h' | '2h',
  tutorId: string, pushToken: string | null,
  petNames: string, petshopName: string, date: string, time: string
): Promise<void> {
  const title = type === '24h' ? 'Lembrete: amanhã! 📅' : 'Daqui 2 horas! ⏰';
  const body = type === '24h'
    ? `${petNames} em ${petshopName} amanhã às ${formatTime(time)}`
    : `${petNames} em ${petshopName} às ${formatTime(time)}`;

  await storeAndSendNotification({
    userId: tutorId,
    pushToken,
    type: `reminder_${type}`,
    title,
    body,
    data: { bookingId },
  });
}
```

### 4. `apps/web/src/app/api/cron/send-reminders/route.ts`

**Purpose:** Cron endpoint to send 24h and 2h booking reminders. Called every 30 minutes by Vercel Cron or external scheduler.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReminder } from '@/lib/push/booking-events';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Protect with cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Validate cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('Authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sent24h = 0;
  let sent2h = 0;

  try {
    // Send 24h reminders
    const { data: reminders24h } = await supabaseAdmin
      .rpc('get_bookings_needing_reminder', { p_type: '24h' });

    for (const r of (reminders24h || [])) {
      await sendReminder(
        r.booking_id, '24h', r.tutor_id, r.tutor_push_token,
        r.pet_names, r.petshop_name, r.booking_date, r.start_time
      );
      // Mark as sent
      await supabaseAdmin.from('bookings')
        .update({ reminder_24h_sent: true })
        .eq('id', r.booking_id);
      sent24h++;
    }

    // Send 2h reminders
    const { data: reminders2h } = await supabaseAdmin
      .rpc('get_bookings_needing_reminder', { p_type: '2h' });

    for (const r of (reminders2h || [])) {
      await sendReminder(
        r.booking_id, '2h', r.tutor_id, r.tutor_push_token,
        r.pet_names, r.petshop_name, r.booking_date, r.start_time
      );
      // Mark as sent
      await supabaseAdmin.from('bookings')
        .update({ reminder_2h_sent: true })
        .eq('id', r.booking_id);
      sent2h++;
    }

    return NextResponse.json({ sent24h, sent2h });
  } catch (err) {
    console.error('Reminder cron error:', err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
```

### 5. `apps/web/vercel.json` (or update existing)

**Purpose:** Configure Vercel Cron to call reminders endpoint.

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

If `vercel.json` already exists at project root, add the `crons` key to it.

### 6. `apps/mobile/src/hooks/useNotifications.ts`

**Purpose:** Fetch in-app notifications, badge count, mark as read.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data_json: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AppNotification[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Unread count
  const unreadCount = (data || []).filter(n => !n.is_read).length;

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  return {
    notifications: data || [],
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
```

### 7. `apps/mobile/src/screens/notifications/NotificationCenterScreen.tsx`

**Purpose:** Full notification list with read/unread states.

```
Route: 'Notifications'

Implementation:
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const navigation = useNavigation();

  handleNotificationPress(notification):
    1. Mark as read: markAsRead(notification.id)
    2. Navigate based on type:
       - booking_confirmed, booking_cancelled, booking_in_progress,
         booking_completed, reminder_24h, reminder_2h, new_booking:
         → navigation.navigate('BookingSuccess', { bookingId: notification.data_json.bookingId })
         (BookingSuccess serves as booking detail for now — IPET-014 will add proper detail screen)
       - default: just mark as read, no navigation

Layout:
  - Header right button: "Marcar todas" (only if unreadCount > 0)
    - onPress: markAllAsRead()
    - fontSize 14, color #FF6B6B

  - If isLoading: ActivityIndicator
  - If notifications.length === 0:
    - Empty state: bell icon 🔔 + "Nenhuma notificação" + "Suas notificações aparecerão aqui"

  - FlatList of notifications:
    Each item (TouchableOpacity):
      - Container: paddingVertical 14, paddingHorizontal 16, borderBottomWidth 1, borderBottomColor #f0f0f0
      - backgroundColor: is_read ? '#fff' : '#FFF8F8' (light pink for unread)
      - Left: type icon (View, width 40, height 40, borderRadius 20, alignItems center, justifyContent center)
        Icon by type:
          booking_confirmed → ✅ bg #E8F5E9
          booking_cancelled → ❌ bg #FFEBEE
          booking_expired → ⏰ bg #FFF3E0
          reminder_24h → 📅 bg #E3F2FD
          reminder_2h → ⏰ bg #FFF3E0
          booking_in_progress → 🐾 bg #F3E5F5
          booking_completed → 🎉 bg #E8F5E9
          new_booking → 📋 bg #E3F2FD
          default → 🔔 bg #f0f0f0
      - Right (flex 1, marginLeft 12):
        - Title: fontSize 14, fontWeight: is_read ? '400' : '700', color #333
        - Body: fontSize 13, color #666, marginTop 2, numberOfLines 2
        - Time: fontSize 11, color #999, marginTop 4 → relative time (timeAgo helper)
      - Unread dot (if !is_read): width 8, height 8, borderRadius 4, backgroundColor #FF6B6B, position absolute right 16

  timeAgo helper function:
    - < 1 min: "Agora"
    - < 60 min: "{n}min atrás"
    - < 24h: "{n}h atrás"
    - < 7d: "{n}d atrás"
    - else: DD/MM/YYYY
```

### 8. `apps/mobile/src/screens/notifications/components/NotificationBell.tsx`

**Purpose:** Bell icon with badge for header. Used in HomeScreen header.

```
Props: none (uses useNotifications hook internally)

Implementation:
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();

Layout:
  TouchableOpacity onPress → navigation.navigate('Notifications'):
    - Bell icon: Text "🔔" fontSize 22
    - If unreadCount > 0:
      - Badge: position absolute, top -4, right -4
      - View: width 18, height 18, borderRadius 9, backgroundColor #FF6B6B
        alignItems center, justifyContent center
      - Text: unreadCount > 9 ? '9+' : String(unreadCount)
        fontSize 10, color #fff, fontWeight 700

Export as named export.
```

## Files to Modify

### 9. `apps/web/src/app/api/webhooks/mercadopago/route.ts`

**Changes:** Replace direct push calls with event-based notification system.

Replace the push notification import and call:

```typescript
// Remove:
import { sendBookingConfirmedNotifications } from '@/lib/push/booking-notifications';

// Add:
import { onBookingConfirmed, onBookingCancelled } from '@/lib/push/booking-events';

// Replace the push sending block:
// Before: sendBookingConfirmedNotifications(bookingId).catch(...)
// After:
if (!error && bookingStatus === 'confirmed') {
  onBookingConfirmed(bookingId).catch(err =>
    console.error('Failed to send booking notifications:', err)
  );
} else if (!error && bookingStatus === 'cancelled') {
  onBookingCancelled(bookingId, 'system').catch(err =>
    console.error('Failed to send cancellation notifications:', err)
  );
}
```

### 10. `apps/mobile/src/hooks/usePushNotifications.ts`

**Changes:** Add navigation on notification tap.

Update the `responseListener` callback:

```typescript
// Need to use a navigation ref for notification tap handling
// (notifications can arrive when navigator isn't mounted yet)

import { useQueryClient } from '@tanstack/react-query';

// Inside usePushNotifications:
const queryClient = useQueryClient();

responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;

  // Invalidate notifications cache to update badge
  queryClient.invalidateQueries({ queryKey: ['notifications'] });

  // Navigate based on notification type
  if (data?.bookingId) {
    // Use navigation ref or event emitter
    // For now, navigation will be handled by NotificationCenterScreen tap
    // Deep navigation from background notifications will be expanded in future
    console.log('Notification tapped with bookingId:', data.bookingId);
  }
});
```

### 11. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:** Add NotificationCenter screen + bell icon in Home header.

1. Import:
```typescript
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
import { NotificationBell } from '../screens/notifications/components/NotificationBell';
```

2. Add to `MainStackParamList`:
```typescript
Notifications: undefined;
```

3. Add screen:
```tsx
<MainStack.Screen name="Notifications" component={NotificationCenterScreen}
  options={{ headerTitle: 'Notificações' }} />
```

4. Update Home screen options to include bell icon:
```tsx
<MainStack.Screen name="Home" component={HomeScreen}
  options={{
    headerTitle: 'IPET',
    headerRight: () => <NotificationBell />,
  }}
/>
```

### 12. `apps/web/src/lib/push/booking-notifications.ts`

**Changes:** This file is now replaced by `booking-events.ts`. Either:
- Delete this file and update all imports, OR
- Keep it as a re-export wrapper that calls booking-events.ts

Simplest: keep file, replace contents:
```typescript
// Deprecated: use booking-events.ts instead
export { onBookingConfirmed as sendBookingConfirmedNotifications } from './booking-events';
export { onBookingCancelled as sendBookingExpiredNotification } from './booking-events';
```

## Environment Variables

Add to `.env.local`:
```
CRON_SECRET=your_random_cron_secret_here
```

## Implementation Order

1. **Migration:** `20260225_003_add_notifications_table.sql`
2. **Server notification lib:** `notification-store.ts` → `booking-events.ts`
3. **Update webhook:** Replace push calls with event-based system
4. **Update booking-notifications.ts:** Re-export wrapper
5. **Cron endpoint:** `send-reminders/route.ts` + `vercel.json`
6. **Mobile hooks:** `useNotifications.ts`
7. **Mobile screens:** `NotificationCenterScreen.tsx` + `NotificationBell.tsx`
8. **Navigation:** Update `RootNavigator.tsx` (Notifications screen + bell in header)
9. **Push hook update:** `usePushNotifications.ts` (cache invalidation on tap)

## Validation Rules

| Field | Rule |
|-------|------|
| notification.user_id | Required, must match auth user |
| notification.type | One of defined event types |
| reminder_24h | Sent once per booking (flag prevents duplicates) |
| reminder_2h | Sent once per booking (flag prevents duplicates) |
| cron secret | Must match CRON_SECRET env var |
| badge count | Count of is_read = false |
| notifications limit | Max 50 recent notifications fetched |

## Testing Checklist

After implementation, verify:
- [ ] Notifications table created with correct columns and RLS
- [ ] Booking confirmed → notification stored in DB + push sent to tutor + pet shop
- [ ] Booking cancelled → notification stored + push sent
- [ ] Notification Center screen shows list ordered by date
- [ ] Unread notifications have pink background + red dot
- [ ] Read notifications have white background
- [ ] Tap notification → marks as read + navigates
- [ ] "Marcar todas" button marks all as read
- [ ] Badge count on bell icon shows unread count
- [ ] Badge shows "9+" when > 9 unread
- [ ] Empty state when no notifications
- [ ] Cron endpoint sends 24h reminders for tomorrow's bookings
- [ ] Cron endpoint sends 2h reminders for upcoming bookings
- [ ] Duplicate reminders prevented (reminder_*_sent flags)
- [ ] Cron rejects requests without valid CRON_SECRET
- [ ] timeAgo displays correctly (Agora, 5min, 2h, 3d, DD/MM)
- [ ] Notification icons match event types
- [ ] TypeScript compiles: `cd apps/mobile && npx tsc --noEmit`

## Git Commit

```bash
git add supabase/migrations/20260225_003_add_notifications_table.sql apps/web/src/lib/push/ apps/web/src/app/api/cron/ apps/web/src/app/api/webhooks/mercadopago/route.ts apps/web/vercel.json apps/mobile/src/hooks/useNotifications.ts apps/mobile/src/hooks/usePushNotifications.ts apps/mobile/src/screens/notifications/ apps/mobile/src/navigation/RootNavigator.tsx
git commit -m "feat: implement push notification system IPET-013

- Notifications table for in-app notification center
- Event-based notification system (confirmed, cancelled, reminders, in_progress, completed)
- Notification Center screen with bell icon + badge count
- Scheduled reminders via Next.js cron (24h + 2h before booking)
- Mark as read / mark all as read
- Notification tap navigation to booking detail
- Vercel Cron config for reminder scheduling
- Migration: notifications table + reminder tracking flags"
```

## Important Notes

- **booking-notifications.ts** is now a re-export wrapper — new code should use `booking-events.ts`
- **All push sends** go through `storeAndSendNotification()` — ensures DB storage + push in sync
- **Reminders** use flags (`reminder_24h_sent`, `reminder_2h_sent`) to prevent duplicates
- **Vercel Cron** requires Vercel Pro plan for sub-1-hour intervals. If on free plan, use 1-hour interval or external cron
- **pg_cron** from IPET-012 (cancel expired bookings) is separate from this reminder cron
- **Notification tap navigation** is basic for now — IPET-014 will add proper BookingDetail screen
- **RLS** on notifications: users can only SELECT/UPDATE their own notifications. INSERT is server-side only (service role)
- **Timezone:** Reminder queries use `America/Sao_Paulo` timezone for Brazilian market
