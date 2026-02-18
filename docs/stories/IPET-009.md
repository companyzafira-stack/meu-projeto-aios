---
story_id: IPET-009
status: Pending
epic: App Tutor
priority: High
feature_section: F3 (Perfil do Pet Shop)
acceptance_criteria:
  - Tela de perfil com banner, info, serviços e avaliações
  - Lista de serviços com preço por porte
  - Avaliações com nota média e comentários recentes
  - Botão "Agendar" visível
scope: Frontend
dependencies:
  - IPET-006
  - IPET-007
constraints:
  - "Layout estilo iFood (banner + serviços + avaliações)"
  - "Preço exibido conforme porte do pet do tutor"
estimates_days: 2
---

# Pet Shop Profile View (App) — IPET-009

## Summary
Tela de perfil do pet shop no app do tutor. Mostra informações do estabelecimento, catálogo de serviços com preços por porte, e avaliações de outros tutores.

## User Story
As a tutor,
I want to see a pet shop's profile with services, prices, and reviews,
So that I can decide if I want to book a service there.

## Acceptance Criteria
- [ ] Banner no topo com foto de capa do pet shop
- [ ] Info: nome, endereço, telefone, horário de funcionamento, distância
- [ ] Nota média em destaque (ex: 4.7 ★ com 23 avaliações)
- [ ] Seção "Serviços": lista organizada por categoria (Banho, Tosa, Combo, Add-ons)
- [ ] Cada serviço mostra: nome, descrição, duração, preço conforme porte do pet do tutor
- [ ] Se tutor tem múltiplos pets com portes diferentes, mostra faixa de preço (ex: R$ 35-55)
- [ ] Seção "Avaliações": 3 comentários mais recentes + nota + botão "Ver todas"
- [ ] Tela "Todas as Avaliações": lista completa com filtro (mais recentes, melhores, piores)
- [ ] Cada avaliação mostra: nome tutor, nota, comentário, data, resposta do pet shop (se houver)
- [ ] Seção "Fotos": galeria de fotos do estabelecimento (horizontal scroll)
- [ ] Botão fixo no footer: "Agendar" → navega para IPET-010

## Technical Details

### Query (join services + prices + reviews)
```typescript
// Perfil completo do pet shop
const { data: petshop } = await supabase
  .from('petshops')
  .select(`
    *,
    petshop_photos(*),
    services(*, service_prices(*)),
    reviews(*, profiles:tutor_id(display_name, avatar_url))
  `)
  .eq('id', petshopId)
  .eq('services.is_active', true)
  .eq('reviews.is_hidden', false)
  .single();
```

### Screen Structure
```
src/screens/petshop/
├── PetShopProfileScreen.tsx  — Container
├── components/
│   ├── ProfileHeader.tsx     — Banner + info + nota
│   ├── ServiceList.tsx       — Lista de serviços por categoria
│   ├── ServiceCard.tsx       — Card individual de serviço
│   ├── ReviewSection.tsx     — 3 reviews recentes + "ver todas"
│   ├── ReviewCard.tsx        — Card de review (nota, comentário, resposta)
│   ├── PhotoGallery.tsx      — Scroll horizontal de fotos
│   └── BookButton.tsx        — Botão fixo "Agendar"
└── AllReviewsScreen.tsx      — Lista completa com filtros
```

## Testing
- [ ] Perfil carrega com dados corretos (nome, endereço, nota)
- [ ] Serviços agrupados por categoria corretamente
- [ ] Preço exibido conforme porte do pet do tutor
- [ ] Faixa de preço exibida para múltiplos pets com portes diferentes
- [ ] Avaliações mostram 3 mais recentes
- [ ] "Ver todas" navega para lista completa
- [ ] Galeria de fotos com scroll horizontal funciona
- [ ] Botão "Agendar" navega para booking flow
- [ ] Pet shop sem avaliações mostra "Nenhuma avaliação ainda"
- [ ] Pet shop sem fotos não mostra seção de galeria

## File List
*Auto-maintained*

## Notes
- Usar react-native-reanimated para animações suaves no scroll
- Lazy loading de imagens (react-native-fast-image ou expo-image)
- Preço personalizado: usar pets do tutor logado para mostrar preço relevante
- Se tutor não tem pet cadastrado, mostrar preço "a partir de"

## Related Stories
- Bloqueada por: IPET-006 (Home), IPET-007 (Services)
- Bloqueador para: IPET-010 (Booking Flow)
