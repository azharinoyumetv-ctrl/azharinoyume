#!/bin/bash
# =============================================================
# Azharinoyume VPS Setup — Ubuntu 22.04 (Hostinger KVM)
# Run as root: bash vps-setup.sh
# =============================================================
set -e

echo "=== [1/10] System update ==="
apt-get update && apt-get upgrade -y

echo "=== [2/10] Install dependencies ==="
apt-get install -y curl git build-essential ffmpeg redis-server postgresql postgresql-contrib nginx certbot python3-certbot-nginx ufw

echo "=== [3/10] Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo "=== [4/10] Install PM2 ==="
npm install -g pm2

echo "=== [5/10] Configure PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER azhar WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE azharinoyume OWNER azhar;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE azharinoyume TO azhar;"
echo "PostgreSQL ready. Database: azharinoyume, User: azhar"

echo "=== [6/10] Configure Redis ==="
sed -i 's/^# maxmemory-policy.*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

echo "=== [7/10] Configure UFW Firewall ==="
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000    # Next.js (behind nginx)
ufw allow 5678    # n8n
ufw --force enable

echo "=== [8/10] Install n8n ==="
npm install -g n8n
cat > /etc/systemd/system/n8n.service <<EOF
[Unit]
Description=n8n automation
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/n8n start
Restart=on-failure
Environment=N8N_BASIC_AUTH_ACTIVE=true
Environment=N8N_BASIC_AUTH_USER=admin
Environment=N8N_BASIC_AUTH_PASSWORD=CHANGE_N8N_PASSWORD
Environment=N8N_HOST=n8n.azharinoyume.cloud
Environment=N8N_PORT=5678
Environment=N8N_PROTOCOL=https
Environment=WEBHOOK_URL=https://n8n.azharinoyume.cloud/

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable n8n
systemctl start n8n

echo "=== [9/10] Configure Nginx ==="
cat > /etc/nginx/sites-available/azharinoyume <<'NGINX'
server {
    server_name azharinoyume.cloud www.azharinoyume.cloud;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10G;
        proxy_read_timeout 300s;
    }
}

server {
    server_name n8n.azharinoyume.cloud;
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/azharinoyume /etc/nginx/sites-enabled/azharinoyume
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== [10/10] SSL Certificates ==="
certbot --nginx -d azharinoyume.cloud -d www.azharinoyume.cloud -d n8n.azharinoyume.cloud --non-interactive --agree-tos -m your@email.com

echo ""
echo "=========================================="
echo "VPS SETUP COMPLETE"
echo "=========================================="
echo "Next steps:"
echo "1. Upload your project to /var/www/azharinoyume"
echo "2. cd /var/www/azharinoyume && npm install"
echo "3. Copy .env.example to .env.local and fill all values"
echo "4. npm run db:migrate"
echo "5. npm run build"
echo "6. pm2 start npm --name azharinoyume -- start"
echo "7. pm2 save && pm2 startup"
echo ""
echo "FFmpeg is ready: $(ffmpeg -version | head -1)"
echo "PostgreSQL: running"
echo "Redis: running"
echo "n8n: running at http://localhost:5678"
