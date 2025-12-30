# OLTCare Complete Deployment Guide

This guide provides step-by-step instructions for deploying OLTCare to your own server (cPanel/aaPanel).

## Prerequisites

- Node.js 18+ installed on your local machine
- Access to cPanel or aaPanel
- Your own Supabase project (already configured)
- VPS with polling server running

---

## Part 1: Your Supabase Configuration

Your Supabase credentials are already configured:

```
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs
```

---

## Part 2: Frontend Deployment

### Step 1: Download Project

Download the project from Lovable using the "Export Code" feature.

### Step 2: Create `.env` File

In the project root, create a `.env` file:

```env
VITE_POLLING_SERVER_URL="https://olt.isppoint.com/olt-polling-server"
VITE_SUPABASE_PROJECT_ID="srofhdgdraihxgpmpdye"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw"
VITE_SUPABASE_URL="https://srofhdgdraihxgpmpdye.supabase.co"
```

### Step 3: Build the Project

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with all static files.

### Step 4: Upload to cPanel/aaPanel

1. **cPanel:**
   - Go to File Manager → `public_html`
   - Upload all contents from `dist/` folder
   - Delete old files first if updating

2. **aaPanel:**
   - Go to Website → Your site → Root Directory
   - Upload all contents from `dist/` folder

### Step 5: Configure Server for SPA Routing

**For Nginx (aaPanel default):**

Add to your site config:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**For Apache (cPanel):**

Create `.htaccess` in `public_html`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## Part 3: Polling Server Setup (Already Running at olt.isppoint.com)

Your polling server is already deployed. For reference, here's the configuration:

### Polling Server `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs

# Polling Configuration
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=30000

# Server Configuration
PORT=3001
NODE_ENV=production
```

### SSL/HTTPS Setup for Polling Server

Since your domain uses HTTPS, ensure the polling server is also accessible via HTTPS.

**Option A: Nginx Reverse Proxy (Recommended)**

Add to your Nginx config for `olt.isppoint.com`:

```nginx
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
    
    # CORS Headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    
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
```

**Option B: aaPanel SSL Configuration**

1. Go to Website → SSL
2. Apply for Let's Encrypt certificate
3. Enable Force HTTPS

### Running the Polling Server

```bash
cd olt-polling-server

# Install dependencies
npm install

# Run with PM2 (recommended)
pm2 start src/index.js --name "olt-polling-server"
pm2 save
pm2 startup
```

---

## Part 4: First Admin Setup

1. Visit your deployed site
2. Click "Sign Up" and create an account
3. **IMPORTANT:** The first user is automatically assigned the "admin" role

---

## Troubleshooting

### VPS Shows Offline

1. Check if polling server is running:
   ```bash
   pm2 status
   ```

2. Check if it's accessible:
   ```bash
   curl https://olt.isppoint.com/olt-polling-server/health
   ```

3. Check Nginx error logs:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

### OLT Connection Errors

1. Ensure OLT IP is publicly accessible from your VPS
2. Check port is correct (SSH: 22, Telnet: 23)
3. Verify credentials are correct
4. Check polling server logs:
   ```bash
   pm2 logs olt-polling-server
   ```

### CORS Errors

Ensure your Nginx config includes the CORS headers shown above.

### 404 on Page Refresh

Ensure your server is configured for SPA routing (see Step 5).

---

## Project Structure

```
oltcare/
├── dist/                   # Built frontend (upload this)
├── olt-polling-server/     # Polling server (run on VPS)
│   ├── src/
│   │   ├── index.js        # Main server
│   │   └── polling/        # OLT polling logic
│   ├── .env                # Server config
│   └── package.json
├── src/                    # Frontend source
├── .env                    # Frontend config
└── package.json
```

---

## Automation Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   OLT Devices   │────▶│  Polling Server  │────▶│  Supabase   │
│ (VSOL, ZTE...)  │     │  (Your VPS)      │     │  Database   │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                                        │
┌─────────────────┐     ┌──────────────────┐           │
│   MikroTik      │────▶│  Polling Server  │───────────┤
│   Routers       │     │  (PPPoE Data)    │           │
└─────────────────┘     └──────────────────┘           │
                                                        ▼
                        ┌──────────────────┐     ┌─────────────┐
                        │   Your Browser   │◀───▶│  Dashboard  │
                        │                  │     │  (Frontend) │
                        └──────────────────┘     └─────────────┘
```

---

## Support

For issues, check:
1. Polling server logs: `pm2 logs`
2. Browser console for frontend errors
3. Supabase logs in your Supabase dashboard
