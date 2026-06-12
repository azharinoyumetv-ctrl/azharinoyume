#!/usr/bin/env bash
#
# azharinoyume — full go-live script for Hostinger VPS (Ubuntu, Node v22)
# Brings up: PostgreSQL + Redis + Next.js web + BullMQ worker + Remotion render service
#
# Run as a user with sudo. Edit the CONFIG block, then: bash go-live.sh
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — edit these
# ─────────────────────────────────────────────────────────────────────────────
SAAS_REPO="https://github.com/azharinoyumetv-ctrl/azharinoyume.git"   # create this repo first (see below)
REMOTION_REPO="https://github.com/azharinoyumetv-ctrl/remotion-render-service.git"
DOMAIN="azharinoyume.cloud"
ADMIN_DOMAIN="admin.azharinoyume.cloud"
DB_PASSWORD="CHANGE_ME_strong_db_password"
RENDER_SECRET="CHANGE_ME_shared_render_secret"             # must match in both .env files
# ─────────────────────────────────────────────────────────────────────────────

SAAS_DIR="/var/www/azharinoyume"
REMOTION_DIR="/opt/remotion-render-service"

echo "==> 1/9  System packages"
sudo apt-get update -y
sudo apt-get install -y curl git nginx postgresql postgresql-contrib redis-server ufw

echo "==> 2/9  Node 22 + pnpm + pm2 (skip if already present)"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pm2 tsx

echo "==> 3/9  PostgreSQL database + user"
sudo -u postgres psql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='azhari') THEN
    CREATE ROLE azhari LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
SELECT 'CREATE DATABASE azharinoyume OWNER azhari'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='azharinoyume')\gexec
SQL

echo "==> 4/9  Redis + firewall"
sudo systemctl enable --now redis-server
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "==> 5/9  Clone repos"
sudo mkdir -p /var/www /opt
sudo chown -R "$USER":"$USER" /var/www /opt
[ -d "$SAAS_DIR/.git" ]     || git clone "$SAAS_REPO" "$SAAS_DIR"
[ -d "$REMOTION_DIR/.git" ] || git clone "$REMOTION_REPO" "$REMOTION_DIR"

echo "==> 6/9  Render service (Remotion) — install + Chrome deps"
cd "$REMOTION_DIR"
npm install
npx remotion browser ensure          # installs the headless Chrome Remotion needs
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/your-strong-secret-here/${RENDER_SECRET}/" .env
  echo "    !! Edit $REMOTION_DIR/.env to add your R2 credentials before rendering"
fi

echo "==> 7/9  SaaS app — install + prisma + build"
cd "$SAAS_DIR"
npm install --legacy-peer-deps
if [ ! -f .env ]; then
  cat > .env <<ENV
DATABASE_URL="postgresql://azhari:${DB_PASSWORD}@localhost:5432/azharinoyume"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXTAUTH_URL="https://${DOMAIN}"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
RENDER_SERVICE_URL="http://127.0.0.1:4000"
RENDER_SERVICE_SECRET="${RENDER_SECRET}"
N8N_WEBHOOK_SECRET="$(openssl rand -hex 16)"
# --- fill these in: ---
ANTHROPIC_API_KEY=""
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="azharinoyume"
RESEND_API_KEY=""
EMAIL_FROM="noreply@${DOMAIN}"
XENDIT_SECRET_KEY=""
XENDIT_WEBHOOK_SECRET=""
WISE_WEBHOOK_SECRET=""
PAYONEER_WEBHOOK_SECRET=""
ENV
  echo "    !! Edit $SAAS_DIR/.env to add API keys (Anthropic, R2, Resend, payment gateways)"
fi
npx prisma generate
npx prisma db push          # creates all 30 tables
npx next build

echo "==> 8/9  Start everything under PM2"
cd "$SAAS_DIR" && pm2 start ecosystem.config.js
cd "$REMOTION_DIR" && pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash || true

echo "==> 9/9  Nginx + SSL"
sudo tee /etc/nginx/sites-available/azharinoyume >/dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${ADMIN_DOMAIN};
    client_max_body_size 500M;     # allow large video uploads
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/azharinoyume /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅  Services are up. Now:"
echo "   1. Fill API keys in:  $SAAS_DIR/.env   and   $REMOTION_DIR/.env"
echo "   2. Restart:           pm2 restart all"
echo "   3. Get SSL:           sudo apt install -y certbot python3-certbot-nginx && \\"
echo "                         sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN}"
echo "   4. Health checks:     curl localhost:3000   &&   curl localhost:4000/health"
echo "   5. pm2 status   /   pm2 logs"
