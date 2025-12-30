# OLTCare Complete Deployment Guide (HTTPS/SSL)

## 🚨 QUICK FIX: PM2 "errored" Status (Your Current Issue)

Your PM2 is crashing because of working directory issues. Run these commands:

```bash
# 1. Stop and delete old PM2 process
pm2 delete olt-polling-server

# 2. Create logs directory
mkdir -p /www/wwwroot/olt.isppoint.com/olt-polling-server/logs

# 3. Go to polling server directory
cd /www/wwwroot/olt.isppoint.com/olt-polling-server

# 4. Start with ecosystem file (THIS IS THE FIX!)
pm2 start ecosystem.config.js

# 5. Save PM2 config
pm2 save

# 6. Check status - should show "online"
pm2 status
pm2 logs olt-polling-server
```

## 🔒 COMPLETE NGINX CONFIG WITH SSL

Replace your ENTIRE Nginx config with this. In aaPanel: **Website → olt.isppoint.com → Config**

```nginx
server {
    listen 80;
    server_name olt.isppoint.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name olt.isppoint.com;

    # SSL Certificate (aaPanel paths - check your actual paths!)
    ssl_certificate /www/server/panel/vhost/cert/olt.isppoint.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/olt.isppoint.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # FRONTEND (React/Vite)
    root /www/wwwroot/olt.isppoint.com/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # BACKEND (Node.js Polling Server) - CRITICAL!
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

## ⚠️ Check SSL Certificate Paths

In aaPanel: **Website → olt.isppoint.com → SSL**
1. Make sure SSL is enabled (Let's Encrypt or your cert)
2. Check the certificate file paths - update Nginx config if different

Common aaPanel SSL paths:
- `/www/server/panel/vhost/cert/olt.isppoint.com/fullchain.pem`
- `/www/server/panel/vhost/cert/olt.isppoint.com/privkey.pem`

## After Changes

```bash
# Test nginx config
nginx -t

# Reload nginx
nginx -s reload

# Verify polling server
curl http://127.0.0.1:3001/health
curl https://olt.isppoint.com/olt-polling-server/health
```

---

## Prerequisites

- Node.js 18+ installed
- Access to aaPanel
- Domain with SSL certificate: `olt.isppoint.com`

---

## Part 1: Polling Server Setup

### Step 1: Create `.env` File (Already done!)

Your `.env` file looks correct. Just verify it's at:
`/www/wwwroot/olt.isppoint.com/olt-polling-server/.env`

### Step 2: Use Ecosystem Config (Fixes PM2 Issues)

Upload `ecosystem.config.js` to `/www/wwwroot/olt.isppoint.com/olt-polling-server/`

```bash
pm2 delete olt-polling-server
cd /www/wwwroot/olt.isppoint.com/olt-polling-server
pm2 start ecosystem.config.js
pm2 save
pm2 startup

---

## Part 2: Nginx HTTPS Proxy Configuration (CRITICAL)

This is the most important step for making HTTPS work with the polling server.

### For aaPanel: Add Reverse Proxy

1. Go to **Website** → **olt.isppoint.com** → **Reverse Proxy**
2. Add a new proxy:
   - **Name:** `olt-polling-server`
   - **Target URL:** `http://127.0.0.1:3001`
   - **Proxy Directory:** `/olt-polling-server`
   - **Enable:** Yes

### OR: Manual Nginx Configuration

Edit your site's Nginx config:

```bash
nano /www/server/panel/vhost/nginx/olt.isppoint.com.conf
```

Add inside the `server` block (before the closing `}`):

```nginx
# OLT Polling Server Reverse Proxy
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
    
    # CORS Headers - Allow requests from any origin
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    
    # Handle preflight OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}

# Force HTTPS redirect
if ($scheme = http) {
    return 301 https://$host$request_uri;
}
```

### Reload Nginx

```bash
nginx -t && nginx -s reload
```

---

## Part 3: Test HTTPS Connection

After configuring Nginx proxy, test:

```bash
# Test health endpoint
curl https://olt.isppoint.com/olt-polling-server/health

# Test status endpoint
curl https://olt.isppoint.com/olt-polling-server/status
```

Expected response:
```json
{"status":"healthy","uptime":123.456,"timestamp":"2024-12-30T..."}
```

---

## Part 4: Frontend Deployment

### Step 1: Create Frontend `.env` File

```env
VITE_POLLING_SERVER_URL="https://olt.isppoint.com/olt-polling-server"
VITE_SUPABASE_PROJECT_ID="srofhdgdraihxgpmpdye"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw"
VITE_SUPABASE_URL="https://srofhdgdraihxgpmpdye.supabase.co"
```

### Step 2: Build the Project

```bash
npm install
npm run build
```

### Step 3: Upload to aaPanel

1. Go to Website → Your site → Root Directory
2. Delete all old files
3. Upload all contents from `dist/` folder

### Step 4: Configure SPA Routing

In aaPanel site config, add:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## Part 5: Force HTTPS for Entire Site

### In aaPanel:

1. Go to **Website** → **olt.isppoint.com** → **SSL**
2. Click **Let's Encrypt** to get free certificate
3. Enable **Force HTTPS**

### Manual Nginx:

```nginx
server {
    listen 80;
    server_name olt.isppoint.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name olt.isppoint.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    root /www/wwwroot/olt.isppoint.com;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        # ... (proxy settings as shown above)
    }
}
```

---

## Troubleshooting

### PM2 Shows "errored" Status

1. Check logs:
   ```bash
   pm2 logs olt-polling-server --lines 100
   ```

2. Common issues:
   - Missing `.env` file → Create it as shown above
   - Missing `node_modules` → Run `npm install`
   - Port already in use → Kill other process: `lsof -i :3001` then `kill -9 PID`

3. Restart cleanly:
   ```bash
   pm2 delete olt-polling-server
   pm2 start src/index.js --name "olt-polling-server"
   ```

### VPS Shows Offline in Dashboard

1. Check Nginx proxy configuration is correct
2. Test: `curl https://olt.isppoint.com/olt-polling-server/status`
3. Check CORS headers are being sent

### SSL Certificate Issues

1. In aaPanel, go to SSL and renew Let's Encrypt
2. Ensure both HTTP and HTTPS are configured
3. Force HTTPS redirect is enabled

### 502 Bad Gateway

The Node.js server is not running:
```bash
pm2 status
pm2 restart olt-polling-server
```

### CORS Errors in Browser

Add CORS headers to Nginx config as shown in Part 2.

---

## Quick Fix Commands

```bash
# Complete restart sequence
cd /www/wwwroot/olt.isppoint.com/olt-polling-server
pm2 delete all
npm install
pm2 start src/index.js --name "olt-polling-server"
pm2 save
nginx -t && nginx -s reload

# Test
curl https://olt.isppoint.com/olt-polling-server/health
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   OLT Devices   │────▶│  Polling Server  │────▶│  Supabase   │
│ (VSOL, ZTE...)  │     │  :3001 (Node.js) │     │  Database   │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               ▲
                               │
┌─────────────────┐     ┌──────────────────┐     
│   Your Browser  │────▶│     Nginx        │
│    (HTTPS)      │     │  :443 → :3001    │
└─────────────────┘     └──────────────────┘
```

All traffic goes through Nginx on port 443 (HTTPS), which proxies `/olt-polling-server/` requests to the Node.js server on port 3001.
