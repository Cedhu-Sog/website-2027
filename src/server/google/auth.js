import { getVercelOidcToken, verifyVercelOidcToken } from '@vercel/oidc';
import { IdentityPoolClient } from 'google-auth-library';
import { GOOGLE_IDENTITY, GoogleConnectionError, googleIdentityConfig, requireGoogleProduction } from './config.js';

export const GOOGLE_READ_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
]);

/** Create inside an authorized function invocation. No ADC, key files or global
 * token cache. The SDK keeps temporary Google credentials in this client only.
 * Dependencies are injectable for offline tests; HTTP requests never set them.
 */
export function createGoogleClient({ env = process.env, now = Date.now, signal,
  getToken = getVercelOidcToken, verifyToken = verifyVercelOidcToken } = {}) {
  const config = googleIdentityConfig(env);
  const projectId = requireGoogleProduction(env);
  return new IdentityPoolClient({
    type: 'external_account',
    project_id: config.projectId,
    audience: config.audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccount}:generateAccessToken`,
    service_account_impersonation: { token_lifetime_seconds: 600 },
    scopes: [...GOOGLE_READ_SCOPES],
    transporterOptions: { timeout: 4000, retry: false, signal },
    subject_token_supplier: {
      async getSubjectToken() {
        // This runs in the request context, never at module import/build time.
        requireGoogleProduction(env);
        let token;
        try { token = await getToken(); }
        catch { throw new GoogleConnectionError('oidc_unavailable'); }
        try {
          const { payload } = await verifyToken(token, {
            issuer: GOOGLE_IDENTITY.issuer,
            audience: GOOGLE_IDENTITY.audience,
            subject: GOOGLE_IDENTITY.subject,
            environment: 'production',
            projectId,
            algorithms: ['RS256'],
            requiredClaims: ['exp', 'iat', 'iss', 'aud', 'sub', 'environment', 'project_id'],
            maxTokenAge: '1h',
            currentDate: new Date(now()),
          });
          if (payload.aud !== GOOGLE_IDENTITY.audience) throw new GoogleConnectionError('oidc_audience_invalid');
          if (payload.sub !== GOOGLE_IDENTITY.subject) throw new GoogleConnectionError('oidc_subject_invalid');
          if (payload.environment !== 'production' || payload.iss !== GOOGLE_IDENTITY.issuer ||
              payload.project_id !== projectId) throw new GoogleConnectionError('oidc_invalid');
        } catch (error) {
          if (error instanceof GoogleConnectionError) throw error;
          // JOSE identifies the failed claim. Never expose its message/payload.
          if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && error.claim === 'aud') throw new GoogleConnectionError('oidc_audience_invalid');
          if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && error.claim === 'sub') throw new GoogleConnectionError('oidc_subject_invalid');
          throw new GoogleConnectionError('oidc_invalid');
        }
        return token;
      },
    },
  });
}

export async function authenticateGoogle(client) {
  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new GoogleConnectionError('google_empty_token');
  } catch (error) {
    if (error instanceof GoogleConnectionError) throw error;
    // Only inspect the destination to distinguish STS from IAM; never retain or
    // serialize a GaxiosError (its config contains credentials).
    const destination = String(error?.config?.url || error?.response?.config?.url || '');
    if (destination.startsWith('https://sts.googleapis.com/')) throw new GoogleConnectionError('federation_exchange_failed');
    if (destination.startsWith('https://iamcredentials.googleapis.com/')) throw new GoogleConnectionError('impersonation_failed');
    throw new GoogleConnectionError('google_authentication_failed');
  }
}
