import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import type { MainStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingPending'>;

interface BookingStatusRow {
  status: string;
  payment_status: string | null;
}

function extractStatusFromRealtimePayload(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const newValue = (payload as { new?: unknown }).new;
  if (typeof newValue !== 'object' || newValue === null) {
    return null;
  }

  const status = (newValue as { status?: unknown }).status;
  return typeof status === 'string' ? status : null;
}

export const BookingPendingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [showManualCheck, setShowManualCheck] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkBookingStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', bookingId)
        .single();

      if (error) {
        throw error;
      }

      const booking = data as BookingStatusRow;

      if (booking.status === 'confirmed') {
        navigation.replace('BookingSuccess', { bookingId });
        return;
      }

      if (booking.status === 'cancelled' || booking.payment_status === 'rejected') {
        navigation.replace('BookingPaymentFailed', { bookingId });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar o status do pagamento.');
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newStatus = extractStatusFromRealtimePayload(payload);

          if (newStatus === 'confirmed') {
            navigation.replace('BookingSuccess', { bookingId });
          } else if (newStatus === 'cancelled') {
            navigation.replace('BookingPaymentFailed', { bookingId });
          }
        }
      )
      .subscribe();

    const timeout = setTimeout(() => {
      setShowManualCheck(true);
    }, 60_000);

    void checkBookingStatus();

    return () => {
      void supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [bookingId, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B6B" />

      <Text style={styles.title}>Processando pagamento...</Text>
      <Text style={styles.message}>
        Aguardando confirmação do Mercado Pago. Isso pode levar alguns segundos.
      </Text>

      <View style={styles.dotsRow}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {showManualCheck ? (
        <View style={styles.manualCheckContainer}>
          <Text style={styles.manualCheckText}>Está demorando mais que o esperado</Text>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={checkBookingStatus}
            disabled={checkingStatus}
            activeOpacity={0.9}
          >
            {checkingStatus ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.outlineButtonText}>Verificar Status</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
            style={styles.linkButton}
          >
            <Text style={styles.linkButtonText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    opacity: 0.8,
  },
  manualCheckContainer: {
    marginTop: 28,
    alignItems: 'center',
    width: '100%',
  },
  manualCheckText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 14,
  },
  linkButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
});
