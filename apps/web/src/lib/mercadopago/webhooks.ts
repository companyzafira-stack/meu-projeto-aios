import crypto from 'crypto';
import { MP_CONFIG } from './config';

export function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  if (!xSignature || !xRequestId || !MP_CONFIG.webhookSecret) {
    return false;
  }

  const parts = xSignature.split(',');
  const tsValue = parts.find((part) => part.startsWith('ts='))?.replace('ts=', '');
  const v1Value = parts.find((part) => part.startsWith('v1='))?.replace('v1=', '');

  if (!tsValue || !v1Value) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsValue};`;

  const hmac = crypto
    .createHmac('sha256', MP_CONFIG.webhookSecret)
    .update(manifest)
    .digest('hex');

  return hmac === v1Value;
}

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
    case 'refunded':
    case 'charged_back':
      return 'cancelled';
    default:
      return 'pending_payment';
  }
}

export function mapPaymentMethod(mpMethod: string): string {
  switch (mpMethod) {
    case 'credit_card':
      return 'credit_card';
    case 'debit_card':
      return 'debit_card';
    case 'bank_transfer':
      return 'pix';
    case 'ticket':
      return 'boleto';
    default:
      return mpMethod;
  }
}
