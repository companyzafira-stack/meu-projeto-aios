# IPET — Product Requirements Document (PRD)

**Version:** 1.0.0
**Date:** 2026-02-18
**Status:** Draft
**Author:** Mateus Batista + Claude Code
**Project:** IPET — O iFood dos Pet Shops
**Stage:** MVP

---

## 1. Visão Geral

### 1.1 O que é o IPET?

IPET é um marketplace mobile-first que conecta **tutores de pets** a **pet shops** para agendamento, pagamento e avaliação de serviços de banho e tosa. É o "iFood dos pet shops" para cidades de interior e médias, onde 100% dos agendamentos ainda são feitos via WhatsApp e telefone.

### 1.2 Missão

Centralizar a descoberta, comparação, agendamento, pagamento e avaliação de serviços pet em uma única plataforma, eliminando a ineficiência do modelo manual atual.

### 1.3 Visão de Longo Prazo

Tornar-se a plataforma líder de serviços pet no Brasil, expandindo de banho/tosa para veterinário, hotel, creche, adestramento e marketplace de produtos, com inteligência artificial como diferenciador competitivo a partir da v1.1.

---

## 2. O Problema

### 2.1 Lado do Tutor (Demanda)

Tutores de pets em cidades de interior não têm como comparar preços, ver avaliações ou agendar banho/tosa de forma centralizada. Hoje:

- 100% dos agendamentos são feitos via WhatsApp e ligação telefônica, um por um
- Sem transparência de preço, disponibilidade ou qualidade
- Descoberta de pet shops é feita por boca a boca
- Tutor que mora a 5 quadras de um pet shop pode não saber que ele existe

### 2.2 Lado do Pet Shop (Oferta)

Pet shops pequenos (98% do mercado brasileiro são micro e pequenas empresas):

- Gastam **2-3 horas/dia** gerenciando agendamentos por WhatsApp e telefone
- Perdem clientes por demora na resposta
- Taxa de **no-show de 15-25%** por falta de confirmação automatizada
- Sem presença digital estruturada
- Não conseguem oferecer serviços adicionais de forma organizada

### 2.3 O Problema Concreto

Não existe um "iFood dos pet shops" para cidades de interior. IPET centraliza a descoberta, comparação, agendamento, pagamento e avaliação de serviços pet em um único app.

---

## 3. Usuários

### 3.1 Usuário 1 — Tutor do Pet (App Mobile)

| Atributo | Detalhe |
|----------|---------|
| **Interface** | App mobile nativo (React Native/Expo) |
| **Idade** | 25-55 anos |
| **Classe** | Média |
| **Pets** | 1-3 (principalmente cão ou gato) |
| **Localização** | Cidades de interior/médias (inicialmente Curvelo, MG — ~80k hab.) |
| **Perfil digital** | Usa WhatsApp, iFood/Rappi, familiaridade com apps de marketplace |
| **Usuários por domicílio** | 1 (responsável principal pelo pet) |

**Workflow do Tutor:**

```
Abre app → Vê pet shops próximos (preços + avaliações)
→ Seleciona pet shop → Escolhe serviço (banho, tosa, combo)
→ Seleciona pets para o agendamento
→ Escolhe dia e horário disponível (slot)
→ Paga via Pix ou cartão pelo app
→ Recebe confirmação push instantânea
→ Leva o pet no horário
→ Recebe notificação "Seu pet está pronto!" + foto
→ Avalia o serviço (1-5 estrelas + comentário)
```

### 3.2 Usuário 2 — Dono/Gestor do Pet Shop (Dashboard Web)

| Atributo | Detalhe |
|----------|---------|
| **Interface** | Dashboard web (Next.js) — navegador no PC ou tablet |
| **Perfil** | Microempreendedor(a), 1-3 funcionários |
| **Gestão atual** | Caderninho, planilha ou WhatsApp |
| **Usuários por pet shop** | 1-2 (dono + eventualmente tosador) |

**Workflow do Pet Shop:**

```
Acessa dashboard web → Configura serviços com preços
→ Define horários de funcionamento e slots
→ Recebe notificação de novo agendamento (automático)
→ Executa serviço → Tira 1-3 fotos do pet pronto
→ Marca como concluído → Tutor recebe notificação + foto
→ Recebe repasse do pagamento via Mercado Pago
```

### 3.3 Usuário 3 — Admin / Founder (Painel Admin Web)

| Atributo | Detalhe |
|----------|---------|
| **Interface** | Seção /admin dentro do Next.js (role-based) |
| **Usuário** | Founder (Mateus) |
| **Propósito** | Gerenciamento operacional da plataforma |

---

## 4. Modelo de Negócio

### 4.1 Fontes de Receita (MVP)

#### Receita 1 — Assinatura Mensal do Pet Shop

| Plano | Preço | Agendamentos | Usuários | Extras |
|-------|-------|-------------|----------|--------|
| **Básico** | R$ 49/mês | Até 30/mês | 1 | Perfil na plataforma |
| **Pro** | R$ 99/mês | Ilimitados | 3 | Destaque na busca + relatórios |
| **Premium** | R$ 149/mês | Ilimitados | 3 | Badge Premium + prioridade no suporte + marketing local |

