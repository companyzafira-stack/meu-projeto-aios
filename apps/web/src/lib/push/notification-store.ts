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
  data?: Record<string, unknown>;
}

export async function storeAndSendNotification(
  payload: NotificationPayload
): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data_json: payload.data || {},
  });

  if (error) {
    throw error;
  }

  if (payload.pushToken) {
    await sendPushNotification({
      to: payload.pushToken,
      title: payload.title,
      body: payload.body,
      data: { ...(payload.data || {}), type: payload.type },
    });
  }
}
