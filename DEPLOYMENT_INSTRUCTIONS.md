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

---

## 📁 Project Structure

```
olt-care-sass/
├── .env.production               # Frontend Production Environment
├── olt-polling-server/
│   ├── .env.production           # Backend Production Environment
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

### Frontend Environment (.env.production → .env)

**Location:** `/var/www/olt-care-sass/.env`

```env
# ==============================================
# Supabase Configuration (Frontend)
# ==============================================
VITE_SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjc5NzIsImV4cCI6MjA4Mjk0Mzk3Mn0.yPQpGWhlm6N9PzeQ4FQztK5LJmRU8BEfiSnDLHSn2Ac
VITE_SUPABASE_PROJECT_ID=koodidvsmjfwjcgnmqox

# ==============================================
# Polling Server URL (Backend API)
# ==============================================
VITE_POLLING_SERVER_URL=https://oltapp.isppoint.com/olt-polling-server
```

### Backend Environment (olt-polling-server/.env.production → .env)

**Location:** `/var/www/olt-care-sass/olt-polling-server/.env`

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

## 🖥️ Step 2: VPS Server Setup

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

# Verify Node.js installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2.3 Clone Project

```bash
# Navigate to web directory
cd /var/www

# Clone repository
sudo git clone https://github.com/hostercube/olt-care-sass.git

# Set ownership
sudo chown -R $USER:$USER /var/www/olt-care-sass

# Navigate to project
cd /var/www/olt-care-sass
```

---

## 🎨 Step 3: Frontend Build

```bash
# Navigate to project root
cd /var/www/olt-care-sass

# Copy production environment file
cp .env.production .env

# Install dependencies
npm install

# Build for production
npm run build

# Verify build was successful
ls -la dist/
# Should show: index.html, assets folder, etc.
```

---

## ⚙️ Step 4: Backend Setup

```bash
# Navigate to backend folder
cd /var/www/olt-care-sass/olt-polling-server

# Copy production environment file
cp .env.production .env

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Run the command that PM2 outputs

# Verify backend is running
pm2 status
curl http://localhost:3001/health
```

---

## 🌐 Step 5: Nginx Configuration

### 5.1 Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/oltapp.isppoint.com
```

### 5.2 Paste Complete Nginx Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name oltapp.isppoint.com www.oltapp.isppoint.com;

    # Frontend - React SPA
    root /var/www/olt-care-sass/dist;
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

    # Backend API Proxy - OLT Polling Server
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running connections
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

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 5.3 Enable Site and Test Configuration

```bash
# Create symbolic link to enable site
sudo ln -sf /etc/nginx/sites-available/oltapp.isppoint.com /etc/nginx/sites-enabled/

# Remove default site (if exists)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## 🔒 Step 6: SSL Certificate (HTTPS)

### 6.1 Obtain SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d oltapp.isppoint.com -d www.oltapp.isppoint.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 6.2 Verify Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

### 6.3 Final Nginx Config (After SSL)

Certbot will automatically update your Nginx config. It should look like:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name oltapp.isppoint.com www.oltapp.isppoint.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name oltapp.isppoint.com www.oltapp.isppoint.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/oltapp.isppoint.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oltapp.isppoint.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend - React SPA
    root /var/www/olt-care-sass/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/xml application/json;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\. {
        deny all;
    }
}
```

---

## 🔥 Step 7: Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

---

## ✅ Step 8: Verification & Testing

### 8.1 Check Backend Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs olt-polling-server --lines 50

# Test health endpoint locally
curl http://localhost:3001/health
```

### 8.2 Check Frontend

```bash
# Test frontend
curl -I https://oltapp.isppoint.com

# Check if files exist
ls -la /var/www/olt-care-sass/dist/
```

### 8.3 Test API Endpoints

```bash
# Test backend through Nginx proxy
curl https://oltapp.isppoint.com/olt-polling-server/health

# Expected response: {"status":"ok","timestamp":"..."}
```

### 8.4 Browser Testing

Open in browser:
- **Frontend:** https://oltapp.isppoint.com
- **Backend Health:** https://oltapp.isppoint.com/olt-polling-server/health

---

## 🔄 Update & Maintenance Commands

### Update Application

```bash
cd /var/www/olt-care-sass

# Pull latest changes
git pull origin main

# Update frontend
npm install
npm run build

# Update backend
cd olt-polling-server
npm install
pm2 restart olt-polling-server
```

### PM2 Commands

```bash
pm2 status                        # Check status
pm2 logs olt-polling-server       # View logs
pm2 restart olt-polling-server    # Restart backend
pm2 stop olt-polling-server       # Stop backend
pm2 delete olt-polling-server     # Remove from PM2
pm2 monit                         # Real-time monitoring
```

### Nginx Commands

```bash
sudo nginx -t                     # Test configuration
sudo systemctl reload nginx       # Reload config
sudo systemctl restart nginx      # Restart Nginx
sudo systemctl status nginx       # Check status
sudo tail -f /var/log/nginx/error.log    # View error logs
sudo tail -f /var/log/nginx/access.log   # View access logs
```

---

## 🔧 Troubleshooting

### Backend Not Starting

```bash
# Check if .env exists
cat /var/www/olt-care-sass/olt-polling-server/.env

# View PM2 logs
pm2 logs olt-polling-server --lines 100

# Check if port 3001 is in use
sudo lsof -i :3001

# Restart backend
pm2 restart olt-polling-server
```

### Frontend Blank Page / 404

```bash
# Check if dist folder exists
ls -la /var/www/olt-care-sass/dist/

# Check if index.html exists
cat /var/www/olt-care-sass/dist/index.html

# Rebuild if necessary
cd /var/www/olt-care-sass
npm run build
```

### Nginx Errors

```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Check permissions
ls -la /var/www/olt-care-sass/dist/
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

### Backend API 502/504 Errors

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs olt-polling-server

# Restart backend
pm2 restart olt-polling-server

# Check Nginx proxy settings
sudo cat /etc/nginx/sites-available/oltapp.isppoint.com
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

### Ports

| Service | Port |
|---------|------|
| Nginx (HTTP) | 80 |
| Nginx (HTTPS) | 443 |
| Backend (internal) | 3001 |

### File Locations

| File | Path |
|------|------|
| Frontend Build | /var/www/olt-care-sass/dist/ |
| Backend Source | /var/www/olt-care-sass/olt-polling-server/ |
| Frontend Env | /var/www/olt-care-sass/.env |
| Backend Env | /var/www/olt-care-sass/olt-polling-server/.env |
| Nginx Config | /etc/nginx/sites-available/oltapp.isppoint.com |
| Nginx Logs | /var/log/nginx/ |
| SSL Certs | /etc/letsencrypt/live/oltapp.isppoint.com/ |

### Common Commands

| Task | Command |
|------|---------|
| Check backend status | `pm2 status` |
| View backend logs | `pm2 logs olt-polling-server` |
| Restart backend | `pm2 restart olt-polling-server` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Test Nginx config | `sudo nginx -t` |
| Renew SSL | `sudo certbot renew` |
| Pull updates | `git pull origin main` |
| Rebuild frontend | `npm run build` |

---

## 🆘 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs olt-polling-server`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all services are running: `pm2 status && sudo systemctl status nginx`
4. Test endpoints: `curl http://localhost:3001/health`

---

**Last Updated:** January 2025
**Version:** 1.0.0
