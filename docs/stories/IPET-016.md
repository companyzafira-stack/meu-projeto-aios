---
story_id: IPET-016
status: Pending
epic: App Tutor + Dashboard Pet Shop
priority: High
feature_section: F7 (Avaliação) + F14 (Avaliações Dashboard)
acceptance_criteria:
  - Tutor avalia com 1-5 estrelas + comentário após serviço concluído
  - Pet shop responde avaliações
  - Filtro de palavrões e botão reportar
  - Nota média exibida no perfil
scope: Both
dependencies:
  - IPET-014
constraints:
  - "1 avaliação por booking (unique constraint)"
  - "Só quem usou o serviço pode avaliar"
estimates_days: 3
---

# Review & Rating System — IPET-016

## Summary
Sistema de avaliações vinculadas a agendamentos concluídos. Tutor avalia, pet shop responde, moderação básica com filtro de palavrões e report.

## User Story
As a tutor,
I want to rate and review pet shops after my appointment,
So that I can help other tutors choose the best service.

## Acceptance Criteria
- [ ] App: após booking status = 'completed', card "Avaliar este serviço" aparece
- [ ] Form: 1-5 estrelas (tap) + campo de comentário (opcional, max 500 chars)
- [ ] Apenas 1 avaliação por booking (botão desaparece após avaliar)
- [ ] Avaliação aparece imediatamente no perfil do pet shop
- [ ] Dashboard: página "Avaliações" lista todas com nota, comentário, tutor, data
- [ ] Dashboard: pet shop pode responder (1 resposta por avaliação, max 500 chars)
- [ ] Resposta aparece abaixo do comentário no app
- [ ] Filtro de palavrões: lista de ~100 palavras bloqueadas, impede submit se detectado
- [ ] Botão "Reportar" disponível para tutores e pet shops
- [ ] Avaliação reportada fica hidden até moderação admin
- [ ] Perfil pet shop: nota média recalculada ao inserir nova avaliação
- [ ] App: tela "Todas as Avaliações" com sort: Mais recentes, Melhores, Piores

## Technical Details

### Rating Component (App)
```typescript
// Star rating component with half-star disabled (integer only)
const StarRating = ({ value, onChange }) => (
  <View style={styles.stars}>
    {[1,2,3,4,5].map(star => (
      <TouchableOpacity key={star} onPress={() => onChange(star)}>
        <Star filled={star <= value} />
      </TouchableOpacity>
    ))}
  </View>
);
```

### Profanity Filter
```typescript
// packages/shared/src/utils/profanityFilter.ts
const BLOCKED_WORDS = ['word1', 'word2', ...]; // ~100 words

export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return BLOCKED_WORDS.some(word => normalized.includes(word));
}
```

### Average Rating (DB trigger)
```sql
-- Recalculate avg rating on review insert/update/delete
CREATE OR REPLACE FUNCTION update_petshop_avg_rating()
RETURNS trigger AS $$
BEGIN
  -- Could store as materialized view or cached column
  -- For MVP: calculate on-the-fly in queries
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### UI Structure
```
-- App
src/screens/reviews/
├── WriteReviewScreen.tsx   — Form: stars + comment
├── AllReviewsScreen.tsx    — Lista completa com sort
└── components/
    ├── StarRating.tsx
    ├── ReviewCard.tsx      — Nota + comment + response + report
    └── ReviewPrompt.tsx    — Card "Avaliar este serviço"

-- Dashboard
apps/web/src/app/(dashboard)/avaliacoes/
├── page.tsx                — Lista de avaliações
└── components/
    ├── ReviewTable.tsx     — Tabela com ações
    ├── ResponseModal.tsx   — Modal para responder
    └── ReportButton.tsx
```

## Testing
- [ ] Tutor consegue avaliar com 1-5 estrelas
- [ ] Comentário é salvo corretamente
- [ ] Segunda avaliação no mesmo booking é bloqueada
- [ ] Pet shop responde e resposta aparece no app
- [ ] Palavrão é bloqueado no submit
- [ ] Report esconde avaliação
- [ ] Nota média atualiza corretamente
- [ ] Sort funciona (newest, highest, lowest)
- [ ] Tutor que não fez booking não consegue avaliar

## File List
*Auto-maintained*

## Notes
- Nota média: calcular on-the-fly com AVG() no query (MVP simples)
- Futuramente: cache em coluna avg_rating no petshops table
- Profanity list: começar com ~100 palavras PT-BR, expandir conforme reports

## Related Stories
- Bloqueada por: IPET-014 (Booking Status)
- Bloqueador para: IPET-021 (Admin Moderation)
