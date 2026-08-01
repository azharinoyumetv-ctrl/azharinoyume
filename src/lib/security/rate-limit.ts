import crypto from "node:crypto";
import Redis from "ioredis";

let redis: Redis | undefined;
const localFallback = new Map<string, { count: number; expiresAt: number }>();

function client() {
  redis ??= new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379/1", {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  return redis;
}

function storageKey(scope: string, identifier: string) {
  const digest = crypto.createHash("sha256").update(identifier).digest("hex");
  return `azyume:rate-limit:${scope}:${digest}`;
}

function pruneLocal(now: number) {
  if (localFallback.size < 1_000) return;
  for (const [key, entry] of localFallback) {
    if (entry.expiresAt <= now) localFallback.delete(key);
  }
}

function consumeLocal(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  pruneLocal(now);
  const current = localFallback.get(key);
  const next = !current || current.expiresAt <= now
    ? { count: 1, expiresAt: now + windowSeconds * 1_000 }
    : { ...current, count: current.count + 1 };
  localFallback.set(key, next);
  return next.count > limit;
}

export async function consumeRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const key = storageKey(input.scope, input.identifier);
  try {
    const connection = client();
    if (connection.status === "wait") await connection.connect();
    const count = Number(await connection.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
      1,
      key,
      input.windowSeconds,
    ));
    return count > input.limit;
  } catch (error) {
    console.error("[rate-limit] Redis unavailable; using bounded process-local protection", error);
    return consumeLocal(key, input.limit, input.windowSeconds);
  }
}

export async function clearRateLimit(scope: string, identifier: string) {
  const key = storageKey(scope, identifier);
  localFallback.delete(key);
  try {
    const connection = client();
    if (connection.status === "wait") await connection.connect();
    await connection.del(key);
  } catch (error) {
    console.error("[rate-limit] Could not clear Redis rate limit", error);
  }
}
