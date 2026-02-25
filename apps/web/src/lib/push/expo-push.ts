const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
  );
}

export async function sendPushNotification(message: PushMessage): Promise<void> {
  if (!message.to || !isExpoPushToken(message.to)) {
    console.warn('Invalid push token, skipping:', message.to);
    return;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
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

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const validMessages = messages.filter(
    (message) => message.to && isExpoPushToken(message.to)
  );

  if (validMessages.length === 0) {
    return;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(
      validMessages.map((message) => ({
        ...message,
        sound: message.sound ?? 'default',
      }))
    ),
  });

  if (!response.ok) {
    console.error('Batch push failed:', await response.text());
  }
}
