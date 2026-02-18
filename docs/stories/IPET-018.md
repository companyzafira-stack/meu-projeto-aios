---
story_id: IPET-018
status: Pending
epic: Dashboard Pet Shop
priority: High
feature_section: F9.1-F9.3 (Self-Signup)
acceptance_criteria:
  - Página pública de cadastro para pet shops
  - Formulário com dados do negócio + fotos
  - Status 'pending' até aprovação admin
  - Email de boas-vindas após aprovação
scope: Both
dependencies:
  - IPET-004
constraints:
  - "Validação de CNPJ (formato + unicidade)"
  - "Aprovação manual pelo admin"
estimates_days: 3
---

# Pet Shop Self-Signup & Approval — IPET-018

## Summary
Página pública para novos pet shops se cadastrarem. Formulário coleta dados do negócio + fotos. Cadastro fica pendente até aprovação manual do admin. Após aprovação, pet shop recebe email com acesso.

## User Story
As a pet shop owner,
I want to sign up my business on IPET through a web form,
So that I can start receiving bookings from tutors.

## Acceptance Criteria
- [ ] Página pública `/cadastro-petshop` (sem auth)
- [ ] Form: nome fantasia, CNPJ (com máscara), endereço completo, cidade, telefone, email, senha
- [ ] Upload de 1-5 fotos do estabelecimento
- [ ] Validação: CNPJ formato válido (XX.XXX.XXX/XXXX-XX), email válido, senha min 6 chars
- [ ] Verificar CNPJ único (não existe outro pet shop com mesmo CNPJ)
- [ ] Submit: cria conta Supabase Auth (role: petshop_owner) + petshop com status 'pending'
- [ ] Tela de confirmação: "Cadastro recebido! Analisaremos em até 48h."
- [ ] Admin pode aprovar (IPET-019): status muda para 'active'
- [ ] Após aprovação: email enviado ao pet shop com link de login + instruções
- [ ] Pet shop faz login → dashboard com wizard: "Configure seus serviços" → "Configure sua agenda"
- [ ] Admin pode rejeitar: email com motivo + opção de recadastrar

## Technical Details

### Public Page (no auth)
```
apps/web/src/app/(public)/cadastro-petshop/
├── page.tsx           — Form de cadastro
├── confirmacao/page.tsx — "Cadastro recebido!"
└── components/
    ├── SignupForm.tsx  — Form com validação
    ├── CNPJInput.tsx   — Input com máscara + validação
    ├── PhotoUpload.tsx — Upload múltiplo de fotos
    └── AddressForm.tsx — Campos de endereço
```

### CNPJ Validation
```typescript
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  // Validate check digits
  // ... (algorithm)
  return true;
}
```

### Signup Flow
```typescript
async function handleSignup(formData) {
  // 1. Create auth user
  const { data: authUser } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: { data: { role: 'petshop_owner', full_name: formData.name } }
  });

  // 2. Update profile role
  await supabase.from('profiles').update({ role: 'petshop_owner' }).eq('id', authUser.user.id);

  // 3. Create petshop
  const { data: petshop } = await supabase.from('petshops').insert({
    owner_id: authUser.user.id,
    name: formData.name,
    cnpj: formData.cnpj,
    address: formData.address,
    city: formData.city,
    phone: formData.phone,
    status: 'pending',
  }).select().single();

  // 4. Upload photos
  for (const photo of formData.photos) {
    const path = `${petshop.id}/${Date.now()}.jpg`;
    await supabase.storage.from('petshop-photos').upload(path, photo);
    const { data } = supabase.storage.from('petshop-photos').getPublicUrl(path);
    await supabase.from('petshop_photos').insert({ petshop_id: petshop.id, photo_url: data.publicUrl });
  }
}
```

### Email (Approval)
```typescript
// Supabase Edge Function or Resend API
async function sendApprovalEmail(petshop) {
  await resend.emails.send({
    from: 'IPET <noreply@ipet.app>',
    to: petshop.email,
    subject: 'Bem-vindo ao IPET! Seu cadastro foi aprovado 🐾',
    html: `Olá ${petshop.name}! Seu pet shop foi aprovado. Acesse: ${DASHBOARD_URL}/login`,
  });
}
```

## Testing
- [ ] Form renderiza corretamente
- [ ] CNPJ inválido é rejeitado
- [ ] CNPJ duplicado é rejeitado
- [ ] Upload de fotos funciona (1-5)
- [ ] Submit cria conta + pet shop com status 'pending'
- [ ] Tela de confirmação aparece
- [ ] Pet shop pending NÃO aparece no app (RLS)
- [ ] Após aprovação: pet shop aparece no app + email enviado
- [ ] Login funciona após aprovação

## File List
*Auto-maintained*

## Notes
- Usar react-hook-form + zod para validação
- CNPJ: usar biblioteca `cpf-cnpj-validator` do npm
- Email: Resend (free tier 100 emails/dia) ou Supabase Auth emails
- Geocoding do endereço para lat/lng (Google Geocoding API)

## Related Stories
- Bloqueada por: IPET-004 (Dashboard Shell)
- Bloqueador para: IPET-019 (Admin Pet Shops)
