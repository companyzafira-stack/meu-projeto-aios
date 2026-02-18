---
story_id: IPET-025
status: Pending
epic: Infra & Launch
priority: Critical
feature_section: F20 (Legal & LGPD)
acceptance_criteria:
  - Termos de Uso publicados e aceitos no cadastro
  - Política de Privacidade conforme LGPD
  - Consentimento de dados com opt-in explícito
  - Direito de exclusão de dados implementado
scope: Both
dependencies: []
constraints:
  - "LGPD (Lei 13.709/2018) obrigatória"
  - "Texto jurídico revisado por advogado antes do go-live"
estimates_days: 2
---

# Terms of Use, Privacy Policy & LGPD — IPET-025

## Summary
Criação dos documentos legais (Termos de Uso + Política de Privacidade) e implementação dos mecanismos de conformidade com a LGPD: consentimento explícito, acesso aos dados, e direito de exclusão.

## User Story
As the IPET founder,
I want the platform to comply with Brazilian data protection law (LGPD),
So that the business operates legally and users trust the platform with their data.

## Acceptance Criteria

### Documentos Legais
- [ ] **Termos de Uso** (`/termos`) — página pública acessível sem login
  - Definições (tutor, pet shop, plataforma)
  - Obrigações do tutor (dados verdadeiros, comparecimento)
  - Obrigações do pet shop (serviço conforme descrito, fotos autorizadas)
  - Política de cancelamento e reembolso (referência IPET-022)
  - Política de no-show (referência IPET-023)
  - Limitação de responsabilidade da plataforma
  - Foro: comarca de Curvelo/MG
- [ ] **Política de Privacidade** (`/privacidade`) — página pública
  - Dados coletados (nome, email, telefone, localização, fotos de pets)
  - Base legal: consentimento (Art. 7°, I da LGPD) + execução contratual (Art. 7°, V)
  - Finalidade de cada dado coletado
  - Compartilhamento: com pet shop (dados do agendamento), Mercado Pago (pagamento)
  - Retenção: dados mantidos enquanto conta ativa + 5 anos após exclusão (fiscal)
  - Direitos do titular (Art. 18): acesso, correção, exclusão, portabilidade
  - Contato do encarregado (DPO): email
  - Cookies e analytics (se aplicável)

### Consentimento no Cadastro
- [ ] **App tutor:** checkbox obrigatório no signup: "Li e aceito os [Termos de Uso] e [Política de Privacidade]"
  - Links abrem os documentos em webview/modal
  - Não permite criar conta sem aceitar
  - Salvar: `accepted_terms_at` timestamp no profile
- [ ] **Dashboard pet shop:** checkbox obrigatório no cadastro (IPET-018): mesmo modelo
- [ ] Versão dos termos salva: `terms_version: '1.0'` — permite re-aceite se termos mudarem

### Direito de Exclusão (LGPD Art. 18)
- [ ] **App tutor:** Configurações → "Excluir minha conta"
  - Confirmação: "Isso excluirá todos os seus dados. Agendamentos futuros serão cancelados."
  - Processo: soft-delete (anonymize dados, manter registros fiscais)
  - Dados anonimizados: nome → "Usuário Removido", email → hash, telefone → null, fotos → deletadas
  - Bookings passados: mantidos para relatório financeiro do pet shop (sem dados pessoais)
  - Push ao tutor: "Sua conta foi excluída conforme solicitado."
- [ ] **Dashboard pet shop:** Configurações → "Solicitar exclusão"
  - Pet shop com agendamentos futuros: cancela todos + reembolso antes de excluir
  - Requer aprovação admin (dados fiscais do CNPJ devem ser preservados)

### Consentimento de Localização
- [ ] Antes de solicitar GPS, mostrar explicação: "Precisamos da sua localização para encontrar pet shops próximos."
- [ ] Opção de recusar: busca manual por cidade/CEP

## Technical Details

