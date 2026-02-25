import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { usePayment } from '@/hooks/usePayment';
import type { MainStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingPaymentFailed'>;

interface BookingStatusCheckRow {
  status: string;
  payment_status: string | null;
}

export const BookingPaymentFailedScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { createPreference, isCreating } = usePayment();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRetry = async () => {
    try {
      const preference = await createPreference(bookingId);

      await WebBrowser.openBrowserAsync(
        __DEV__ ? preference.sandboxInitPoint : preference.initPoint,
        {
          dismissButtonStyle: 'cancel',
          showTitle: true,
        }
      );

      const { data: updatedBooking, error } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', bookingId)
        .single();

      if (error) {
        throw error;
      }

      const booking = updatedBooking as BookingStatusCheckRow;

      if (booking.status === 'confirmed') {
        navigation.replace('BookingSuccess', { bookingId });
      } else if (booking.payment_status === 'rejected' || booking.status === 'cancelled') {
        navigation.replace('BookingPaymentFailed', { bookingId });
      } else {
        navigation.replace('BookingPending', { bookingId });
      }
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error
          ? error.message
          : 'Não foi possível reabrir o pagamento.'
      );
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancelar?', 'Tem certeza que deseja cancelar o agendamento?', [
      { text: 'Não' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCancelling(true);
            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'cancelled',
                cancelled_by: 'tutor',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', bookingId);

            if (error) {
              throw error;
            }

            navigation.navigate('Home');
          } catch {
            Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>✕</Text>
      </View>

      <Text style={styles.title}>Pagamento não aprovado</Text>
      <Text style={styles.message}>
        O pagamento não foi aprovado. Tente novamente com outro método de pagamento.
      </Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isCreating ? styles.buttonDisabled : null]}
          onPress={handleRetry}
          disabled={isCreating}
          activeOpacity={0.9}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.outlineDangerButton,
            isCancelling ? styles.buttonDisabledOutline : null,
          ]}
          onPress={handleCancel}
          disabled={isCancelling}
          activeOpacity={0.9}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <Text style={styles.outlineDangerButtonText}>Cancelar Agendamento</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 40,
    color: '#e74c3c',
    fontWeight: '700',
    lineHeight: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: 32,
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  outlineDangerButton: {
    borderWidth: 1,
    borderColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: '#fff',
  },
  outlineDangerButtonText: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonDisabledOutline: {
    opacity: 0.7,
  },
});
