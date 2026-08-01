import bcrypt from "bcrypt";
import { z } from "zod";

const DUMMY_PASSWORD_HASH =
  "$2b$12$.IPLl2uA3J.vGLVqi/esnuFwgod10Jzj85JQdL993Plat52x6X5aC";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

export function parseLoginCredentials(input: unknown) {
  const result = loginSchema.safeParse(input);
  return result.success ? result.data : null;
}

export async function verifyPasswordHash(
  password: string,
  passwordHash: string | null | undefined,
) {
  if (!password || password.length > 256) return false;
  try {
    const matches = await bcrypt.compare(
      password,
      passwordHash || DUMMY_PASSWORD_HASH,
    );
    return Boolean(passwordHash) && matches;
  } catch {
    return false;
  }
}
