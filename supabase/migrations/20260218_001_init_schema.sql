-- =====================================================
-- IPET Database Schema & Migrations
-- Version: 1.0.0
-- Description: Complete database schema for IPET marketplace
-- =====================================================

-- =====================================================
-- 1. PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('tutor', 'petshop_owner', 'admin')) DEFAULT 'tutor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 2. PETS
-- =====================================================
CREATE TABLE public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT CHECK (species IN ('dog', 'cat', 'other')) NOT NULL,
  breed TEXT,
  size TEXT CHECK (size IN ('P', 'M', 'G', 'GG')) NOT NULL,
  age_months INT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pets_user ON pets(user_id);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pets" ON pets FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. PET SHOPS
-- =====================================================
CREATE TABLE public.petshops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'MG',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  cover_photo TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'suspended', 'rejected')) DEFAULT 'pending',
  plan TEXT CHECK (plan IN ('basic', 'pro', 'premium')) DEFAULT 'basic',
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_bookings INT DEFAULT 0,
  no_show_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_petshops_city ON petshops(city);
CREATE INDEX idx_petshops_status ON petshops(status);
CREATE INDEX idx_petshops_location ON petshops(lat, lng);
CREATE INDEX idx_petshops_owner ON petshops(owner_id);

ALTER TABLE public.petshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active petshops" ON petshops FOR SELECT USING (status = 'active');
CREATE POLICY "Owner can manage own petshop" ON petshops FOR ALL USING (auth.uid() = owner_id);

-- =====================================================
-- 4. PET SHOP PHOTOS
-- =====================================================
CREATE TABLE public.petshop_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. SERVICES
-- =====================================================
CREATE TABLE public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('banho', 'tosa', 'combo', 'addon')) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  is_addon BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_petshop ON services(petshop_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services" ON services FOR SELECT USING (TRUE);
CREATE POLICY "Owner can manage services" ON services FOR ALL
  USING (petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid()));

-- =====================================================
-- 6. SERVICE PRICES (per size)
-- =====================================================
CREATE TABLE public.service_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  size TEXT CHECK (size IN ('P', 'M', 'G', 'GG')) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  UNIQUE(service_id, size)
);

-- =====================================================
-- 7. SCHEDULES
-- =====================================================
CREATE TABLE public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  max_concurrent INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(petshop_id, day_of_week)
);

-- =====================================================
-- 8. SCHEDULE BLOCKS
-- =====================================================
CREATE TABLE public.schedule_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. BOOKINGS
-- =====================================================
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID REFERENCES public.profiles(id) NOT NULL,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending_payment',
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  payment_id TEXT,
  payment_status TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('tutor', 'petshop', 'system')),
  cancelled_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_tutor ON bookings(tutor_id);
CREATE INDEX idx_bookings_petshop ON bookings(petshop_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutor can view own bookings" ON bookings FOR SELECT USING (auth.uid() = tutor_id);
CREATE POLICY "Petshop can view own bookings" ON bookings FOR SELECT
  USING (petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid()));
CREATE POLICY "Tutor can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutor can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = tutor_id);
CREATE POLICY "Petshop can update own bookings" ON bookings FOR UPDATE
  USING (petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid()));

-- =====================================================
-- 10. BOOKING ITEMS
-- =====================================================
CREATE TABLE public.booking_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL
);

-- =====================================================
-- 11. BOOKING PHOTOS
-- =====================================================
CREATE TABLE public.booking_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. REVIEWS
-- =====================================================
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tutor_id UUID REFERENCES public.profiles(id) NOT NULL,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  petshop_response TEXT,
  response_date TIMESTAMPTZ,
  is_reported BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_petshop ON reviews(petshop_id);
CREATE INDEX idx_reviews_tutor ON reviews(tutor_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden reviews" ON reviews FOR SELECT USING (NOT is_hidden);
CREATE POLICY "Tutor can create review" ON reviews FOR INSERT WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutor can update own review" ON reviews FOR UPDATE USING (auth.uid() = tutor_id);

-- =====================================================
-- 13. NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data_json JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 14. MULTI-PET DISCOUNT
-- =====================================================
CREATE TABLE public.petshop_multi_pet_discount (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  min_pets INT NOT NULL DEFAULT 2,
  discount_percent DECIMAL(5,2) NOT NULL,
  UNIQUE(petshop_id, min_pets)
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- Tables created: 14
-- RLS policies: enabled on all user-facing tables
-- Indexes: created for common queries
-- Triggers: auto-create profile on signup
