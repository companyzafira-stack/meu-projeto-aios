---
story_id: IPET-027
status: Pending
epic: Infra & Launch
priority: Critical
feature_section: Publicação
acceptance_criteria:
  - App publicado na App Store (iOS)
  - App publicado na Play Store (Android)
  - Dashboard web em produção (Vercel)
  - Domínio configurado
scope: Both
dependencies:
  - IPET-025
  - IPET-026
constraints:
  - "Apple Developer: $99/ano"
  - "Google Play: $25 taxa única"
  - "Review Apple pode levar 2-7 dias"
  - "EAS Build (Expo) para gerar binários"
estimates_days: 3
---

# App Store & Play Store Publication — IPET-027

## Summary
Publicação do app IPET nas lojas Apple App Store e Google Play Store, deploy do dashboard web em produção no Vercel com domínio personalizado, e configuração de ambiente de produção completo.

## User Story
As the IPET founder,
I want to publish the app on both app stores and deploy the web dashboard,
So that tutors can download the app and pet shops can access the dashboard.

## Acceptance Criteria

### Pré-requisitos
- [ ] **Apple Developer Account** criada ($99/ano) — developer.apple.com
- [ ] **Google Play Console** criada ($25 taxa única) — play.google.com/console
- [ ] **Domínio** registrado: ipet.app ou ipetapp.com.br
- [ ] **Certificados e chaves** de assinatura gerados

### Build & Deploy — App Mobile (Expo/EAS)
- [ ] **Configurar EAS Build:**
  - `eas.json` com perfis: development, preview, production
  - App identifier: `com.ipet.app` (iOS) / `com.ipet.app` (Android)
  - Versão: 1.0.0 (build 1)
- [ ] **Assets do app:**
  - Ícone: 1024x1024 (iOS) + 512x512 (Android) — sem transparência
  - Splash screen: logo IPET centralizado, fundo branco
  - Screenshots: 5-8 por plataforma (iPhone 6.5" + iPad 12.9" + Android phone)
  - Feature graphic (Android): 1024x500
- [ ] **Build de produção:**
  ```bash
  eas build --platform all --profile production
  ```
- [ ] **Submit para lojas:**
  ```bash
  eas submit --platform ios    # App Store Connect
  eas submit --platform android # Google Play Console
  ```

### App Store (iOS)
- [ ] **App Store Connect** configurado:
  - Nome: IPET — Pet Shops Perto de Você
  - Subtítulo: Agende banho e tosa para seu pet
  - Categoria: Lifestyle (primária), Utilities (secundária)
  - Descrição (4000 chars max): detalhada com funcionalidades
  - Keywords: pet shop, banho, tosa, agendamento, pet, cachorro, gato
  - Política de privacidade URL: https://ipet.app/privacidade
  - Classificação: 4+ (sem conteúdo restrito)
- [ ] **Screenshots:**
  - Tela 1: Home com pet shops próximos
  - Tela 2: Perfil do pet shop com serviços
  - Tela 3: Agendamento com seleção de horário
  - Tela 4: Confirmação de pagamento
  - Tela 5: Avaliação após serviço
- [ ] **Review notes:** "Conta de teste: tutor@test.com / 123456. Pet shop disponível em Curvelo/MG."
- [ ] Submit para review → aguardar aprovação (2-7 dias)

### Google Play Store (Android)
- [ ] **Google Play Console** configurado:
  - Nome: IPET — Pet Shops Perto de Você
  - Descrição curta (80 chars): Agende banho e tosa para seu pet nos melhores pet shops
  - Descrição longa: detalhada com funcionalidades
  - Categoria: Lifestyle
  - Tags: pet shop, agendamento, banho, tosa
  - Classificação de conteúdo: preenchido (questionário IARC)
  - Política de privacidade URL: https://ipet.app/privacidade
- [ ] **Store listing assets:**
  - Screenshots (phone + tablet)
  - Feature graphic 1024x500
  - Ícone 512x512
- [ ] **Release:**
  - Internal testing track primeiro (verificar tudo funciona)
  - Production track: enviar para review
  - Review Google: 1-3 dias geralmente

