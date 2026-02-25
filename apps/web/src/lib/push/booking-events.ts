import { createClient } from '@supabase/supabase-js';
import { storeAndSendNotification } from './notification-store';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BookingNotificationData {
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

interface BookingOwnerRow {
  tutor_id: string;
  petshop_id: string;
  petshops: { owner_id: string } | { owner_id: string }[] | null;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function asSingle<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getBookingData(bookingId: string): Promise<BookingNotificationData | null> {
  const { data, error } = await supabaseAdmin.rpc('get_booking_notification_data', {
    p_booking_id: bookingId,
  });

  if (error || !data?.length) {
    return null;
  }

  return (data[0] ?? null) as BookingNotificationData | null;
}

async function getBookingParticipants(
  bookingId: string
): Promise<{ tutorId: string; petshopId: string; petshopOwnerId: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('tutor_id, petshop_id, petshops(owner_id)')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as BookingOwnerRow;
  const petshop = asSingle(row.petshops);

  return {
    tutorId: row.tutor_id,
    petshopId: row.petshop_id,
    petshopOwnerId: petshop?.owner_id ?? null,
  };
}

export async function onBookingConfirmed(bookingId: string): Promise<void> {
  const [bookingData, participants] = await Promise.all([
    getBookingData(bookingId),
    getBookingParticipants(bookingId),
  ]);

  if (!bookingData || !participants) {
    return;
  }

  await storeAndSendNotification({
    userId: participants.tutorId,
    pushToken: bookingData.tutor_push_token,
    type: 'booking_confirmed',
    title: 'Agendamento confirmado! ✅',
    body: `${bookingData.pet_names || 'Seus pets'} em ${bookingData.petshop_name || 'pet shop'} dia ${formatDate(bookingData.booking_date)} às ${formatTime(bookingData.start_time)}`,
    data: { bookingId, petshopId: participants.petshopId },
  });

  if (participants.petshopOwnerId) {
    await storeAndSendNotification({
      userId: participants.petshopOwnerId,
      pushToken: bookingData.petshop_owner_push_token,
      type: 'new_booking',
      title: 'Novo agendamento! 📋',
      body: `${bookingData.tutor_name || 'Tutor'} - ${bookingData.service_names || 'Serviços'} - ${formatDate(bookingData.booking_date)} ${formatTime(bookingData.start_time)}`,
      data: { bookingId, petshopId: participants.petshopId },
    });
  }
}

export async function onBookingCancelled(
  bookingId: string,
  cancelledBy: string
): Promise<void> {
  const [bookingData, participants] = await Promise.all([
    getBookingData(bookingId),
    getBookingParticipants(bookingId),
  ]);

  if (!bookingData || !participants) {
    return;
  }

  await storeAndSendNotification({
    userId: participants.tutorId,
    pushToken: bookingData.tutor_push_token,
    type: 'booking_cancelled',
    title: 'Agendamento cancelado ❌',
    body:
      cancelledBy === 'system'
        ? 'Seu agendamento foi cancelado por falta de pagamento.'
        : `Agendamento em ${bookingData.petshop_name || 'pet shop'} dia ${formatDate(bookingData.booking_date)} foi cancelado.`,
    data: { bookingId, petshopId: participants.petshopId, cancelledBy },
  });

  if (cancelledBy === 'tutor' && participants.petshopOwnerId) {
    await storeAndSendNotification({
      userId: participants.petshopOwnerId,
      pushToken: bookingData.petshop_owner_push_token,
      type: 'booking_cancelled',
      title: 'Agendamento cancelado ❌',
      body: `${bookingData.tutor_name || 'Tutor'} cancelou o agendamento de ${formatDate(bookingData.booking_date)} ${formatTime(bookingData.start_time)}`,
      data: { bookingId, petshopId: participants.petshopId, cancelledBy },
    });
  }
}

export async function onBookingInProgress(bookingId: string): Promise<void> {
  const [bookingData, participants] = await Promise.all([
    getBookingData(bookingId),
    getBookingParticipants(bookingId),
  ]);

  if (!bookingData || !participants) {
    return;
  }

  await storeAndSendNotification({
    userId: participants.tutorId,
    pushToken: bookingData.tutor_push_token,
    type: 'booking_in_progress',
    title: 'Atendimento iniciado! 🐾',
    body: `${bookingData.pet_names || 'Seu pet'} está sendo atendido em ${bookingData.petshop_name || 'pet shop'}`,
    data: { bookingId, petshopId: participants.petshopId },
  });
}

export async function onBookingCompleted(bookingId: string): Promise<void> {
  const [bookingData, participants] = await Promise.all([
    getBookingData(bookingId),
    getBookingParticipants(bookingId),
  ]);

  if (!bookingData || !participants) {
    return;
  }

  await storeAndSendNotification({
    userId: participants.tutorId,
    pushToken: bookingData.tutor_push_token,
    type: 'booking_completed',
    title: 'Pronto! 🎉',
    body: `${bookingData.pet_names || 'Seu pet'} está pronto! Veja como ficou 🐾`,
    data: { bookingId, petshopId: participants.petshopId },
  });
}

export async function sendReminder(
  bookingId: string,
  type: '24h' | '2h',
  tutorId: string,
  pushToken: string | null,
  petNames: string,
  petshopName: string,
  _date: string,
  time: string
): Promise<void> {
  const title = type === '24h' ? 'Lembrete: amanhã! 📅' : 'Daqui 2 horas! ⏰';
  const body =
    type === '24h'
      ? `${petNames} em ${petshopName} amanhã às ${formatTime(time)}`
      : `${petNames} em ${petshopName} às ${formatTime(time)}`;

  await storeAndSendNotification({
    userId: tutorId,
    pushToken,
    type: `reminder_${type}`,
    title,
    body,
    data: { bookingId },
  });
}