#### Receita 2 — Comissão por Transação

- **10%** sobre cada agendamento pago pelo app
- Implementado via **split payment do Mercado Pago Marketplace**
- Tutor paga valor cheio → Mercado Pago retém 10% para IPET → repassa 90% ao pet shop
- Pix: taxa ~0,99% (absorvida pela comissão de 10%)
- Cartão: taxa ~4,99% (absorvida pela comissão de 10%)

#### Receitas Futuras (NÃO no MVP)

| Receita | Versão | Descrição |
|---------|--------|-----------|
| Marketplace de produtos | v2.0 | Pet shops vendem rações, shampoos, acessórios. Comissão 12-15% |
| Destaque pago | v2.0 | R$ 29-99/mês extra para posição prioritária nas buscas |

### 4.2 Mercado

| Métrica | Valor | Fonte |
|---------|-------|-------|
| **Mercado pet Brasil** | R$ 75,4 bilhões/ano | ABINPET/IPB 2024 |
| **Posição global** | 3º maior mercado pet do mundo | ABINPET |
| **Crescimento** | 9,6% ao ano (2024) | ABINPET |
| **Empresas pet no Brasil** | 285.000+ | Sebrae/Receita Federal 2023 |
| **Micro e pequenas** | 98% do total | Sebrae |
| **Pets no Brasil** | 167,6 milhões | ABINPET |
| **Cães** | 67,8 milhões | ABINPET |
| **Gatos** | 33,6 milhões | ABINPET |
| **Domicílios com pet** | 56% | ABINPET |

### 4.3 TAM / SAM / SOM

| Nível | Definição | Valor Estimado |
|-------|-----------|---------------|
| **TAM** | 285k empresas pet × R$ 99/mês | R$ 338 milhões/ano (só assinatura) |
| **SAM** | 80k-120k pet shops com banho/tosa em cidades <200k hab. | R$ 95-142 milhões/ano |
| **SOM (Ano 1)** | 15-25 pet shops em Curvelo + cidades próximas (MG) | R$ 18k-45k/ano |

### 4.4 Projeção Curvelo (Piloto)

| Cenário | Pet Shops | Agendamentos/dia/shop | Receita Mensal |
|---------|-----------|----------------------|----------------|
| **Pessimista (mês 1-3)** | 3 | 2 | ~R$ 1.077 |
| **Realista (mês 4-6)** | 5 | 4 | ~R$ 3.095 |
| **Otimista (mês 7-12)** | 6 | 6 | ~R$ 5.274 |

### 4.5 Willingness to Pay

Pet shops pequenos já pagam R$ 100-200/mês por sistemas de gestão (SimplesVet, GestãoClick). Aceitam pagar se a plataforma **trouxer clientes novos**, não apenas organizar o que já têm.

---

## 5. Features do MVP

### 5.1 App do Tutor (Mobile)

#### F1. Onboarding do Tutor

| ID | Feature | Descrição |
|----|---------|-----------|
| F1.1 | Cadastro | Email, Google ou Apple Sign-In via Supabase Auth |
| F1.2 | Cadastro de pet | Nome, espécie (cão/gato), raça, porte (P/M/G/GG), idade, foto |
| F1.3 | Múltiplos pets | Tutor pode cadastrar até 5 pets no perfil |
| F1.4 | Localização | Solicitar permissão de geolocalização para buscar pet shops próximos |

#### F2. Descoberta de Pet Shops

| ID | Feature | Descrição |
|----|---------|-----------|
| F2.1 | Home com lista | Pet shops próximos com foto, nota média, distância, faixa de preço |
| F2.2 | Busca por nome | Campo de busca para encontrar pet shop específico |
| F2.3 | Filtros | Ordenar por: mais próximo, melhor avaliado, menor preço |
| F2.4 | Mapa | Visualização em mapa dos pet shops próximos (Google Maps / Mapbox) |
| F2.5 | Card do pet shop | Nome, foto de capa, nota (ex: 4.7), nº de avaliações, distância, preço "a partir de" |

#### F3. Perfil do Pet Shop

| ID | Feature | Descrição |
|----|---------|-----------|
| F3.1 | Banner e info | Foto de capa, nome, endereço, horário de funcionamento, telefone |
| F3.2 | Lista de serviços | Serviços organizados por categoria com preço por porte |
| F3.3 | Avaliações | Nota média + comentários recentes + ver todas |
| F3.4 | Fotos do pet shop | Galeria de fotos do estabelecimento |

#### F4. Agendamento

| ID | Feature | Descrição |
|----|---------|-----------|
| F4.1 | Seleção de pets | Tutor escolhe 1 ou mais pets para o agendamento |
| F4.2 | Seleção de serviço | Escolhe serviço para cada pet (banho, tosa, combo, add-ons) |
| F4.3 | Calendário de slots | Visualização de dias e horários disponíveis (estilo Booksy) |
| F4.4 | Slots consecutivos | Para múltiplos pets, reserva automática de slots consecutivos |
| F4.5 | Resumo | Resumo do agendamento: pets, serviços, data/hora, preço total, tempo estimado |
| F4.6 | Desconto multi-pet | Se configurado pelo pet shop, aplica desconto para 2+ pets |

