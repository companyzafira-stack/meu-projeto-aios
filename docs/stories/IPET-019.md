---
story_id: IPET-019
status: Pending
epic: Painel Admin
priority: High
feature_section: F16 (Gestão de Pet Shops)
acceptance_criteria:
  - Lista de pet shops com status e plano
  - Aprovar/recusar pet shops pendentes
  - Suspender pet shops ativos
scope: Frontend
dependencies:
  - IPET-018
constraints:
  - "Rota /admin, role 'admin' obrigatório"
  - "Usar service_role key para bypass RLS"
estimates_days: 2
---

# Admin — Pet Shop Management — IPET-019

## Summary
Painel admin para gerenciar pet shops: aprovar cadastros pendentes, visualizar ativos, suspender por violação.

## User Story
As the IPET admin,
I want to manage all pet shops on the platform,
So that I can ensure quality and approve new registrations.

## Acceptance Criteria
- [ ] Página `/admin/petshops` com tabela: nome, cidade, CNPJ, status, plano, data cadastro, ações
- [ ] Tabs: Pendentes, Ativos, Suspensos
- [ ] **Pendentes:** botões Aprovar / Recusar com modal de confirmação
  - Aprovar: status → 'active', envia email de boas-vindas
  - Recusar: status → 'rejected' (ou deletar), envia email com motivo
- [ ] **Ativos:** botão Suspender com motivo obrigatório
  - Suspender: status → 'suspended', pet shop fica invisível no app
- [ ] **Suspensos:** botão Reativar
- [ ] Clique no pet shop abre detalhes: dados completos, fotos, serviços, agendamentos recentes
- [ ] Busca por nome ou CNPJ
- [ ] Contadores: X pendentes, Y ativos, Z suspensos

## Technical Details

### Admin API (service_role bypass)
```typescript
// apps/web/src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// Service role key bypasses RLS — ONLY use in admin routes
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Server-side only!
);
```

### UI Structure
```
apps/web/src/app/(admin)/petshops/
├── page.tsx
├── [id]/page.tsx          — Detalhes do pet shop
└── components/
    ├── PetShopTable.tsx
    ├── ApprovalModal.tsx
    ├── RejectionModal.tsx
    ├── SuspendModal.tsx
    └── PetShopDetail.tsx
```

## Testing
- [ ] Admin vê todos os pet shops (bypass RLS)
- [ ] Aprovar muda status e envia email
- [ ] Recusar remove ou marca como rejected
- [ ] Suspender torna pet shop invisível no app
- [ ] Reativar torna pet shop visível novamente
- [ ] Busca funciona por nome e CNPJ
- [ ] Usuário não-admin não acessa /admin

## File List
*Auto-maintained*

## Related Stories
- Bloqueada por: IPET-018 (Self-Signup)
