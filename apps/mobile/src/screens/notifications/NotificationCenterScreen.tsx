import React, { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import type { MainStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));

  if (diffMin < 1) {
    return 'Agora';
  }

  if (diffMin < 60) {
    return `${diffMin}min atrás`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h atrás`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d atrás`;
  }

  return formatDate(dateString);
}

function getNotificationIcon(type: string): { emoji: string; backgroundColor: string } {
  switch (type) {
    case 'booking_confirmed':
      return { emoji: '✅', backgroundColor: '#E8F5E9' };
    case 'booking_cancelled':
      return { emoji: '❌', backgroundColor: '#FFEBEE' };
    case 'booking_expired':
      return { emoji: '⏰', backgroundColor: '#FFF3E0' };
    case 'reminder_24h':
      return { emoji: '📅', backgroundColor: '#E3F2FD' };
    case 'reminder_2h':
      return { emoji: '⏰', backgroundColor: '#FFF3E0' };
    case 'booking_in_progress':
      return { emoji: '🐾', backgroundColor: '#F3E5F5' };
    case 'booking_completed':
      return { emoji: '🎉', backgroundColor: '#E8F5E9' };
    case 'new_booking':
      return { emoji: '📋', backgroundColor: '#E3F2FD' };
    default:
      return { emoji: '🔔', backgroundColor: '#f0f0f0' };
  }
}

function getBookingId(notification: AppNotification): string | null {
  const value = notification.data_json.bookingId;
  return typeof value === 'string' ? value : null;
}

function shouldNavigateToBooking(notification: AppNotification): boolean {
  return [
    'booking_confirmed',
    'booking_cancelled',
    'booking_in_progress',
    'booking_completed',
    'reminder_24h',
    'reminder_2h',
    'new_booking',
  ].includes(notification.type);
}

export const NotificationCenterScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => (
              <TouchableOpacity onPress={() => markAllAsRead()} activeOpacity={0.8}>
                <Text style={styles.markAllText}>Marcar todas</Text>
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [navigation, unreadCount, markAllAsRead]);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      const bookingId = getBookingId(notification);
      if (!bookingId || !shouldNavigateToBooking(notification)) {
        return;
      }

      navigation.navigate('BookingSuccess', { bookingId });
    },
    [markAsRead, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const icon = getNotificationIcon(item.type);

      return (
        <TouchableOpacity
          style={[styles.item, !item.is_read ? styles.itemUnread : null]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: icon.backgroundColor }]}>
            <Text style={styles.iconText}>{icon.emoji}</Text>
          </View>

          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, !item.is_read ? styles.itemTitleUnread : null]}>
              {item.title}
            </Text>
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
          </View>

          {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </TouchableOpacity>
      );
    },
    [handleNotificationPress]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={[styles.container, styles.centered, styles.emptyContainer]}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
        <Text style={styles.emptyMessage}>Suas notificações aparecerão aqui</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingHorizontal: 24,
  },
  markAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    position: 'relative',
  },
  itemUnread: {
    backgroundColor: '#FFF8F8',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 18,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
  },
  itemTitleUnread: {
    fontWeight: '700',
  },
  itemBody: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    right: 16,
    top: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptyMessage: {
    marginTop: 6,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
