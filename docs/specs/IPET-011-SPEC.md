# IPET-011 SPEC — Mercado Pago Integration & Split Payment (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. The web dashboard uses **Next.js 14 App Router + TypeScript + Tailwind + Supabase**. The mobile app uses **Expo 51 + React Native**. IPET-001 to IPET-010 are implemented. This spec covers IPET-011: Mercado Pago Marketplace integration with split payment (90% pet shop / 10% IPET commission).

**Tech stack (web):** Next.js 14 (App Router), TypeScript strict, Tailwind CSS, Supabase client at `@/lib/supabase`, Lucide React icons.

**Tech stack (mobile):** Expo 51, React Native 0.74, TypeScript, TanStack React Query 5, Supabase JS 2.45.

**Imports:** Web uses `@/` alias (maps to `./src/`). Mobile uses `@/` alias (maps to `./src/`).

## Architecture Overview

```
Payment Flow:

1. Tutor completes booking (IPET-010) → booking created as 'pending_payment'
2. Mobile app calls POST /api/payments/create-preference
3. API creates MP preference with split (90/10) using pet shop's access_token
4. API returns init_point URL → mobile opens in browser
5. Tutor pays via Pix or Credit Card on MP checkout
6. MP sends webhook → POST /api/webhooks/mercadopago
7. Webhook updates booking status (approved/rejected/pending)
8. Mobile polls booking status OR listens for update

Pet Shop OAuth Flow:

1. Pet shop clicks "Conectar Mercado Pago" in dashboard
2. Redirect to MP authorization page
3. MP redirects back with auth code
4. API exchanges code for access_token + refresh_token
5. Tokens stored in petshops table
```

## Existing Database Schema (partial — relevant columns)

```sql
-- bookings (already exists)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY,
  tutor_id UUID NOT NULL,
  petshop_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending_payment',
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  payment_id TEXT,           -- EXISTS
  payment_status TEXT,       -- EXISTS
  -- payment_method TEXT,    -- NEEDS MIGRATION
  -- paid_at TIMESTAMPTZ,   -- NEEDS MIGRATION
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- petshops (already exists)
CREATE TABLE public.petshops (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT,
  -- mp_access_token TEXT,    -- NEEDS MIGRATION
  -- mp_refresh_token TEXT,   -- NEEDS MIGRATION
  -- mp_user_id TEXT,         -- NEEDS MIGRATION
  -- mp_connected_at TIMESTAMPTZ, -- NEEDS MIGRATION
  ...
);
```

## Files to Create

### 1. `supabase/migrations/20260225_001_add_payment_columns.sql`

**Purpose:** Add missing payment columns to bookings and MP credentials to petshops.

```sql
-- Add payment tracking columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add Mercado Pago credentials to petshops
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_user_id TEXT;
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMPTZ;

-- RLS: Only petshop owner can see their own MP tokens
-- (petshops table already has RLS enabled with owner policies)
-- Tokens are sensitive — ensure SELECT policy doesn't expose them to tutors
-- The existing "Anyone can view active petshops" policy returns all columns,
-- so we need a security-definer function for token access instead.

-- Function to check if petshop has MP connected (without exposing tokens)
CREATE OR REPLACE FUNCTION public.is_petshop_mp_connected(p_petshop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT mp_access_token IS NOT NULL
  FROM public.petshops
  WHERE id = p_petshop_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_petshop_mp_connected(UUID) TO authenticated;
```

### 2. `apps/web/src/lib/mercadopago/config.ts`

**Purpose:** MP SDK configuration and constants.

```typescript
// Environment variables (add to .env.local):
// MP_APP_ID=your_marketplace_app_id
// MP_CLIENT_SECRET=your_marketplace_client_secret
// MP_ACCESS_TOKEN=your_marketplace_access_token (IPET's own token)
// MP_REDIRECT_URI=http://localhost:3000/api/mercadopago/oauth/callback
// NEXT_PUBLIC_MP_APP_ID=your_marketplace_app_id (exposed to client for OAuth URL)

export const MP_CONFIG = {
  appId: process.env.MP_APP_ID!,
  clientSecret: process.env.MP_CLIENT_SECRET!,
  accessToken: process.env.MP_ACCESS_TOKEN!,
  redirectUri: process.env.MP_REDIRECT_URI!,
  webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
  commissionPercent: 10, // 10% IPET commission
  apiBaseUrl: 'https://api.mercadopago.com',
  authBaseUrl: 'https://auth.mercadopago.com.br',
};

// Generate OAuth authorization URL for pet shop sellers
export function getOAuthUrl(petshopId: string): string {
  const state = petshopId; // Pass petshopId as state to identify on callback
  return `${MP_CONFIG.authBaseUrl}/authorization?client_id=${MP_CONFIG.appId}&response_type=code&redirect_uri=${encodeURIComponent(MP_CONFIG.redirectUri)}&state=${state}&platform_id=mp`;
}
```

