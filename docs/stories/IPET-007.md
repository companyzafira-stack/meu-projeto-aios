---
story_id: IPET-007
status: Pending
epic: Dashboard Pet Shop
priority: Critical
feature_section: F10 (Gestão de Serviços)
acceptance_criteria:
  - Pet shop cria serviços com nome, categoria, duração
  - Preço configurado por porte (P/M/G/GG)
  - Add-ons (hidratação, tosa de unha) configuráveis
  - CRUD completo de serviços
scope: Both
dependencies:
  - IPET-004
constraints:
  - "Categorias fixas: banho, tosa, combo, addon"
  - "Preço obrigatório para pelo menos 1 porte"
estimates_days: 3
---

# Pet Shop Service Catalog (CRUD) — IPET-007

## Summary
Dashboard para pet shop criar e gerenciar seu catálogo de serviços com preço por porte do pet. Inclui serviços pré-definidos e customizados.

## User Story
As a pet shop owner,
I want to configure my services with prices per pet size,
So that tutors can see exactly what I offer and how much it costs.

## Acceptance Criteria
- [ ] Página "Serviços" no dashboard lista todos os serviços do pet shop
- [ ] Botão "Novo Serviço" abre formulário: nome, descrição, categoria (dropdown), duração (minutos)
- [ ] Preço configurado por porte: inputs separados para P, M, G, GG (ao menos 1 obrigatório)
- [ ] Categorias disponíveis: Banho, Tosa, Banho + Tosa (combo), Add-on
- [ ] Checkbox "É add-on" para serviços adicionais (hidratação, tosa de unha)
- [ ] Serviços pré-sugeridos ao primeiro acesso: Banho, Tosa Higiênica, Tosa Máquina, Tosa Tesoura, Banho+Tosa, Hidratação, Tosa de Unha
- [ ] Editar serviço: todos os campos editáveis
- [ ] Desativar serviço: toggle ativo/inativo (não deleta, apenas oculta do app)
- [ ] Deletar serviço: com confirmação, só se não tiver agendamentos futuros vinculados
- [ ] Tabela com colunas: Nome, Categoria, Duração, Preço (P/M/G/GG), Status, Ações
- [ ] Desconto multi-pet: seção separada para configurar % desconto para 2+ pets (opcional)

## Technical Details

### UI Components
```
apps/web/src/app/(dashboard)/servicos/
├── page.tsx              — Lista de serviços + tabela
├── novo/page.tsx         — Form de criação
├── [id]/page.tsx         — Form de edição
└── components/
    ├── ServiceTable.tsx   — Tabela de serviços
    ├── ServiceForm.tsx    — Form reutilizável (criar/editar)
    ├── PriceBySize.tsx    — 4 inputs de preço (P/M/G/GG)
    └── MultiPetDiscount.tsx — Config de desconto multi-pet
```

### API Operations
```typescript
// Criar serviço + preços (transaction)
async function createService(service, prices) {
  const { data: svc } = await supabase.from('services').insert(service).select().single();
  const priceRows = prices.map(p => ({ service_id: svc.id, ...p }));
  await supabase.from('service_prices').insert(priceRows);
  return svc;
}

// Listar serviços do pet shop com preços
const { data } = await supabase
  .from('services')
  .select('*, service_prices(*)')
  .eq('petshop_id', petshopId)
  .order('category', { ascending: true });
```

## Testing
- [ ] Criar serviço com preço para todos os portes funciona
- [ ] Criar serviço com preço para apenas 1 porte funciona
- [ ] Editar preço atualiza corretamente
- [ ] Desativar serviço oculta do app (não aparece em queries públicas)
- [ ] Deletar serviço com agendamentos futuros é bloqueado
- [ ] Serviços pré-sugeridos aparecem no primeiro acesso
- [ ] Desconto multi-pet é salvo e aplicável
- [ ] Validação: nome obrigatório, duração > 0, preço > 0

## File List
*Auto-maintained*

## Notes
- Usar react-hook-form para formulários (validação + performance)
- Tabela com shadcn/ui Table component
- Serviços pré-sugeridos: seed no primeiro acesso do pet shop (check flag)
- Preços em centavos no banco (evitar floating point issues)

## Related Stories
- Bloqueada por: IPET-004 (Dashboard Shell)
- Bloqueador para: IPET-009 (Pet Shop Profile), IPET-010 (Booking)
