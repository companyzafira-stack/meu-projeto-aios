import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/RootNavigator';
import { supabase } from '@/lib/supabase';
import { usePayment } from '@/hooks/usePayment';
import { useBooking } from '../context/BookingContext';
import { useCreateBooking } from '../hooks/useCreateBooking';

function formatPriceBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDateBr(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

type MainNavigation = NativeStackNavigationProp<MainStackParamList>;

export const ReviewStep: React.FC = () => {
  const navigation = useNavigation<MainNavigation>();
  const {
    state,
    dispatch,
    subtotal,
    discountAmount,
    totalAmount,
    totalDuration,
  } = useBooking();
  const { createBookingAsync, isCreating: isCreatingBooking } = useCreateBooking();
  const { createPreference, isCreating: isCreatingPayment } = usePayment();

  const handleConfirmBooking = async () => {
    if (!state.selectedDate || !state.selectedSlot) {
      Alert.alert('Erro', 'Selecione a data e o horário do agendamento.');
      return;
    }

    if (totalAmount <= 0) {
      Alert.alert('Erro', 'Total inválido para criar o agendamento.');
      return;
    }

    const mainServiceItems = state.selectedServices.map((service) => ({
      petId: service.petId,
      serviceId: service.serviceId,
      price: service.price,
      durationMinutes: service.duration_minutes,
    }));

    const addonItems = state.selectedAddons.map((addon) => ({
      petId: addon.petId,
      serviceId: addon.serviceId,
      price: addon.price,
      durationMinutes: addon.duration_minutes,
    }));

    try {
      const booking = await createBookingAsync({
        petshopId: state.petshopId,
        bookingDate: state.selectedDate,
        startTime: state.selectedSlot.start,
        endTime: state.selectedSlot.end,
        totalAmount,
        items: [...mainServiceItems, ...addonItems],
      });

      const preference = await createPreference(booking.id);

      await WebBrowser.openBrowserAsync(
        __DEV__ ? preference.sandboxInitPoint : preference.initPoint,
        { dismissButtonStyle: 'cancel', showTitle: true }
      );

      const { data: updatedBooking, error: bookingStatusError } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', booking.id)
        .single();

      if (bookingStatusError) {
        throw bookingStatusError;
      }

      const status = (updatedBooking as { status?: string; payment_status?: string | null })?.status;
      const paymentStatus = (updatedBooking as { payment_status?: string | null })?.payment_status ?? null;

      if (status === 'confirmed') {
        dispatch({ type: 'RESET' });
        navigation.navigate('BookingSuccess', { bookingId: booking.id });
      } else if (paymentStatus === 'rejected' || status === 'cancelled') {
        navigation.navigate('BookingPaymentFailed', { bookingId: booking.id });
      } else {
        navigation.navigate('BookingPending', { bookingId: booking.id });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar o pagamento.';
      Alert.alert('Erro', message);
    }
  };

  const isButtonDisabled = isCreatingBooking || isCreatingPayment;

  const buttonLabel =
    isCreatingBooking || isCreatingPayment
      ? 'Criando pagamento...'
      : `Agendar e Pagar → ${formatPriceBRL(totalAmount)}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Resumo do Agendamento</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{state.petshopName}</Text>
          <Text style={styles.cardSubtitle}>{state.petshopAddress}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.rowText}>
            📅 {state.selectedDate ? formatDateBr(state.selectedDate) : 'Data não selecionada'}
          </Text>
          <Text style={styles.rowText}>
            🕐{' '}
            {state.selectedSlot
              ? `${state.selectedSlot.start} - ${state.selectedSlot.end}`
              : 'Horário não selecionado'}
          </Text>
          <Text style={styles.metaText}>⏱ Duração total: {totalDuration}min</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pets & Serviços</Text>
          {state.selectedPets.map((pet, petIndex) => {
            const mainService = state.selectedServices.find(
              (service) => service.petId === pet.id
            );
            const addons = state.selectedAddons.filter((addon) => addon.petId === pet.id);

            return (
              <View key={pet.id} style={styles.petSummaryBlock}>
                <View style={styles.petSummaryHeader}>
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
                  ) : (
                    <View style={[styles.petPhoto, styles.petPhotoPlaceholder]}>
                      <Text style={styles.petPhotoPlaceholderText}>🐾</Text>
                    </View>
                  )}
                  <View style={styles.petSummaryInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petMeta}>Porte {pet.size}</Text>
                  </View>
                </View>

                {mainService ? (
                  <View style={styles.lineItemRow}>
                    <Text style={styles.lineItemLabel}>{mainService.serviceName}</Text>
                    <Text style={styles.lineItemValue}>{formatPriceBRL(mainService.price)}</Text>
                  </View>
                ) : (
                  <Text style={styles.missingItemText}>Serviço principal não selecionado</Text>
                )}

                {addons.map((addon) => (
                  <View key={`${pet.id}-${addon.serviceId}`} style={styles.lineItemRow}>
                    <Text style={styles.addonLabel}>+ {addon.serviceName}</Text>
                    <Text style={styles.addonValue}>{formatPriceBRL(addon.price)}</Text>
                  </View>
                ))}

                {petIndex < state.selectedPets.length - 1 ? (
                  <View style={styles.petDivider} />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>{formatPriceBRL(subtotal)}</Text>
          </View>

          {state.discount && discountAmount > 0 ? (
            <View style={styles.priceRow}>
              <Text style={styles.discountLabel}>
                Desconto multi-pet ({state.discount.percent}%)
              </Text>
              <Text style={styles.discountValue}>- {formatPriceBRL(discountAmount)}</Text>
            </View>
          ) : null}

          <View style={styles.priceDivider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPriceBRL(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>Política de Cancelamento</Text>
          <Text style={styles.policyText}>
            Cancelamento gratuito até 2 horas antes do horário agendado. Após esse prazo, o valor será cobrado integralmente.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isButtonDisabled ? styles.confirmButtonDisabled : null]}
          onPress={handleConfirmBooking}
          disabled={isButtonDisabled}
          activeOpacity={0.9}
        >
          <View style={styles.confirmButtonContent}>
            {(isCreatingBooking || isCreatingPayment) ? (
              <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
            ) : null}
            <Text style={styles.confirmButtonText}>{buttonLabel}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  rowText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  petSummaryBlock: {
    marginTop: 8,
  },
  petSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  petPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  petPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petPhotoPlaceholderText: {
    fontSize: 16,
  },
  petSummaryInfo: {
    marginLeft: 10,
  },
  petName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  petMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  lineItemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingRight: 8,
  },
  lineItemValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  addonLabel: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    paddingLeft: 12,
    paddingRight: 8,
  },
  addonValue: {
    fontSize: 13,
    color: '#666',
  },
  missingItemText: {
    fontSize: 13,
    color: '#e74c3c',
  },
  petDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#333',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  discountLabel: {
    fontSize: 14,
    color: '#2ecc71',
  },
  discountValue: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  policyCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFEAB5',
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  policyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
