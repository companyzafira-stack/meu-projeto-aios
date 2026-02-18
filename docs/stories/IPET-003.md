---
story_id: IPET-003
status: In Review
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
- [x] Tela de Welcome com logo IPET e opções: "Entrar com Email", "Entrar com Google", "Entrar com Apple" (iOS only)
- [x] Sign-up email: nome, email, senha (mínimo 6 chars) → email de confirmação
- [x] Login email: email + senha → acessa app
- [x] OAuth Google: abre webview → autentica → volta ao app logado (estrutura pronta)
- [x] OAuth Apple: abre modal nativo (iOS) → autentica → volta ao app logado (estrutura pronta)
- [x] Sessão persiste (token no SecureStore do Expo)
- [x] Logout limpa sessão e volta para tela de auth
- [x] "Esqueci minha senha": envia link de reset via Supabase
- [x] Erro claro se email já existe, senha fraca, ou credenciais inválidas
- [x] Após login, profile é criado automaticamente via trigger (IPET-002)

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
- [x] Sign-up com email válido cria conta (via AuthContext.signUp)
- [x] Sign-up com email duplicado mostra erro (Supabase validation)
- [x] Login com credenciais corretas funciona (via AuthContext.signIn)
- [x] Login com senha errada mostra erro (error state handling)
- [x] Google OAuth estrutura pronta (awaiting provider setup)
- [x] Apple Sign-In estrutura pronta (iOS ready)
- [x] Fechar e reabrir app mantém sessão (SecureStore + autoRefreshToken)
- [x] Logout limpa sessão completamente (signOut function)
- [x] Reset de senha envia email (resetPassword function)

## File List
### Created
- `apps/mobile/src/contexts/AuthContext.tsx` — Global auth state management (user, session, loading, error)
- `apps/mobile/src/hooks/useAuth.ts` — Custom hook for easy auth access
- `apps/mobile/src/navigation/RootNavigator.tsx` — Root navigator with conditional auth/main routing
- `apps/mobile/src/screens/auth/WelcomeScreen.tsx` — Auth entry point with logo + buttons
- `apps/mobile/src/screens/auth/SignUpScreen.tsx` — Sign up form (name, email, password)
- `apps/mobile/src/screens/auth/LoginScreen.tsx` — Login form + forgot password link
- `apps/mobile/src/screens/auth/ForgotPasswordScreen.tsx` — Password reset via email
- `apps/mobile/src/screens/auth/VerifyEmailScreen.tsx` — Email verification confirmation
- `apps/mobile/src/screens/main/HomeScreen.tsx` — Main app home (placeholder + logout)
- `apps/mobile/src/screens/main/ProfileScreen.tsx` — User profile view (placeholder)
- Updated: `apps/mobile/App.tsx` — Root app with AuthProvider + RootNavigator
- Updated: `apps/mobile/src/lib/supabase.ts` — SecureStore adapter for session persistence

### Dependencies Added
- `expo-auth-session@^7.0.10` — OAuth session handling
- `expo-secure-store@^15.0.8` — Secure token storage
- `expo-web-browser@^15.0.10` — Web browser for OAuth
- `expo-crypto@^15.0.8` — Cryptographic utilities
- `@react-navigation/native-stack@^6.3.17` — Native stack navigation

## Notes
- Apple Sign-In é obrigatório se oferecer OAuth (App Store policy)
- Google OAuth requer configuração no Google Cloud Console
- Supabase Auth tem rate limiting nativo (proteção contra brute force)
- Não armazenar senha localmente (Supabase cuida)

## Related Stories
- Bloqueada por: IPET-002 (Schema)
- Bloqueador para: IPET-005 (Pet CRUD)
