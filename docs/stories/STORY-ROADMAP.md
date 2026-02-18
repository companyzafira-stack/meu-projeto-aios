# IPET — Story Roadmap (12 Semanas)

**Total:** 28 stories | **Timeline:** 12 semanas | **Dev:** 1 pessoa + Claude Code
**PRD:** `/docs/prd/IPET-PRD-v1.0.md`
**Context:** `IPET-CONTEXT.md` (memory)

---

## Mês 1: Fundação (Semanas 1-4)

### Semana 1 — Infraestrutura & Auth
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-001 | Project Setup (Monorepo, Supabase, Expo, Next.js) | Critical | 2 | — |
| IPET-002 | Database Schema & Migrations | Critical | 2 | 001 |
| IPET-003 | Tutor Authentication (Email + OAuth) | Critical | 1 | 002 |

### Semana 2 — Onboarding & Home
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-004 | Pet Shop Auth & Dashboard Shell | Critical | 2 | 002 |
| IPET-005 | Pet Registration (CRUD + Photo) | Critical | 2 | 003 |
| IPET-006 | Home Screen — Pet Shop Discovery | High | 1 | 002 |

### Semana 3 — Dashboard Pet Shop
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-007 | Pet Shop Service Catalog (CRUD) | Critical | 3 | 004 |
| IPET-008 | Pet Shop Schedule & Slots Management | Critical | 2 | 004 |

### Semana 4 — Perfil & Seleção de Serviço
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-009 | Pet Shop Profile View (App) | High | 2 | 006, 007 |
| IPET-010 | Service Selection & Slot Booking Flow | Critical | 3 | 008, 009 |

---

## Mês 2: Core (Semanas 5-8)

### Semana 5 — Pagamento
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-011 | Mercado Pago Integration (Split Payment) | Critical | 3 | 010 |
| IPET-012 | Booking Confirmation & Payment Flow | Critical | 2 | 011 |

### Semana 6 — Notificações & Status
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-013 | Push Notifications System (FCM + Expo) | High | 2 | 012 |
| IPET-014 | Booking Status Management (Dashboard) | High | 3 | 012 |

### Semana 7 — Fotos & Avaliações
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-015 | Photo Upload Post-Service | High | 2 | 014 |
| IPET-016 | Review & Rating System | High | 3 | 014 |

### Semana 8 — Financeiro & Self-Signup
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-017 | Pet Shop Financial Dashboard | Medium | 2 | 011 |
| IPET-018 | Pet Shop Self-Signup & Approval | High | 3 | 004 |

---

## Mês 3: Polish & Launch (Semanas 9-12)

### Semana 9 — Admin Panel
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-019 | Admin — Pet Shop Management | High | 2 | 018 |
| IPET-020 | Admin — Metrics Dashboard | Medium | 2 | 012 |
| IPET-021 | Admin — Disputes & Moderation | Medium | 1 | 016 |

### Semana 10 — Regras de Negócio
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-022 | Cancellation & Refund System | Critical | 2 | 011, 012 |
| IPET-023 | No-Show Policy & Penalties | High | 1 | 012 |
| IPET-024 | Map View & Advanced Filters | Medium | 2 | 006 |

### Semana 11 — Legal & QA
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-025 | Terms of Use, Privacy Policy, LGPD | Critical | 2 | — |
| IPET-026 | Testing & QA with Real Pet Shops | Critical | 3 | ALL |

### Semana 12 — Launch
| Story | Título | Prioridade | Dias | Deps |
|-------|--------|-----------|------|------|
| IPET-027 | App Store & Play Store Publication | Critical | 3 | 025, 026 |
| IPET-028 | Go-Live: Onboarding 5 Pet Shops Curvelo | Critical | 2 | 027 |

---

## Resumo por Epic

| Epic | Stories | Dias | % do MVP |
|------|---------|------|----------|
| **App Tutor** | 001-003, 005-006, 009-010, 012-013, 015-016, 022-024 | 30 | 50% |
| **Dashboard Pet Shop** | 004, 007-008, 014, 017-018 | 17 | 28% |
| **Admin Panel** | 019-021 | 5 | 8% |
| **Infra & Launch** | 001-002, 025-028 | 8 | 14% |
| **TOTAL** | 28 stories | 60 dias | 100% |

---

## Dependency Graph (Simplificado)

```
IPET-001 (Setup)
  └── IPET-002 (Schema)
        ├── IPET-003 (Tutor Auth) ──→ IPET-005 (Pet CRUD)
        ├── IPET-004 (PetShop Auth) ──→ IPET-007 (Services) ──→ IPET-009 (Profile)
        │                              IPET-008 (Slots) ──────→ IPET-010 (Booking)
        └── IPET-006 (Home) ─────────────────────────────────→ IPET-009 (Profile)

IPET-010 (Booking) + IPET-011 (Pagamento) ──→ IPET-012 (Confirmation)
  └── IPET-012 ──→ IPET-013 (Push)
                    IPET-014 (Status Mgmt) ──→ IPET-015 (Photos)
                                                IPET-016 (Reviews)
                    IPET-022 (Cancel/Refund)
                    IPET-023 (No-Show)

IPET-018 (Self-Signup) ──→ IPET-019 (Admin PetShops)
IPET-012 ──→ IPET-020 (Admin Metrics)
IPET-016 ──→ IPET-021 (Admin Moderation)

IPET-025 (Legal) + IPET-026 (QA) ──→ IPET-027 (Publish) ──→ IPET-028 (Go-Live)
```

---

## Status Tracking

| Story | Status | Assignee | Started | Completed |
|-------|--------|----------|---------|-----------|
| IPET-001 | Pending | — | — | — |
| IPET-002 | Pending | — | — | — |
| IPET-003 | Pending | — | — | — |
| IPET-004 | Pending | — | — | — |
| IPET-005 | Pending | — | — | — |
| IPET-006 | Pending | — | — | — |
| IPET-007 | Pending | — | — | — |
| IPET-008 | Pending | — | — | — |
| IPET-009 | Pending | — | — | — |
| IPET-010 | Pending | — | — | — |
| IPET-011 | Pending | — | — | — |
| IPET-012 | Pending | — | — | — |
| IPET-013 | Pending | — | — | — |
| IPET-014 | Pending | — | — | — |
| IPET-015 | Pending | — | — | — |
| IPET-016 | Pending | — | — | — |
| IPET-017 | Pending | — | — | — |
| IPET-018 | Pending | — | — | — |
| IPET-019 | Pending | — | — | — |
| IPET-020 | Pending | — | — | — |
| IPET-021 | Pending | — | — | — |
| IPET-022 | Pending | — | — | — |
| IPET-023 | Pending | — | — | — |
| IPET-024 | Pending | — | — | — |
| IPET-025 | Pending | — | — | — |
| IPET-026 | Pending | — | — | — |
| IPET-027 | Pending | — | — | — |
| IPET-028 | Pending | — | — | — |

---

*Última atualização: 2026-02-18*
