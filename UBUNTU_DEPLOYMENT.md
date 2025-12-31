# OLT Monitoring System - Ubuntu VPS Deployment Guide

## ⚠️ IMPORTANT: Before You Start

### 1. Run Supabase Setup SQL
Before deploying, run the `supabase-setup.sql` file in your Supabase SQL Editor:
- Go to: https://supabase.com/dashboard/project/srofhdgdraihxgpmpdye/sql
- Copy the entire content of `supabase-setup.sql` and run it
- This creates all required tables with MikroTik integration columns

---

## 🚀 Quick Start (New VPS)

```bash
# 1. Install dependencies
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2

# 2. Clone repository
sudo mkdir -p /var/www/olt.isppoint.com
sudo chown -R $USER:$USER /var/www/olt.isppoint.com
cd /var/www
git clone https://github.com/YOUR_REPO/olt-monitoring.git olt.isppoint.com
cd olt.isppoint.com

# 3. Create frontend .env (YOUR Supabase credentials)
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw
VITE_POLLING_SERVER_URL=https://olt.isppoint.com/olt-polling-server
EOF

# 4. Install & build frontend
npm install
npm run build

# 5. Configure polling server .env
cd olt-polling-server
cat > .env << 'EOF'
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs
PORT=3001
NODE_ENV=production
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
API_TIMEOUT_MS=30000
EOF

# 6. Start polling server
npm install
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 📡 Connection Types by Port

| Port | Protocol | Use For | Brands |
|------|----------|---------|--------|
| 22 | SSH | CLI access | ZTE, Huawei, Nokia |
| 23 | Telnet | CLI access | VSOL, DBC, CDATA, ECOM, BDCOM, Fiberhome |
| 161 | SNMP | Status monitoring | All (read-only) |
| 80/443/8080 | HTTP API | Web interface | Any with web API |
| Custom (8085, 2323) | Auto-Detect | Telnet first for Chinese brands | VSOL, DBC, CDATA, ECOM |

### Auto-Detection Logic:
- **Port 22** → SSH only
- **Port 23** → Telnet only
- **Port 161** → SNMP only
- **Port 80/443/8080** → HTTP API only
- **Custom ports for VSOL/DBC/CDATA/ECOM/BDCOM** → Telnet first, fallback to SSH
- **Custom ports for ZTE/Huawei/Nokia** → SSH first, fallback to Telnet
- **Other brands on custom ports** → Auto-detect: Telnet → SSH → HTTP

---

## 🔧 Update Commands (Existing VPS)

```bash
cd /var/www/olt.isppoint.com

# Pull latest code
git pull origin main

# Rebuild frontend
npm run build

# Update polling server
cd olt-polling-server
npm install
pm2 restart olt-polling-server

# View logs
pm2 logs olt-polling-server --lines 30
```

---

## ⚙️ Configuration Files

### Backend: `olt-polling-server/.env`
```bash
# YOUR Supabase Project (from supabase.com dashboard)
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs

# Server
PORT=3001
NODE_ENV=production

# Polling
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
API_TIMEOUT_MS=30000
```

### Frontend: `.env` (for VPS build)
Create this file in your project root before running `npm run build`:
```bash
VITE_SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw
VITE_POLLING_SERVER_URL=https://olt.isppoint.com/olt-polling-server
```

---

## 🌐 Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/olt.isppoint.com
```

```nginx
server {
    listen 80;
    server_name olt.isppoint.com;
    root /var/www/olt.isppoint.com/dist;
    index index.html;

    # Frontend (React SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend Polling Server
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/olt.isppoint.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d olt.isppoint.com
```

---

## 🔍 Troubleshooting

### VPS Status / Polling Server Down
```bash
pm2 status
pm2 logs olt-polling-server --lines 50
pm2 restart olt-polling-server
```

### "supabaseUrl is required" Error
```bash
cd /var/www/olt.isppoint.com/olt-polling-server
cat .env  # Check SUPABASE_URL and SUPABASE_SERVICE_KEY
pm2 delete olt-polling-server
node src/index.js  # Test directly to see errors
pm2 start ecosystem.config.cjs
```

### OLT Connection Failed
```bash
# 1. Check port is open
nc -zv OLT_IP PORT

# 2. Test Telnet manually
telnet OLT_IP 23
telnet OLT_IP 8085

# 3. Test SSH manually
ssh -p 22 admin@OLT_IP

# 4. Check brand/port mapping:
# - VSOL, DBC, CDATA: Telnet (23 or custom like 8085)
# - ZTE, Huawei: SSH (22)
# - SNMP monitoring: Port 161
```

### Frontend Not Loading
```bash
cd /var/www/olt.isppoint.com
npm run build
sudo systemctl reload nginx
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 📁 Project Structure

```
/var/www/olt.isppoint.com/
├── dist/                    # Built frontend (served by Nginx)
├── src/                     # Frontend source code
├── olt-polling-server/      # Backend polling server
│   ├── src/
│   │   ├── index.js         # Main server entry
│   │   ├── config.js        # Environment config
│   │   ├── supabase-client.js
│   │   ├── polling/
│   │   │   ├── olt-poller.js      # Main polling logic
│   │   │   ├── telnet-client.js   # Telnet connection
│   │   │   ├── http-api-client.js # HTTP API connection
│   │   │   ├── mikrotik-client.js # MikroTik integration
│   │   │   └── parsers/           # Brand-specific parsers
│   │   └── utils/
│   │       └── logger.js
│   ├── .env                 # Server config (create from .env.example)
│   ├── ecosystem.config.cjs # PM2 config
│   └── package.json
├── supabase/                # Supabase config & edge functions
├── .env                     # Frontend env (Supabase URL)
└── UBUNTU_DEPLOYMENT.md     # This file
```

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/status` | GET | Polling status |
| `/test-connection` | POST | Test OLT/MikroTik connection |
| `/poll/:oltId` | POST | Poll specific OLT |
| `/poll-all` | POST | Poll all OLTs |

---

## 🛠️ PM2 Commands

```bash
pm2 status                     # View all processes
pm2 logs olt-polling-server    # View logs
pm2 restart olt-polling-server # Restart server
pm2 stop olt-polling-server    # Stop server
pm2 delete olt-polling-server  # Remove from PM2
pm2 save                       # Save current processes
pm2 startup                    # Enable auto-start on boot
```

---

## 🔒 Firewall (if needed)

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 📝 Adding an OLT

1. Go to **OLT Management** → **Add OLT**
2. Select **Brand** (auto-sets default port)
3. Enter **IP Address** and **Port**:
   - Port 22 = SSH
   - Port 23 = Telnet
   - Port 8085 = Custom Telnet (VSOL)
   - Port 161 = SNMP
   - Port 443 = HTTPS API
4. Enter **Username** and **Password**
5. Click **Test Connection** to verify
6. Click **Add OLT**

The system auto-detects the correct protocol based on port and brand.
