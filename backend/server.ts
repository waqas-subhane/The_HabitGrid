import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  isValidEmailFormat,
  normalizeEmail,
  checkRateLimit,
  recordRateLimitHit,
  createOTP,
  verifyOTP,
  createUser,
  findUserByEmail,
  createSession,
  validateSession,
  deleteSession,
} from './auth';
import { sendOTPEmail } from './mailer';
import {
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  loadStoredTokens,
  getOAuthCredentials,
} from './gmailOAuth';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const PORT = 3000;

// Helper to determine accurate public origin / redirect URI
function getRedirectUri(req: express.Request): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
  const host = forwardedHost || req.get('host') || 'ais-dev-icf77dqkz2cjibrfobcljx-727899377493.asia-east1.run.app';
  const protocol = forwardedProto || (req.secure ? 'https' : 'https');
  return `${protocol}://${host}/auth/google/callback`;
}

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
}

// ==========================================
// SECURE AUTHENTICATION ENDPOINTS (OTP FLOW)
// ==========================================

// 1. Request OTP Endpoint
app.post('/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';

    const check = await isValidEmailFormat(email);
    if (!check.valid) {
      res.status(400).json({
        success: false,
        message: check.reason || 'Invalid email address format. Please use a recognized email provider.',
      });
      return;
    }

    const normEmail = normalizeEmail(email);

    // Rate Limiting Checks
    // Limit per IP: max 5 requests per 10 mins
    const ipCheck = checkRateLimit(`ip_req:${clientIp}`, 5, 10 * 60 * 1000, 30 * 1000);
    if (!ipCheck.allowed) {
      res.status(429).json({
        success: false,
        message: ipCheck.message || 'Too many OTP requests from this IP address.',
        retryAfterSeconds: ipCheck.retryAfterSeconds,
      });
      return;
    }

    // Limit per email: max 3 requests per 15 mins with 60s cooldown
    const emailCheck = checkRateLimit(`email_req:${normEmail}`, 3, 15 * 60 * 1000, 60 * 1000);
    if (!emailCheck.allowed) {
      res.status(429).json({
        success: false,
        message: emailCheck.message || 'Please wait 60 seconds before requesting another code.',
        retryAfterSeconds: emailCheck.retryAfterSeconds,
      });
      return;
    }

    // Record hits
    recordRateLimitHit(`ip_req:${clientIp}`, 10 * 60 * 1000);
    recordRateLimitHit(`email_req:${normEmail}`, 15 * 60 * 1000);

    // Generate cryptographic OTP & store hashed representation (never plaintext in DB)
    const otpData = createOTP(normEmail, clientIp);

    // Dispatch live email using user's Gmail account (waqassubhane99@gmail.com)
    const mailResult = await sendOTPEmail(normEmail, otpData.otp);

    if (!mailResult.success) {
      if (!mailResult.serviceConfigured) {
        res.status(500).json({
          success: false,
          message:
            'Gmail OAuth 2.0 authorization is required. Please authorize the sender account at /auth/google/authorize after configuring GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: mailResult.error || 'Failed to send verification email via Gmail API. Please try again.',
      });
      return;
    }

    // Generic security response - never expose plaintext OTP or tokens
    res.json({
      success: true,
      message: 'A 6-digit verification code has been sent from waqassubhane99@gmail.com to your email.',
      expiresSeconds: otpData.expiresSeconds,
      resendCooldownSeconds: otpData.resendCooldownSeconds,
    });
  } catch (error: any) {
    console.error('Request OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service temporarily unavailable.',
    });
  }
});

// 2. Verify OTP Endpoint
app.post('/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';

    const check = await isValidEmailFormat(email);
    if (!check.valid) {
      res.status(400).json({
        success: false,
        message: check.reason || 'Invalid email address format.',
      });
      return;
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit numerical verification code.',
      });
      return;
    }

    const normEmail = normalizeEmail(email);

    // Rate limit verification attempts per IP (max 10 attempts per 10 mins)
    const ipVerifyCheck = checkRateLimit(`ip_verify:${clientIp}`, 10, 10 * 60 * 1000);
    if (!ipVerifyCheck.allowed) {
      res.status(429).json({
        success: false,
        message: 'Too many verification attempts from this IP address. Please wait a few minutes.',
        retryAfterSeconds: ipVerifyCheck.retryAfterSeconds,
      });
      return;
    }
    recordRateLimitHit(`ip_verify:${clientIp}`, 10 * 60 * 1000);

    // Verify OTP against hashed record
    const result = verifyOTP(normEmail, otp.trim());

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
        remainingAttempts: result.remainingAttempts,
      });
      return;
    }

    // OTP Verified! Get or Create User Server-Side
    const user = createUser(normEmail, name);

    // Create session token
    const { sessionToken } = createSession(user.id);

    // Set HTTP-Only Cookie
    res.cookie('auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
      path: '/',
    });

    res.json({
      success: true,
      message: 'Account verified and authenticated successfully.',
      user,
      sessionToken, // Also send token for client state if needed
    });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error during verification.',
    });
  }
});

