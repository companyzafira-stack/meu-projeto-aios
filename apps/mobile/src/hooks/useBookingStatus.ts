import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface BookingStatusRow {
  id: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  paid_at: string | null;
}

export function useBookingStatus(
  bookingId: string | null,
  enabled: boolean = false
) {
  const isEnabled = Boolean(bookingId) && enabled;

  const { data, isLoading } = useQuery<BookingStatusRow | null, Error>({
    queryKey: ['booking-status', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        return null;
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, status, payment_status, payment_method, paid_at')
        .eq('id', bookingId)
        .single();

      if (error) {
        throw error;
      }

      return booking as BookingStatusRow;
    },
    enabled: isEnabled,
    refetchInterval: isEnabled ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  return {
    booking: data ?? null,
    isLoading,
  };
}
