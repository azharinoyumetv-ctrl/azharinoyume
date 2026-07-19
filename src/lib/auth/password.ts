import bcrypt from "bcrypt";
import { z } from "zod";

const DUMMY_PASSWORD_HASH = "$2b$12$.IPLl2uA3J.vGLVqi/esnuFwgod10Jzj85JQdL993Plat52x6X5aC";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 8;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

type LoginAttempt = { failures: number; windowStartedAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

export function parseLoginCredentials(input: unknown) {
  const result = loginSchema.safeParse(input);
  return result.success ? result.data : null;
}

export async function verifyPasswordHash(password: string, passwordHash: string | null | undefined) {
  if (!password || password.length > 256) return false;
  try {
    const matches = await bcrypt.compare(password, passwordHash || DUMMY_PASSWORD_HASH);
    return Boolean(passwordHash) && matches;
  } catch {
    return false;
  }
}

function pruneExpiredAttempts(now: number) {
  if (loginAttempts.size < 500) return;
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(key);
  }
}

export function isPasswordLoginRateLimited(key: string, now = Date.now()) {
  pruneExpiredAttempts(now);
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.failures >= MAX_LOGIN_FAILURES;
}

export function recordPasswordLoginFailure(key: string, now = Date.now()) {
  const attempt = loginAttempts.get(key);
  if (!attempt || now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, windowStartedAt: now });
    return;
  }
  attempt.failures += 1;
}

export function clearPasswordLoginFailures(key: string) {
  loginAttempts.delete(key);
}
