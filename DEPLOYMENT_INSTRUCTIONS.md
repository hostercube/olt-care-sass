# 🚀 OLT Care SaaS - Complete Deployment Guide

## 📁 Project Structure (ফোল্ডার গঠন)

```
oltcaresass/
├── .env                          # ❌ Lovable Cloud (auto-generated, DO NOT USE FOR VPS)
├── .env.production               # ✅ YOUR VPS Frontend Config (copy to .env before build)
├── olt-polling-server/
│   ├── .env.production           # ✅ YOUR VPS Backend Config (copy to .env)
│   ├── .env.example              # Template example
│   └── src/                      # Backend source code
├── src/                          # Frontend React source code
├── public/                       # Static assets (NO .env here!)
├── supabase/                     # Supabase migrations
├── COMPLETE_DATABASE_SCHEMA.sql  # ✅ Run this in Supabase SQL Editor
└── dist/                         # Built frontend (after npm run build)
```

---

## 🔐 Environment Files - কোথায় কি রাখবেন

### ❌ Root `.env` (Lovable Cloud - স্পর্শ করবেন না)
```
Location: /.env
Purpose: Lovable Cloud development environment (Lovable এর নিজস্ব Supabase)
Action: VPS deployment এ এই ফাইল USE করবেন না!
```

### ✅ Root `.env.production` (YOUR VPS Frontend)
```
Location: /.env.production
Purpose: আপনার production Supabase credentials (frontend এর জন্য)
Action: VPS এ build করার আগে এটা .env হিসেবে copy করুন
Command: cp .env.production .env
```

### ✅ `olt-polling-server/.env.production` (YOUR VPS Backend)
```
Location: /olt-polling-server/.env.production
Purpose: আপনার production Supabase credentials (polling server এর জন্য)
Action: VPS এ /olt-polling-server/.env হিসেবে copy করুন
Command: cp .env.production .env
```

---

## 📋 YOUR Supabase Credentials

```
Project Name: oltcaresass
Project ID: koodidvsmjfwjcgnmqox
Project URL: https://koodidvsmjfwjcgnmqox.supabase.co

Anon Key (Frontend): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjc5NzIsImV4cCI6MjA4Mjk0Mzk3Mn0.yPQpGWhlm6N9PzeQ4FQztK5LJmRU8BEfiSnDLHSn2Ac

Service Role Key (Backend): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2Nzk3MiwiZXhwIjoyMDgyOTQzOTcyfQ.VOOCGUxPyLMQP4E-f--72bsql-BLVAXUNcbrUXFqyZs
```

---

## 🛠️ Step-by-Step VPS Deployment

### Step 1: Supabase Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/koodidvsmjfwjcgnmqox/sql)
2. Open **SQL Editor**
3. Copy entire content from `COMPLETE_DATABASE_SCHEMA.sql`
4. Run the SQL

### Step 2: Create Super Admin User

After running schema, signup through the app first, then run this SQL:
```sql
-- আপনার email দিয়ে replace করুন
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' 
FROM auth.users 
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT DO NOTHING;
```

### Step 3: VPS Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 & Nginx
sudo npm install -g pm2
sudo apt install -y nginx

# Clone your project
cd /var/www
git clone https://github.com/YOUR_USERNAME/oltcaresass.git
cd oltcaresass
```

### Step 4: Build Frontend

```bash
cd /var/www/oltcaresass

# ⭐ IMPORTANT: Copy production env to .env (NOT from public folder!)
cp .env.production .env

# Verify .env content - should show YOUR Supabase, not Lovable's
cat .env

# Install and build
npm install
npm run build

# Verify dist folder created
ls -la dist/
```

### Step 5: Setup Backend Polling Server

```bash
cd /var/www/oltcaresass/olt-polling-server

# ⭐ IMPORTANT: Copy production env to .env
cp .env.production .env

# Verify .env content
cat .env

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/oltapp
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name oltapp.isppoint.com;

    # Frontend - React App
    root /var/www/oltcaresass/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend - Polling Server API
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
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/oltapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d oltapp.isppoint.com
```

### Step 8: Firewall Setup

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## ✅ Verification Checklist

### Check Frontend
```bash
# Open in browser
https://oltapp.isppoint.com
```

### Check Backend Health
```bash
curl https://oltapp.isppoint.com/olt-polling-server/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Check PM2 Status
```bash
pm2 status
pm2 logs olt-polling-server
```

---

## 🔄 Update Commands (Future Updates)

```bash
cd /var/www/oltcaresass

# Pull latest code
git pull origin main

# Rebuild frontend
cp .env.production .env
npm install
npm run build

# Restart backend
cd olt-polling-server
cp .env.production .env
npm install
pm2 restart olt-polling-server

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### Problem: Frontend shows blank page
```bash
# Check if dist exists
ls -la /var/www/oltcaresass/dist/

# Check Nginx config
sudo nginx -t

# Check Nginx error log
sudo tail -100 /var/log/nginx/error.log
```

### Problem: Polling server not responding
```bash
# Check PM2 status
pm2 status
pm2 logs olt-polling-server --lines 100

# Check if .env exists
cat /var/www/oltcaresass/olt-polling-server/.env

# Restart server
pm2 restart olt-polling-server
```

### Problem: Supabase connection failed
```bash
# Verify environment variables
cat /var/www/oltcaresass/.env | grep SUPABASE
cat /var/www/oltcaresass/olt-polling-server/.env | grep SUPABASE

# Test connection
curl -I https://koodidvsmjfwjcgnmqox.supabase.co
```

---

## 📝 Quick Reference Table

| Component | Source File | VPS Location | Command |
|-----------|-------------|--------------|---------|
| Frontend .env | `/.env.production` | `/.env` | `cp .env.production .env` |
| Backend .env | `/olt-polling-server/.env.production` | `/olt-polling-server/.env` | `cp .env.production .env` |
| Database Schema | `/COMPLETE_DATABASE_SCHEMA.sql` | Supabase SQL Editor | Run SQL |
| Built Frontend | `/dist/` | Served by Nginx | `npm run build` |

---

## ⚠️ Important Notes

1. **Root `.env` is for Lovable Cloud** - VPS এ এটা ব্যবহার করবেন না!
2. **`.env.production` files copy করুন** - `.env` হিসেবে VPS এ
3. **public folder এ কোনো .env নেই** - আগে ছিল, এখন সরানো হয়েছে
4. **Service Role Key secret রাখুন** - এটা admin access দেয়
