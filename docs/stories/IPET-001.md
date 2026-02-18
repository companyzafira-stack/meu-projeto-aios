---
story_id: IPET-001
status: Pending
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
- [ ] Monorepo Turborepo funcional com 3 packages: `mobile`, `web`, `shared`
- [ ] `mobile`: Expo app com TypeScript, rodando no iOS Simulator e/ou Android Emulator
- [ ] `web`: Next.js 14+ com TypeScript e Tailwind CSS, rodando em localhost:3000
- [ ] `shared`: Package com tipos TypeScript exportados e importáveis por mobile e web
- [ ] Supabase projeto criado (free tier), URL e anon key configurados em `.env`
- [ ] Supabase client inicializado em ambos os apps (mobile e web)
- [ ] ESLint + Prettier configurados no monorepo
- [ ] `.gitignore` correto (node_modules, .env, .expo, .next, etc.)
- [ ] `README.md` do projeto com instruções de setup
- [ ] Primeiro commit no Git com toda a estrutura

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
- [ ] `turbo dev` roda ambos os apps simultaneamente
- [ ] Mobile app abre no simulator sem erros
- [ ] Web app abre em localhost:3000 sem erros
- [ ] Import de tipos compartilhados funciona em ambos os apps
- [ ] Supabase connection funciona (console.log do client)
- [ ] `turbo build` compila sem erros
- [ ] `turbo lint` passa sem erros

## File List
*Auto-maintained*

## Notes
- Expo SDK 52+ recomendado (mais recente e estável)
- Next.js 14+ com App Router (não Pages Router)
- Supabase JS v2 (@supabase/supabase-js)
- NÃO instalar dependências desnecessárias ainda (adicionar conforme stories)

## Related Stories
- Bloqueador para: IPET-002 (Schema), IPET-003 (Auth), IPET-004 (PetShop Auth)
