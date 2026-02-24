---
story_id: IPET-029
status: Pending
epic: Dashboard Pet Shop
priority: Critical
feature_section: F9 (Onboarding Pet Shop)
acceptance_criteria:
  - Pet shop owner cria conta com nome, email e senha
  - Validação de email e senha (força mínima)
  - Confirm password matches
  - Após cadastro, cria automaticamente perfil no Supabase
  - Tela com mensagem de sucesso e link para login
  - Link "Já tem conta?" redireciona para login
scope: Frontend
dependencies:
  - IPET-002
  - IPET-004
constraints:
  - "Next.js App Router"
  - "Tailwind CSS para estilização"
  - "Supabase Auth (mesmo sistema)"
  - "Validação client-side + server-side"
estimates_days: 1
---

# Pet Shop Sign-Up (Cadastro) — IPET-029

## Summary
Criar tela de cadastro/sign-up para novos pet shop owners no dashboard web. Complementa IPET-004 permitindo que novos usuários criem conta antes de fazer login.

## User Story
As a new pet shop owner,
I want to create an account with email and password,
So that I can access the IPET dashboard and manage my business.

## Acceptance Criteria
- [ ] Tela de cadastro com formulário: nome da loja, email, senha, confirmar senha
- [ ] Validação client-side:
  - [ ] Email válido (formato correto)
  - [ ] Senha mínimo 8 caracteres
  - [ ] Senha contém números e letras
  - [ ] Confirmação de senha matches
  - [ ] Nome obrigatório
- [ ] Mensagens de erro clara para cada campo
- [ ] Botão "Cadastrar" desabilitado enquanto houver erros
- [ ] Loading state durante submissão
- [ ] Após cadastro bem-sucedido:
  - [ ] Cria usuário no Supabase Auth
  - [ ] Cria automaticamente perfil na tabela 'profiles' (role: 'petshop_owner')
  - [ ] Redireciona para tela de sucesso com mensagem "Conta criada com sucesso!"
  - [ ] Link "Fazer login" leva para /login
- [ ] Link "Já tem conta? Faça login aqui" na parte inferior (redireciona para /login)
- [ ] Tela responsiva (mobile, tablet, desktop)

## Technical Details

### Route
```
apps/web/src/app/(auth)/signup/page.tsx
apps/web/src/app/(auth)/signup/layout.tsx (compartilha com login)
```

### Form Validation
```typescript
// apps/web/src/lib/auth-validation.ts
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email inválido';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Senha deve ter mínimo 8 caracteres';
  if (!/\d/.test(password)) return 'Senha deve conter números';
  if (!/[a-zA-Z]/.test(password)) return 'Senha deve conter letras';
  return null;
};
```

### Sign-Up Handler
```typescript
// apps/web/src/app/(auth)/signup/page.tsx
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    // 1. Create auth user
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // 2. Create profile (automatic via trigger, but can be explicit)
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        shop_name: shopName,
        email: email,
        role: 'petshop_owner',
      });
    }

    // 3. Show success and redirect to login
    setSuccess(true);
    setTimeout(() => {
      router.push('/login?message=Conta+criada+com+sucesso');
    }, 2000);
  } catch (error) {
    setError('Erro ao criar conta. Tente novamente.');
  } finally {
    setLoading(false);
  }
};
```

### Component Structure
```
apps/web/src/app/(auth)/signup/
├── page.tsx              — Sign-up form component
└── layout.tsx            — Shared with login (inherited from parent)

apps/web/src/components/
├── FormInput.tsx         — Reusable input with error display
└── AuthLayout.tsx        — Shared layout for auth screens
```

## Testing
- [ ] Formulário com todos os campos obrigatórios exibe erros até preenchimento
- [ ] Email inválido mostra erro de validação
- [ ] Senha com <8 caracteres mostra erro
- [ ] Senha sem números mostra erro
- [ ] Senha sem letras mostra erro
- [ ] Confirmação de senha diferente mostra erro
- [ ] Cadastro com email já existente mostra erro do Supabase
- [ ] Cadastro bem-sucedido cria usuário no Auth
- [ ] Profile criado com role 'petshop_owner'
- [ ] Após sucesso, página mostra mensagem de confirmação
- [ ] Link "Fazer login" funciona
- [ ] Link "Já tem conta?" redireciona para /login
- [ ] Responsivo em mobile/tablet/desktop

## File List
### Created
- `apps/web/src/app/(auth)/signup/page.tsx` — Sign-up form with validation
- `apps/web/src/lib/auth-validation.ts` — Email and password validation functions

### Updated
- `apps/web/src/app/(auth)/login/page.tsx` — Add link to signup
- `apps/web/src/app/layout.tsx` — (if needed for shared styles)

## Notes
- Trigger automático no Supabase cria profile quando novo user é criado (via trigger em IPET-002)
- Email confirmation pode ser opcional (depender de IPET-002)
- Considerar re-usar componentes de erro/input entre login e signup
- Link de signup no footer do login page: "Ainda não tem conta? Cadastre-se"

## Related Stories
- Bloqueada por: IPET-002 (Database schema + triggers)
- Complementa: IPET-004 (Pet Shop Auth & Dashboard Shell)
- Usada por: IPET-007, IPET-008, etc (qualquer feature que dependa de dashboard)
