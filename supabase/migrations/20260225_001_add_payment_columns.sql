-- Add payment tracking columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add Mercado Pago credentials to petshops
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_user_id TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMPTZ;

-- Function to check if petshop has MP connected (without exposing tokens)
CREATE OR REPLACE FUNCTION public.is_petshop_mp_connected(p_petshop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(mp_access_token IS NOT NULL, FALSE)
  FROM public.petshops
  WHERE id = p_petshop_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_petshop_mp_connected(UUID) TO authenticated;
