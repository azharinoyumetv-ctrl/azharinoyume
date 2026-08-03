# Azyume Render Service — VPS Deploy

This directory contains the dedicated video-editing renderer for Azyume Studio. It is deployed from the public `azharinoyume` repository and is independent of every n8n/YouTube renderer and WMP.

## Production identity

- Directory: `/var/www/azharinoyume/services/azyume-render-service`
- PM2 process: `azyume-render-service`
- Listener: `127.0.0.1:4100`
- R2 bucket: `azyumecutai`
- Job state: `/var/lib/azyume-render-service/jobs`
- Temporary renders: `/tmp/azyume-remotion-renders`

The service stays local-only. It does not require an n8n workflow or a public reverse proxy.

## Install

```bash
cd /var/www/azharinoyume/services/azyume-render-service
npm ci
npx remotion browser ensure
cp .env.example .env
# Fill the Azyume-only render secret and R2 credentials.
pm2 start ecosystem.config.cjs
pm2 save
```

The Azyume app must use the matching configuration:

```dotenv
RENDER_SERVICE_URL=http://127.0.0.1:4100
RENDER_SERVICE_SECRET=<same Azyume-only secret>
```

## Verification

```bash
curl http://127.0.0.1:4100/health
pm2 status azyume-render-service
```

Available composition IDs are `timeline`, `cinematic`, `anime`, `minimal`, `corporate`, and `energetic`.

The production `timeline` composition accepts deterministic segments, captions,
licensed music, B-roll, and brand rules. Every render is rejected before upload
unless ffprobe confirms playable video, dimensions, frame rate, duration, and
file size. Audio presence is reported to the Studio QA record.
