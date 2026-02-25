import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import type { MainStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingSuccess'>;

interface RawReceiptPetshop {
  name: string | null;
  address: string | null;
}

interface RawReceiptPet {
  name: string | null;
  size: string | null;
}

interface RawReceiptService {
  name: string | null;
}

interface RawBookingItem {
  price: number | string;
  duration_minutes: number;
  pets: RawReceiptPet | RawReceiptPet[] | null;
  services: RawReceiptService | RawReceiptService[] | null;
}

interface RawBookingReceipt {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number | string;
  payment_method: string | null;
  payment_status: string | null;
  paid_at: string | null;
  status: string;
  petshops: RawReceiptPetshop | RawReceiptPetshop[] | null;
  booking_items: RawBookingItem[] | null;
}

function asSingleObject<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPriceBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case 'pix':
      return 'Pix';
    case 'credit_card':
      return 'Cartão de Crédito';
    case 'debit_card':
      return 'Cartão de Débito';
    default:
      return method || '—';
  }
}

export const BookingSuccessScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;

  const { data, isLoading, error } = useQuery<RawBookingReceipt | null, Error>({
    queryKey: ['booking-receipt', bookingId],
    queryFn: async () => {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(
          `
            id,
            booking_date,
            start_time,
            end_time,
            total_amount,
            payment_method,
            payment_status,
            paid_at,
            status,
            petshops(name, address),
            booking_items(
              price,
              duration_minutes,
              pets(name, size),
              services(name)
            )
          `
        )
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return (booking ?? null) as RawBookingReceipt | null;
    },
    enabled: Boolean(bookingId),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Erro ao carregar comprovante</Text>
        <Text style={styles.errorMessage}>{error?.message || 'Agendamento não encontrado'}</Text>
      </View>
    );
  }

  const petshop = asSingleObject(data.petshops);
  const bookingItems = data.booking_items ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.successIconCircle}>
        <Text style={styles.successCheckText}>✓</Text>
      </View>
      <Text style={styles.title}>Agendamento Confirmado!</Text>
      <Text style={styles.subtitle}>Seu pagamento foi aprovado</Text>

      <View style={styles.receiptCard}>
        <Text style={styles.receiptHeader}>Comprovante</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Booking ID</Text>
          <Text style={styles.rowValueMuted}>#{data.id.substring(0, 8)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pet Shop</Text>
          <Text style={styles.rowValueStrong}>{petshop?.name || '—'}</Text>
        </View>
        <View style={styles.rowColumn}>
          <Text style={styles.rowLabel}>Endereço</Text>
          <Text style={styles.rowValueAddress}>{petshop?.address || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Data</Text>
          <Text style={styles.rowValueStrong}>{formatDate(data.booking_date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Horário</Text>
          <Text style={styles.rowValueStrong}>
            {formatTime(data.start_time)} - {formatTime(data.end_time)}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Serviços</Text>
        {bookingItems.map((item, index) => {
          const pet = asSingleObject(item.pets);
          const service = asSingleObject(item.services);

          return (
            <View key={`${data.id}-item-${index}`} style={styles.serviceRow}>
              <View style={styles.serviceRowLeft}>
                <Text style={styles.servicePetText}>
                  {(pet?.name || 'Pet')} ({pet?.size || '—'})
                </Text>
                <Text style={styles.serviceNameText}>{service?.name || 'Serviço'}</Text>
              </View>
              <Text style={styles.servicePriceText}>{formatPriceBRL(toNumber(item.price))}</Text>
            </View>
          );
        })}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pagamento</Text>
          <Text style={styles.rowValueStrong}>{paymentMethodLabel(data.payment_method)}</Text>
        </View>
        <View style={styles.rowTotal}>
          <Text style={styles.totalLabel}>Total Pago</Text>
          <Text style={styles.totalValue}>{formatPriceBRL(toNumber(data.total_amount))}</Text>
        </View>
      </View>

      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>Confirmado</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Ver Meus Agendamentos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.9}
        >
          <Text style={styles.outlineButtonText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 32,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2ecc71',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCheckText: {
    fontSize: 40,
    color: '#fff',
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  receiptHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  rowColumn: {
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#666',
    flexShrink: 1,
  },
  rowValueMuted: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  rowValueStrong: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  serviceRowLeft: {
    flex: 1,
  },
  servicePetText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  serviceNameText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  servicePriceText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  statusBadge: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: '#2ecc71',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
