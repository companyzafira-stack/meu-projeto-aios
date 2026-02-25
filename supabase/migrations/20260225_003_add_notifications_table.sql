-- Extend notifications table for in-app notification center (table already exists since IPET-002)
ALTER TABLE public.notifications
  ALTER COLUMN body SET DEFAULT '';

UPDATE public.notifications
SET body = COALESCE(body, '')
WHERE body IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN body SET NOT NULL;

ALTER TABLE public.notifications
  ALTER COLUMN data_json SET DEFAULT '{}'::jsonb;

UPDATE public.notifications
SET data_json = '{}'::jsonb
WHERE data_json IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN data_json SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Reminder tracking flags (prevent duplicates)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.get_bookings_needing_reminder(p_type TEXT)
RETURNS TABLE (
  booking_id UUID,
  tutor_id UUID,
  tutor_push_token TEXT,
  tutor_name TEXT,
  pet_names TEXT,
  petshop_name TEXT,
  booking_date DATE,
  start_time TIME
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH base AS (
    SELECT
      b.id,
      b.tutor_id,
      p.push_token,
      p.display_name,
      ps.name AS petshop_name,
      b.booking_date,
      b.start_time,
      ((b.booking_date::timestamp + b.start_time) AT TIME ZONE 'America/Sao_Paulo') AS appointment_at
    FROM public.bookings b
    JOIN public.profiles p ON p.id = b.tutor_id
    JOIN public.petshops ps ON ps.id = b.petshop_id
    WHERE b.status = 'confirmed'
      AND (
        (p_type = '24h' AND COALESCE(b.reminder_24h_sent, FALSE) = FALSE)
        OR (p_type = '2h' AND COALESCE(b.reminder_2h_sent, FALSE) = FALSE)
      )
  )
  SELECT
    base.id AS booking_id,
    base.tutor_id,
    base.push_token AS tutor_push_token,
    base.display_name AS tutor_name,
    STRING_AGG(DISTINCT pet.name, ', ') AS pet_names,
    base.petshop_name,
    base.booking_date,
    base.start_time
  FROM base
  JOIN public.booking_items bi ON bi.booking_id = base.id
  JOIN public.pets pet ON pet.id = bi.pet_id
  WHERE (
      p_type = '24h'
      AND base.appointment_at >= NOW() + INTERVAL '23 hours 30 minutes'
      AND base.appointment_at < NOW() + INTERVAL '24 hours 30 minutes'
    )
    OR (
      p_type = '2h'
      AND base.appointment_at >= NOW() + INTERVAL '1 hour 30 minutes'
      AND base.appointment_at < NOW() + INTERVAL '2 hours 30 minutes'
    )
  GROUP BY base.id, base.tutor_id, base.push_token, base.display_name,
           base.petshop_name, base.booking_date, base.start_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_bookings_needing_reminder(TEXT) TO service_role;
