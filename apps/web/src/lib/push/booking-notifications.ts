import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from './expo-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BookingNotificationRow {
  booking_id: string;
  booking_date: string;
  start_time: string;
  tutor_name: string | null;
  tutor_push_token: string | null;
  pet_names: string | null;
  petshop_name: string | null;
  petshop_owner_push_token: string | null;
  service_names: string | null;
  total_amount: number | string;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${parsed.getFullYear()}`;
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

async function getBookingNotificationRow(
  bookingId: string
): Promise<BookingNotificationRow | null> {
  const { data, error } = await supabaseAdmin.rpc('get_booking_notification_data', {
    p_booking_id: bookingId,
  });

  if (error || !data || data.length === 0) {
    console.error('Failed to get booking notification data:', error);
    return null;
  }

  return (data[0] ?? null) as BookingNotificationRow | null;
}

export async function sendBookingConfirmedNotifications(
  bookingId: string
): Promise<void> {
  const booking = await getBookingNotificationRow(bookingId);

  if (!booking) {
    return;
  }

  const dateStr = formatDate(booking.booking_date);
  const timeStr = formatTime(booking.start_time);
  const petNames = booking.pet_names || 'Seus pets';
  const petshopName = booking.petshop_name || 'pet shop';
  const serviceNames = booking.service_names || 'serviços';
  const tutorName = booking.tutor_name || 'Tutor';

  if (booking.tutor_push_token) {
    await sendPushNotification({
      to: booking.tutor_push_token,
      title: 'Agendamento confirmado! ✅',
      body: `${petNames} em ${petshopName} dia ${dateStr} às ${timeStr}`,
      data: { type: 'booking_confirmed', bookingId },
    });
  }

  if (booking.petshop_owner_push_token) {
    await sendPushNotification({
      to: booking.petshop_owner_push_token,
      title: 'Novo agendamento recebido! 📋',
      body: `${tutorName} - ${serviceNames} - ${dateStr} ${timeStr}`,
      data: { type: 'new_booking', bookingId },
    });
  }
}

export async function sendBookingExpiredNotification(
  bookingId: string
): Promise<void> {
  const booking = await getBookingNotificationRow(bookingId);

  if (!booking || !booking.tutor_push_token) {
    return;
  }

  await sendPushNotification({
    to: booking.tutor_push_token,
    title: 'Agendamento expirado ⏰',
    body: 'Seu agendamento expirou por falta de pagamento. Agende novamente.',
    data: { type: 'booking_expired', bookingId },
  });
}
