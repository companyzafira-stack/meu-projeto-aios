---
story_id: IPET-026
status: Pending
epic: Infra & Launch
priority: Critical
feature_section: QA & Validação
acceptance_criteria:
  - Testes end-to-end de todos os fluxos críticos
  - Testes com 2-3 pet shops reais de Curvelo
  - Bugs críticos corrigidos antes do launch
  - Performance aceitável em 3G
scope: Both
dependencies:
  - IPET-001
  - IPET-002
  - IPET-003
  - IPET-004
  - IPET-005
  - IPET-006
  - IPET-007
  - IPET-008
  - IPET-009
  - IPET-010
  - IPET-011
  - IPET-012
  - IPET-013
  - IPET-014
  - IPET-015
  - IPET-016
  - IPET-017
  - IPET-018
  - IPET-019
  - IPET-020
  - IPET-021
  - IPET-022
  - IPET-023
  - IPET-024
  - IPET-025
constraints:
  - "Testar em dispositivos Android reais (público-alvo)"
  - "Pet shops beta em Curvelo para feedback real"
  - "Performance: <3s first load em 3G"
estimates_days: 3
---

# Testing & QA with Real Pet Shops — IPET-026

## Summary
Fase de testes completa: testes end-to-end automatizados dos fluxos críticos, testes manuais com pet shops reais de Curvelo, correção de bugs, e validação de performance em conexão 3G.

## User Story
As the IPET founder,
I want to thoroughly test the platform with real pet shops before launching,
So that the first users have a smooth, bug-free experience.

## Acceptance Criteria

### Testes End-to-End (Automatizados)
- [ ] **Fluxo Tutor Completo:**
  1. Signup → login → cadastrar pet → buscar pet shops → selecionar serviço → agendar → pagar → receber confirmação → avaliar
- [ ] **Fluxo Pet Shop Completo:**
  1. Signup → aguardar aprovação → login → cadastrar serviços → configurar agenda → receber agendamento → marcar em andamento → tirar foto → concluir
- [ ] **Fluxo Admin:**
  1. Login → aprovar pet shop → ver métricas → moderar avaliação
- [ ] **Cancelamento:** tutor cancela >12h, 2-12h, <2h — reembolso correto
- [ ] **No-show:** pet shop marca no-show → penalidade correta
- [ ] **Pagamento:** Pix + cartão (sandbox Mercado Pago)

### Testes com Pet Shops Reais (Curvelo)
- [ ] **Recrutar 2-3 pet shops beta** em Curvelo para testar
- [ ] Cadastrar manualmente: serviços, preços, fotos, agenda
- [ ] Pet shop usa dashboard por 3-5 dias: feedback sobre UX
- [ ] Simular 5-10 agendamentos reais (founder como tutor)
- [ ] Coletar feedback: formulário Google Forms com 10 perguntas
  - Facilidade de uso (1-5)
  - Clareza das informações (1-5)
  - Velocidade do app (1-5)
  - O que mais gostou?
  - O que melhoraria?
  - Usaria no dia a dia? (sim/não/talvez)
  - Indicaria para outro pet shop? (sim/não)
  - Bugs encontrados (campo aberto)
  - Sugestões (campo aberto)
  - NPS: "De 0 a 10, quanto recomendaria?"

### Bug Fixing & Polish
- [ ] **P0 (Blocker):** app crasha, pagamento falha, dados perdidos → corrigir imediatamente
- [ ] **P1 (Critical):** fluxo quebrado mas tem workaround → corrigir antes do launch
- [ ] **P2 (Major):** UX ruim mas funciona → corrigir se tempo permitir
- [ ] **P3 (Minor):** cosmético → backlog pós-launch

### Performance
- [ ] **First load app:** <3s em 3G
- [ ] **Navegação entre telas:** <500ms
- [ ] **Busca de pet shops:** <2s
- [ ] **Upload de foto:** <5s (foto comprimida)
- [ ] **Tamanho do APK:** <50MB (bundle splitting)

