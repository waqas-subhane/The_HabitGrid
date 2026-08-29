import fs from 'fs';
import path from 'path';

export interface GmailTokenStore {
  userEmail: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  updatedAt: string;
}

const TOKENS_FILE_PATH = path.join(process.cwd(), 'data', 'gmail_tokens.json');
const SENDER_EMAIL = 'waqassubhane99@gmail.com';
const SENDER_NAME = 'Waqas Subhane';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Ensure data folder exists
function ensureTokensFile() {
  const dir = path.dirname(TOKENS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Clean and sanitize env strings (stripping any accidental angle brackets <>, quotes, or whitespace)
function sanitizeEnv(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^<|>$/g, '').replace(/^"|"$/g, '').trim();
}

// Load token store from file or environment
export function loadStoredTokens(): GmailTokenStore {
  ensureTokensFile();
  try {
    if (fs.existsSync(TOKENS_FILE_PATH)) {
      const data = fs.readFileSync(TOKENS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading stored Gmail OAuth tokens:', err);
  }

  // Fallback to environment variable if preset
  return {
    userEmail: sanitizeEnv(process.env.GMAIL_USER) || SENDER_EMAIL,
    refreshToken: sanitizeEnv(process.env.GMAIL_REFRESH_TOKEN) || undefined,
    updatedAt: new Date().toISOString(),
  };
}

// Save tokens securely to server-side JSON store
export function saveStoredTokens(tokens: Partial<GmailTokenStore>) {
  ensureTokensFile();
  const current = loadStoredTokens();
  const updated: GmailTokenStore = {
    ...current,
    ...tokens,
    userEmail: SENDER_EMAIL,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// Get Google OAuth credentials from env
export function getOAuthCredentials() {
  const clientId = sanitizeEnv(process.env.GMAIL_CLIENT_ID);
  const clientSecret = sanitizeEnv(process.env.GMAIL_CLIENT_SECRET);
  return { clientId, clientSecret };
}

// Generate the Google OAuth 2.0 Authorization URL
export function generateGoogleAuthUrl(redirectUri: string): string {
  const { clientId } = getOAuthCredentials();
  if (!clientId) {
    throw new Error('GMAIL_CLIENT_ID environment variable is missing.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SEND_SCOPE,
    access_type: 'offline',
    prompt: 'consent', // Forces Google to issue a refresh_token every time
    login_hint: SENDER_EMAIL,
    include_granted_scopes: 'true',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; error?: string; tokens?: GmailTokenStore }> {
  const { clientId, clientSecret } = getOAuthCredentials();
  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'Google OAuth Client ID or Client Secret is missing from server environment.',
    };
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Google OAuth Token Exchange Error:', data);
      return {
        success: false,
        error: data.error_description || data.error || 'Failed to exchange authorization code.',
      };
    }

    const expiresInMs = (data.expires_in || 3600) * 1000;
    const expiresAt = Date.now() + expiresInMs;

    const storedTokens = saveStoredTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || loadStoredTokens().refreshToken, // preserve existing if not returned
      expiresAt,
      scope: data.scope,
      tokenType: data.token_type,
    });

    return {
      success: true,
      tokens: storedTokens,
    };
  } catch (err: any) {
    console.error('Exception in exchangeCodeForTokens:', err);
    return {
      success: false,
      error: err.message || 'Network exception during token exchange.',
    };
  }
}

// Ensure a valid access token (refreshes automatically if expired)
export async function getValidAccessToken(): Promise<{
  accessToken: string | null;
  error?: string;
}> {
  const { clientId, clientSecret } = getOAuthCredentials();
  const stored = loadStoredTokens();

  const refreshToken = stored.refreshToken || process.env.GMAIL_REFRESH_TOKEN?.trim();

  if (!refreshToken) {
    return {
      accessToken: null,
      error: 'No Gmail OAuth refresh token found. Please complete authorization first.',
    };
  }

  // If active access token has at least 60 seconds left before expiration, use it
  if (stored.accessToken && stored.expiresAt && stored.expiresAt > Date.now() + 60000) {
    return { accessToken: stored.accessToken };
  }

  if (!clientId || !clientSecret) {
    return {
      accessToken: null,
      error: 'GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET environment variable is missing.',
    };
  }

  // Refresh the access token using the refresh token
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Failed to refresh Gmail access token:', data);
      return {
        accessToken: null,
        error: data.error_description || data.error || 'Failed to refresh Gmail access token.',
      };
    }

    const expiresInMs = (data.expires_in || 3600) * 1000;
    const expiresAt = Date.now() + expiresInMs;

    saveStoredTokens({
      accessToken: data.access_token,
      expiresAt,
      scope: data.scope,
      tokenType: data.token_type,
    });

    return { accessToken: data.access_token };
  } catch (err: any) {
    console.error('Exception refreshing Gmail access token:', err);
    return {
      accessToken: null,
      error: err.message || 'Exception occurred while refreshing token.',
    };
  }
}

// Build RFC 2822 standard email message encoded in base64url format for Gmail REST API
export function createRawGmailMessage(
  recipientEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string
): string {
  const boundary = `====_HabitGrid_${Date.now()}_====`;

  const emailLines = [
    `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
    `To: <${recipientEmail}>`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ];

  const rawMime = emailLines.join('\r\n');
  return Buffer.from(rawMime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send email directly using the official Gmail REST API
export async function sendEmailViaGmailApi(
  recipientEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { accessToken, error } = await getValidAccessToken();

  if (!accessToken) {
    return {
      success: false,
      error: error || 'Gmail OAuth 2.0 access token could not be obtained.',
    };
  }

  const raw = createRawGmailMessage(recipientEmail, subject, htmlBody, textBody);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Gmail REST API Send Error:', data);
      return {
        success: false,
        error: data.error?.message || data.error_description || 'Failed to send message via Gmail API.',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    console.error('Exception calling Gmail REST API:', err);
    return {
      success: false,
      error: err.message || 'Network exception while sending email via Gmail API.',
    };
  }
}