#### F5. Pagamento

| ID | Feature | Descrição |
|----|---------|-----------|
| F5.1 | Pagamento antecipado | Tutor paga no momento do agendamento (resolve no-show) |
| F5.2 | Métodos | Pix e cartão de crédito/débito via Mercado Pago Checkout |
| F5.3 | Split payment | 90% pet shop / 10% IPET via Mercado Pago Marketplace |
| F5.4 | Política exibida | Política de cancelamento exibida antes da confirmação |
| F5.5 | Comprovante | Recibo digital do pagamento (push + in-app) |

#### F6. Acompanhamento

| ID | Feature | Descrição |
|----|---------|-----------|
| F6.1 | Status em tempo real | Agendado → Em atendimento → Concluído |
| F6.2 | Push: confirmação | Notificação ao confirmar agendamento |
| F6.3 | Push: lembrete | Lembrete 24h e 2h antes do horário |
| F6.4 | Push: em atendimento | Pet shop inicia o serviço |
| F6.5 | Push: concluído + foto | "Seu Rex está pronto! Veja como ficou" + foto do pet |
| F6.6 | Histórico | Lista de todos os agendamentos (passados e futuros) |

#### F7. Avaliação

| ID | Feature | Descrição |
|----|---------|-----------|
| F7.1 | Nota + comentário | 1-5 estrelas + texto livre, disponível após status "concluído" |
| F7.2 | Vinculada ao agendamento | Só quem usou o serviço pode avaliar (elimina avaliações falsas) |
| F7.3 | 1 avaliação por agendamento | Limite de 1 avaliação por serviço concluído |
| F7.4 | Reportar | Botão "reportar" para comentários ofensivos |

#### F8. Perfil do Tutor

| ID | Feature | Descrição |
|----|---------|-----------|
| F8.1 | Dados pessoais | Nome, email, telefone, foto |
| F8.2 | Meus pets | Lista de pets cadastrados com perfil individual |
| F8.3 | Histórico de fotos | Galeria de fotos do pet pós-serviço (linha do tempo visual) |
| F8.4 | Configurações | Notificações, termos de uso, política de privacidade, logout |

#### Navegação do App (Bottom Tab Bar)

| Aba | Ícone | Tela |
|-----|-------|------|
| **Home** | Casa/Lupa | Buscar pet shops |
| **Agendamentos** | Calendário | Meus agendamentos (futuros + passados) |
| **Meus Pets** | Pata | Perfis dos pets + histórico de fotos |
| **Perfil** | Pessoa | Conta, configurações, suporte |

---

### 5.2 Dashboard do Pet Shop (Web)

#### F9. Onboarding do Pet Shop

| ID | Feature | Descrição |
|----|---------|-----------|
| F9.1 | Self-signup | Formulário: CNPJ, nome fantasia, endereço, telefone, email, fotos do estabelecimento |
| F9.2 | Status pendente | Após submissão, fica "pendente" até aprovação manual do admin |
| F9.3 | Email de boas-vindas | Após aprovação, pet shop recebe email com credenciais de acesso |
| F9.4 | Seed manual | Primeiros 5-6 pet shops cadastrados manualmente pelo founder via Supabase |

#### F10. Gestão de Serviços

| ID | Feature | Descrição |
|----|---------|-----------|
| F10.1 | Catálogo de serviços | Criar, editar, remover serviços |
| F10.2 | Preço por porte | Cada serviço tem preço diferente por porte (P, M, G, GG) |
| F10.3 | Serviços customizados | Campo livre para nome, descrição e preço (ex: "Banho especial Golden — R$ 85") |
| F10.4 | Duração estimada | Tempo de execução por serviço (usado para calcular slots) |
| F10.5 | Add-ons | Hidratação e tosa de unha como itens opcionais adicionáveis |
| F10.6 | Desconto multi-pet | Campo opcional: % de desconto para 2+ pets no mesmo agendamento |

**Serviços Pré-Definidos no MVP:**

| Serviço | Variações |
|---------|-----------|
| Banho | Por porte: Pequeno, Médio, Grande, Gigante |
| Tosa | Higiênica, Na máquina, Na tesoura |
| Banho + Tosa | Combo com preço definido pelo pet shop |
| Hidratação de pelagem | Add-on ao banho |
| Tosa de unha | Add-on avulso |

#### F11. Gestão de Agenda

| ID | Feature | Descrição |
|----|---------|-----------|
| F11.1 | Definir horários | Horário de funcionamento por dia da semana |
| F11.2 | Definir slots | Quantidade de atendimentos simultâneos por horário |
| F11.3 | Bloquear horários | Bloquear slots de última hora (emergência, falta de funcionário) |
| F11.4 | Visualização | Calendário semanal com agendamentos marcados |
| F11.5 | Reagendamento | Se bloquear horário com agendamento existente, tutor é notificado e reagendado com prioridade |