### Checklist de Segurança
- [ ] Senhas hasheadas (Supabase Auth faz isso)
- [ ] RLS ativo em TODAS as tabelas
- [ ] API keys NÃO expostas no client-side
- [ ] HTTPS em todas as comunicações
- [ ] Input sanitization em todos os formulários
- [ ] Rate limiting nas APIs críticas (login, pagamento)
- [ ] Service role key APENAS no server-side

## Technical Details

### Test Scripts
```typescript
// tests/e2e/tutor-flow.test.ts
describe('Tutor Complete Flow', () => {
  test('signup → book → pay → review', async () => {
    // 1. Signup
    const { user } = await signUp('tutor@test.com', '123456');
    expect(user).toBeDefined();

    // 2. Register pet
    const pet = await createPet(user.id, { name: 'Rex', species: 'dog', size: 'M' });
    expect(pet.id).toBeDefined();

    // 3. Search pet shops
    const shops = await searchPetShops(-18.7264, -44.4314, 10);
    expect(shops.length).toBeGreaterThan(0);

    // 4. Get available slots
    const slots = await getAvailableSlots(shops[0].id, tomorrow());
    expect(slots.length).toBeGreaterThan(0);

    // 5. Create booking
    const booking = await createBooking({
      tutor_id: user.id,
      petshop_id: shops[0].id,
      booking_date: tomorrow(),
      start_time: slots[0].time,
      items: [{ pet_id: pet.id, service_id: shops[0].services[0].id }],
    });
    expect(booking.status).toBe('pending_payment');

    // 6. Process payment (sandbox)
    const payment = await processPayment(booking.id, 'pix');
    expect(payment.status).toBe('approved');

    // 7. Verify booking confirmed
    const updated = await getBooking(booking.id);
    expect(updated.status).toBe('confirmed');
  });
});
```

### Performance Testing
```bash
# Lighthouse CI (web dashboard)
npx lighthouse https://ipet-dashboard.vercel.app --preset=desktop --output=json

# React Native performance
# Use Flipper + React DevTools profiler
# Target: <16ms per frame (60fps)
```

### Beta Feedback Form (Google Forms)
```
Formulário: "IPET Beta — Feedback Pet Shop"
1. Nome do pet shop: [texto]
2. Facilidade de uso: [1-5]
3. Clareza das informações: [1-5]
4. Velocidade: [1-5]
5. O que mais gostou? [texto]
6. O que melhoraria? [texto]
7. Usaria no dia a dia? [sim/não/talvez]
8. Indicaria? [sim/não]
9. Bugs encontrados: [texto]
10. NPS (0-10): [número]
```

### Bug Tracking
```markdown
## Bug Template
**ID:** BUG-XXX
**Severidade:** P0/P1/P2/P3
**Fluxo:** [onde ocorre]
**Passos:** [como reproduzir]
**Esperado:** [o que deveria acontecer]
**Atual:** [o que acontece]
**Device:** [modelo + OS]
**Screenshot:** [se aplicável]
**Status:** Open/Fixed/Verified
```

## Testing
- [ ] Todos os testes E2E passam
- [ ] 2-3 pet shops testaram e deram feedback
- [ ] NPS médio >= 7
- [ ] Zero bugs P0
- [ ] Máximo 2 bugs P1 (com fix agendado)
- [ ] Performance dentro dos limites
- [ ] Checklist de segurança 100% verde
- [ ] APK gerado e testado em Android real

## File List
*Auto-maintained*

## Notes
- Mercado Pago sandbox para pagamentos de teste (não usar produção)
- Testar em Android primeiro (público-alvo principal em cidades de interior)
- Dispositivos alvo: Android 10+, telas 5-6.5"
- Conexão alvo: 3G/4G (interior de MG)
- Considerar: TestFlight (iOS) + Firebase App Distribution (Android) para beta
- Grupo WhatsApp com pet shops beta para feedback rápido

## Related Stories
- Bloqueada por: TODAS as stories anteriores (001-025)
- Bloqueador para: IPET-027 (Publicação)