// 3. Get Session Endpoint
app.get('/auth/session', (req, res) => {
  try {
    const sessionToken = req.cookies.auth_session || 
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!sessionToken) {
      res.json({ authenticated: false });
      return;
    }

    const user = validateSession(sessionToken);
    if (!user) {
      res.json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    console.error('Session Endpoint Error:', error);
    res.json({ authenticated: false });
  }
});

// 4. Logout Endpoint
app.post('/auth/logout', (req, res) => {
  try {
    const sessionToken = req.cookies.auth_session || 
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (sessionToken) {
      deleteSession(sessionToken);
    }

    res.clearCookie('auth_session', { path: '/' });
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error: any) {
    res.json({ success: true, message: 'Logged out.' });
  }
});

// ==========================================
// GOOGLE OAUTH 2.0 (GMAIL API) ENDPOINTS
// ==========================================

// 5. Initiate Google OAuth 2.0 Authorization Flow
// Provides both direct redirect and an interactive landing page to prevent iframe/proxy interception
app.get('/auth/google/authorize', (req, res) => {
  try {
    const { clientId } = getOAuthCredentials();
    if (!clientId) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Gmail OAuth Configuration Required</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">GMAIL_CLIENT_ID Not Configured</h2>
          <p>Please provide <strong>GMAIL_CLIENT_ID</strong> and <strong>GMAIL_CLIENT_SECRET</strong> in your application environment variables.</p>
          <p>Sender Account: <strong>waqassubhane99@gmail.com</strong></p>
        </body>
        </html>
      `);
      return;
    }

    const redirectUri = getRedirectUri(req);
    const authUrl = generateGoogleAuthUrl(redirectUri);

    // If 'direct=true' or standard redirect requested
    if (req.query.direct === 'true') {
      res.redirect(authUrl);
      return;
    }

    // Render a clean direct-dispatch page so the browser immediately launches Google OAuth top-level without proxy interception
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Connect Gmail API - HabitGrid</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fbf9f6; color: #292524; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; margin: 0; }
          .card { max-width: 540px; width: 100%; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; padding: 36px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); text-align: center; }
          .logo { font-size: 40px; margin-bottom: 12px; }
          h1 { font-size: 22px; margin: 0 0 10px 0; color: #1c1917; font-weight: 700; }
          p { font-size: 14px; color: #57534e; margin: 0 0 24px 0; line-height: 1.5; }
          .info-box { background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px; color: #44403c; }
          .info-row { margin-bottom: 8px; }
          .info-row:last-child { margin-bottom: 0; }
          .btn-google { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: #065f46; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; box-sizing: border-box; transition: background 0.15s; }
          .btn-google:hover { background: #047857; }
          .auto-text { font-size: 12px; color: #a8a29e; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">✉️</div>
          <h1>Authorize Gmail OTP Dispatcher</h1>
          <p>You are about to authorize <strong>waqassubhane99@gmail.com</strong> via Google's official OAuth 2.0 consent screen.</p>
          
          <div class="info-box">
            <div class="info-row"><strong>Sender Account:</strong> waqassubhane99@gmail.com</div>
            <div class="info-row"><strong>Requested Scope:</strong> https://www.googleapis.com/auth/gmail.send</div>
            <div class="info-row"><strong>Redirect URI:</strong> <code style="word-break: break-all; color: #065f46;">${redirectUri}</code></div>
          </div>

          <a href="${authUrl}" class="btn-google" id="authBtn">
            <span>Continue directly to Google OAuth</span> →
          </a>
          <div class="auto-text">Redirecting directly to Google...</div>
        </div>
        <script>
          // Automatically redirect top-level to Google OAuth if not clicked within 1.5s
          setTimeout(() => {
            window.location.href = ${JSON.stringify(authUrl)};
          }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Google Auth Init Error:', error);
    res.status(500).send(`Failed to initiate Google OAuth: ${error.message}`);
  }
});

// 6. Google OAuth 2.0 Callback Endpoint
app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Google Authorization Cancelled</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6;">
        <h2 style="color: #dc2626;">Authorization Error</h2>
        <p>Google OAuth returned an error: <strong>${error}</strong></p>
        <p><a href="/auth/google/authorize">Click here to retry authorization</a></p>
      </body>
      </html>
    `);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).send('Authorization code missing from Google response.');
    return;
  }

  const redirectUri = getRedirectUri(req);
  const result = await exchangeCodeForTokens(code, redirectUri);

  if (!result.success) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Token Exchange Failed</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6;">
        <h2 style="color: #dc2626;">Token Exchange Failed</h2>
        <p>${result.error}</p>
        <p><a href="/auth/google/authorize">Click here to retry</a></p>
      </body>
      </html>
    `);
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Gmail OAuth 2.0 Connected - HabitGrid</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fbf9f6; color: #292524; padding: 40px 20px; display: flex; justify-content: center; }
        .card { max-width: 520px; width: 100%; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); text-align: center; }
        .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 28px; background: #dcfce7; color: #16a34a; font-size: 28px; margin-bottom: 20px; }
        h1 { font-size: 22px; margin: 0 0 10px 0; color: #1c1917; font-weight: 700; }
        p { font-size: 14px; color: #57534e; margin: 0 0 20px 0; line-height: 1.5; }
        .info-box { background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px; margin-bottom: 24px; text-align: left; font-size: 13px; font-family: monospace; color: #44403c; }
        .btn { display: inline-block; background: #065f46; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; transition: background 0.15s; }
        .btn:hover { background: #047857; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">✓</div>
        <h1>Gmail OAuth 2.0 Connected!</h1>
        <p>Your Google Cloud OAuth 2.0 authorization was completed successfully.</p>
        <div class="info-box">
          <div><strong>Sender Account:</strong> waqassubhane99@gmail.com</div>
          <div><strong>Granted Scope:</strong> https://www.googleapis.com/auth/gmail.send</div>
          <div><strong>Status:</strong> Active & Ready for OTP Emails</div>
        </div>
        <p>All OTP verification emails will now be delivered via the official Gmail API.</p>
        <a href="/" class="btn">Return to HabitGrid</a>
      </div>
    </body>
    </html>
  `);
});