**Regra de Inatividade:**
- 7 dias sem atualizar slots → Alerta ao pet shop
- 14 dias sem atualizar → Pet shop fica temporariamente invisível na busca

#### F12. Gestão de Agendamentos

| ID | Feature | Descrição |
|----|---------|-----------|
| F12.1 | Lista de agendamentos | Todos os agendamentos por status: confirmado, em atendimento, concluído, cancelado |
| F12.2 | Iniciar atendimento | Botão para mudar status para "em atendimento" |
| F12.3 | Upload de fotos | Tirar 1-3 fotos do pet após serviço (câmera nativa, max 5MB, compressão automática) |
| F12.4 | Concluir | Marcar como concluído → tutor recebe push com foto |
| F12.5 | Cancelar | Pet shop pode cancelar → reembolso integral automático ao tutor |

#### F13. Financeiro

| ID | Feature | Descrição |
|----|---------|-----------|
| F13.1 | Resumo de ganhos | Total recebido no período (dia/semana/mês) |
| F13.2 | Lista de transações | Cada agendamento com valor, comissão IPET, valor líquido |
| F13.3 | Status de repasse | Vinculado ao dashboard do Mercado Pago |

#### F14. Avaliações

| ID | Feature | Descrição |
|----|---------|-----------|
| F14.1 | Ver avaliações | Todas as avaliações recebidas com nota, comentário e data |
| F14.2 | Responder | 1 resposta pública por avaliação |
| F14.3 | Reportar | Reportar avaliação ofensiva (envia para moderação admin) |

#### F15. Perfil do Pet Shop

| ID | Feature | Descrição |
|----|---------|-----------|
| F15.1 | Dados do negócio | Nome, CNPJ, endereço, telefone, descrição |
| F15.2 | Fotos | Upload de fotos do estabelecimento |
| F15.3 | Plano e assinatura | Ver plano atual, upgrade, dados de pagamento |

---

### 5.3 Painel Admin (Founder)

#### F16. Gestão de Pet Shops

| ID | Feature | Descrição |
|----|---------|-----------|
| F16.1 | Lista de pet shops | Todos cadastrados: status (ativo, pendente, suspenso), plano, data de cadastro |
| F16.2 | Aprovar/recusar | Aprovação manual de pet shops que fizeram self-signup |
| F16.3 | Suspender | Suspender pet shop por violação de termos |

#### F17. Dashboard de Métricas

| ID | Feature | Descrição |
|----|---------|-----------|
| F17.1 | Agendamentos | Total por dia/semana/mês, gráfico de tendência |
| F17.2 | Receita | Total de comissões + assinaturas no período |
| F17.3 | Taxa de cancelamento | % de agendamentos cancelados |
| F17.4 | Taxa de no-show | % de no-shows |
| F17.5 | Rankings | Pet shops mais ativos, tutores mais ativos |

#### F18. Gestão de Agendamentos

| ID | Feature | Descrição |
|----|---------|-----------|
| F18.1 | Lista global | Todos os agendamentos da plataforma |
| F18.2 | Filtros | Por pet shop, por data, por status |
| F18.3 | Disputas | Ver casos de disputa/reembolso fora da política automática, decidir manualmente |

#### F19. Moderação

| ID | Feature | Descrição |
|----|---------|-----------|
| F19.1 | Avaliações reportadas | Lista de avaliações reportadas, opção de ocultar ou manter |

---

## 6. Regras de Negócio

### 6.1 Agendamento

| Regra | Detalhe |
|-------|---------|
| **Modelo** | Slots pré-definidos pelo pet shop + confirmação automática ao pagar |
| **Pagamento** | Antecipado (no ato do agendamento) |
| **Multi-pet** | 1 agendamento com N itens (modelo carrinho). Slots consecutivos reservados automaticamente |
| **Inatividade** | 7 dias sem atualizar slots = alerta. 14 dias = pet shop invisível na busca |

### 6.2 Cancelamento e Reembolso

| Situação | Reembolso | Destino |
|----------|-----------|---------|
| Tutor cancela **>12h antes** | 100% | Devolvido ao tutor |
| Tutor cancela **2-12h antes** | 50% | 50% tutor, 50% pet shop |
| Tutor cancela **<2h** ou no-show | 0% | 100% pet shop |
| Pet shop cancela (qualquer momento) | 100% | Devolvido ao tutor + sugestão de alternativas |

- Reembolsos 100% automáticos via API Mercado Pago
- Pix: instantâneo. Cartão: 7-15 dias úteis

### 6.3 No-Show

| Ocorrência | Consequência |
|------------|-------------|
| 1-2 no-shows em 30 dias | Aviso ao tutor |
| 3+ no-shows em 30 dias | Restrição: só pode agendar com antecedência mínima de 48h por 30 dias |

### 6.4 Avaliações

| Regra | Detalhe |
|-------|---------|
| Quem pode avaliar | Apenas tutores com agendamento concluído naquele pet shop |
| Limite | 1 avaliação por agendamento |
| Resposta do pet shop | 1 resposta pública por avaliação |
| Moderação | Filtro básico de palavrões + botão reportar + moderação manual no admin |

