import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    registerForPushNotifications().then((token) => {
      if (!isMounted || !token) {
        return;
      }

      setPushToken(token);

      supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save push token:', error);
          }
        });
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Foreground notifications are displayed by the handler above.
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void data;
      });

    return () => {
      isMounted = false;

      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
        notificationListener.current = null;
      }

      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
        responseListener.current = null;
      }
    };
  }, [queryClient, user]);

  return { pushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

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

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return tokenData.data;
}