// 7. Check Gmail OAuth Status Endpoint
app.get('/api/auth/google/status', (req, res) => {
  const { clientId, clientSecret } = getOAuthCredentials();
  const tokens = loadStoredTokens();
  const hasRefreshToken = !!(tokens.refreshToken || process.env.GMAIL_REFRESH_TOKEN);
  const isConfigured = !!(clientId && clientSecret);
  const isAuthorized = isConfigured && hasRefreshToken;

  res.json({
    senderEmail: 'waqassubhane99@gmail.com',
    isConfigured,
    isAuthorized,
    redirectUri: getRedirectUri(req),
    authorizeUrl: '/auth/google/authorize',
  });
});

// Gemini Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, userContext } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    let ai;
    try {
      ai = getAi();
    } catch (err: any) {
      res.status(500).json({ 
        error: 'GEMINI_API_KEY_MISSING',
        message: 'Gemini API Key is missing. Please set GEMINI_API_KEY in server environment settings.' 
      });
      return;
    }

    const systemInstruction = `You are a helpful, intelligent, and friendly AI assistant embedded inside HabitGrid Pro (a daily goals and habit tracking application).
You can answer ANY general questions asked by the user (topics like general knowledge, science, mathematics, technology, philosophy, writing, coding, creative ideas, etc.), as well as provide tailored productivity coaching, routine suggestions, and habit advice.

If the user asks about their goals or habits, you can reference the provided app context:
${userContext ? JSON.stringify(userContext, null, 2) : 'No user context supplied.'}

Always format responses using clean Markdown with bold headers or bullet points where appropriate for easy reading. Keep answers direct, accurate, and engaging.`;

    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'model' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content || msg.text || '' }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ text: response.text || 'No response generated.' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'GEMINI_ERROR',
      message: error.message || 'An error occurred while communicating with Gemini.' 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
