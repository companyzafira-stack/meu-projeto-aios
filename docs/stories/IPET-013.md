---
story_id: IPET-013
status: In Review
epic: App Tutor
priority: High
feature_section: F6 (Acompanhamento)
acceptance_criteria:
  - Push tokens registrados no login
  - Notificações enviadas em cada evento de booking
  - Central de notificações in-app
  - Notificações funcionam em background
scope: Both
dependencies:
  - IPET-012
constraints:
  - "Firebase Cloud Messaging via Expo"
  - "expo-notifications"
estimates_days: 2
---

# Push Notifications System — IPET-013

## Summary
Sistema de push notifications usando Firebase Cloud Messaging via Expo. Registra tokens, envia notificações em eventos de booking, e central de notificações in-app.

## User Story
As a tutor/pet shop owner,
I want to receive push notifications about my bookings,
So that I stay informed in real-time without checking the app constantly.

## Acceptance Criteria
- [x] Device push token registrado no login (salvo em profiles.push_token)
- [x] Notificação enviada em cada evento:
  - `booking_confirmed` → tutor: "Agendamento confirmado!" + pet shop: "Novo agendamento!"
  - `reminder_24h` → tutor: "Lembrete: amanhã às [hora] no [pet shop]"
  - `reminder_2h` → tutor: "Daqui 2h: [pet] no [pet shop]"
  - `in_progress` → tutor: "[Pet] está sendo atendido!"
  - `completed` → tutor: "[Pet] está pronto! Veja como ficou 🐾"
  - `cancelled` → tutor/pet shop: "Agendamento cancelado"
- [x] Notificações funcionam com app em background e fechado
- [x] Central de notificações: ícone de sino no header do app
- [x] Badge com contagem de não lidas
- [x] Lista de notificações com título, corpo, data, status (lida/não lida)
- [x] Tocar na notificação navega para tela relevante (booking detail)
- [x] Marcar todas como lidas

## Technical Details

### Dependencies
```bash
npx expo install expo-notifications expo-device expo-constants
```

### Token Registration
```typescript
// apps/mobile/src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;

  // Save to Supabase
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  return token;
}
```

### Send Notification (Supabase Edge Function)
```typescript
// supabase/functions/send-notification/index.ts
export async function sendPushNotification(userId: string, title: string, body: string, data?: object) {
  const { data: profile } = await supabase.from('profiles').select('push_token').eq('id', userId).single();
  if (!profile?.push_token) return;

  // Insert in notifications table
  await supabase.from('notifications').insert({
    user_id: userId, type: data?.type, title, body, data_json: data
  });

  // Send via Expo Push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: profile.push_token, title, body, data,
      sound: 'default', badge: 1,
    }),
  });
}
```

### Scheduled Reminders (24h + 2h)
```sql
-- Supabase cron job (pg_cron extension)
-- Run every hour, find bookings 24h or 2h away
SELECT cron.schedule('booking-reminders', '0 * * * *', $$
  SELECT send_reminder(id, '24h') FROM bookings
  WHERE status = 'confirmed'
  AND booking_date = CURRENT_DATE + INTERVAL '1 day'
  AND start_time = CURRENT_TIME::TIME;
$$);
```

### Notification Center (App)
```
src/screens/notifications/
├── NotificationCenterScreen.tsx  — Lista de notificações
├── components/
│   └── NotificationItem.tsx      — Item individual (ícone, título, corpo, data)
└── hooks/
    └── useNotifications.ts       — Badge count, mark as read
```

## Testing
- [x] Token registrado no login (verificar no banco)
- [x] Push recebido ao confirmar booking
- [x] Push recebido em background
- [x] Tocar na notificação abre tela correta
- [x] Central mostra notificações ordenadas por data
- [x] Badge count atualiza ao receber nova
- [x] Marcar como lida funciona
- [x] Reminder 24h enviado no horário correto
- [x] Reminder 2h enviado no horário correto

## File List
*Auto-maintained*

## Notes
- Expo Push API é gratuita e não precisa de Firebase setup manual
- pg_cron para reminders (ou Supabase Edge Function com cron)
- Adicionar campo push_token na tabela profiles (migration)
- Rate limit: Expo permite 600 push/segundo (mais que suficiente)

## Related Stories
- Bloqueada por: IPET-012 (Confirmation)
- Usada por: IPET-014 (Status), IPET-015 (Photos), IPET-022 (Cancel)
