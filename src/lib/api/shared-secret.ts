import { timingSafeEqual } from "@/lib/security/crypto";
export function verifySharedSecret(supplied: string | null, expected: string | undefined) { return !!supplied && !!expected && timingSafeEqual(supplied, expected); }
