export const MP_CONFIG = {
  appId: process.env.MP_APP_ID!,
  clientSecret: process.env.MP_CLIENT_SECRET!,
  accessToken: process.env.MP_ACCESS_TOKEN!,
  redirectUri: process.env.MP_REDIRECT_URI!,
  webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
  commissionPercent: 10,
  apiBaseUrl: 'https://api.mercadopago.com',
  authBaseUrl: 'https://auth.mercadopago.com.br',
};

export function getOAuthUrl(petshopId: string): string {
  const state = petshopId;
  return `${MP_CONFIG.authBaseUrl}/authorization?client_id=${MP_CONFIG.appId}&response_type=code&redirect_uri=${encodeURIComponent(MP_CONFIG.redirectUri)}&state=${state}&platform_id=mp`;
}
