---
story_id: IPET-028
status: Pending
epic: Infra & Launch
priority: Critical
feature_section: Go-Live
acceptance_criteria:
  - 5 pet shops de Curvelo onboardados
  - Dados reais cadastrados (serviços, preços, fotos, agenda)
  - Tutores convidados via marketing local
  - Primeiro agendamento real processado
scope: Operations
dependencies:
  - IPET-027
constraints:
  - "Onboarding presencial ou por videochamada"
  - "Meta: 10+ agendamentos/semana até dia 60"
  - "Grupo WhatsApp para suporte e feedback"
estimates_days: 2
---

# Go-Live: Onboarding 5 Pet Shops Curvelo — IPET-028

## Summary
Onboarding dos 5 primeiros pet shops de Curvelo/MG na plataforma: cadastro real, configuração de serviços/preços/agenda, treinamento dos donos, e lançamento local com marketing para tutores. Meta: primeiro agendamento real na primeira semana.

## User Story
As the IPET founder,
I want to onboard 5 pet shops in Curvelo and attract their first tutors,
So that the platform has real traction and validates the business model.

## Acceptance Criteria

### Fase 1: Recrutamento (Dias 1-2)
- [ ] **Lista de pet shops alvo** em Curvelo (mínimo 8, fechar 5):
  - Pet shops já contatados durante validação
  - Critérios: ativo, com banho/tosa, receptivo à tecnologia
- [ ] **Pitch deck simples** (5 slides):
  1. Problema: "Quanto tempo você gasta no WhatsApp?"
  2. Solução: IPET — agendamento automático + pagamento
  3. Como funciona: demo de 2min
  4. Oferta: 3 meses GRÁTIS (plano Básico R$ 49/mês)
  5. Próximo passo: "Cadastro em 15 minutos"
- [ ] **Visita presencial** ou videochamada com cada pet shop
- [ ] **5 pet shops confirmados** e dispostos a usar

### Fase 2: Onboarding (Dias 3-5)
- [ ] **Cadastro de cada pet shop** na plataforma:
  - Dados: nome, CNPJ, endereço, telefone, email
  - Fotos: 3-5 fotos do estabelecimento (tirar no local se necessário)
  - Serviços: banho, tosa, banho+tosa, hidratação (com preços por porte)
  - Agenda: horários de funcionamento, duração por serviço, slots
- [ ] **Aprovação admin** de cada pet shop (founder é admin)
- [ ] **Treinamento** de cada pet shop owner (30min):
  - Login no dashboard
  - Ver agendamentos recebidos
  - Marcar "em andamento" → "concluído"
  - Tirar e upload de foto pós-serviço
  - Ver financeiro
  - Como cancelar se necessário
- [ ] **Material de suporte:**
  - PDF "Guia Rápido IPET para Pet Shops" (1 página)
  - Vídeo tutorial de 3min (opcional, screen recording)
  - Número de WhatsApp para suporte direto

### Fase 3: Lançamento Local (Dias 5-7)
- [ ] **Marketing local para tutores:**
  - Panfleto A5 para pet shops distribuírem aos clientes
  - Post para Instagram dos pet shops: "Agora agendando pelo IPET!"
  - QR code no panfleto → download do app
  - Grupo de WhatsApp "IPET Curvelo" para tutores beta
- [ ] **Incentivos para primeiros tutores:**
  - Primeiro agendamento: sem taxa (comissão absorvida pelo IPET)
  - Convidar amigo: ambos ganham desconto no próximo agendamento (v1.1)
- [ ] **Monitoramento ativo (primeiras 2 semanas):**
  - Founder acompanha CADA agendamento nos primeiros dias
  - Ligar para tutor após primeiro agendamento: "Como foi?"
  - Ligar para pet shop após primeiro atendimento via app: "Algum problema?"

### Fase 4: Métricas de Validação (Semanas 1-4)
- [ ] **Dashboard de acompanhamento:**
  - Agendamentos por dia/semana
  - Tutores cadastrados
  - Pet shops ativos (recebendo bookings)
  - Taxa de no-show
  - NPS (pesquisa quinzenal)
- [ ] **Metas semana 1:** 3+ agendamentos
- [ ] **Metas semana 2:** 5+ agendamentos
- [ ] **Metas semana 4:** 10+ agendamentos/semana
- [ ] **Meta validação (dia 60):** 10+ agendamentos/semana consistentes
- [ ] **Sinal de alerta:** <3 agendamentos/semana após 30 dias → analisar causas

## Technical Details

