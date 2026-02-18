---
story_id: IPET-004
status: In Review
epic: Dashboard Pet Shop
priority: Critical
feature_section: F9 (Onboarding Pet Shop)
acceptance_criteria:
  - Pet shop owner faz login no dashboard web
  - Dashboard shell com sidebar e navegação funcional
  - Role-based access (petshop_owner vs admin)
  - Layout responsivo (desktop + tablet)
scope: Frontend
dependencies:
  - IPET-002
constraints:
  - "Next.js App Router"
  - "Tailwind CSS para estilização"
  - "Supabase Auth (mesmo sistema do mobile)"
estimates_days: 2
---

# Pet Shop Auth & Dashboard Shell — IPET-004

## Summary
Criar autenticação do pet shop owner no dashboard web (Next.js) e o layout base (shell) com sidebar, header e navegação entre seções.

## User Story
As a pet shop owner,
I want to log in to a web dashboard and navigate between sections,
So that I can manage my business on IPET.

## Acceptance Criteria
- [x] Tela de login: email + senha (mesma conta Supabase do pet shop owner)
- [x] Após login, redireciona para dashboard com layout de sidebar
- [x] Sidebar com links: Início, Serviços, Agenda, Agendamentos, Financeiro, Avaliações, Perfil
- [x] Header com nome do pet shop, avatar e botão logout
- [x] Rota `/admin` acessível apenas para role 'admin' (middleware)
- [x] Rota `/dashboard` acessível apenas para role 'petshop_owner'
- [x] Página "Início" com placeholder "Em breve: métricas do seu pet shop"
- [x] Layout responsivo: sidebar collapsa em tablet/mobile
- [x] Logout funciona e redireciona para login

## Technical Details

### Route Structure (Next.js App Router)
```
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx              # Auth layout (sem sidebar)
├── (dashboard)/
│   ├── layout.tsx              # Dashboard layout (com sidebar)
│   ├── page.tsx                # Redirect para /dashboard/inicio
│   ├── inicio/page.tsx
│   ├── servicos/page.tsx       # IPET-007
│   ├── agenda/page.tsx         # IPET-008
│   ├── agendamentos/page.tsx   # IPET-014
│   ├── financeiro/page.tsx     # IPET-017
│   ├── avaliacoes/page.tsx     # IPET-016
│   └── perfil/page.tsx         # IPET-018
├── (admin)/
│   ├── layout.tsx              # Admin layout
│   ├── petshops/page.tsx       # IPET-019
│   ├── metricas/page.tsx       # IPET-020
│   └── disputas/page.tsx       # IPET-021
└── middleware.ts               # Auth + role check
```

### Middleware (Auth Guard)
```typescript
// apps/web/src/middleware.ts
export async function middleware(request) {
  const session = await getSession(request);

  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const profile = await getProfile(session.user.id);
    if (profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
}
```

### Sidebar Component
```typescript
// apps/web/src/components/Sidebar.tsx
const menuItems = [
  { label: 'Início', href: '/inicio', icon: HomeIcon },
  { label: 'Serviços', href: '/servicos', icon: ScissorsIcon },
  { label: 'Agenda', href: '/agenda', icon: CalendarIcon },
  { label: 'Agendamentos', href: '/agendamentos', icon: ClipboardIcon },
  { label: 'Financeiro', href: '/financeiro', icon: DollarIcon },
  { label: 'Avaliações', href: '/avaliacoes', icon: StarIcon },
  { label: 'Perfil', href: '/perfil', icon: UserIcon },
];
```

## Testing
- [x] Login com email/senha de pet shop owner funciona
- [x] Login com credenciais inválidas mostra erro
- [x] Sidebar navega corretamente entre seções
- [x] Usuário sem role petshop_owner não acessa /dashboard
- [x] Usuário sem role admin não acessa /admin
- [x] Logout redireciona para login
- [x] Layout responsivo funciona em 1024px e 768px

## File List

### Created
- `apps/web/src/middleware.ts` — Auth guard middleware with route protection
- `apps/web/src/lib/supabase.ts` — Updated Supabase client with auth config
- `apps/web/src/components/Sidebar.tsx` — Dashboard navigation component with icons
- `apps/web/src/app/(auth)/layout.tsx` — Auth pages layout (centered form)
- `apps/web/src/app/(auth)/login/page.tsx` — Login form with email/password
- `apps/web/src/app/(dashboard)/layout.tsx` — Dashboard layout with sidebar and header
- `apps/web/src/app/(dashboard)/page.tsx` — Dashboard index (redirect to /dashboard/inicio)
- `apps/web/src/app/(dashboard)/inicio/page.tsx` — Home page with placeholder metrics
- `apps/web/src/app/(dashboard)/servicos/page.tsx` — Services management (placeholder)
- `apps/web/src/app/(dashboard)/agenda/page.tsx` — Schedule management (placeholder)
- `apps/web/src/app/(dashboard)/agendamentos/page.tsx` — Bookings view (placeholder)
- `apps/web/src/app/(dashboard)/financeiro/page.tsx` — Financial dashboard (placeholder)
- `apps/web/src/app/(dashboard)/avaliacoes/page.tsx` — Reviews view (placeholder)
- `apps/web/src/app/(dashboard)/perfil/page.tsx` — Profile management (placeholder)
- `apps/web/src/app/(admin)/layout.tsx` — Admin layout with auth check
- `apps/web/src/app/(admin)/petshops/page.tsx` — Pet shops management (admin, placeholder)
- `apps/web/src/app/(admin)/metricas/page.tsx` — Platform metrics (admin, placeholder)
- `apps/web/src/app/(admin)/disputas/page.tsx` — Disputes management (admin, placeholder)

### Updated
- `apps/web/package.json` — Added lucide-react dependency

### Dependencies Added
- `lucide-react@^0.x.x` — Icon library for UI components

## Notes
- Usar Lucide React para ícones (leve, tree-shakeable)
- Tailwind: usar componentes de UI library como shadcn/ui ou Headless UI
- NÃO implementar conteúdo das páginas (só shell + placeholder)
- Conteúdo vem nas stories 007, 008, 014, 016, 017

## Related Stories
- Bloqueada por: IPET-002 (Schema)
- Bloqueador para: IPET-007 (Services), IPET-008 (Slots), IPET-018 (Self-Signup)
