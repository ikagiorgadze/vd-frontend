Deployment on EC2 (Ubuntu) – Frontend

Overview
- Vite React app built into static files
- Served by Nginx from /var/www/vd-frontend
- Proxies /api/* to backend on 127.0.0.1:3000

One-time EC2 bootstrap
1) SSH to instance and install basics
   - sudo apt-get update -y && sudo apt-get install -y git nginx
   - Install Node.js 20: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
2) Ensure firewall allows HTTP
   - sudo ufw allow OpenSSH
   - sudo ufw allow 80/tcp
   - sudo ufw enable

GitHub Secrets required (in vd-frontend repo)
- EC2_HOST: public IP or DNS
- EC2_USER: ubuntu
- EC2_SSH_PORT: 22 (or custom)
- EC2_SSH_KEY: contents of private key (PEM) with access to the instance

CI/CD behavior
- On push to main, GitHub Action builds on the EC2 host into /opt/vd-frontend/dist, publishes to /var/www/vd-frontend, and installs an Nginx site that proxies /api to the backend.

Environment (.env)
- VITE_API_BASE_URL=/api so that production calls go through the same domain under /api.
