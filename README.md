# IPET — Pet Shop Marketplace

Plataforma iFood para pet shops. Marketplace onde tutores agendam banho/tosa e pet shops gerenciam agendamentos.

## Stack Tecnológico

- **Mobile:** React Native + Expo (iOS/Android)
- **Web:** Next.js 14+ (Dashboard + Admin)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Monorepo:** Turborepo
- **Pagamentos:** Mercado Pago
- **Notificações:** Firebase Cloud Messaging

## Estrutura do Projeto

```
ipet/
├── apps/
│   ├── mobile/          # Expo React Native app (tutores)
│   └── web/             # Next.js dashboard (pet shops + admin)
├── packages/
│   └── shared/          # Tipos TypeScript compartilhados
├── docs/
│   ├── prd/             # Product Requirements Document
│   ├── stories/         # Development stories (IPET-001, etc)
│   └── architecture/    # Documentação técnica
└── .aios-core/          # Framework AIOS
```

## Setup Rápido

### 1. Clone e instale dependências

```bash
cd /Users/mbatista10/meu-projeto-aios
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais Supabase
```

### 3. Rode os apps

```bash
# Roda ambos os apps em paralelo
npm run dev

# Ou rode individualmente:
cd apps/mobile && npm run dev  # Expo
cd apps/web && npm run dev     # Next.js localhost:3000
```

### 4. Build

```bash
npm run build
```

## Primeira Story — IPET-001

Esta é a **IPET-001: Project Setup**. Configurações:

- ✅ Monorepo Turborepo com `apps/mobile`, `apps/web`, `packages/shared`
- ✅ Expo app rodando
- ✅ Next.js app rodando
- ✅ Tipos compartilhados configurados
- ✅ Supabase integrado (ainda sem banco criado)
- ✅ ESLint + Prettier configurados
- ✅ Git inicializado

### Próximos passos

1. **IPET-002:** Database Schema & Migrations (criar tabelas no Supabase)
2. **IPET-003:** Tutor Authentication (login/signup)
3. **IPET-004:** Pet Shop Auth & Dashboard

## Documentação

- **PRD Completo:** `/docs/prd/IPET-PRD-v1.0.md`
- **Stories:** `/docs/stories/IPET-*.md` (28 stories, 12 semanas de desenvolvimento)
- **Architecture:** `/docs/architecture/` (decisões técnicas)

## Suporte

Para dúvidas sobre o desenvolvimento:

1. Leia a story correspondente em `/docs/stories/`
2. Verifique o CLAUDE.md para padrões do projeto
3. Consulte a arquitetura em `/docs/architecture/`

## Status do Projeto

**Semana 1:** Setup ✅
- IPET-001: Project Setup (IN PROGRESS)
- IPET-002: Database Schema (Pending)
- IPET-003: Tutor Auth (Pending)

---

**IPET v1.0.0** — Desenvolvido com ❤️ em Curvelo, MG
