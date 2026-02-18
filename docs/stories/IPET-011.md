---
story_id: IPET-011
status: Pending
epic: App Tutor
priority: Critical
feature_section: F5 (Pagamento)
acceptance_criteria:
  - Mercado Pago Marketplace account configured with CNPJ
  - Pet shop sellers connected via OAuth (access_token stored)
  - Payment preference created with split payment rules (90/10)
  - Pix and credit card supported
  - Webhook endpoint for payment notifications
  - Payment status tracked in bookings table
scope: Backend
dependencies:
  - IPET-010
constraints:
  - "Split payment: 90% pet shop / 10% IPET commission"
  - "Mercado Pago Marketplace API (not standard checkout)"
  - "OAuth flow required for each pet shop seller"
estimates_days: 3
---

# Mercado Pago Integration (Split Payment) — IPET-011

## Summary
Integrar Mercado Pago Marketplace para split payment automático (90% pet shop / 10% IPET). Configurar conta marketplace, OAuth para sellers (pet shops), e criação de preferências de pagamento com divisão automática.

## User Story
As the IPET platform,
I want to integrate Mercado Pago Marketplace with split payment,
So that payments are automatically divided between the pet shop (90%) and the platform (10%).

## Acceptance Criteria
- [ ] **Marketplace Account:** Mercado Pago Marketplace account configured with IPET CNPJ
- [ ] **OAuth Flow:** Pet shop sellers connected via OAuth authorization flow
  - Pet shop clicks "Conectar Mercado Pago" in dashboard
  - Redirected to MP authorization page
  - On approval, `access_token` and `refresh_token` stored in `petshop_profiles` table
- [ ] **Split Payment:** Payment preference created with marketplace split rules
  - 90% goes to pet shop seller (`collector_id`)
  - 10% retained by IPET marketplace (`marketplace_fee`)
- [ ] **Payment Methods:** Pix and credit card both supported
  - Pix: instant confirmation via webhook
  - Credit card: supports installments (up to 12x)
- [ ] **Webhook Endpoint:** `/api/webhooks/mercadopago` receives payment notifications
  - Validates webhook signature (x-signature header)
  - Handles: `payment.created`, `payment.updated`
  - Updates booking status based on payment status
- [ ] **Payment Tracking:** Payment status stored and tracked in bookings table
  - Fields: `payment_id`, `payment_status`, `payment_method`, `paid_at`
  - Statuses: `pending`, `approved`, `rejected`, `refunded`

## Technical Details

### Mercado Pago Marketplace Flow
```
1. IPET creates Marketplace application on MP
2. Pet shop authorizes IPET via OAuth → receives access_token
3. Tutor books → IPET creates payment preference using pet shop's access_token
4. marketplace_fee set to 10% of total
5. MP processes payment → splits automatically
6. Webhook notifies IPET → updates booking status
```

### OAuth for Pet Shop Sellers
```typescript
// Step 1: Generate authorization URL
const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${MP_APP_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&platform_id=mp`;

// Step 2: Exchange code for tokens
async function exchangeCodeForToken(code: string) {
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    body: JSON.stringify({
      client_secret: MP_CLIENT_SECRET,
      client_id: MP_APP_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const { access_token, refresh_token, user_id } = await response.json();
  // Store in petshop_profiles
  await supabase.from('petshop_profiles').update({
    mp_access_token: access_token,
    mp_refresh_token: refresh_token,
    mp_user_id: user_id,
  }).eq('id', petshopId);
}
```

### Create Payment Preference (Split)
```typescript
async function createPaymentPreference(booking: Booking, petshopAccessToken: string) {
  const preference = {
    items: [{
      title: `Agendamento IPET #${booking.id}`,
      quantity: 1,
      unit_price: booking.total_amount,
      currency_id: 'BRL',
    }],
    marketplace_fee: booking.total_amount * 0.10, // 10% IPET commission
    back_urls: {
      success: `${APP_URL}/booking/${booking.id}/success`,
      failure: `${APP_URL}/booking/${booking.id}/failure`,
      pending: `${APP_URL}/booking/${booking.id}/pending`,
    },
    notification_url: `${API_URL}/api/webhooks/mercadopago`,
    external_reference: booking.id,
    payment_methods: {
      excluded_payment_types: [],
      installments: 12,
    },
  };

  const mp = new MercadoPago(petshopAccessToken);
  return mp.preferences.create(preference);
}
```

### Webhook Handler
```typescript
// pages/api/webhooks/mercadopago.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body;

  if (type === 'payment') {
    const paymentId = data.id;
    const payment = await mp.payment.get(paymentId);

    await supabase.from('bookings').update({
      payment_id: paymentId,
      payment_status: payment.status, // approved, rejected, pending
      payment_method: payment.payment_type_id,
      paid_at: payment.status === 'approved' ? new Date().toISOString() : null,
    }).eq('id', payment.external_reference);
  }

  return res.status(200).json({ received: true });
}
```

### Database Changes
```sql
-- Add payment fields to bookings table
ALTER TABLE bookings ADD COLUMN payment_id TEXT;
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN payment_method TEXT;
ALTER TABLE bookings ADD COLUMN paid_at TIMESTAMPTZ;

-- Add MP credentials to petshop_profiles
ALTER TABLE petshop_profiles ADD COLUMN mp_access_token TEXT;
ALTER TABLE petshop_profiles ADD COLUMN mp_refresh_token TEXT;
ALTER TABLE petshop_profiles ADD COLUMN mp_user_id TEXT;
```

### File Structure
```
src/
├── lib/
│   └── mercadopago/
│       ├── client.ts              — MP SDK initialization
│       ├── oauth.ts               — OAuth flow helpers
│       ├── preferences.ts         — Create payment preferences
│       └── webhooks.ts            — Webhook validation & handling
├── pages/api/
│   ├── mercadopago/
│   │   └── oauth-callback.ts     — OAuth redirect handler
│   └── webhooks/
│       └── mercadopago.ts         — Payment webhook endpoint
```

## Testing
- [ ] Mercado Pago Marketplace credentials configured (sandbox)
- [ ] OAuth flow: pet shop authorizes → tokens stored correctly
- [ ] OAuth flow: token refresh works when expired
- [ ] Payment preference created with correct 90/10 split
- [ ] Pix payment flow works end-to-end (sandbox)
- [ ] Credit card payment flow works end-to-end (sandbox)
- [ ] Webhook receives payment.created and updates booking
- [ ] Webhook receives payment.updated (approved) and updates booking
- [ ] Webhook signature validation rejects invalid requests
- [ ] Booking payment_status updates correctly for all states
- [ ] Refund flow works via MP API

## File List
*Auto-maintained*

## Notes
- Use Mercado Pago sandbox for development and testing
- Access tokens expire; implement token refresh logic
- Webhook URL must be publicly accessible (use ngrok for local dev)
- Store sensitive tokens encrypted or use Supabase Vault
- marketplace_fee is in the same currency unit as the item price (BRL)

## Related Stories
- Bloqueada por: IPET-010 (Booking Flow)
- Bloqueador para: IPET-012 (Payment Confirmation), IPET-017 (Financial Dashboard)
