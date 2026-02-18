# Supabase Configuration

## Setup Inicial

### 1. Criar Projeto Supabase

1. Acesse: https://supabase.com
2. Crie novo projeto
3. Copie credenciais em Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Adicionar Credenciais ao .env

```bash
# .env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Executar Migrations

**Opção A: Via Supabase Dashboard (Recomendado)**

1. Supabase Dashboard → SQL Editor
2. Novo Query
3. Copiar conteúdo de: `supabase/migrations/20260218_001_init_schema.sql`
4. Executar

**Opção B: Via Supabase CLI**

```bash
npm install -g supabase

supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 4. Gerar Types TypeScript

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/shared/src/types/database.ts
```

## Seed Data (Testing)

### Criar Admin User

No Supabase Dashboard → Authentication → Users → Add User

```
Email: admin@ipet.app
Password: [strong password]
```

Depois no SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin', display_name = 'Admin IPET'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@ipet.app');
```

### Criar Pet Shops de Teste

```sql
-- Pet Shop 1: Banho & Tosa Curvelo
INSERT INTO public.petshops (owner_id, name, cnpj, address, city, state, lat, lng, status, plan)
SELECT id, 'Banho & Tosa Curvelo', '12.345.678/0001-90', 'Rua A, 100', 'Curvelo', 'MG', -18.7264, -44.4314, 'active', 'basic'
FROM public.profiles
WHERE role = 'petshop_owner'
LIMIT 1;

-- Pet Shop 2: Petcare Professional
INSERT INTO public.petshops (owner_id, name, cnpj, address, city, state, lat, lng, status, plan)
SELECT id, 'Petcare Professional', '98.765.432/0001-01', 'Avenida B, 250', 'Curvelo', 'MG', -18.7300, -44.4350, 'active', 'pro'
FROM public.profiles
WHERE role = 'petshop_owner'
LIMIT 1 OFFSET 1;
```

### Criar Serviços de Teste

```sql
-- Get first pet shop ID
WITH petshop_ids AS (
  SELECT id FROM public.petshops LIMIT 1
)
INSERT INTO public.services (petshop_id, name, category, duration_minutes, is_active)
SELECT id, 'Banho Simples', 'banho', 30, true FROM petshop_ids
UNION ALL
SELECT id, 'Tosa Completa', 'tosa', 45, true FROM petshop_ids
UNION ALL
SELECT id, 'Banho + Tosa', 'combo', 90, true FROM petshop_ids;

-- Add prices for services
INSERT INTO public.service_prices (service_id, size, price)
SELECT id, 'P', 40.00 FROM services WHERE name = 'Banho Simples' AND category = 'banho'
UNION ALL
SELECT id, 'M', 50.00 FROM services WHERE name = 'Banho Simples' AND category = 'banho'
UNION ALL
SELECT id, 'G', 60.00 FROM services WHERE name = 'Banho Simples' AND category = 'banho'
UNION ALL
SELECT id, 'GG', 70.00 FROM services WHERE name = 'Banho Simples' AND category = 'banho'
UNION ALL
SELECT id, 'P', 50.00 FROM services WHERE name = 'Tosa Completa' AND category = 'tosa'
UNION ALL
SELECT id, 'M', 70.00 FROM services WHERE name = 'Tosa Completa' AND category = 'tosa'
UNION ALL
SELECT id, 'G', 90.00 FROM services WHERE name = 'Tosa Completa' AND category = 'tosa'
UNION ALL
SELECT id, 'GG', 110.00 FROM services WHERE name = 'Tosa Completa' AND category = 'tosa'
UNION ALL
SELECT id, 'P', 80.00 FROM services WHERE name = 'Banho + Tosa' AND category = 'combo'
UNION ALL
SELECT id, 'M', 110.00 FROM services WHERE name = 'Banho + Tosa' AND category = 'combo'
UNION ALL
SELECT id, 'G', 140.00 FROM services WHERE name = 'Banho + Tosa' AND category = 'combo'
UNION ALL
SELECT id, 'GG', 170.00 FROM services WHERE name = 'Banho + Tosa' AND category = 'combo';
```

## Database Structure

### Tabelas Criadas
- ✅ profiles (extends auth.users)
- ✅ pets
- ✅ petshops
- ✅ petshop_photos
- ✅ services
- ✅ service_prices
- ✅ schedules
- ✅ schedule_blocks
- ✅ bookings
- ✅ booking_items
- ✅ booking_photos
- ✅ reviews
- ✅ notifications
- ✅ petshop_multi_pet_discount

### RLS Ativada
- ✅ Tutor vê só seus dados
- ✅ Pet shop vê só seus dados
- ✅ Admin vê tudo (via service_role key)
- ✅ Public read para petshops ativos e serviços

## Troubleshooting

### Erro: "RLS policy violation"
- Certifique-se de estar autenticado
- Verificar se auth.uid() retorna valor correto
- Para admin, use service_role key (server-only)

### Erro: "Trigger não existe"
- Refaça a migration do zero
- Ou execute manualmente no SQL Editor

### Tipos não gerando
```bash
# Limpar cache
rm packages/shared/src/types/database.ts

# Regenerar
npx supabase gen types typescript --project-id YOUR_ID > packages/shared/src/types/database.ts
```

## Próximos Passos

1. Execute as migrations
2. Crie usuários de teste
3. Gere os tipos TypeScript
4. Comece com IPET-003 (Authentication)
