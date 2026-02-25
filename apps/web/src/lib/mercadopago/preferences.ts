import { MP_CONFIG } from './config';

interface BookingPaymentData {
  bookingId: string;
  totalAmount: number;
  description: string;
  petshopAccessToken: string;
  payerEmail: string;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

interface MpPreferenceErrorResponse {
  message?: string;
  error?: string;
}

export class MercadoPagoApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MercadoPagoApiError';
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as MpPreferenceErrorResponse;
    return errorBody.message || errorBody.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function createPaymentPreference(
  data: BookingPaymentData
): Promise<PreferenceResponse> {
  const commissionAmount = Number(
    ((data.totalAmount * MP_CONFIG.commissionPercent) / 100).toFixed(2)
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

  const preference = {
    items: [
      {
        title: data.description,
        quantity: 1,
        unit_price: data.totalAmount,
        currency_id: 'BRL',
      },
    ],
    marketplace_fee: commissionAmount,
    payer: {
      email: data.payerEmail,
    },
    back_urls: {
      success: `${appUrl}/booking/${data.bookingId}/success`,
      failure: `${appUrl}/booking/${data.bookingId}/failure`,
      pending: `${appUrl}/booking/${data.bookingId}/pending`,
    },
    auto_return: 'approved',
    notification_url: `${apiUrl}/api/webhooks/mercadopago`,
    external_reference: data.bookingId,
    payment_methods: {
      excluded_payment_types: [],
      installments: 12,
    },
    statement_descriptor: 'IPET',
  };

  const response = await fetch(`${MP_CONFIG.apiBaseUrl}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.petshopAccessToken}`,
    },
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new MercadoPagoApiError(
      `MP Preference error: ${message}`,
      response.status
    );
  }

  return (await response.json()) as PreferenceResponse;
}
