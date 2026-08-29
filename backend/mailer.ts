import {
  sendEmailViaGmailApi,
  loadStoredTokens,
  getOAuthCredentials,
} from './gmailOAuth';

const DEFAULT_SENDER_EMAIL = 'waqassubhane99@gmail.com';
const SENDER_NAME = 'Waqas Subhane';

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  serviceConfigured?: boolean;
}

/**
 * Sends a real 6-digit OTP verification email via waqassubhane99@gmail.com using the official Gmail API (OAuth 2.0).
 */
export async function sendOTPEmail(
  recipientEmail: string,
  otp: string
): Promise<SendMailResult> {
  const storedTokens = loadStoredTokens();
  const senderEmail = storedTokens.userEmail || DEFAULT_SENDER_EMAIL;
  const subject = 'Your verification code';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292524;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf7f2; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #065f46; padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Verify your email
              </h1>
              <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 14px;">
                HabitGrid • Personal Growth & Productivity
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #44403c; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #44403c; line-height: 1.6;">
                Your verification code is:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f5f5f4; border: 1px solid #d6d3d1; border-radius: 12px; padding: 22px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #065f46; display: inline-block;">
                  ${otp}
                </span>
              </div>

              <!-- Security & Expiration Information -->
              <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #047857;">
                This code expires in 5 minutes.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #78716c; line-height: 1.6;">
                If you did not request this verification code, you can safely ignore this email. No changes will be made to your account.
              </p>

              <hr style="border: none; border-top: 1px solid #f0eeeb; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; color: #a8a29e; text-align: center; line-height: 1.5;">
                Sent securely by <strong>Waqas Subhane</strong> &lt;${senderEmail}&gt;<br />
                © ${new Date().getFullYear()} HabitGrid. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const plainTextContent = `Verify your email

Your verification code is:
${otp}

This code expires in 5 minutes.

If you did not request this verification code, you can safely ignore this email.

Sent by Waqas Subhane <${senderEmail}>
`.trim();

  // 1. Check if OAuth 2.0 is configured
  const { clientId, clientSecret } = getOAuthCredentials();
  const hasOAuthSetup = !!(clientId && clientSecret && (storedTokens.refreshToken || process.env.GMAIL_REFRESH_TOKEN));

  if (hasOAuthSetup) {
    const apiResult = await sendEmailViaGmailApi(recipientEmail, subject, htmlContent, plainTextContent);
    if (apiResult.success) {
      return {
        success: true,
        serviceConfigured: true,
        messageId: apiResult.messageId,
      };
    }
    // If OAuth failed with an error, return it
    return {
      success: false,
      serviceConfigured: true,
      error: apiResult.error || 'Failed to dispatch email via Gmail API.',
    };
  }

  // 2. If OAuth is not yet completed/configured
  return {
    success: false,
    serviceConfigured: false,
    error: 'Google OAuth 2.0 authorization is not yet connected. Please authorize the application at /auth/google/authorize.',
  };
}

