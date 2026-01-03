# OLT Care SaaS - Complete VPS Deployment Guide

## 📋 Project Information

| Item | Value |
|------|-------|
| Project Name | oltcaresass |
| Git Repository | https://github.com/hostercube/olt-care-sass.git |
| Frontend URL | https://oltapp.isppoint.com |
| Backend API URL | https://oltapp.isppoint.com/olt-polling-server |
| Supabase Project ID | koodidvsmjfwjcgnmqox |
| Supabase URL | https://koodidvsmjfwjcgnmqox.supabase.co |
| VPS Directory | /var/www/oltapp.isppoint.com |

---

## 📁 Project Structure

```
/var/www/oltapp.isppoint.com/
├── .env                          # Frontend Environment (auto from .env.production)
├── .env.production               # Frontend Production Template
├── olt-polling-server/
│   ├── .env                      # Backend Environment (auto from .env.production)
│   ├── .env.production           # Backend Production Template
│   ├── ecosystem.config.cjs      # PM2 Configuration
│   ├── package.json              # Backend Dependencies
│   └── src/                      # Backend Source Code
├── src/                          # Frontend React Source
├── public/                       # Static Assets
├── COMPLETE_DATABASE_SCHEMA.sql  # Database Schema (Run in Supabase)
├── dist/                         # Built Frontend (after npm run build)
└── DEPLOYMENT_INSTRUCTIONS.md    # This File
```

---

## 🔐 Environment Configuration

### Frontend Environment (.env)

**Location:** `/var/www/oltapp.isppoint.com/.env`

```env
# ==============================================
# OLT Care SaaS - Frontend Environment
# ==============================================

# Supabase Configuration
VITE_SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjc5NzIsImV4cCI6MjA4Mjk0Mzk3Mn0.yPQpGWhlm6N9PzeQ4FQztK5LJmRU8BEfiSnDLHSn2Ac
VITE_SUPABASE_PROJECT_ID=koodidvsmjfwjcgnmqox

# Polling Server URL (Backend API)
VITE_POLLING_SERVER_URL=https://oltapp.isppoint.com/olt-polling-server
```

### Backend Environment (olt-polling-server/.env)

**Location:** `/var/www/oltapp.isppoint.com/olt-polling-server/.env`

```env
# ==============================================
# Server Configuration
# ==============================================
PORT=3001
NODE_ENV=production

# ==============================================
# Supabase Configuration (Backend - Service Role)
# ==============================================
SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2Nzk3MiwiZXhwIjoyMDgyOTQzOTcyfQ.VOOCGUxPyLMQP4E-f--72bsql-BLVAXUNcbrUXFqyZs

# ==============================================
# Polling Configuration
# ==============================================
POLLING_INTERVAL=30000
SSH_TIMEOUT=30000
MIKROTIK_TIMEOUT=15000
DEBUG=false
```

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Access Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/koodidvsmjfwjcgnmqox/sql/new

### 1.2 Run Database Schema

1. Open `COMPLETE_DATABASE_SCHEMA.sql` file
2. Copy all SQL content
3. Paste in Supabase SQL Editor
4. Click **"Run"** button

### 1.3 Create Super Admin User

After creating a user through the signup page, run this SQL:

```sql
-- Make user super_admin (replace email with actual admin email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role 
FROM auth.users 
WHERE email = 'admin@isppoint.com'
ON CONFLICT DO NOTHING;
```

---

## 🖥️ Step 2: VPS Server Setup (First Time Only)

### 2.1 System Requirements

- Ubuntu 20.04+ or Debian 11+
- Minimum 1GB RAM, 1 CPU
- Root or sudo access

### 2.2 Install Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2.3 Clone Project

```bash
# Create directory and clone
cd /var/www
sudo git clone https://github.com/hostercube/olt-care-sass.git oltapp.isppoint.com

# Set ownership
sudo chown -R $USER:$USER /var/www/oltapp.isppoint.com

# Navigate to project
cd /var/www/oltapp.isppoint.com
```

---

## 🎨 Step 3: Frontend Build (First Time)

```bash
cd /var/www/oltapp.isppoint.com

# Install dependencies
npm install

# Build for production
npm run build

# Verify build
ls -la dist/
```

---

## ⚙️ Step 4: Backend Setup (First Time)

```bash
cd /var/www/oltapp.isppoint.com/olt-polling-server

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

# Enable PM2 startup
pm2 startup
# Run the command that PM2 outputs

# Verify
pm2 status
curl http://localhost:3001/health
```

