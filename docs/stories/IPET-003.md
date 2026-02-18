---
story_id: IPET-003
status: Pending
epic: App Tutor
priority: Critical
feature_section: F1 (Onboarding)
acceptance_criteria:
  - Tutor cria conta com email ou Google/Apple Sign-In
  - Sessão persiste entre reaberturas do app
  - Logout funciona corretamente
  - Tela de auth é clean e profissional
scope: Both
dependencies:
  - IPET-002
constraints:
  - "Supabase Auth (email, Google, Apple)"
  - "Expo AuthSession para OAuth"
estimates_days: 1
---

# Tutor Authentication — IPET-003

## Summary
Implementar autenticação de tutores via email + OAuth (Google, Apple). Supabase Auth cuida de toda a lógica; nós construímos as telas e o fluxo.

## User Story
As a tutor,
I want to create an account and log in easily,
So that I can access the app and book pet services.

## Acceptance Criteria
- [ ] Tela de Welcome com logo IPET e opções: "Entrar com Email", "Entrar com Google", "Entrar com Apple" (iOS only)
- [ ] Sign-up email: nome, email, senha (mínimo 6 chars) → email de confirmação
- [ ] Login email: email + senha → acessa app
- [ ] OAuth Google: abre webview → autentica → volta ao app logado
- [ ] OAuth Apple: abre modal nativo (iOS) → autentica → volta ao app logado
- [ ] Sessão persiste (token no SecureStore do Expo)
- [ ] Logout limpa sessão e volta para tela de auth
- [ ] "Esqueci minha senha": envia link de reset via Supabase
- [ ] Erro claro se email já existe, senha fraca, ou credenciais inválidas
- [ ] Após login, profile é criado automaticamente via trigger (IPET-002)

## Technical Details

### Dependencies
```bash
# Mobile
npx expo install @supabase/supabase-js expo-auth-session expo-secure-store expo-web-browser expo-crypto
```

### Supabase Client (Mobile)
```typescript
// apps/mobile/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Auth Context
```typescript
// apps/mobile/src/contexts/AuthContext.tsx
// Provides: user, session, signUp, signIn, signOut, loading
// Wraps entire app
// Listens to onAuthStateChange
```

### Screens
```
src/screens/auth/
├── WelcomeScreen.tsx      — Logo + botões (Email, Google, Apple)
├── SignUpScreen.tsx        — Form: nome, email, senha
├── LoginScreen.tsx         — Form: email, senha, "esqueci senha"
├── ForgotPasswordScreen.tsx — Form: email → envia link reset
└── VerifyEmailScreen.tsx   — "Verifique seu email" + botão reenviar
```

### Navigation
```typescript
// Conditional navigation
if (!session) → Auth Navigator (Welcome, SignUp, Login, etc.)
if (session && !hasPets) → Onboarding Navigator (AddPet)
if (session && hasPets) → Main Navigator (Home, Bookings, Pets, Profile)
```

## Testing
- [ ] Sign-up com email válido cria conta
- [ ] Sign-up com email duplicado mostra erro
- [ ] Login com credenciais corretas funciona
- [ ] Login com senha errada mostra erro
- [ ] Google OAuth abre webview e retorna autenticado
- [ ] Apple Sign-In funciona no iOS
- [ ] Fechar e reabrir app mantém sessão
- [ ] Logout limpa sessão completamente
- [ ] Reset de senha envia email

## File List
*Auto-maintained*

## Notes
- Apple Sign-In é obrigatório se oferecer OAuth (App Store policy)
- Google OAuth requer configuração no Google Cloud Console
- Supabase Auth tem rate limiting nativo (proteção contra brute force)
- Não armazenar senha localmente (Supabase cuida)

## Related Stories
- Bloqueada por: IPET-002 (Schema)
- Bloqueador para: IPET-005 (Pet CRUD)
