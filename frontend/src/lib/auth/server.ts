import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL || "https://placeholder.neonauth.us-east-1.aws.neon.build/neondb/auth";
const secret = process.env.NEON_AUTH_COOKIE_SECRET || "fallback-cookie-secret-must-be-at-least-32-characters-long";

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
});
