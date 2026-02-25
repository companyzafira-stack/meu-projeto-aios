import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data_json: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface RawNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data_json: unknown;
  is_read: boolean;
  created_at: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeNotification(row: RawNotification): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    data_json: asRecord(row.data_json),
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<AppNotification[], Error>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return ((data ?? []) as RawNotification[]).map(normalizeNotification);
    },
    enabled: Boolean(user?.id),
    staleTime: 30 * 1000,
  });

  const markAsReadMutation = useMutation<void, Error, string>({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    refetch: notificationsQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