### 3. `apps/web/src/lib/mercadopago/oauth.ts`

**Purpose:** Exchange authorization code for access tokens.

```typescript
import { MP_CONFIG } from './config';

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${MP_CONFIG.apiBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_secret: MP_CONFIG.clientSecret,
      client_id: MP_CONFIG.appId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: MP_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MP OAuth error: ${error.message || response.statusText}`);
  }

  return response.json();
}

// Refresh expired access token
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${MP_CONFIG.apiBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_secret: MP_CONFIG.clientSecret,
      client_id: MP_CONFIG.appId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh MP token');
  }

  return response.json();
}
```

### 4. `apps/web/src/lib/mercadopago/preferences.ts`

**Purpose:** Create payment preferences with split payment.

```typescript
import { MP_CONFIG } from './config';

interface BookingPaymentData {
  bookingId: string;
  totalAmount: number;       // in BRL (e.g., 150.00)
  description: string;       // "Agendamento IPET #bookingId"
  petshopAccessToken: string;
  payerEmail: string;        // tutor's email
}

interface PreferenceResponse {
  id: string;
  init_point: string;        // URL to redirect tutor for payment
  sandbox_init_point: string;
}

// Create payment preference with marketplace split
export async function createPaymentPreference(data: BookingPaymentData): Promise<PreferenceResponse> {
  const commissionAmount = Number((data.totalAmount * MP_CONFIG.commissionPercent / 100).toFixed(2));

  const preference = {
    items: [{
      title: data.description,
      quantity: 1,
      unit_price: data.totalAmount,
      currency_id: 'BRL',
    }],
    marketplace_fee: commissionAmount,
    payer: {
      email: data.payerEmail,
    },
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${data.bookingId}/success`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${data.bookingId}/failure`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${data.bookingId}/pending`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/mercadopago`,
    external_reference: data.bookingId,
    payment_methods: {
      excluded_payment_types: [],
      installments: 12,
    },
    statement_descriptor: 'IPET',
  };

  // Use pet shop's access token (seller) — NOT IPET's marketplace token
  const response = await fetch(`${MP_CONFIG.apiBaseUrl}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.petshopAccessToken}`,
    },
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MP Preference error: ${error.message || response.statusText}`);
  }

  return response.json();
}
```

### 5. `apps/web/src/lib/mercadopago/webhooks.ts`

**Purpose:** Webhook signature validation and payment status mapping.

```typescript
import crypto from 'crypto';
import { MP_CONFIG } from './config';

// Validate MP webhook signature (x-signature header)
// MP v2 webhook signature format: ts=timestamp,v1=hash
export function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  if (!xSignature || !xRequestId || !MP_CONFIG.webhookSecret) return false;

  const parts = xSignature.split(',');
  const tsValue = parts.find(p => p.startsWith('ts='))?.replace('ts=', '');
  const v1Value = parts.find(p => p.startsWith('v1='))?.replace('v1=', '');

  if (!tsValue || !v1Value) return false;

  // Build manifest string as per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsValue};`;

  const hmac = crypto
    .createHmac('sha256', MP_CONFIG.webhookSecret)
    .update(manifest)
    .digest('hex');

  return hmac === v1Value;
}

// Map MP payment status to booking status
export function mapPaymentToBookingStatus(mpStatus: string): string {
  switch (mpStatus) {
    case 'approved':
      return 'confirmed';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pending_payment';
    case 'rejected':
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'cancelled';
    default:
      return 'pending_payment';
  }
}