---

## 🌐 Step 5: Nginx Configuration

### 5.1 Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/oltapp.isppoint.com
```

### 5.2 Paste Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name oltapp.isppoint.com www.oltapp.isppoint.com;

    # Frontend - React SPA
    root /var/www/oltapp.isppoint.com/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/xml application/json;
    gzip_disable "MSIE [1-6]\.";

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API Proxy
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Frontend Routes - React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
    }
}
```

### 5.3 Enable Site

```bash
sudo ln -sf /etc/nginx/sites-available/oltapp.isppoint.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 6: SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d oltapp.isppoint.com -d www.oltapp.isppoint.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🔥 Step 7: Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 🔄 Quick Update Commands (Daily Use)

### One-Line Update (Copy & Paste)

```bash
cd /var/www/oltapp.isppoint.com && git pull && npm install && npm run build && cd olt-polling-server && npm install && pm2 restart olt-polling-server
```

### Step-by-Step Update

```bash
# Navigate to project
cd /var/www/oltapp.isppoint.com

# Pull latest code
git pull

# Update frontend
npm install
npm run build

# Update backend
cd olt-polling-server
npm install
pm2 restart olt-polling-server
```

### Frontend Only Update

```bash
cd /var/www/oltapp.isppoint.com
git pull
npm install
npm run build
```

### Backend Only Update

```bash
cd /var/www/oltapp.isppoint.com/olt-polling-server
git pull
npm install
pm2 restart olt-polling-server
```

---

## ✅ Verification & Testing

### Check Status

```bash
# Backend status
pm2 status

# Backend logs
pm2 logs olt-polling-server --lines 50

# Nginx status
sudo systemctl status nginx
```

### Test Endpoints

```bash
# Local backend health
curl http://localhost:3001/health

# Public frontend
curl -I https://oltapp.isppoint.com

# Public backend API
curl https://oltapp.isppoint.com/olt-polling-server/health
```

### Browser Test URLs

- **Frontend:** https://oltapp.isppoint.com
- **Backend Health:** https://oltapp.isppoint.com/olt-polling-server/health

---

## 🔧 Troubleshooting

### Backend Issues

```bash
# View logs
pm2 logs olt-polling-server --lines 100

# Check .env
cat /var/www/oltapp.isppoint.com/olt-polling-server/.env

# Restart
pm2 restart olt-polling-server

# Check port
sudo lsof -i :3001
```

### Frontend Issues

```bash
# Check dist folder
ls -la /var/www/oltapp.isppoint.com/dist/

# Rebuild
cd /var/www/oltapp.isppoint.com
npm run build
```

### Nginx Issues

```bash
# Test config
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/error.log

# Reload
sudo systemctl reload nginx
```

### SSL Issues

```bash
# Check certificates
sudo certbot certificates

# Renew
sudo certbot renew --force-renewal
```

---

## 📊 Quick Reference

### URLs

| Service | URL |
|---------|-----|
| Frontend | https://oltapp.isppoint.com |
| Backend API | https://oltapp.isppoint.com/olt-polling-server |
| Health Check | https://oltapp.isppoint.com/olt-polling-server/health |
| Supabase | https://koodidvsmjfwjcgnmqox.supabase.co |

### File Locations

| File | Path |
|------|------|
| Project Root | /var/www/oltapp.isppoint.com/ |
| Frontend Build | /var/www/oltapp.isppoint.com/dist/ |
| Backend | /var/www/oltapp.isppoint.com/olt-polling-server/ |
| Frontend Env | /var/www/oltapp.isppoint.com/.env |
| Backend Env | /var/www/oltapp.isppoint.com/olt-polling-server/.env |
| Nginx Config | /etc/nginx/sites-available/oltapp.isppoint.com |

### PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check status |
| `pm2 logs olt-polling-server` | View logs |
| `pm2 restart olt-polling-server` | Restart |
| `pm2 stop olt-polling-server` | Stop |
| `pm2 monit` | Real-time monitor |

### Nginx Commands

| Command | Description |
|---------|-------------|
| `sudo nginx -t` | Test config |
| `sudo systemctl reload nginx` | Reload |
| `sudo systemctl restart nginx` | Restart |
| `sudo tail -f /var/log/nginx/error.log` | View errors |

---

**Last Updated:** January 2025
