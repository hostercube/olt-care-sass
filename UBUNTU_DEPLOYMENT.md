# OLT Monitoring System - Ubuntu VPS Deployment Guide

## Quick Update Commands

```bash
cd /var/www/olt.isppoint.com

# Pull latest code from GitHub
git pull origin main

# Build frontend
npm run build

# Restart polling server
cd olt-polling-server
npm install
pm2 restart olt-polling-server

# Check status
pm2 logs olt-polling-server --lines 30
```

---

## Connection Types

| Port | Protocol | Brands |
|------|----------|--------|
| 22 | SSH | ZTE, Huawei, Nokia |
| 23 | Telnet | VSOL, DBC, CDATA, ECOM, BDCOM, Fiberhome |
| 80, 443, 8080 | HTTP API | Any with web interface |
| Custom | Auto-detect | Based on brand |

---

## Initial Setup

### 1. Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

### 2. Clone Repository
```bash
sudo mkdir -p /var/www/olt.isppoint.com
sudo chown -R $USER:$USER /var/www/olt.isppoint.com
cd /var/www
git clone https://github.com/YOUR_REPO/olt.isppoint.com.git
cd olt.isppoint.com
```

### 3. Configure Frontend
```bash
npm install
npm run build
```

### 4. Configure Polling Server
```bash
cd olt-polling-server
cp .env.example .env
nano .env
```

Edit `.env`:
```
SUPABASE_URL=https://qsewotfkllgthwwnuyot.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=3001
POLLING_INTERVAL_MS=60000
```

```bash
npm install
mkdir -p logs
```

### 5. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/olt.isppoint.com
```

```nginx
server {
    listen 80;
    server_name olt.isppoint.com;
    root /var/www/olt.isppoint.com/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/olt.isppoint.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d olt.isppoint.com
```

---

## Troubleshooting

### VPS Offline / Polling Server Down
```bash
pm2 status
pm2 logs olt-polling-server --lines 50
pm2 restart olt-polling-server
```

### "supabaseUrl is required" Error
```bash
cd /var/www/olt.isppoint.com/olt-polling-server
cat .env  # Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set
pm2 delete olt-polling-server
node src/index.js  # Test directly to see errors
pm2 start ecosystem.config.cjs
```

### OLT Connection Failed
1. Check port is open: `nc -zv OLT_IP PORT`
2. Verify username/password
3. Check brand-specific port:
   - VSOL/DBC/CDATA: Telnet (port 23 or custom)
   - ZTE/Huawei: SSH (port 22)

### Frontend Not Updating
```bash
cd /var/www/olt.isppoint.com
npm run build
sudo systemctl reload nginx
```

---

## Useful Commands

```bash
# View logs
pm2 logs olt-polling-server

# Restart polling server
pm2 restart olt-polling-server

# Stop polling server
pm2 stop olt-polling-server

# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```
