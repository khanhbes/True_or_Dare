import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { CloudflareEnv } from './types';

const normalizeTeamDomain = (value: string): string =>
  value.replace(/^https?:\/\//, '').replace(/\/$/, '');

export const authenticateAdmin = async (
  request: Request,
  env: CloudflareEnv,
): Promise<string | null> => {
  if (env.ENVIRONMENT === 'development' && env.DEV_ADMIN_EMAIL) {
    const localEmail = request.headers.get('x-dev-admin-email');
    if (!localEmail || localEmail.toLowerCase() === env.DEV_ADMIN_EMAIL.toLowerCase()) {
      return env.DEV_ADMIN_EMAIL.toLowerCase();
    }
  }

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  try {
    const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
    const issuer = `https://${teamDomain}`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: env.ACCESS_AUD,
    });
    return typeof payload.email === 'string' && payload.email.includes('@')
      ? payload.email.toLowerCase()
      : null;
  } catch {
    return null;
  }
};
