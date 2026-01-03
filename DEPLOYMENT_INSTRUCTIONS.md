# OLT Care SaaS - Complete VPS Deployment Guide

## 📋 Project Information

| Item | Value |
|------|-------|
| Project Name | oltcaresass |
| Git Repository | https://github.com/hostercube/olt-care-sass.git |
| Frontend Domain | https://olt.isppoint.com |
| Backend API | https://olt.isppoint.com/olt-polling-server |
| Supabase Project ID | koodidvsmjfwjcgnmqox |
| Supabase URL | https://koodidvsmjfwjcgnmqox.supabase.co |

---

## 📁 Project Structure

```
olt-care-sass/
├── .env.production               # ✅ Frontend Production Config
├── olt-polling-server/
│   ├── .env.production           # ✅ Backend Production Config
│   ├── ecosystem.config.cjs      # PM2 Config
│   └── src/                      # Backend Source Code
├── src/                          # Frontend React Source
├── public/                       # Static Assets
├── COMPLETE_DATABASE_SCHEMA.sql  # ✅ Run in Supabase SQL Editor
└── dist/                         # Built Frontend (after npm run build)
```

---

## 🔐 Environment Files

### Frontend (.env.production → .env)
```env
VITE_SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjc5NzIsImV4cCI6MjA4Mjk0Mzk3Mn0.yPQpGWhlm6N9PzeQ4FQztK5LJmRU8BEfiSnDLHSn2Ac
VITE_SUPABASE_PROJECT_ID=koodidvsmjfwjcgnmqox
VITE_POLLING_SERVER_URL=https://olt.isppoint.com/olt-polling-server
```

### Backend (olt-polling-server/.env.production → .env)
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2Nzk3MiwiZXhwIjoyMDgyOTQzOTcyfQ.VOOCGUxPyLMQP4E-f--72bsql-BLVAXUNcbrUXFqyZs
POLLING_INTERVAL=30000
SSH_TIMEOUT=30000
MIKROTIK_TIMEOUT=15000
DEBUG=false
```

---

## 🗄️ Step 1: Supabase Database Setup

### 1.1 Go to Supabase SQL Editor
```
https://supabase.com/dashboard/project/koodidvsmjfwjcgnmqox/sql/new
```

### 1.2 Run Database Schema
- `COMPLETE_DATABASE_SCHEMA.sql` ফাইলের সব SQL কপি করুন
- SQL Editor এ paste করুন
- "Run" বাটনে ক্লিক করুন

### 1.3 Create Super Admin User
```sql
-- First, create user through signup page
-- Then run this to make them super_admin:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'admin@isppoint.com'
ON CONFLICT DO NOTHING;
```

---

## 🖥️ Step 2: VPS Server Setup

### 2.1 Install Required Packages
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### 2.2 Clone Project
```bash
cd /var/www
sudo git clone https://github.com/hostercube/olt-care-sass.git
sudo chown -R $USER:$USER /var/www/olt-care-sass
cd /var/www/olt-care-sass
```

---

## 🎨 Step 3: Frontend Build

```bash
cd /var/www/olt-care-sass

# Copy production env
cp .env.production .env

# Install dependencies
npm install

# Build
npm run build

# Verify build
ls -la dist/
```

---

## ⚙️ Step 4: Backend Setup

```bash
cd /var/www/olt-care-sass/olt-polling-server

# Copy production env
cp .env.production .env

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

# Enable PM2 startup
pm2 startup
```

---

## 🌐 Step 5: Nginx Configuration

### 5.1 Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/oltapp
```

### 5.2 Paste This Configuration
```nginx
server {
    listen 80;
    server_name olt.isppoint.com;

    # Frontend
    root /var/www/olt-care-sass/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

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
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/oltapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 6: SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d olt.isppoint.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🔥 Step 7: Firewall Setup

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

---

## ✅ Step 8: Verification

### 8.1 Check Backend
```bash
pm2 status
pm2 logs olt-polling-server
curl http://localhost:3001/health
```

### 8.2 Check Frontend
```bash
curl -I https://olt.isppoint.com
```

### 8.3 Test URLs
- Frontend: https://olt.isppoint.com
- Backend Health: https://olt.isppoint.com/olt-polling-server/health

---

## 🔄 Update Commands

```bash
cd /var/www/olt-care-sass

# Pull latest changes
git pull origin main

# Rebuild frontend
npm install
npm run build

# Restart backend
cd olt-polling-server
npm install
pm2 restart olt-polling-server
```

---

## 🔧 Troubleshooting

### Backend not starting
```bash
cd /var/www/olt-care-sass/olt-polling-server
cat .env  # Check if .env exists
pm2 logs olt-polling-server --lines 50
```

### Frontend blank page
```bash
ls -la /var/www/olt-care-sass/dist/
cat /var/www/olt-care-sass/dist/index.html
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### PM2 commands
```bash
pm2 list
pm2 restart all
pm2 logs
pm2 monit
```

---

## 📊 Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 80/443 | https://olt.isppoint.com |
| Backend | 3001 | https://olt.isppoint.com/olt-polling-server |
| Supabase | - | https://koodidvsmjfwjcgnmqox.supabase.co |

| Command | Description |
|---------|-------------|
| `pm2 status` | Check backend status |
| `pm2 restart olt-polling-server` | Restart backend |
| `pm2 logs` | View logs |
| `sudo systemctl reload nginx` | Reload Nginx |
| `sudo certbot renew` | Renew SSL |