### 6.5 Pet Shop

| Regra | Detalhe |
|-------|---------|
| Cancelamentos excessivos | 3+ cancelamentos pelo pet shop em 30 dias = alerta de qualidade |
| Plano Básico | Limite de 30 agendamentos/mês |
| Self-signup | Requer aprovação manual do admin antes de ficar visível |

### 6.6 Fotos do Pet

| Regra | Detalhe |
|-------|---------|
| Quantidade | 1-3 fotos por atendimento |
| Tamanho máximo | 5MB por foto |
| Compressão | Automática no upload |
| Armazenamento | Supabase Storage (bucket por pet shop, organizado por data) |
| Notificação | Push com preview da foto ao tutor |

---

## 7. Arquitetura Técnica

### 7.1 Tech Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **App Mobile (Tutor)** | React Native + Expo | Um codebase → iOS + Android. Expo simplifica build, deploy, push. Excelente suporte com Claude Code |
| **Dashboard Web (Pet Shop + Admin)** | Next.js | React frontend + API routes. Acesso via navegador |
| **Backend / Banco / Auth** | Supabase | PostgreSQL gerenciado, auth pronta, realtime, storage. Elimina 60% do backend |
| **Pagamento** | Mercado Pago Marketplace | Split payment nativo. Checkout redirect. Pix + cartão. Sem custo fixo |
| **Push Notifications** | Firebase Cloud Messaging | Gratuito, funciona via Expo em iOS/Android |
| **Deploy (Web)** | Vercel | Free tier para Next.js |
| **Deploy (Auxiliar)** | Railway ou Render | Para serviços auxiliares se necessário |
| **Mapas** | Google Maps API ou Mapbox | Geolocalização de pet shops próximos |
| **Monorepo** | Turborepo ou Nx | Compartilhar tipos TypeScript entre mobile e web |

### 7.2 Decisões Arquiteturais que Economizam Tempo

| Decisão | Economia |
|---------|----------|
| Supabase como BaaS | Elimina construção de auth, API REST, realtime, storage do zero |
| Expo managed workflow | Elimina configuração nativa complexa de iOS/Android |
| Mercado Pago checkout redirect | Elimina UI de pagamento custom |
| Monorepo com tipos compartilhados | Elimina duplicação de types entre mobile e web |

### 7.3 Modelo de Dados (Entidades Principais)

```
users (tutores)
├── id, name, email, phone, avatar_url, created_at
├── auth via Supabase Auth (email, Google, Apple)
└── role: 'tutor' | 'petshop_owner' | 'admin'

pets
├── id, user_id (FK), name, species, breed, size, age, photo_url
└── size: 'small' | 'medium' | 'large' | 'giant'

petshops
├── id, owner_id (FK users), name, cnpj, address, lat, lng
├── phone, description, cover_photo, status, plan
├── status: 'pending' | 'active' | 'suspended'
└── plan: 'basic' | 'pro' | 'premium'

petshop_photos
├── id, petshop_id (FK), photo_url, order
└── Galeria de fotos do estabelecimento

services
├── id, petshop_id (FK), name, description, category
├── duration_minutes, is_addon
└── category: 'banho' | 'tosa' | 'combo' | 'addon'

service_prices
├── id, service_id (FK), size, price
└── size: 'small' | 'medium' | 'large' | 'giant'

schedules
├── id, petshop_id (FK), day_of_week, start_time, end_time
├── slot_duration_minutes, max_concurrent
└── is_active

schedule_blocks
├── id, petshop_id (FK), date, start_time, end_time, reason
└── Bloqueios pontuais de horário

bookings (agendamentos / orders)
├── id, tutor_id (FK users), petshop_id (FK), booking_date
├── start_time, end_time, status, total_amount
├── payment_id (Mercado Pago), payment_status
├── status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
└── cancelled_by: 'tutor' | 'petshop' | null

booking_items (itens do agendamento)
├── id, booking_id (FK), pet_id (FK), service_id (FK)
├── price, duration_minutes
└── 1 booking : N booking_items (modelo carrinho)

booking_photos (fotos pós-serviço)
├── id, booking_id (FK), photo_url, uploaded_at
└── Max 3 por booking

reviews (avaliações)
├── id, booking_id (FK), tutor_id (FK), petshop_id (FK)
├── rating (1-5), comment, created_at
├── petshop_response, response_date
├── is_reported, is_hidden
└── 1 review por booking

notifications
├── id, user_id (FK), type, title, body, data_json
├── is_read, created_at
└── type: 'booking_confirmed' | 'reminder_24h' | 'reminder_2h' | 'in_progress' | 'completed' | 'cancelled' | 'photo_ready'

petshop_multi_pet_discount
├── id, petshop_id (FK), min_pets, discount_percent
└── Configuração opcional de desconto para múltiplos pets
```

### 7.4 Armazenamento de Fotos

