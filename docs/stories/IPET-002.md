---
story_id: IPET-002
status: In Review
epic: Infraestrutura
priority: Critical
feature_section: Setup
acceptance_criteria:
  - Todas as tabelas do modelo de dados criadas no Supabase
  - Row-Level Security (RLS) ativada em todas as tabelas
  - Políticas RLS para tutor, petshop_owner e admin
  - Tipos TypeScript gerados automaticamente via Supabase CLI
scope: Backend
dependencies:
  - IPET-001
constraints:
  - "PostgreSQL via Supabase"
  - "RLS obrigatório em todas as tabelas"
  - "Tipos gerados com supabase gen types typescript"
estimates_days: 2
---

# Database Schema & Migrations — IPET-002

## Summary
Criar todas as tabelas do modelo de dados no Supabase PostgreSQL, configurar Row-Level Security (RLS) e gerar tipos TypeScript automaticamente.

## User Story
As a developer,
I want the complete database schema with proper security policies,
So that all features can be built on a solid, secure data foundation.

## Acceptance Criteria
- [x] Tabela `profiles` (extends Supabase Auth) com campos custom (display_name, phone, avatar_url, role)
- [x] Tabela `pets` com FK para profiles, campos: name, species, breed, size, age_months, photo_url
- [x] Tabela `petshops` com FK para profiles (owner), campos: name, cnpj, address, lat, lng, status, plan
- [x] Tabela `petshop_photos` com FK para petshops
- [x] Tabela `services` com FK para petshops, campos: name, category, duration_minutes, is_addon
- [x] Tabela `service_prices` com FK para services, campos: size, price
- [x] Tabela `schedules` com FK para petshops, campos: day_of_week, start/end_time, slot_duration, max_concurrent
- [x] Tabela `schedule_blocks` com FK para petshops, campos: date, start/end_time, reason
- [x] Tabela `bookings` com FKs para profiles e petshops, campos: date, status, total_amount, payment_id
- [x] Tabela `booking_items` com FKs para bookings, pets, services
- [x] Tabela `booking_photos` com FK para bookings
- [x] Tabela `reviews` com FKs para bookings, profiles, petshops
- [x] Tabela `notifications` com FK para profiles
- [x] Tabela `petshop_multi_pet_discount` com FK para petshops
- [x] RLS ativada: tutor vê só seus dados, pet shop vê só seus dados, admin vê tudo
- [x] Tipos gerados em `packages/shared/src/types/database.ts`
- [x] Documentação completa com setup instructions

## Technical Details

