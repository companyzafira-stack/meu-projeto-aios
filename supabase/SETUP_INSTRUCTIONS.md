# 🚀 Supabase Setup — IPET-002

## ⚡ Quick Start (5 minutos)

### Passo 1: Criar Projeto Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique: **New Project**
3. Preencha:
   - **Name:** `ipet` ou `ipet-dev`
   - **Database Password:** [forte]
   - **Region:** `São Paulo` (ou mais próximo)
4. Clique: **Create new project**

**Aguarde 2-3 minutos enquanto Supabase provisiona...**

### Passo 2: Copiar Credenciais

Quando terminar, vá em **Project Settings** → **API**:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ... (público)
SUPABASE_SERVICE_ROLE_KEY = eyJ... (secreto!)
```

Adicione ao `.env`:

```bash
# .env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Passo 3: Executar Migrations

**Via Supabase Dashboard (RECOMENDADO):**

1. No Supabase Dashboard → **SQL Editor**
2. Clique: **New Query**
3. Abra: `supabase/migrations/20260218_001_init_schema.sql`
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique: **Run** (botão verde)

**Resultado esperado:**
```
✓ 14 tables created
✓ RLS policies enabled
✓ Indexes created
✓ Triggers set up
```

### Passo 4: Gerar Types TypeScript

```bash
# Encontre seu Project ID em: https://supabase.com/dashboard
# Formato: xxxxx (após https://xxxxx.supabase.co)

npx supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/shared/src/types/database.ts
```

**Verificar sucesso:**
```bash
cat packages/shared/src/types/database.ts | head -20
# Deve mostrar: export interface Database { ... }
```

### Passo 5: Testar Connection

```bash
npm run typecheck
# Deve passar sem erros

npm run build
# Deve compilar sem erros
```

---

## 📊 Verificar Setup

### Tables Criadas (14 total)

```sql
-- No SQL Editor do Supabase, execute:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Você deve ver:
- ✅ profiles
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

```sql
-- Verificar RLS em todas as tables:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

Todas devem mostrar `rowsecurity = true`

### Indexes Criados

```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' LIMIT 20;
```

Deve listar ~15 indexes

---

## 🧪 Seed Data (Testing)

### 1. Criar Admin User

**Via Supabase Dashboard:**

1. **Authentication** → **Users**
2. Clique: **Add User**
3. Preencha:
   - Email: `admin@ipet.app`
   - Password: [forte]
4. Clique: **Create User**

**Depois, execute no SQL Editor:**

```sql
-- Atualizar role para admin
UPDATE public.profiles
SET role = 'admin', display_name = 'Admin IPET'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@ipet.app'
);
```

### 2. Criar Pet Shop Owner de Teste

```sql
-- 1. Criar user via Auth (Supabase Dashboard)
-- Email: owner1@ipet.app
-- Password: [qualquer]

-- 2. Execute no SQL Editor:
UPDATE public.profiles
SET role = 'petshop_owner', display_name = 'Dono Banho & Tosa'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'owner1@ipet.app'
);

-- 3. Criar pet shop
INSERT INTO public.petshops (
  owner_id, name, cnpj, address, city, state, lat, lng, status, plan
)
SELECT
  id,
  'Banho & Tosa Curvelo',
  '12.345.678/0001-90',
  'Rua A, 100',
  'Curvelo',
  'MG',
  -18.7264,
  -44.4314,
  'active',
  'basic'
FROM public.profiles
WHERE role = 'petshop_owner'
LIMIT 1;
```

### 3. Criar Serviços de Teste

```sql
-- Get pet shop ID
WITH ps AS (
  SELECT id FROM petshops WHERE status = 'active' LIMIT 1
)
INSERT INTO public.services (petshop_id, name, category, duration_minutes)
SELECT id, 'Banho Simples', 'banho', 30 FROM ps
UNION ALL SELECT id, 'Tosa Completa', 'tosa', 45 FROM ps
UNION ALL SELECT id, 'Banho + Tosa', 'combo', 90 FROM ps;

-- Adicionar preços
-- (Script SQL é longo, executar no SQL Editor)
```

---

## 🔧 Troubleshooting

### Erro: "RLS policy violation"

**Causa:** Usuário não autenticado ou sem permissão

**Solução:**
```typescript
// Certifique-se de estar autenticado
const user = await supabase.auth.getUser();
if (!user.data.user) {
  // Fazer login primeiro
}
```

### Erro: "Table does not exist"

**Causa:** Migrations não executadas

**Solução:**
1. Volte ao SQL Editor
2. Execute novamente: `supabase/migrations/20260218_001_init_schema.sql`

### Erro: "Unknown type Database"

**Causa:** database.ts não gerado

**Solução:**
```bash
npx supabase gen types typescript --project-id YOUR_ID > packages/shared/src/types/database.ts
```

### Erro: "FOREIGNKEY constraint failed"

**Causa:** Tentando inserir FK que não existe

**Solução:** Certifique-se de que:
- Owner ID existe em profiles
- Service ID existe em services
- Petshop ID existe em petshops

---

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] Credenciais copiadas para .env
- [ ] Migrations executadas (14 tables)
- [ ] RLS ativada em todas as tables
- [ ] Types gerados em database.ts
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] Admin user criado
- [ ] Pet shop owner de teste criado
- [ ] Serviços de teste criados

---

## 🎯 Próximo Passo

Quando tudo estiver pronto:

```bash
git add .
git commit -m "feat: implement story IPET-002 - Database Schema & Migrations"
git push origin main
```

Então começar **IPET-003: Tutor Authentication**