| Tipo | Bucket | Estimativa/mês |
|------|--------|---------------|
| Fotos de pets (perfil) | `pet-avatars` | ~50MB |
| Fotos de pet shops | `petshop-photos` | ~200MB |
| Fotos pós-serviço | `booking-photos` | ~2.25GB (3 fotos × 1MB × 25/dia × 30 dias) |
| **Total** | | ~2.5GB/mês |

Supabase Pro ($25/mês) oferece 100GB. Suficiente para 40+ meses de operação.

---

## 8. Inteligência Artificial (Roadmap)

### 8.1 Decisão Estratégica

O MVP é construído **SEM dependência de IA**, mas com arquitetura preparada para plugar módulos de IA nas versões seguintes. Workflows do MVP são **100% hardcoded** (templates rígidos).

**IA nunca toma decisão autônoma** sobre agendamento, preço ou cancelamento. Toda decisão final é do tutor ou do pet shop. IA apenas sugere.

### 8.2 Roadmap de IA

| Versão | Feature | O que IA faz | Métrica de Sucesso |
|--------|---------|-------------|-------------------|
| **v1.0 (MVP)** | Nenhuma | N/A | N/A |
| **v1.1** | Assistente IA para tutores | Chatbot 24/7: dúvidas sobre saúde/comportamento do pet, sugestão de frequência de banho por raça/porte | 80% interações sem humano. +30% agendamentos de usuários que interagem |
| **v2.0** | Recomendação inteligente | Análise de perfil do pet → sugestão de serviços e frequência ideal | +20-30% ticket médio dos pet shops |
| **v2.0** | Otimização de agenda | Análise de padrões → sugestão de redistribuição de horários | -15% ociosidade dos slots |

### 8.3 Regra de Ouro

```
MVP: 100% hardcoded, zero IA
v1.1+: Híbrido (templates hardcoded + IA refina)
Sempre: IA sugere, humano decide
```

---

## 9. Design e UX

### 9.1 Referências Visuais

| Referência | O que pegar |
|-----------|------------|
| **iFood** | Home com lista, cards de estabelecimento, checkout, acompanhamento de status, push notifications |
| **Booksy** | Calendário de slots, seleção de serviço, confirmação instantânea, lembretes |

### 9.2 Estilo Visual

| Atributo | Decisão |
|----------|---------|
| **Cor primária** | Azul ou verde-água (confiança e cuidado, diferente do vermelho iFood e roxo Zoop) |
| **Background** | Branco/claro |
| **Cards** | Bordas arredondadas, sombras suaves, fotos grandes |
| **Tipografia** | Legível, sem serifas, tamanhos hierárquicos |
| **Ícones** | Simples e universais (estrelas, relógio, mapa) |
| **Princípio** | 1 tela = 1 objetivo claro. Sem excesso de informação |
| **UI Library** | NativeBase ou React Native Paper (mobile) + Tailwind (web) |

### 9.3 Prioridade de Design

```
funciona > limpo > bonito > perfeito
```

O diferencial do IPET não é UX inovadora — é resolver o problema de agendamento pet de forma profissional onde ninguém resolve hoje. Não reinventar a UX. Tutores já usam iFood e sabem navegar nesse padrão.

---

## 10. Métricas de Sucesso

### 10.1 KPIs do MVP (3 meses)

| KPI | Meta | Período |
|-----|------|---------|
| Pet shops ativos na plataforma | 5+ | Mês 3 |
| Agendamentos concluídos por semana | 10+ | A partir do mês 2 |
| Taxa de no-show | <10% (vs 15-25% atual) | Mês 3 |
| NPS dos tutores | >40 | Mês 3 |
| NPS dos pet shops | >40 | Mês 3 |
| App publicado (iOS + Android) | Sim | Mês 3 |

### 10.2 Métricas de Alerta

| Métrica | Threshold | Ação |
|---------|-----------|------|
| <3 pet shops ativos após 30 dias | Alerta crítico | Investigar causa, pivotar abordagem |
| <10 agendamentos/semana após 60 dias | Alerta | Intensificar marketing, ajustar proposta de valor |
| Taxa de cancelamento >30% | Alerta | Revisar UX de agendamento, política de cancelamento |

### 10.3 Métrica de Validação do Modelo

```
Se após 60 dias houver pelo menos 10 agendamentos/semana pelo app,
o modelo está validado e pronto para expansão.
```

---

## 11. Concorrência

### 11.1 Concorrentes Diretos

| Concorrente | Modelo | Diferença IPET |
|------------|--------|---------------|
| **Zoop Pet** | Marketplace de serviços pet | Foca em capitais, sem pagamento integrado, sem fotos pós-serviço |
| **PetBacker** | Marketplace de cuidadores | Foco em pet sitting/dog walking, não banho/tosa |
| **DogHero** | Marketplace de hospedagem | Foco em hospedagem e passeio, não serviços de pet shop |

### 11.2 Concorrentes Indiretos

| Concorrente | Tipo | Por que não resolve |
|------------|------|-------------------|
| **WhatsApp** | Comunicação direta | Sem centralização, sem pagamento, sem avaliação, sem comparação |
| **SimplesVet** | Sistema de gestão | Não traz clientes novos, só organiza os existentes |
| **GestãoClick** | ERP | Generalista, não especializado em pet |
| **Instagram** | Presença digital | Não tem agendamento, não tem pagamento integrado |

