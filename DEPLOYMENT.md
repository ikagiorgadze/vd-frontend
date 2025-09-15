Deployment on EC2 (Ubuntu) – Frontend

Overview
- Vite React app built into static files
- Served by Nginx from /var/www/vd-frontend
- Proxies /api/* to backend on 127.0.0.1:3000

One-time EC2 bootstrap
1) SSH to instance and install basics
   - sudo apt-get update -y && sudo apt-get install -y git nginx
   - Install Node.js 20: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
2) Ensure firewall and security group allow HTTP+HTTPS
   - sudo ufw allow OpenSSH
   - sudo ufw allow 80/tcp
   - sudo ufw allow 443/tcp
   - sudo ufw enable
   - In your cloud provider, allow inbound 80 and 443 in the instance Security Group

GitHub Secrets required (in vd-frontend repo)
- EC2_HOST: public IP or DNS
- EC2_USER: ubuntu
- EC2_SSH_PORT: 22 (or custom)
- EC2_SSH_KEY: contents of private key (PEM) with access to the instance

CI/CD behavior
- On push to main, GitHub Action builds on the EC2 host into /opt/vd-frontend/dist, publishes to /var/www/vd-frontend, and installs an Nginx site that proxies /api to the backend.

Environment (.env)
- VITE_API_BASE_URL=/api so that production calls go through the same domain under /api.

TLS certificates (Let’s Encrypt)
- The included Nginx config expects certificates at /etc/letsencrypt/live/democracy-dashboard.com/…
- Issue them once using HTTP-01 with webroot after Nginx is serving HTTP:
   - sudo apt-get install -y certbot
   - sudo certbot certonly --webroot -w /var/www/vd-frontend -d democracy-dashboard.com -d www.democracy-dashboard.com
   - sudo systemctl reload nginx
   - Certificates auto-renew; ensure a cron/systemd timer exists (certbot installs one by default)

DNS and redirects
- Create A/AAAA records for democracy-dashboard.com and www.democracy-dashboard.com pointing to the EC2 public IP
- The site redirects HTTP to HTTPS; www is handled as an alias of the apex
- If using a proxy like Cloudflare, temporarily set DNS-only (grey cloud) when issuing/renewing certificates via HTTP-01
