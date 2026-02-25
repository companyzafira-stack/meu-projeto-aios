import { Linking } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface PaymentPreference {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

interface PaymentApiError {
  error?: string;
}

export function usePayment() {
  const mutation = useMutation<PaymentPreference, Error, string>({
    mutationFn: async (bookingId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('EXPO_PUBLIC_API_URL não configurado');
      }

      const response = await fetch(`${apiUrl}/api/payments/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      if (!response.ok) {
        try {
          const err = (await response.json()) as PaymentApiError;
          throw new Error(err.error || 'Falha ao criar pagamento');
        } catch (error) {
          if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
            throw error;
          }

          throw new Error('Falha ao criar pagamento');
        }
      }

      return (await response.json()) as PaymentPreference;
    },
  });

  const openCheckout = async (preference: PaymentPreference) => {
    const url = __DEV__ ? preference.sandboxInitPoint : preference.initPoint;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      throw new Error('Não foi possível abrir o checkout');
    }

    await Linking.openURL(url);
  };

  return {
    createPreference: mutation.mutateAsync,
    openCheckout,
    isCreating: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
  };
}