### 11.3 Vantagem Competitiva IPET

1. **Foco em cidades de interior** — onde ninguém compete
2. **Pagamento integrado** — resolve no-show estruturalmente
3. **Foto do pet pós-serviço** — diferenciador emocional e viral
4. **IA roadmap** — diferenciador competitivo de longo prazo (v1.1+)
5. **Modelo de negócio** — assinatura + comissão (receita previsível + variável)

---

## 12. Riscos e Mitigações

### 12.1 Risco #1: Pet Shops Não Adotam (EXISTENCIAL)

**Problema:** Cold-start do marketplace — sem pet shops, sem tutores; sem tutores, sem pet shops.

**Mitigação:**
- Abordagem presencial em Curvelo (já tem contato com 4 dos 8 pet shops, 6 aceitariam)
- 3 meses grátis de assinatura para os primeiros 6 pet shops
- Cadastro manual pelo founder (fotos, serviços, preços)
- Grupo WhatsApp com donos para feedback semanal e suporte direto
- Métrica de alerta: <3 pet shops ativos após 30 dias → pivotar

### 12.2 Risco #2: Tutores Não Baixam o App

**Mitigação:**
- Marketing local em Curvelo: panfletos nos pet shops parceiros, posts em grupos do Facebook/WhatsApp da cidade
- Pet shops parceiros indicam o app aos clientes
- Incentivo: primeiro agendamento com 20% de desconto (absorvido pelo IPET)

### 12.3 Risco #3: IA Não Funciona Bem

**Mitigação:** IA NÃO está no MVP. Risco zero.

### 12.4 Risco #4: Capital Acaba

**Mitigação:** Burn rate baixo (R$ 1.4k-3.3k/mês). Runway de 15-35 meses com R$ 50k.

### 12.5 Risco #5: Concorrente Entra em Curvelo

**Mitigação:** Improvável no curto prazo. Zoop Pet foca em capitais. Vantagem de first-mover local.

---

## 13. Requisitos Legais

### 13.1 Obrigatórios para MVP

| Requisito | Detalhe |
|-----------|---------|
| **CNPJ** | Ativo (necessário para Mercado Pago Marketplace, App Store, Google Play) |
| **Termos de Uso** | Obrigatório para publicação em lojas de app e conformidade LGPD |
| **Política de Privacidade** | Obrigatório (LGPD Lei 13.709/2018 + exigência Apple/Google) |
| **Apple Developer Program** | $99 USD/ano (~R$ 570) |
| **Google Play Developer** | $25 USD (único, ~R$ 145) |

### 13.2 Dados Coletados

| Dado | Tipo | Sensibilidade |
|------|------|--------------|
| Nome, email, telefone do tutor | Pessoal | Padrão LGPD |
| Nome, espécie, raça, porte, idade do pet | Pet profile | Baixa |
| Histórico de agendamentos e pagamentos | Transacional | Média |
| Razão social, CNPJ, endereço do pet shop | Empresarial | Padrão |
| Dados de saúde do pet (alergias, vacinas) | **NÃO coletado no MVP** | Alta (v2.0) |

### 13.3 Implementação

Termos de uso e política de privacidade gerados com auxílio jurídico (R$ 500-1.000 consulta) ou via plataformas como iubenda.com com revisão manual.

---

## 14. Orçamento

### 14.1 Custos Iniciais (Único)

| Item | Custo |
|------|-------|
| Apple Developer Program | R$ 570 |
| Google Play Developer | R$ 145 |
| Termos de uso / assessoria jurídica | R$ 500-1.000 |
| **Total** | ~R$ 1.215-1.715 |

### 14.2 Custos Mensais (Operação)

| Item | Custo/mês |
|------|-----------|
| Supabase (Pro tier) | R$ 150 (~$25) |
| Servidor auxiliar (Railway/Render) | R$ 50-250 |
| Domínio + SSL | R$ 15 |
| APIs (Mapas, SMS, Push) | R$ 100-300 |
| Design freelance (amortizado) | R$ 500-1.000 |
| Marketing local | R$ 500-1.500 |
| Contabilidade/MEI | R$ 100 |
| **Total mensal** | R$ 1.415-3.315 |

### 14.3 Runway

| Capital | Burn Rate | Runway |
|---------|-----------|--------|
| R$ 50.000 | R$ 1.415/mês (pessimista) | ~35 meses |
| R$ 50.000 | R$ 3.315/mês (otimista de gasto) | ~15 meses |

**Capital NÃO é a restrição.** A restrição é velocidade de execução e taxa de adoção dos pet shops.

---

## 15. Timeline MVP (3 Meses)

### Mês 1: Fundação (Semanas 1-4)

| Semana | Entregável |
|--------|-----------|
| S1 | Setup: monorepo, Supabase, Expo, Next.js. Modelo de dados. Auth (tutor + pet shop) |
| S2 | App tutor: onboarding, cadastro de pet, home com lista de pet shops |
| S3 | Dashboard pet shop: cadastro de serviços, preços por porte, gestão de agenda/slots |
| S4 | App tutor: perfil do pet shop, lista de serviços, calendário de slots, seleção de serviço |