### Pages (Next.js — Public)
```
apps/web/src/app/(public)/
├── termos/page.tsx          — Termos de Uso
└── privacidade/page.tsx     — Política de Privacidade
```

### Deep Link (App Mobile)
```typescript
// apps/mobile/src/screens/legal/
├── TermsScreen.tsx          — WebView para /termos
└── PrivacyScreen.tsx        — WebView para /privacidade
```

### Consent Storage
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN accepted_terms_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN terms_version TEXT DEFAULT '1.0';
```

```typescript
// On signup (tutor or petshop)
await supabase.from('profiles').update({
  accepted_terms_at: new Date().toISOString(),
  terms_version: '1.0',
}).eq('id', userId);
```

### Account Deletion (Soft Delete)
```typescript
// API route: POST /api/account/delete
async function deleteAccount(userId: string) {
  // 1. Cancel future bookings + refund
  const futureBookings = await supabase
    .from('bookings')
    .select('*')
    .eq('tutor_id', userId)
    .in('status', ['confirmed', 'pending_payment'])
    .gte('booking_date', new Date().toISOString().split('T')[0]);

  for (const booking of futureBookings.data || []) {
    await cancelBooking(booking.id, 'system', 'Conta excluída pelo usuário');
  }

  // 2. Anonymize profile
  await supabase.from('profiles').update({
    full_name: 'Usuário Removido',
    email: `deleted_${Date.now()}@removed.ipet`,
    phone: null,
    avatar_url: null,
    deleted_at: new Date().toISOString(),
    is_active: false,
  }).eq('id', userId);

  // 3. Delete pet photos from storage
  const pets = await supabase.from('pets').select('photo_url').eq('tutor_id', userId);
  for (const pet of pets.data || []) {
    if (pet.photo_url) {
      await supabase.storage.from('pet-photos').remove([extractPath(pet.photo_url)]);
    }
  }

  // 4. Anonymize pets
  await supabase.from('pets').update({
    name: 'Pet Removido',
    photo_url: null,
  }).eq('tutor_id', userId);

  // 5. Disable auth account
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    user_metadata: { deleted: true },
  });

  // 6. Send confirmation
  await sendPushNotification(userId, 'Conta excluída', 'Seus dados foram removidos conforme LGPD.');
}
```

### Re-acceptance Flow (Version Change)
```typescript
// On app open, check if terms version changed
const { data: profile } = await supabase.from('profiles').select('terms_version').eq('id', userId).single();

if (profile.terms_version !== CURRENT_TERMS_VERSION) {
  // Show modal: "Atualizamos nossos Termos. Por favor, leia e aceite para continuar."
  navigation.navigate('ReAcceptTerms');
}
```

## Testing
- [ ] Página /termos renderiza corretamente
- [ ] Página /privacidade renderiza corretamente
- [ ] Signup tutor exige aceitar termos (checkbox obrigatório)
- [ ] Signup pet shop exige aceitar termos
- [ ] `accepted_terms_at` salvo no profile
- [ ] Exclusão de conta: dados anonimizados
- [ ] Exclusão de conta: fotos deletadas do storage
- [ ] Exclusão de conta: agendamentos futuros cancelados + reembolso
- [ ] Exclusão de conta: auth desabilitado
- [ ] Re-aceite: modal aparece quando versão muda
- [ ] Links dos termos abrem em webview no app mobile

## File List
*Auto-maintained*

## Notes
- Termos e Política devem ser REVISADOS por advogado antes do go-live
- Template base: usar modelo padrão para marketplace de serviços
- LGPD: Lei 13.709/2018 — vigente desde setembro 2020
- Dados fiscais (notas, valores) devem ser retidos por 5 anos mesmo após exclusão
- Considerar usar serviço como iubenda.com para gerar documentos legais
- Encarregado (DPO): pode ser o próprio founder no início

## Related Stories
- Independente (sem bloqueadores)
- Bloqueador para: IPET-027 (Publicação — exige termos)
- Referência: IPET-022 (Cancelamento), IPET-023 (No-Show)
