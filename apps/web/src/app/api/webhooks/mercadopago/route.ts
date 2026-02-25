import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapPaymentMethod,
  mapPaymentToBookingStatus,
  validateWebhookSignature,
} from '@/lib/mercadopago/webhooks';
import { MP_CONFIG } from '@/lib/mercadopago/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  type?: string;
  data?: {
    id?: string | number;
  };
}

interface MercadoPagoPaymentResponse {
  external_reference?: string | null;
  status?: string;
  payment_type_id?: string;
  transaction_amount?: number;
}

interface BookingUpdateRow {
  payment_id: string;
  payment_status: string;
  payment_method: string;
  status: string;
  commission_amount: number;
  updated_at: string;
  paid_at?: string;
  cancelled_by?: 'system';
  cancelled_at?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseWebhookPayload(value: unknown): WebhookPayload {
  if (!isObject(value)) {
    return {};
  }

  const type = typeof value.type === 'string' ? value.type : undefined;
  const data = isObject(value.data)
    ? {
        id:
          typeof value.data.id === 'string' || typeof value.data.id === 'number'
            ? value.data.id
            : undefined,
      }
    : undefined;

  return { type, data };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as unknown;
    const body = parseWebhookPayload(rawBody);

    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id ? String(body.data.id) : '';

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    if (MP_CONFIG.webhookSecret) {
      const isValid = validateWebhookSignature(xSignature, xRequestId, paymentId);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const paymentResponse = await fetch(
      `${MP_CONFIG.apiBaseUrl}/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${MP_CONFIG.accessToken}` },
      }
    );

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from MP:', paymentResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch payment' },
        { status: 500 }
      );
    }

    const payment = (await paymentResponse.json()) as MercadoPagoPaymentResponse;
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.error('No external_reference in payment');
      return NextResponse.json({ received: true });
    }

    const mpStatus = payment.status ?? 'pending';
    const bookingStatus = mapPaymentToBookingStatus(mpStatus);
    const paymentMethod = mapPaymentMethod(payment.payment_type_id ?? '');
    const transactionAmount = Number(payment.transaction_amount ?? 0);
    const commissionAmount = Number(
      ((transactionAmount * MP_CONFIG.commissionPercent) / 100).toFixed(2)
    );

    const updateData: BookingUpdateRow = {
      payment_id: paymentId,
      payment_status: mpStatus,
      payment_method: paymentMethod,
      status: bookingStatus,
      commission_amount: commissionAmount,
      updated_at: new Date().toISOString(),
    };

    if (mpStatus === 'approved') {
      updateData.paid_at = new Date().toISOString();
    }

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
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
