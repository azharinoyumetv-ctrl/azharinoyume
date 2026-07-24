# Cloudflare Worker migration

## Runtime split

- Cloudflare Workers: Next.js pages, authentication, payment webhooks, order APIs,
  signed R2 upload URLs, and PostgreSQL access through Hyperdrive.
- VPS `azyume-worker`: BullMQ/Redis consumer, scheduled maintenance, ffprobe media
  validation, and Puppeteer invoice rendering.
- VPS `azyume-render-service`: Remotion/FFmpeg rendering.

The public Worker never receives Redis credentials and does not execute native
processes. It calls the origin bridge with `ORIGIN_SERVICE_SECRET`.

## Cloudflare resources

1. Create a Workers VPC service over the existing `cloudflared` tunnel for
   `localhost:5432`, then create a Hyperdrive configuration backed by that VPC
   service. This keeps PostgreSQL private; do not open port 5432 to the Internet.
2. Add the resulting binding to `wrangler.jsonc` as `HYPERDRIVE`.
3. Add all secret values with `wrangler secret put`; never place them in
   `wrangler.jsonc`.
4. Expose the origin bridge through a Cloudflare Tunnel at
   `origin.azcutai.azharinoyume.cloud` and restrict the tunnel route to
   `/health` and `/internal/*`.
5. Set the same `ORIGIN_SERVICE_SECRET` on the Worker and `azyume-worker`.

Required Worker secrets:

- `NEXTAUTH_SECRET`
- `RESEND_API_KEY`
- `DATABASE_URL` only as a temporary fallback until Hyperdrive is bound
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- payment provider secrets
- AI provider keys
- VAPID keys
- `ORIGIN_SERVICE_URL`
- `ORIGIN_SERVICE_SECRET`

## Safe cutover

1. Deploy to the temporary `workers.dev` URL.
2. Run login, quote, payment sandbox, upload, media verification, render queue,
   portal, admin, and webhook smoke tests.
3. Lower the existing DNS TTL.
4. Bind `azcutai.azharinoyume.cloud` to the Worker.
5. Keep `azyume-web` in PM2 for rollback for at least one day, but remove it from
   the public reverse proxy.
6. After production verification, stop and disable only `azyume-web`. Keep
   `azyume-worker` and `azyume-render-service` online.
