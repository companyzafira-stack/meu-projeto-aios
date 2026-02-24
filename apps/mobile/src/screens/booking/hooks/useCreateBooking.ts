import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CreateBookingParams {
  petshopId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  items: {
    petId: string;
    serviceId: string;
    price: number;
    durationMinutes: number;
  }[];
}

interface CreatedBooking {
  id: string;
}

function normalizeTime(time: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }

  throw new Error('Horário inválido');
}

export function useCreateBooking() {
  const { user } = useAuth();

  const mutation = useMutation<CreatedBooking, Error, CreateBookingParams>({
    mutationFn: async (params) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tutor_id: user.id,
          petshop_id: params.petshopId,
          booking_date: params.bookingDate,
          start_time: normalizeTime(params.startTime),
          end_time: normalizeTime(params.endTime),
          status: 'pending_payment',
          total_amount: params.totalAmount,
        })
        .select('id')
        .single();

      if (bookingError) {
        throw bookingError;
      }

      const bookingItems = params.items.map((item) => ({
        booking_id: booking.id,
        pet_id: item.petId,
        service_id: item.serviceId,
        price: item.price,
        duration_minutes: item.durationMinutes,
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) {
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw itemsError;
      }

      return booking as CreatedBooking;
    },
  });

  return {
    createBooking: mutation.mutate,
    createBookingAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
  };
}
