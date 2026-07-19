import crypto from "crypto";

export function timingSafeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function requestFingerprint(headers: Headers) {
  return sha256([
    headers.get("user-agent") || "",
    headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || "",
  ].join("|"));
}
