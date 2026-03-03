'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface MercadoPagoStatus {
  id: string;
  mp_user_id: string | null;
  mp_connected_at: string | null;
}

function formatDateTimeBr(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function MercadoPagoConnect() {
  const searchParams = useSearchParams();
  const [petshopId, setPetshopId] = useState('');
  const [status, setStatus] = useState<MercadoPagoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const handledSearchAlertRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      setLoading(true);
      setError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data, error: fetchError } = await supabase
        .from('petshops')
        .select('id, mp_user_id, mp_connected_at')
        .eq('owner_id', userId)
        .single();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError('Erro ao carregar status do Mercado Pago');
        setLoading(false);
        return;
      }

      setPetshopId(data.id);
      setStatus(data as MercadoPagoStatus);
      setLoading(false);
    };

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (handledSearchAlertRef.current) {
      return;
    }

    const mpConnected = searchParams.get('mp_connected');
    const mpError = searchParams.get('mp_error');

    if (mpConnected === 'true') {
      window.alert('Mercado Pago conectado com sucesso!');
      handledSearchAlertRef.current = true;
      return;
    }

    if (mpError) {
      window.alert('Erro ao conectar Mercado Pago. Tente novamente.');
      handledSearchAlertRef.current = true;
    }
  }, [searchParams]);

  const publicAppId = process.env.NEXT_PUBLIC_MP_APP_ID || '';
  const redirectUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/mercadopago/oauth/callback`
      : '';

  const oauthUrl =
    publicAppId && petshopId && redirectUri
      ? `https://auth.mercadopago.com.br/authorization?client_id=${publicAppId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${petshopId}&platform_id=mp`
      : '';

  const isConnected = Boolean(status?.mp_user_id);

  const handleConnect = () => {
    if (!oauthUrl) {
      setError('Configuração do Mercado Pago incompleta.');
      return;
    }

    setConnecting(true);
    window.location.href = oauthUrl;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Mercado Pago</h2>

      {loading ? (
        <p className="text-gray-600">Carregando status da integração...</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : !isConnected ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-500 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-gray-900">
                Conecte sua conta do Mercado Pago para receber pagamentos
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Seus pagamentos serão depositados diretamente na sua conta MP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || !publicAppId}
            className="bg-[#009EE3] hover:bg-[#0087c4] text-white font-semibold rounded-lg px-6 py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {connecting ? 'Redirecionando...' : 'Conectar Mercado Pago'}
          </button>

          {!publicAppId && (
            <p className="text-xs text-red-600">
              Defina `NEXT_PUBLIC_MP_APP_ID` no ambiente para habilitar a conexão.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-600">Mercado Pago conectado</p>
              {status?.mp_connected_at ? (
                <p className="text-sm text-gray-500 mt-1">
                  Conectado em {formatDateTimeBr(status.mp_connected_at)}
                </p>
              ) : null}
              {status?.mp_user_id ? (
                <p className="text-xs text-gray-400 mt-1">ID: {status.mp_user_id}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
