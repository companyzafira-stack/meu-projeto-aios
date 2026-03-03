import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens } from '@/lib/mercadopago/oauth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/perfil?mp_error=missing_params', request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const { error } = await supabaseAdmin
      .from('petshops')
      .update({
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token,
        mp_user_id: String(tokens.user_id),
        mp_connected_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (error) {
      throw error;
    }

    return NextResponse.redirect(
      new URL('/perfil?mp_connected=true', request.url)
    );
  } catch (error) {
    console.error('MP OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/perfil?mp_error=oauth_failed', request.url)
    );
  }
}
