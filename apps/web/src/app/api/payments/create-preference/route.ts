import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createPaymentPreference,
  MercadoPagoApiError,
} from '@/lib/mercadopago/preferences';
import { refreshAccessToken } from '@/lib/mercadopago/oauth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function createSupabaseAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface CreatePreferenceRequestBody {
  bookingId?: string;
}

interface BookingRow {
  id: string;
  tutor_id: string;
  petshop_id: string;
  total_amount: number | string;
  status: string;
}

interface PetshopRow {
  id: string;
  name: string;
  mp_access_token: string | null;
  mp_refresh_token: string | null;
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUnauthorizedPreferenceError(error: unknown): boolean {
  return error instanceof MercadoPagoApiError && error.status === 401;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await createSupabaseAnonClient().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const requestBody = (await request.json()) as CreatePreferenceRequestBody;
    const bookingId = requestBody.bookingId;

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

    const bookingRow = booking as BookingRow;

    if (bookingRow.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Booking already paid or cancelled' },
        { status: 400 }
      );
    }

    const { data: petshop, error: petshopError } = await supabaseAdmin
      .from('petshops')
      .select('id, name, mp_access_token, mp_refresh_token')
      .eq('id', bookingRow.petshop_id)
      .single();

    if (petshopError || !petshop) {
      return NextResponse.json({ error: 'Pet shop not found' }, { status: 404 });
    }

    const petshopRow = petshop as PetshopRow;

    if (!petshopRow.mp_access_token) {
      return NextResponse.json(
        { error: 'Pet shop não conectou o Mercado Pago' },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Usuário sem e-mail' }, { status: 400 });
    }

    const payerEmail = user.email;

    const buildPreference = async (petshopAccessToken: string) => {
      return createPaymentPreference({
        bookingId: bookingRow.id,
        totalAmount: toNumber(bookingRow.total_amount),
        description: `Agendamento IPET #${bookingRow.id.substring(0, 8)}`,
        petshopAccessToken,
        payerEmail,
      });
    };

    try {
      const preference = await buildPreference(petshopRow.mp_access_token);

      return NextResponse.json({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      });
    } catch (error) {
      if (isUnauthorizedPreferenceError(error)) {
        if (!petshopRow.mp_refresh_token) {
          return NextResponse.json(
            { error: 'Credenciais Mercado Pago inválidas. Reconecte a conta.' },
            { status: 400 }
          );
        }

        const newTokens = await refreshAccessToken(petshopRow.mp_refresh_token);

        const { error: updateTokensError } = await supabaseAdmin
          .from('petshops')
          .update({
            mp_access_token: newTokens.access_token,
            mp_refresh_token: newTokens.refresh_token,
          })
          .eq('id', petshopRow.id);

        if (updateTokensError) {
          throw updateTokensError;
        }

        const preference = await buildPreference(newTokens.access_token);

        return NextResponse.json({
          preferenceId: preference.id,
          initPoint: preference.init_point,
          sandboxInitPoint: preference.sandbox_init_point,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Create preference error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
