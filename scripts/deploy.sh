#!/bin/bash
# =============================================================
# Azharinoyume — Deploy/Update Script
# Run from /var/www/azharinoyume on VPS after pushing new code
# =============================================================
set -euo pipefail

cd /var/www/azharinoyume
set -a
. ./.env
set +a

echo "[1] Pull latest code"
git pull origin main

echo "[2] Install dependencies"
npm ci --include=dev --legacy-peer-deps

echo "[3] Run database migrations"
npx prisma migrate deploy

echo "[4] Generate Prisma client"
npx prisma generate

echo "[5] Build Next.js"
npm run build
npm prune --omit=dev

echo "[6] Restart app with PM2"
pm2 startOrReload ecosystem.config.cjs --update-env

echo "[7] Save PM2 config"
pm2 save

echo "Deployment complete. App is running."
pm2 status azyume-web azyume-worker azyume-render-service
