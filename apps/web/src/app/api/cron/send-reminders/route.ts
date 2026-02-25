import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReminder } from '@/lib/push/booking-events';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CRON_SECRET = process.env.CRON_SECRET;

interface ReminderRow {
  booking_id: string;
  tutor_id: string;
  tutor_push_token: string | null;
  tutor_name: string | null;
  pet_names: string | null;
  petshop_name: string | null;
  booking_date: string;
  start_time: string;
}

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) {
    return true;
  }

  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sent24h = 0;
  let sent2h = 0;

  try {
    const { data: reminders24h, error: reminders24hError } = await supabaseAdmin.rpc(
      'get_bookings_needing_reminder',
      { p_type: '24h' }
    );

    if (reminders24hError) {
      throw reminders24hError;
    }

    for (const reminder of ((reminders24h ?? []) as ReminderRow[])) {
      await sendReminder(
        reminder.booking_id,
        '24h',
        reminder.tutor_id,
        reminder.tutor_push_token,
        reminder.pet_names || 'Seu pet',
        reminder.petshop_name || 'pet shop',
        reminder.booking_date,
        reminder.start_time
      );

      const { error: markError } = await supabaseAdmin
        .from('bookings')
        .update({ reminder_24h_sent: true })
        .eq('id', reminder.booking_id);

      if (markError) {
        throw markError;
      }

      sent24h += 1;
    }

    const { data: reminders2h, error: reminders2hError } = await supabaseAdmin.rpc(
      'get_bookings_needing_reminder',
      { p_type: '2h' }
    );

    if (reminders2hError) {
      throw reminders2hError;
    }

    for (const reminder of ((reminders2h ?? []) as ReminderRow[])) {
      await sendReminder(
        reminder.booking_id,
        '2h',
        reminder.tutor_id,
        reminder.tutor_push_token,
        reminder.pet_names || 'Seu pet',
        reminder.petshop_name || 'pet shop',
        reminder.booking_date,
        reminder.start_time
      );

      const { error: markError } = await supabaseAdmin
        .from('bookings')
        .update({ reminder_2h_sent: true })
        .eq('id', reminder.booking_id);

      if (markError) {
        throw markError;
      }

      sent2h += 1;
    }

    return NextResponse.json({ sent24h, sent2h });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
