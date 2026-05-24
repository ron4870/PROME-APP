#!/bin/bash
set -e

echo "Restarting Docker container on port 8080..."
cd /root/prome-app
docker compose down
docker compose up -d

echo "Installing Nginx and Certbot..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

echo "Configuring Nginx Reverse Proxy..."
cat << 'EOF' > /etc/nginx/sites-available/ims.promeconsult.com
server {
    listen 80;
    server_name ims.promeconsult.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site and disable default
ln -sf /etc/nginx/sites-available/ims.promeconsult.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

echo "Provisioning SSL Certificate via Let's Encrypt..."
certbot --nginx -d ims.promeconsult.com --non-interactive --agree-tos -m admin@promeconsult.com

echo "SSL Setup Complete!"
