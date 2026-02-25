import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications } from '@/hooks/useNotifications';
import type { MainStackParamList } from '@/navigation/RootNavigator';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

export const NotificationBell: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { unreadCount } = useNotifications();

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Notifications')}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificações"
    >
      <Text style={styles.bell}>🔔</Text>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  bell: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
});