### Deploy — Dashboard Web (Vercel)
- [ ] **Vercel** configurado:
  - Projeto: ipet-dashboard
  - Framework: Next.js (auto-detected)
  - Domínio: dashboard.ipet.app
  - Environment variables de produção configuradas
- [ ] **Environment variables (produção):**
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...     # Server-side only
  MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx
  MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx
  NEXT_PUBLIC_APP_URL=https://dashboard.ipet.app
  RESEND_API_KEY=re_xxx
  ```
- [ ] **DNS configurado:**
  - `ipet.app` → landing page (ou redirect para app stores)
  - `dashboard.ipet.app` → Vercel (dashboard pet shop + admin)
  - `api.ipet.app` → Vercel API routes (se necessário)
- [ ] **SSL:** automático via Vercel (Let's Encrypt)
- [ ] Deploy de produção: `vercel --prod`

### Supabase Produção
- [ ] **Projeto produção** criado no Supabase (separado do dev)
- [ ] Migrations executadas no banco de produção
- [ ] RLS policies ativas e verificadas
- [ ] Backups automáticos configurados (Supabase Pro: daily backups)
- [ ] Edge Functions deployadas (se usadas)

### Mercado Pago Produção
- [ ] Aplicação em modo produção (não sandbox)
- [ ] Credenciais de produção no .env
- [ ] Webhook URL atualizada: `https://dashboard.ipet.app/api/webhooks/mercadopago`
- [ ] Testado com pagamento real de R$ 1,00 (estornar depois)

## Technical Details

### EAS Configuration
```json
// eas.json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "ios": { "resourceClass": "m1-medium" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "mateus@ipet.app",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

### app.json (Production Config)
```json
{
  "expo": {
    "name": "IPET",
    "slug": "ipet",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFFFF"
    },
    "ios": {
      "bundleIdentifier": "com.ipet.app",
      "supportsTablet": false,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Precisamos da sua localização para encontrar pet shops próximos.",
        "NSCameraUsageDescription": "Para tirar fotos do seu pet.",
        "NSPhotoLibraryUsageDescription": "Para selecionar fotos do seu pet."
      }
    },
    "android": {
      "package": "com.ipet.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### Vercel Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from web app directory
cd apps/web
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... etc
```

### Pre-Launch Checklist
```markdown
## Pre-Launch Verification
- [ ] App loads correctly on iOS (TestFlight)
- [ ] App loads correctly on Android (Internal Testing)
- [ ] Dashboard loads correctly (Vercel preview)
- [ ] Supabase production migrations applied
- [ ] RLS policies verified in production
- [ ] Mercado Pago production mode active
- [ ] Webhook receiving events correctly
- [ ] Push notifications working (FCM production)
- [ ] Email sending working (Resend production)
- [ ] Privacy policy URL accessible
- [ ] Terms of use URL accessible
- [ ] Error monitoring configured (Sentry or similar)
- [ ] Analytics configured (basic pageviews/events)
```

## Testing
- [ ] Build iOS gerado sem erros
- [ ] Build Android gerado sem erros
- [ ] App funciona em TestFlight (iOS)
- [ ] App funciona em Internal Testing (Android)
- [ ] Dashboard acessível via domínio de produção
- [ ] Login funciona em produção
- [ ] Pagamento real de R$ 1 processado e estornado
- [ ] Push notifications chegam em produção
- [ ] Todas as URLs legais acessíveis

## File List
*Auto-maintained*

## Notes
- Apple review pode rejeitar na primeira vez — motivos comuns:
  - Falta screenshot de iPad (mesmo sem suporte)
  - Login com Apple obrigatório se tiver login social
  - Descrição genérica demais
  - Bug no fluxo principal
- Google Play é mais rápido para aprovar (1-3 dias vs 2-7 dias Apple)
- EAS Build: free tier tem limite de builds/mês — planejar builds com cuidado
- Considerar Sentry para crash reporting em produção
- Custo mensal estimado em produção: Vercel Pro ($20) + Supabase Pro ($25) + domínio ($40/ano)

## Related Stories
- Bloqueada por: IPET-025 (Legal), IPET-026 (QA)
- Bloqueador para: IPET-028 (Go-Live)
