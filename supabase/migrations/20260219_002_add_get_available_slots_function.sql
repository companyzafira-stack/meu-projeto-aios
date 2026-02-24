-- Function: get_available_slots
-- Called by mobile app to get available booking slots for a pet shop on a specific date
-- Returns only truly available slots (respecting schedule, blocks, and existing bookings)

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_petshop_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_start TIME,
  slot_end TIME,
  available_spots INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_slot_start TIME;
  v_slot_end TIME;
  v_booking_count INT;
  v_is_blocked BOOLEAN;
BEGIN
  -- 1. Get schedule for this day of week
  SELECT * INTO v_schedule
  FROM public.schedules
  WHERE petshop_id = p_petshop_id
    AND day_of_week = EXTRACT(DOW FROM p_date)::INT
    AND is_active = TRUE;

  -- If no schedule or inactive, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Generate slots
  v_slot_start := v_schedule.start_time;

  WHILE v_slot_start + (v_schedule.slot_duration_minutes || ' minutes')::INTERVAL <= v_schedule.end_time LOOP
    v_slot_end := v_slot_start + (v_schedule.slot_duration_minutes || ' minutes')::INTERVAL;

    -- 3. Check if blocked
    SELECT EXISTS(
      SELECT 1 FROM public.schedule_blocks
      WHERE petshop_id = p_petshop_id
        AND block_date = p_date
        AND (
          (start_time IS NULL) -- full day block
          OR (start_time < v_slot_end AND end_time > v_slot_start) -- partial overlap
        )
    ) INTO v_is_blocked;

    IF NOT v_is_blocked THEN
      -- 4. Count existing bookings in this slot
      SELECT COUNT(*) INTO v_booking_count
      FROM public.bookings
      WHERE petshop_id = p_petshop_id
        AND booking_date = p_date
        AND start_time < v_slot_end
        AND end_time > v_slot_start
        AND status IN ('pending_payment', 'confirmed', 'in_progress');

      -- 5. Only return if has available spots
      IF v_booking_count < v_schedule.max_concurrent THEN
        slot_start := v_slot_start;
        slot_end := v_slot_end;
        available_spots := v_schedule.max_concurrent - v_booking_count;
        RETURN NEXT;
      END IF;
    END IF;

    v_slot_start := v_slot_end;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (mobile app)
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO authenticated;
