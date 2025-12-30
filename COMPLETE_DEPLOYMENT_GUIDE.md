# OLTCare Complete Deployment Guide (HTTPS/SSL)

This guide provides step-by-step instructions for deploying OLTCare with HTTPS/SSL support.

## Prerequisites

- Node.js 18+ installed
- Access to aaPanel
- Supabase project configured
- Domain with SSL certificate: `olt.isppoint.com`

---

## Part 1: Polling Server Fix (PM2 Errored Status)

Your PM2 processes are showing "errored" status. Follow these steps to fix:

### Step 1: Stop All PM2 Processes

```bash
pm2 delete all
```

### Step 2: Create Proper `.env` File

```bash
cd /www/wwwroot/olt.isppoint.com/olt-polling-server
nano .env
```

Add this content:

```env
# Supabase Configuration
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs

# Polling Configuration
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
MIKROTIK_TIMEOUT_MS=30000

# Server Configuration
PORT=3001
NODE_ENV=production

# Debug
DEBUG=false
```

### Step 3: Install Dependencies

```bash
cd /www/wwwroot/olt.isppoint.com/olt-polling-server
npm install
```

### Step 4: Test Server Manually First

```bash
# Run directly to see any errors
node src/index.js
```

If you see "OLT Polling Server running on port 3001", the server works. Press Ctrl+C to stop.

### Step 5: Start with PM2

```bash
# Start the polling server
pm2 start src/index.js --name "olt-polling-server"

# Check status
pm2 status

# View logs if there are issues
pm2 logs olt-polling-server --lines 50

# Save and enable startup
pm2 save
pm2 startup
```

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
