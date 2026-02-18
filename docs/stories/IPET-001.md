---
story_id: IPET-001
status: In Review
epic: Infraestrutura
priority: Critical
feature_section: Setup
acceptance_criteria:
  - Monorepo Turborepo configurado com mobile/ e web/
  - Expo app (React Native) inicializado e rodando
  - Next.js app inicializado e rodando
  - Supabase projeto criado e conectado
  - Tipos compartilhados em packages/shared/
  - Git inicializado com .gitignore correto
scope: Both
dependencies: []
constraints:
  - "Expo managed workflow (não bare)"
  - "TypeScript strict em todos os packages"
  - "Supabase free tier inicialmente"
estimates_days: 2
---

# Project Setup — IPET-001

## Summary
Configurar monorepo com Turborepo contendo app mobile (Expo/React Native), dashboard web (Next.js), e tipos compartilhados. Conectar ao Supabase para backend/DB/auth.

## User Story
As a developer,
I want a properly configured monorepo with all tools connected,
So that I can start building features immediately without setup friction.

## Acceptance Criteria
- [x] Monorepo Turborepo funcional com 3 packages: `mobile`, `web`, `shared`
- [x] `mobile`: Expo app com TypeScript, rodando no iOS Simulator e/ou Android Emulator
- [x] `web`: Next.js 14+ com TypeScript e Tailwind CSS, rodando em localhost:3000
- [x] `shared`: Package com tipos TypeScript exportados e importáveis por mobile e web
- [x] Supabase projeto criado (free tier), URL e anon key configurados em `.env`
- [x] Supabase client inicializado em ambos os apps (mobile e web)
- [x] ESLint + Prettier configurados no monorepo
- [x] `.gitignore` correto (node_modules, .env, .expo, .next, etc.)
- [x] `README.md` do projeto com instruções de setup
- [x] Primeiro commit no Git com toda a estrutura

## Technical Details

### Monorepo Structure
```
ipet/
├── apps/
│   ├── mobile/              # Expo React Native app
│   │   ├── app.json
│   │   ├── App.tsx
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                 # Next.js dashboard
│       ├── src/
│       │   ├── app/         # App Router
│       │   └── lib/
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── packages/
│   └── shared/              # Shared TypeScript types
│       ├── src/
│       │   └── types/
│       │       ├── index.ts
│       │       ├── user.ts
│       │       ├── pet.ts
│       │       ├── petshop.ts
│       │       ├── booking.ts
│       │       └── service.ts
│       ├── package.json
│       └── tsconfig.json
├── turbo.json
├── package.json             # Root workspace
├── .env                     # Supabase keys (gitignored)
├── .env.example             # Template sem secrets
├── .gitignore
├── .eslintrc.js
├── .prettierrc
└── README.md
```

### Environment Variables (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://[project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

### Supabase Client (shared pattern)
```typescript
// packages/shared/src/supabase.ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey);
}
```

### Turbo Config
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

## Testing
- [x] `turbo dev` roda ambos os apps simultaneamente
- [x] Mobile app abre no simulator sem erros
- [x] Web app abre em localhost:3000 sem erros
- [x] Import de tipos compartilhados funciona em ambos os apps
- [x] Supabase connection funciona (console.log do client)
- [x] `turbo build` compila sem erros
- [x] `turbo lint` passa sem erros

## File List
### Created
- `package.json` — Root workspace configuration
- `turbo.json` — Turborepo tasks configuration
- `.eslintrc.js` — ESLint rules
- `.prettierrc` — Prettier formatting
- `README.md` — Project documentation
- `apps/mobile/` — Expo app (React Native)
  - `App.tsx` — Root component
  - `app.json` — Expo configuration
  - `package.json` — Dependencies
  - `tsconfig.json` — TypeScript config
  - `src/lib/supabase.ts` — Supabase client
- `apps/web/` — Next.js dashboard
  - `src/app/` — App Router pages
  - `src/lib/supabase.ts` — Supabase client
  - `tailwind.config.ts` — Tailwind CSS
  - `next.config.ts` — Next.js config
  - `tsconfig.json` — TypeScript config
- `packages/shared/` — Shared types
  - `src/types/` — 5 type modules (user, pet, petshop, booking, service)
  - `tsconfig.json` — TypeScript config with composite flag

## Notes
- Expo SDK 52+ recomendado (mais recente e estável)
- Next.js 14+ com App Router (não Pages Router)
- Supabase JS v2 (@supabase/supabase-js)
- NÃO instalar dependências desnecessárias ainda (adicionar conforme stories)

## Related Stories
- Bloqueador para: IPET-002 (Schema), IPET-003 (Auth), IPET-004 (PetShop Auth)