### Mês 2: Core (Semanas 5-8)

| Semana | Entregável |
|--------|-----------|
| S5 | Integração Mercado Pago: split payment, checkout, Pix + cartão |
| S6 | Fluxo completo: agendamento multi-pet, pagamento, confirmação, push notifications |
| S7 | Status em tempo real, upload de fotos pós-serviço, avaliações |
| S8 | Dashboard pet shop: gestão de agendamentos, financeiro, avaliações. Self-signup com aprovação |

### Mês 3: Polish & Launch (Semanas 9-12)

| Semana | Entregável |
|--------|-----------|
| S9 | Painel admin: lista pet shops, métricas, disputas, moderação |
| S10 | Cancelamento, reembolso automático, no-show policy. Busca por mapa. Filtros |
| S11 | Testes com pet shops de Curvelo. Bug fixes. Ajustes de UX. Termos de uso |
| S12 | Publicação App Store + Google Play. Onboarding dos 5 pet shops. Go-live |

---

## 16. Critérios de Aceitação do MVP

O MVP está **pronto para lançamento** quando:

- [ ] Tutor consegue criar conta e cadastrar pet
- [ ] Tutor consegue buscar pet shops por localização
- [ ] Tutor consegue ver perfil, serviços e avaliações do pet shop
- [ ] Tutor consegue selecionar 1+ pets, escolher serviços e agendar em slot disponível
- [ ] Tutor consegue pagar via Pix ou cartão pelo app (Mercado Pago)
- [ ] Tutor recebe push de confirmação, lembrete e conclusão com foto
- [ ] Tutor consegue avaliar o serviço com nota + comentário
- [ ] Pet shop consegue configurar serviços, preços e agenda de slots
- [ ] Pet shop recebe notificação de novo agendamento
- [ ] Pet shop consegue iniciar atendimento, tirar foto e concluir
- [ ] Pet shop recebe repasse do pagamento (90% via split)
- [ ] Cancelamento e reembolso funcionam conforme política
- [ ] Admin consegue ver métricas, aprovar pet shops e gerenciar disputas
- [ ] App publicado no App Store e Google Play
- [ ] 5 pet shops de Curvelo cadastrados e ativos
- [ ] Termos de uso e política de privacidade implementados

---

## 17. O que NÃO está no MVP

| Feature | Motivo | Versão Planejada |
|---------|--------|-----------------|
| Veterinário | Regulação CRMV, complexidade | v2.0 |
| Hotel pet / Creche | Lógica de diária ≠ slot | v2.0 |
| Adestramento | Profissional autônomo | v2.0 |
| Marketplace de produtos | Logística, estoque, devoluções | v2.0 |
| Vídeo ao vivo do banho | Streaming, storage | v2.0 |
| IA Assistente | Foco no core primeiro | v1.1 |
| IA Recomendações | Precisa de dados de uso | v2.0 |
| IA Otimização de agenda | Precisa de dados de uso | v2.0 |
| Destaque pago | Precisa de massa crítica | v2.0 |
| Chat tutor ↔ pet shop | WhatsApp resolve no MVP | v1.1 |
| Delivery (leva-e-traz) | Logística complexa | v2.0 |
| Programa de fidelidade | Precisa de recorrência | v1.1 |

---

## 18. Expansão Pós-MVP

### Fase 1: Validação (Meses 1-3)
- Curvelo, MG — 5 pet shops, validar modelo

### Fase 2: Expansão Regional (Meses 4-8)
- Sete Lagoas (~240k hab.) + 2-3 cidades próximas em MG
- Meta: 30-50 pet shops

### Fase 3: Expansão Estadual (Meses 9-12)
- Belo Horizonte (~2.5M hab.) + região metropolitana
- Implementar IA v1.1 (assistente para tutores)
- Meta: 100+ pet shops

### Fase 4: Expansão Nacional (Ano 2+)
- Principais cidades de interior do Brasil
- Implementar v2.0 (marketplace, IA avançada, vet, hotel)
- Buscar investimento Series A

---

## 19. Glossário

| Termo | Definição |
|-------|-----------|
| **Tutor** | Dono/responsável pelo pet (usuário do app mobile) |
| **Pet Shop** | Estabelecimento que oferece serviços de banho e tosa |
| **Slot** | Unidade de tempo disponível para agendamento |
| **Booking** | Agendamento confirmado e pago |
| **No-show** | Tutor não comparece ao agendamento |
| **Split Payment** | Divisão automática do pagamento (90% pet shop / 10% IPET) |
| **Add-on** | Serviço adicional ao banho/tosa (hidratação, tosa de unha) |
| **Cold-start** | Problema de marketplace: precisa de oferta E demanda simultaneamente |

---

## 20. Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | 2026-02-18 | Mateus Batista + Claude Code | PRD inicial do MVP |

---

**FIM DO PRD — IPET v1.0**