// Map MP payment type to readable format
export function mapPaymentMethod(mpMethod: string): string {
  switch (mpMethod) {
    case 'credit_card': return 'credit_card';
    case 'debit_card': return 'debit_card';
    case 'bank_transfer': return 'pix'; // Pix comes as bank_transfer
    case 'ticket': return 'boleto';
    default: return mpMethod;
  }
}
```

### 6. `apps/web/src/app/api/mercadopago/oauth/callback/route.ts`

**Purpose:** OAuth callback — exchange code for tokens and store in petshops table.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens } from '@/lib/mercadopago/oauth';

// Use service role key for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // petshopId passed as state

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/perfil?mp_error=missing_params', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in petshops table
    const { error } = await supabaseAdmin
      .from('petshops')
      .update({
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token,
        mp_user_id: String(tokens.user_id),
        mp_connected_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (error) throw error;

    // Redirect to dashboard with success
    return NextResponse.redirect(
      new URL('/dashboard/perfil?mp_connected=true', request.url)
    );
  } catch (err) {
    console.error('MP OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/perfil?mp_error=oauth_failed', request.url)
    );
  }
}
```

### 7. `apps/web/src/app/api/payments/create-preference/route.ts`

**Purpose:** Create MP payment preference for a booking. Called by mobile app.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentPreference } from '@/lib/mercadopago/preferences';
import { refreshAccessToken } from '@/lib/mercadopago/oauth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Validate auth — get tutor from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // Verify JWT and get user
    const { data: { user }, error: authError } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Get booking data
    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, tutor_id, petshop_id, total_amount, status')
      .eq('id', bookingId)
      .eq('tutor_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Booking already paid or cancelled' }, { status: 400 });
    }

    // 3. Get pet shop's MP credentials
    const { data: petshop, error: petshopError } = await supabaseAdmin
      .from('petshops')
      .select('id, name, mp_access_token, mp_refresh_token')
      .eq('id', booking.petshop_id)
      .single();

    if (petshopError || !petshop?.mp_access_token) {
      return NextResponse.json(
        { error: 'Pet shop não conectou o Mercado Pago' },
        { status: 400 }
      );
    }

    // 4. Try to create preference; if token expired, refresh and retry
    let accessToken = petshop.mp_access_token;
    try {
      const preference = await createPaymentPreference({
        bookingId: booking.id,
        totalAmount: Number(booking.total_amount),
        description: `Agendamento IPET #${booking.id.substring(0, 8)}`,
        petshopAccessToken: accessToken,
        payerEmail: user.email!,
      });

      return NextResponse.json({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      });
    } catch (prefError: any) {
      // Token might be expired — try refresh
      if (prefError.message?.includes('401') || prefError.message?.includes('unauthorized')) {
        const newTokens = await refreshAccessToken(petshop.mp_refresh_token!);

        // Update tokens in DB
        await supabaseAdmin.from('petshops').update({
          mp_access_token: newTokens.access_token,
          mp_refresh_token: newTokens.refresh_token,
        }).eq('id', petshop.id);

        // Retry with new token
        const preference = await createPaymentPreference({
          bookingId: booking.id,
          totalAmount: Number(booking.total_amount),
          description: `Agendamento IPET #${booking.id.substring(0, 8)}`,
          petshopAccessToken: newTokens.access_token,
          payerEmail: user.email!,
        });

        return NextResponse.json({
          preferenceId: preference.id,
          initPoint: preference.init_point,
          sandboxInitPoint: preference.sandbox_init_point,
        });
      }
      throw prefError;
    }
  } catch (err) {
    console.error('Create preference error:', err);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
```

### 8. `apps/web/src/app/api/webhooks/mercadopago/route.ts`

**Purpose:** Receive MP payment notifications and update booking status.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWebhookSignature, mapPaymentToBookingStatus, mapPaymentMethod } from '@/lib/mercadopago/webhooks';
import { MP_CONFIG } from '@/lib/mercadopago/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, action } = body;

    // Only handle payment events
    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = String(data.id);

    // Validate webhook signature
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    if (MP_CONFIG.webhookSecret) {
      const isValid = validateWebhookSignature(xSignature, xRequestId, paymentId);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Fetch payment details from MP API
    const paymentResponse = await fetch(
      `${MP_CONFIG.apiBaseUrl}/v1/payments/${paymentId}`,
      {
        headers: { 'Authorization': `Bearer ${MP_CONFIG.accessToken}` },
      }
    );

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from MP:', paymentResponse.statusText);
      return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
    }

    const payment = await paymentResponse.json();
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.error('No external_reference in payment');
      return NextResponse.json({ received: true });
    }

    // Map status and update booking
    const bookingStatus = mapPaymentToBookingStatus(payment.status);
    const paymentMethod = mapPaymentMethod(payment.payment_type_id);
    const commissionAmount = Number((payment.transaction_amount * MP_CONFIG.commissionPercent / 100).toFixed(2));

    const updateData: Record<string, any> = {
      payment_id: paymentId,
      payment_status: payment.status,
      payment_method: paymentMethod,
      status: bookingStatus,
      commission_amount: commissionAmount,
      updated_at: new Date().toISOString(),
    };

    // Set paid_at only when approved
    if (payment.status === 'approved') {
      updateData.paid_at = new Date().toISOString();
    }

    // Set cancelled fields if payment failed
    if (bookingStatus === 'cancelled') {
      updateData.cancelled_by = 'system';
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (error) {
      console.error('Failed to update booking:', error);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

### 9. `apps/web/src/app/(dashboard)/perfil/components/MercadoPagoConnect.tsx`

**Purpose:** Dashboard component for pet shop to connect/disconnect Mercado Pago.

```
'use client';

Props: none (fetches own petshop data)

Implementation:
  - Get session (same auth pattern as other dashboard pages)
  - Fetch petshop: supabase.from('petshops').select('id, mp_user_id, mp_connected_at').eq('id', userId).single()
  - State: isConnected (mp_user_id is not null), connecting (loading)

  Generate OAuth URL:
    const oauthUrl = `https://auth.mercadopago.com.br/authorization?client_id=${process.env.NEXT_PUBLIC_MP_APP_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${petshopId}&platform_id=mp`;

Layout (Tailwind):
  - Card: bg-white rounded-lg shadow p-6
  - Title: "Mercado Pago" text-lg font-bold
  - If NOT connected:
    - Icon: orange warning icon (AlertCircle from lucide)
    - Text: "Conecte sua conta do Mercado Pago para receber pagamentos"
    - Info: "Seus pagamentos serão depositados diretamente na sua conta MP"
    - Button: "Conectar Mercado Pago" bg-[#009EE3] (MP blue) text-white rounded-lg px-6 py-3
      - onClick: window.location.href = oauthUrl
  - If connected:
    - Icon: green check (CheckCircle from lucide)
    - Text: "Mercado Pago conectado" text-green-600
    - Sub: "Conectado em {formatted mp_connected_at}" text-sm text-gray-500
    - MP User ID: "ID: {mp_user_id}" text-xs text-gray-400
    - Button: "Desconectar" outline, text-red-500 (optional — can skip for MVP)

  Handle URL params on mount:
    - Check searchParams for mp_connected=true → show success toast/alert
    - Check searchParams for mp_error → show error toast/alert
```

### 10. `apps/mobile/src/hooks/usePayment.ts`

**Purpose:** Mobile hook to create payment preference and handle checkout.

```typescript
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Linking } from 'react-native';

interface PaymentPreference {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export function usePayment() {
  // useMutation to create payment preference via API:
  //
  //   mutationFn: async (bookingId: string) => {
  //     // Get current session token
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (!session) throw new Error('Não autenticado');
  //
  //     const response = await fetch(
  //       `${process.env.EXPO_PUBLIC_API_URL}/api/payments/create-preference`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${session.access_token}`,
  //         },
  //         body: JSON.stringify({ bookingId }),
  //       }
  //     );
  //
  //     if (!response.ok) {
  //       const err = await response.json();
  //       throw new Error(err.error || 'Falha ao criar pagamento');
  //     }
  //
  //     return response.json() as Promise<PaymentPreference>;
  //   }
  //
  // openCheckout helper:
  //   async function openCheckout(preference: PaymentPreference) {
  //     // Use sandbox URL for dev, production URL for prod
  //     const url = __DEV__ ? preference.sandboxInitPoint : preference.initPoint;
  //     const canOpen = await Linking.canOpenURL(url);
  //     if (canOpen) {
  //       await Linking.openURL(url);
  //     } else {
  //       throw new Error('Não foi possível abrir o checkout');
  //     }
  //   }
  //
  // Return: { createPreference: mutateAsync, openCheckout, isCreating: isPending, error }
}
```

### 11. `apps/mobile/src/hooks/useBookingStatus.ts`

**Purpose:** Poll booking status after payment to detect confirmation.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useBookingStatus(bookingId: string | null, enabled: boolean = false) {
  // useQuery:
  //   queryKey: ['booking-status', bookingId]
  //   queryFn:
  //     const { data } = await supabase
  //       .from('bookings')
  //       .select('id, status, payment_status, payment_method, paid_at')
  //       .eq('id', bookingId)
  //       .single();
  //     return data;
  //
  //   enabled: !!bookingId && enabled
  //   refetchInterval: 3000 (poll every 3 seconds while waiting for payment)
  //   refetchIntervalInBackground: false
  //
  // Return: { booking, isLoading }
  //
  // The consumer should:
  //   - Start polling after opening checkout (enabled = true)
  //   - Stop polling when status !== 'pending_payment' (enabled = false)
  //   - Show success screen when status === 'confirmed'
  //   - Show failure screen when status === 'cancelled'
}
```

## Files to Modify

### 12. `apps/mobile/src/screens/booking/steps/ReviewStep.tsx`

**Changes:** Replace the temporary Alert with actual payment flow.

```typescript
// Replace handleConfirmBooking:

const { createPreference, openCheckout, isCreating } = usePayment();
const { createBooking } = useCreateBooking();
const [bookingId, setBookingId] = useState<string | null>(null);
const [waitingPayment, setWaitingPayment] = useState(false);

// Poll booking status while waiting
const { booking: bookingStatus } = useBookingStatus(bookingId, waitingPayment);

// Watch for payment confirmation
useEffect(() => {
  if (!bookingStatus) return;
  if (bookingStatus.status === 'confirmed') {
    setWaitingPayment(false);
    // Navigate to success screen or show confirmation
    Alert.alert('Pagamento Confirmado!', 'Seu agendamento foi confirmado.',
      [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
  } else if (bookingStatus.status === 'cancelled') {
    setWaitingPayment(false);
    Alert.alert('Pagamento Cancelado', 'O pagamento não foi aprovado. Tente novamente.');
  }
}, [bookingStatus?.status]);

async function handleConfirmBooking() {
  try {
    // 1. Create booking in DB
    const booking = await createBooking({
      petshopId: state.petshopId,
      bookingDate: state.selectedDate!,
      startTime: state.selectedSlot!.start,
      endTime: state.selectedSlot!.end,
      totalAmount: totalAmount,
      items: [
        ...state.selectedServices.map(s => ({
          petId: s.petId, serviceId: s.serviceId, price: s.price, durationMinutes: s.duration_minutes,
        })),
        ...state.selectedAddons.map(a => ({
          petId: a.petId, serviceId: a.serviceId, price: a.price, durationMinutes: a.duration_minutes,
        })),
      ],
    });

    setBookingId(booking.id);

    // 2. Create MP payment preference
    const preference = await createPreference(booking.id);

    // 3. Open MP checkout in browser
    await openCheckout(preference);

    // 4. Start polling for payment status
    setWaitingPayment(true);
  } catch (err: any) {
    Alert.alert('Erro', err.message || 'Não foi possível iniciar o pagamento.');
  }
}

// Update button text:
// If isCreating: "Criando pagamento..." (disabled, show spinner)
// If waitingPayment: "Aguardando pagamento..." (disabled, show spinner)
// Else: "Agendar e Pagar → R$ {totalAmount.toFixed(2)}"
```

### 13. `apps/web/src/app/(dashboard)/perfil/page.tsx`

**Changes:** Add the MercadoPagoConnect component to the profile page.

```
Import and render <MercadoPagoConnect /> as a new section on the profile page.
Place it below existing profile info sections.
```

## Environment Variables

Add to `apps/web/.env.local`:
```
# Mercado Pago Marketplace
MP_APP_ID=your_app_id
MP_CLIENT_SECRET=your_client_secret
MP_ACCESS_TOKEN=your_marketplace_access_token
MP_REDIRECT_URI=http://localhost:3000/api/mercadopago/oauth/callback
MP_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_MP_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Add to `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Implementation Order

1. **Migration:** `20260225_001_add_payment_columns.sql`
2. **MP lib (server):** `config.ts` → `oauth.ts` → `preferences.ts` → `webhooks.ts`
3. **API routes:** `oauth/callback/route.ts` → `create-preference/route.ts` → `webhooks/mercadopago/route.ts`
4. **Dashboard:** `MercadoPagoConnect.tsx` + update `perfil/page.tsx`
5. **Mobile hooks:** `usePayment.ts` → `useBookingStatus.ts`
6. **Wiring:** Update `ReviewStep.tsx` with real payment flow

## Validation Rules

| Field | Rule |
|-------|------|
| MP OAuth code | Required, single use, expires in 10min |
| access_token | Required for preference creation, expires ~6h |
| refresh_token | Required for token renewal, long-lived |
| bookingId | Required UUID, must be pending_payment |
| total_amount | > 0, in BRL |
| commission | Exactly 10% of total_amount |
| webhook signature | Must validate against MP_WEBHOOK_SECRET |
| payment_status | One of: pending, approved, rejected, refunded |

## Testing Checklist

After implementation, verify:
- [ ] Migration adds columns correctly (payment_method, paid_at, mp_*)
- [ ] OAuth URL redirects pet shop to Mercado Pago auth page
- [ ] OAuth callback exchanges code and stores tokens in petshops table
- [ ] MercadoPagoConnect shows "Conectado" after OAuth success
- [ ] Create preference API returns init_point URL
- [ ] Create preference includes correct 90/10 split (marketplace_fee)
- [ ] Auth validation rejects requests without valid JWT
- [ ] Token refresh works when access_token is expired
- [ ] Webhook receives payment.created event
- [ ] Webhook validates signature correctly
- [ ] Webhook rejects invalid signatures
- [ ] Booking status updates to 'confirmed' on payment approved
- [ ] Booking status updates to 'cancelled' on payment rejected
- [ ] payment_method and paid_at populated correctly
- [ ] commission_amount calculated as 10% of total
- [ ] Mobile opens MP checkout via Linking.openURL
- [ ] Mobile polls booking status and detects confirmation
- [ ] Mobile shows success alert when payment confirmed
- [ ] Pet shop without MP connected → error message on booking attempt
- [ ] TypeScript compiles: `cd apps/web && npx tsc --noEmit`

## Git Commit

After all files pass validation:
```bash
git add supabase/migrations/20260225_001_add_payment_columns.sql apps/web/src/lib/mercadopago/ apps/web/src/app/api/ apps/web/src/app/\(dashboard\)/perfil/components/MercadoPagoConnect.tsx apps/mobile/src/hooks/usePayment.ts apps/mobile/src/hooks/useBookingStatus.ts
git commit -m "feat: integrate Mercado Pago split payment IPET-011

- Mercado Pago Marketplace integration with 90/10 split
- OAuth flow for pet shop seller authorization
- Payment preference creation with Pix + credit card
- Webhook endpoint for payment notifications
- Booking status tracking (pending → confirmed/cancelled)
- Token refresh logic for expired access tokens
- Dashboard: MercadoPagoConnect component
- Mobile: usePayment + useBookingStatus hooks
- Migration: payment_method, paid_at, mp_* columns"
```

## Important Notes

- **Sandbox first:** Use MP sandbox credentials for dev/testing. Switch to production for deploy.
- **SUPABASE_SERVICE_ROLE_KEY** is used in API routes to bypass RLS — NEVER expose to client.
- MP access tokens expire (~6h). Always try-catch and refresh on 401.
- Webhook URL must be publicly accessible. Use ngrok for local dev: `ngrok http 3000`
- `external_reference` in preference = bookingId — this links MP payment back to our booking.
- DO NOT store MP tokens in client-side code. All MP operations happen server-side (API routes).
- The `auto_return: 'approved'` in preference redirects tutor back after approved payment.
- For Pix: payment is instant. For credit card: may take a few seconds.
- Installments (12x) are configured but the pet shop's MP account determines actual availability.
- Commission (10%) is deducted automatically by MP via `marketplace_fee` — IPET receives it in the marketplace account.
