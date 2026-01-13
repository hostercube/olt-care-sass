# Custom Domain SSL Setup Guide

## 🔥 Production-Grade Auto SSL System

This system automatically provisions **individual Let's Encrypt SSL certificates** for each tenant custom domain. No wildcard SSL, no manual Nginx editing per domain.

---

## 📋 Prerequisites

Before running the setup:

1. **VPS with Nginx** installed
2. **Root/sudo access**
3. **DNS pointed** to your server IP for main domain
4. **Node.js 18+** installed

---

## 🚀 One-Time VPS Setup

SSH into your VPS and run these commands:

```bash
# =============================================
# STEP 1: Install Certbot (Let's Encrypt)
# =============================================
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version

# =============================================
# STEP 2: Create ACME Challenge Directory
# =============================================
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# =============================================
# STEP 3: Update Nginx Main Config
# =============================================
# Add ACME challenge location to your main site config
# This allows Certbot to verify domain ownership

sudo nano /etc/nginx/sites-available/oltapp.isppoint.com
```

**Add this location block BEFORE other location blocks:**

```nginx
# Add this inside the server block (before other locations)
location /.well-known/acme-challenge/ {
    root /var/www/html;
    allow all;
}
```

**IMPORTANT: Remove the catch-all block** (server_name _;) if you have one.

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# =============================================
# STEP 4: Update Backend Environment
# =============================================
cd /var/www/oltapp.isppoint.com/olt-polling-server

# Copy production env (if not exists)
cp .env.production .env

# Edit with correct values
nano .env
```

**Required .env variables:**

```env
# Supabase
SUPABASE_URL=https://kpcmlbztpztrxdwlfhfw.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# SSL Configuration
CERTBOT_EMAIL=hostercube@gmail.com
CERTBOT_PATH=/usr/bin/certbot
CERTBOT_WEBROOT=/var/www/html
NGINX_SITES_AVAILABLE=/etc/nginx/sites-available
NGINX_SITES_ENABLED=/etc/nginx/sites-enabled
FRONTEND_ROOT=/var/www/oltapp.isppoint.com/dist
OLT_SERVER_ROOT=/var/www/oltapp.isppoint.com/olt-polling-server
BACKEND_PROXY_HOST=127.0.0.1
BACKEND_PROXY_PORT=3001
```

```bash
# =============================================
# STEP 5: Install Dependencies & Restart
# =============================================
npm install
pm2 restart olt-polling-server

# Check logs
pm2 logs olt-polling-server --lines 20
```

---

## ⚙️ Super Admin Configuration

1. Login to Super Admin panel
2. Go to **Settings → Infrastructure**
3. Set **Custom Domain Server IP**: `YOUR_VPS_IP` (e.g., `103.123.45.67`)
4. Save settings

---

## 🌐 How Tenants Add Custom Domains

### Step 1: Add Domain
Tenant goes to **ISP Dashboard → Website → Custom Domain** and enters their domain (e.g., `isp.example.com`)

### Step 2: Configure DNS
At their domain registrar, add:
```
Type: A
Name: isp (or @ for root domain)
Value: YOUR_VPS_IP
```

### Step 3: Verify DNS
Click **Verify DNS** button. System checks if A record points to server.

### Step 4: Issue SSL
Click **Issue SSL Certificate**. System automatically:
1. Creates Nginx config for the domain
2. Issues Let's Encrypt certificate
3. Updates config with SSL
4. Reloads Nginx

**Done!** Domain is live with HTTPS.

---

## 🔧 Troubleshooting

### Check SSL Provisioning Logs
```bash
pm2 logs olt-polling-server --lines 100 | grep -i "ssl\|certbot\|nginx"
```

### Manually Test Certbot
```bash
sudo certbot certonly --webroot -w /var/www/html -d test.example.com --dry-run
```

### Check Nginx Config for a Domain
```bash
cat /etc/nginx/sites-available/tenant-example-com.conf
```

### Reload Nginx Manually
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Check Certificate Status
```bash
sudo certbot certificates
```

---

## 📁 File Structure

When a tenant adds domain `isp.example.com`:

```
/etc/nginx/sites-available/
└── tenant-isp-example-com.conf    # Auto-generated Nginx config

/etc/nginx/sites-enabled/
└── tenant-isp-example-com.conf    # Symlink to above

/etc/letsencrypt/live/isp.example.com/
├── fullchain.pem                  # SSL certificate
└── privkey.pem                    # Private key
```

---

## 🔒 Security Notes

1. **No wildcard SSL** - Each domain has its own certificate
2. **Auto-renewal** - Certbot renews certificates automatically
3. **Isolated configs** - Each tenant gets separate Nginx config
4. **No browser warnings** - Fully trusted Let's Encrypt certificates

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs olt-polling-server`
2. Check Nginx error log: `tail -f /var/log/nginx/error.log`
3. Verify DNS propagation: `dig +short isp.example.com A`
