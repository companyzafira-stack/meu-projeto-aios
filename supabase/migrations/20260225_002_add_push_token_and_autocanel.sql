-- Add push_token to profiles for push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Auto-cancel expired bookings (pending_payment > 15 minutes)
CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_by = 'system',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending_payment'
    AND created_at < NOW() - INTERVAL '15 minutes';
END;
$$;

-- Schedule: run every 5 minutes
SELECT cron.schedule(
  'cancel-expired-bookings',
  '*/5 * * * *',
  'SELECT public.cancel_expired_bookings()'
);

-- Function to get booking details for notifications (used by webhook)
CREATE OR REPLACE FUNCTION public.get_booking_notification_data(p_booking_id UUID)
RETURNS TABLE (
  booking_id UUID,
  booking_date DATE,
  start_time TIME,
  tutor_name TEXT,
  tutor_push_token TEXT,
  pet_names TEXT,
  petshop_name TEXT,
  petshop_owner_push_token TEXT,
  service_names TEXT,
  total_amount DECIMAL
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    b.id AS booking_id,
    b.booking_date,
    b.start_time,
    tp.display_name AS tutor_name,
    tp.push_token AS tutor_push_token,
    STRING_AGG(DISTINCT p.name, ', ') AS pet_names,
    ps.name AS petshop_name,
    op.push_token AS petshop_owner_push_token,
    STRING_AGG(DISTINCT s.name, ', ') AS service_names,
    b.total_amount
  FROM public.bookings b
  JOIN public.profiles tp ON tp.id = b.tutor_id
  JOIN public.petshops ps ON ps.id = b.petshop_id
  JOIN public.profiles op ON op.id = ps.owner_id
  JOIN public.booking_items bi ON bi.booking_id = b.id
  JOIN public.pets p ON p.id = bi.pet_id
  JOIN public.services s ON s.id = bi.service_id
  WHERE b.id = p_booking_id
  GROUP BY b.id, b.booking_date, b.start_time, tp.display_name, tp.push_token,
           ps.name, op.push_token, b.total_amount;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_notification_data(UUID) TO service_role;
