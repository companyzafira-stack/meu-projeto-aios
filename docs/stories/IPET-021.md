---
story_id: IPET-021
status: Pending
epic: Painel Admin
priority: Medium
feature_section: F18-F19 (Disputas e Moderação)
acceptance_criteria:
  - Lista de avaliações reportadas
  - Ações de moderação (manter/ocultar)
  - Lista de disputas de reembolso
scope: Frontend
dependencies:
  - IPET-016
constraints:
  - "Moderação manual no MVP"
estimates_days: 1
---

# Admin — Disputes & Moderation — IPET-021

## Summary
Ferramentas de moderação para o admin: gerenciar avaliações reportadas e disputas de reembolso fora da política automática.

## User Story
As the IPET admin,
I want to moderate reported reviews and handle payment disputes,
So that the platform maintains quality and fairness.

## Acceptance Criteria
- [ ] Página `/admin/moderacao` com duas seções: Avaliações Reportadas + Disputas
- [ ] **Avaliações Reportadas:**
  - Lista: avaliação, quem reportou, motivo, data
  - Ações: Manter (remove report, mantém visível) / Ocultar (is_hidden = true)
  - Preview da avaliação com nota, comentário, resposta do pet shop
- [ ] **Disputas:**
  - Lista: bookings com disputas pendentes (tutor contestou cancelamento ou pediu reembolso fora da política)
  - Detalhes: booking info, política aplicável, valor envolvido
  - Ações: Aprovar Reembolso / Negar / Reembolso Parcial
  - Reembolso manual via API Mercado Pago
- [ ] Contadores no sidebar admin: "X pendentes" como badge

## Technical Details

### UI Structure
```
apps/web/src/app/(admin)/moderacao/
├── page.tsx
└── components/
    ├── ReportedReviews.tsx    — Lista + ações
    ├── ReviewPreview.tsx      — Preview da avaliação
    ├── DisputesList.tsx       — Lista de disputas
    ├── DisputeDetail.tsx      — Detalhes + ações
    └── RefundModal.tsx        — Modal de reembolso manual
```

## Testing
- [ ] Avaliações reportadas aparecem na lista
- [ ] "Manter" remove flag de report
- [ ] "Ocultar" esconde avaliação no app
- [ ] Disputas listam bookings contestados
- [ ] Reembolso manual processa via API
- [ ] Badge no sidebar atualiza

## File List
*Auto-maintained*

## Related Stories
- Bloqueada por: IPET-016 (Reviews)