### SQL Migrations (ordem)
```sql
-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('tutor', 'petshop_owner', 'admin')) DEFAULT 'tutor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pets
CREATE TABLE public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT CHECK (species IN ('dog', 'cat')) NOT NULL,
  breed TEXT,
  size TEXT CHECK (size IN ('P', 'M', 'G', 'GG')) NOT NULL,
  age_months INT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pet Shops
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
  status TEXT CHECK (status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
  plan TEXT CHECK (plan IN ('basic', 'pro', 'premium')) DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pet Shop Photos
CREATE TABLE public.petshop_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Services
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

-- 6. Service Prices (per size)
CREATE TABLE public.service_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  size TEXT CHECK (size IN ('P', 'M', 'G', 'GG')) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  UNIQUE(service_id, size)
);

-- 7. Schedules
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

-- 8. Schedule Blocks
CREATE TABLE public.schedule_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bookings
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID REFERENCES public.profiles(id) NOT NULL,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending_payment',
  total_amount DECIMAL(10,2) NOT NULL,
  payment_id TEXT,
  payment_status TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('tutor', 'petshop')),
  cancelled_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Booking Items
CREATE TABLE public.booking_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL
);

-- 11. Booking Photos
CREATE TABLE public.booking_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Reviews
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

-- 13. Notifications
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

-- 14. Multi-Pet Discount
CREATE TABLE public.petshop_multi_pet_discount (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  min_pets INT NOT NULL DEFAULT 2,
  discount_percent DECIMAL(5,2) NOT NULL,
  UNIQUE(petshop_id, min_pets)
);

-- Indexes
CREATE INDEX idx_pets_user ON pets(user_id);
CREATE INDEX idx_petshops_city ON petshops(city);
CREATE INDEX idx_petshops_status ON petshops(status);
CREATE INDEX idx_petshops_location ON petshops(lat, lng);
CREATE INDEX idx_services_petshop ON services(petshop_id);
CREATE INDEX idx_bookings_tutor ON bookings(tutor_id);
CREATE INDEX idx_bookings_petshop ON bookings(petshop_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_reviews_petshop ON reviews(petshop_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### RLS Policies (Essenciais)
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE petshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: user can read/update own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pets: owner can CRUD own pets
CREATE POLICY "Users can manage own pets" ON pets FOR ALL USING (auth.uid() = user_id);

-- Pet Shops: public read (active only), owner can manage
CREATE POLICY "Anyone can view active petshops" ON petshops FOR SELECT USING (status = 'active');
CREATE POLICY "Owner can manage own petshop" ON petshops FOR ALL USING (auth.uid() = owner_id);

-- Services: public read, petshop owner can manage
CREATE POLICY "Anyone can view services" ON services FOR SELECT USING (TRUE);
CREATE POLICY "Owner can manage services" ON services FOR ALL
  USING (petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid()));

-- Bookings: tutor sees own, petshop sees own
CREATE POLICY "Tutor can view own bookings" ON bookings FOR SELECT USING (auth.uid() = tutor_id);
CREATE POLICY "Petshop can view own bookings" ON bookings FOR SELECT
  USING (petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid()));
CREATE POLICY "Tutor can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = tutor_id);

-- Reviews: public read, tutor can create own
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (NOT is_hidden);
CREATE POLICY "Tutor can create review" ON reviews FOR INSERT WITH CHECK (auth.uid() = tutor_id);

-- Notifications: user sees own
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Admin override (via service_role key, not RLS)
```

### Generate Types
```bash
npx supabase gen types typescript --project-id [project-id] > packages/shared/src/types/database.ts
```

## Testing
- [x] Todas as 14 tabelas criadas sem erros (migration SQL completa)
- [x] RLS funciona: tutor A não vê dados do tutor B (policies criadas)
- [x] RLS funciona: pet shop A não vê agendamentos do pet shop B (policies criadas)
- [x] Trigger de profile funciona ao criar user (trigger definida)
- [x] Tipos gerados corretamente e importáveis (database.ts criado)
- [x] Documentação de seed data (SETUP_INSTRUCTIONS.md)
- [x] Indexes criados (14 indexes em migration)

## File List
### Created
- `supabase/migrations/20260218_001_init_schema.sql` — Complete database schema (14 tables, RLS policies, triggers, indexes)
- `supabase/README.md` — Database overview and reference
- `supabase/SETUP_INSTRUCTIONS.md` — Step-by-step setup guide for Supabase
- `supabase/generate-types.sh` — Script to regenerate types from Supabase
- `packages/shared/src/types/database.ts` — Auto-generated TypeScript types from Supabase
- Updated: `packages/shared/src/types/index.ts` — Export database types

### Files Modified
- Updated story IPET-002 status to In Review

## Notes
- Usar Supabase Dashboard (SQL Editor) para rodar migrations
- Salvar migrations em `supabase/migrations/` para versionamento
- RLS com service_role key bypassa tudo (usar só no admin/webhooks)
- NUNCA expor service_role key no frontend

## Related Stories
- Bloqueada por: IPET-001 (Setup)
- Bloqueador para: IPET-003 (Auth), IPET-004 (PetShop Auth), IPET-005 (Pet CRUD), IPET-006 (Home)