### Onboarding Checklist (Per Pet Shop)
```markdown
## Pet Shop: [NOME]
**Responsável:** [nome do dono]
**Telefone:** [número]
**Data onboarding:** [data]

### Cadastro
- [ ] Conta criada (email + senha)
- [ ] Dados do negócio preenchidos
- [ ] CNPJ validado
- [ ] Endereço com lat/lng correto no mapa
- [ ] 3+ fotos uploadeadas

### Serviços
- [ ] Banho configurado (preços P/M/G/GG)
- [ ] Tosa configurada (preços P/M/G/GG)
- [ ] Banho + Tosa (combo com desconto)
- [ ] Hidratação (se oferece)
- [ ] Duração por serviço definida

### Agenda
- [ ] Dias de funcionamento definidos
- [ ] Horários de cada dia configurados
- [ ] Slots gerados e visíveis no app
- [ ] Teste: slot aparece na busca do tutor

### Treinamento
- [ ] Login demonstrado
- [ ] Fluxo de agendamento explicado
- [ ] Upload de foto demonstrado
- [ ] Cancelamento explicado
- [ ] Financeiro explicado
- [ ] Suporte WhatsApp compartilhado

### Go-Live
- [ ] Pet shop ativo e visível no app
- [ ] Primeiro agendamento de teste (founder como tutor)
- [ ] Pet shop confirmou que está pronto
```

### Marketing Materials
```
Panfleto A5:
┌─────────────────────────────┐
│         🐾 IPET 🐾          │
│                             │
│  Agende banho e tosa        │
│  pelo celular!              │
│                             │
│  ✓ Escolha o pet shop       │
│  ✓ Agende o horário         │
│  ✓ Pague pelo app           │
│  ✓ Avalie o serviço         │
│                             │
│  [QR CODE → App Store]      │
│                             │
│  Baixe grátis!              │
│  ipet.app                   │
└─────────────────────────────┘
```

### Feedback Collection
```typescript
// Enviar pesquisa NPS quinzenal via push
// Link para Google Forms
const npsQuestions = {
  tutors: {
    subject: 'Como está sua experiência com o IPET?',
    url: 'https://forms.gle/xxx-tutor-nps',
    frequency: '15 days',
  },
  petshops: {
    subject: 'Como está o IPET para seu pet shop?',
    url: 'https://forms.gle/xxx-petshop-nps',
    frequency: '15 days',
  },
};
```

### Daily Monitoring (First 2 Weeks)
```sql
-- Query diária para acompanhamento
SELECT
  DATE(created_at) as dia,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
  COUNT(DISTINCT tutor_id) as unique_tutors,
  COUNT(DISTINCT petshop_id) as active_petshops,
  SUM(total_amount) as gmv
FROM bookings
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY dia DESC;
```

### Go/No-Go Decision Framework
```
Dia 30 — Checkpoint:
├── 10+ agendamentos/semana? → ✅ Continuar, escalar
├── 5-9 agendamentos/semana? → ⚠️ Investigar, ajustar
├── <5 agendamentos/semana?  → 🔴 Pivotar ou mudar estratégia
│
│   Investigar:
│   - Pet shops estão usando? (abrir dashboard diariamente?)
│   - Tutores estão baixando? (downloads vs cadastros)
│   - Tutores estão agendando? (cadastros vs bookings)
│   - Funil: download → cadastro → busca → booking → pagamento
│   - Onde está o gargalo?
│
Dia 60 — Decisão:
├── Validado? → Expandir para 2ª cidade
├── Parcialmente? → Ajustar e dar mais 30 dias
└── Não validado? → Pivotar modelo ou público
```

## Testing
- [ ] 5 pet shops cadastrados e ativos na plataforma
- [ ] Todos os serviços e preços configurados corretamente
- [ ] Agenda com slots visíveis para tutores
- [ ] Pelo menos 1 agendamento de teste completo por pet shop
- [ ] Pet shop owners treinados e confortáveis com o dashboard
- [ ] Material de marketing pronto e distribuído
- [ ] Primeiro agendamento REAL (não-teste) processado
- [ ] Sistema de acompanhamento de métricas funcionando
- [ ] Grupo WhatsApp de suporte ativo

## File List
*Auto-maintained*

## Notes
- Curvelo/MG: ~80k habitantes, estimativa 15-20 pet shops com banho/tosa
- Founder tem contatos prévios com pet shops locais (validação)
- Oferta 3 meses grátis = R$ 0 receita imediata, mas valida modelo
- Comissão 10% ativa desde dia 1 (pet shop não paga, tutor paga normalmente)
- Suporte inicial 100% pelo founder via WhatsApp
- Considerar: camiseta IPET para donos de pet shop (marketing orgânico)
- Critical: RESPONDER RÁPIDO qualquer problema nas primeiras semanas (confiança)

## Related Stories
- Bloqueada por: IPET-027 (Publicação nas lojas)
- Última story do roadmap — início da operação real
- Após IPET-028: ciclo de feedback → melhorias → expansão
