import { MP_CONFIG } from './config';

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface MpErrorResponse {
  message?: string;
  error?: string;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as MpErrorResponse;
    return errorBody.message || errorBody.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

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
    const message = await parseErrorMessage(response);
    throw new Error(`MP OAuth error: ${message}`);
  }

  return (await response.json()) as OAuthTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthTokenResponse> {
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
    const message = await parseErrorMessage(response);
    throw new Error(`Failed to refresh MP token: ${message}`);
  }

  return (await response.json()) as OAuthTokenResponse;
}
