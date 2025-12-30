# OLTCare - Ubuntu 24.04 LTS Complete Deployment Guide

এই গাইড আপনাকে OLTCare সম্পূর্ণভাবে Ubuntu 24.04 সার্ভারে deploy করতে সাহায্য করবে।

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Initial Setup](#server-initial-setup)
3. [Supabase Database Setup](#supabase-database-setup)
4. [Frontend Deployment](#frontend-deployment)
5. [Polling Server Setup](#polling-server-setup)
6. [Nginx Configuration with SSL](#nginx-configuration-with-ssl)
7. [PM2 Process Management](#pm2-process-management)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- Ubuntu 24.04 LTS Server
- Domain name pointing to server (e.g., `olt.yourdomain.com`)
- Supabase account (free or paid)
- Root/sudo access

### Server Requirements
- RAM: Minimum 1GB (2GB recommended)
- Storage: 10GB+
- Open Ports: 80, 443, 22

---

## Server Initial Setup

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3: Install PM2 Globally
```bash
sudo npm install -g pm2
```

### Step 4: Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Step 5: Install Certbot for SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 6: Configure Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

---

## Supabase Database Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your **Project URL** and **Service Role Key**

### Step 2: Run Database Schema
Go to SQL Editor in Supabase and run this complete schema:

```sql
-- Create ENUMs
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE public.olt_brand AS ENUM ('ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'Other', 'DBC', 'CDATA', 'ECOM');
CREATE TYPE public.olt_mode AS ENUM ('EPON', 'GPON');
CREATE TYPE public.connection_status AS ENUM ('online', 'offline', 'warning', 'unknown');
CREATE TYPE public.alert_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE public.alert_type AS ENUM ('onu_offline', 'power_drop', 'olt_unreachable', 'high_latency');

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'operator',
    UNIQUE(user_id, role)
);

-- OLTs table
CREATE TABLE public.olts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    brand olt_brand NOT NULL,
    olt_mode olt_mode DEFAULT 'GPON',
    status connection_status DEFAULT 'unknown',
    total_ports INTEGER DEFAULT 8,
    active_ports INTEGER DEFAULT 0,
    last_polled TIMESTAMPTZ,
    mikrotik_ip TEXT,
    mikrotik_port INTEGER DEFAULT 8728,
    mikrotik_username TEXT,
    mikrotik_password_encrypted TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ONUs table
CREATE TABLE public.onus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES public.olts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serial_number TEXT,
    mac_address TEXT,
    pon_port TEXT NOT NULL,
    onu_index INTEGER NOT NULL,
    status connection_status DEFAULT 'unknown',
    rx_power NUMERIC,
    tx_power NUMERIC,
    pppoe_username TEXT,
    router_name TEXT,
    last_online TIMESTAMPTZ,
    last_offline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    device_id UUID,
    device_name TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Power readings table
CREATE TABLE public.power_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onu_id UUID NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
    rx_power NUMERIC NOT NULL,
    tx_power NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- System settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'))
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operator')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_olts_updated_at
    BEFORE UPDATE ON public.olts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onus_updated_at
    BEFORE UPDATE ON public.onus
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- OLTs
CREATE POLICY "Authenticated users can view OLTs" ON public.olts FOR SELECT USING (is_authenticated());
CREATE POLICY "Operators and admins can insert OLTs" ON public.olts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators and admins can update OLTs" ON public.olts FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));
CREATE POLICY "Admins can delete OLTs" ON public.olts FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ONUs
CREATE POLICY "Authenticated users can view ONUs" ON public.onus FOR SELECT USING (is_authenticated());
CREATE POLICY "Operators and admins can manage ONUs" ON public.onus FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Alerts
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT USING (is_authenticated());
CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE USING (is_authenticated());
CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);

-- Power Readings
CREATE POLICY "Authenticated users can view power readings" ON public.power_readings FOR SELECT USING (is_authenticated());
CREATE POLICY "System can insert power readings" ON public.power_readings FOR INSERT WITH CHECK (true);

-- System Settings
CREATE POLICY "Authenticated users can view settings" ON public.system_settings FOR SELECT USING (is_authenticated());
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### Step 3: Configure Auth Settings
In Supabase Dashboard → Authentication → Settings:
- Enable "Confirm email" → **OFF** (for development)
- Or keep it ON for production

---

## Frontend Deployment

### Step 1: Create Project Directory
```bash
sudo mkdir -p /var/www/olt.yourdomain.com
sudo chown -R $USER:$USER /var/www/olt.yourdomain.com
```

### Step 2: Upload Project Files
Upload your project to `/var/www/olt.yourdomain.com/`

### Step 3: Create Environment File
```bash
cd /var/www/olt.yourdomain.com
nano .env
```

Add your Supabase credentials:
```env
VITE_POLLING_SERVER_URL="https://olt.yourdomain.com/api"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

### Step 4: Build Frontend
```bash
npm install
npm run build
```

The built files will be in `dist/` folder.

---

## Polling Server Setup

### Step 1: Navigate to Polling Server
```bash
cd /var/www/olt.yourdomain.com/olt-polling-server
```

### Step 2: Create Environment File
```bash
cp .env.example .env
nano .env
```

**⚠️ IMPORTANT: Fill in your actual Supabase credentials!**

```env
# Supabase Configuration (REQUIRED!)
# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-key

# Polling Configuration  
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
MIKROTIK_TIMEOUT_MS=30000

# Server Configuration
PORT=3001
NODE_ENV=production

# Debug (set to true for verbose logging)
DEBUG=false
```

**Where to find your Supabase keys:**
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Click "Project Settings" (gear icon)
3. Click "API" in the sidebar
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role (secret)** → `SUPABASE_SERVICE_KEY`

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Create Logs Directory
```bash
mkdir -p logs
```

### Step 5: Verify .env is Correct
```bash
cat .env | grep SUPABASE
# Should show your actual Supabase URL and key (not placeholder values!)
```

### Step 6: Test Manually
```bash
node src/index.js
```
If it starts without errors (should show "OLT Polling Server running on port 3001"), press `Ctrl+C` to stop.

---

## Nginx Configuration with SSL

### Step 1: Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/olt.yourdomain.com
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name olt.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name olt.yourdomain.com;

    # SSL will be configured by Certbot
    # ssl_certificate /etc/letsencrypt/live/olt.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/olt.yourdomain.com/privkey.pem;

    # Frontend (React/Vite)
    root /var/www/olt.yourdomain.com/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API (Node.js Polling Server)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### Step 2: Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/olt.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Get SSL Certificate
```bash
sudo certbot --nginx -d olt.yourdomain.com
```
Follow the prompts. Certbot will automatically configure SSL.

### Step 4: Auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## PM2 Process Management

### Step 1: Start Polling Server with PM2
```bash
cd /var/www/olt.yourdomain.com/olt-polling-server
pm2 start ecosystem.config.cjs
```

### Step 2: Save PM2 Configuration
```bash
pm2 save
```

### Step 3: Enable PM2 Startup
```bash
pm2 startup
```
Run the command it outputs (with sudo).

### Step 4: Verify Status
```bash
pm2 status
pm2 logs olt-polling-server
```

---

## Verify Everything is Working

### Step 1: Test Polling Server Health
```bash
curl http://127.0.0.1:3001/health
# Should return: {"status":"healthy","uptime":...}
```

### Step 2: Test Through Nginx
```bash
curl https://olt.yourdomain.com/api/health
# Should return: {"status":"healthy","uptime":...}
```

### Step 3: Check PM2 Status
```bash
pm2 status
# Should show: olt-polling-server | online
```

---

## Troubleshooting

### ❌ Error: "supabaseUrl is required"
**Cause:** The `.env` file is missing, has wrong values, OR the environment variables are not loading properly.

**CRITICAL FIX - Follow these steps exactly:**

```bash
# Step 1: Go to polling server directory
cd /var/www/olt.isppoint.com/olt-polling-server

# Step 2: Pull the latest code (if using git)
git pull origin main

# Step 3: Check your .env file exists and has correct content
cat .env

# Step 4: Your .env file MUST have these exact keys (with YOUR values):
# SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
# SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-full-key

# Step 5: If .env is wrong/missing, create it:
nano .env

# Step 6: Add these lines (replace with YOUR actual values):
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.your-signature
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
MIKROTIK_TIMEOUT_MS=30000
PORT=3001
NODE_ENV=production
DEBUG=false

# Step 7: Save and exit (Ctrl+X, Y, Enter)

# Step 8: Create logs directory
mkdir -p logs

# Step 9: Delete old PM2 process and restart fresh
pm2 delete olt-polling-server
pm2 start ecosystem.config.cjs

# Step 10: Check logs for errors
pm2 logs olt-polling-server --lines 30

# Step 11: Test health endpoint
curl http://127.0.0.1:3001/health
```

**If still getting the error, test manually:**
```bash
cd /var/www/olt.isppoint.com/olt-polling-server
node src/index.js
# This will show detailed error messages
```
```

### ❌ Error: "301 Moved Permanently" when testing API
**Cause:** Nginx is redirecting HTTP to HTTPS.

**Fix:** Use `https://` or test locally:
```bash
# Test directly (bypassing nginx)
curl http://127.0.0.1:3001/health

# Or use https
curl https://olt.yourdomain.com/api/health
```

### ❌ Connection Test Returns HTML/JSON Error
**Cause:** Polling server not running or wrong URL.

**Fix:**
```bash
# Check if server is running
pm2 status

# If errored, check logs
pm2 logs olt-polling-server --lines 50

# Restart
pm2 restart olt-polling-server
```

### PM2 Shows "errored"
```bash
# Check logs
pm2 logs olt-polling-server --lines 50

# Common fixes:
cd /var/www/olt.yourdomain.com/olt-polling-server
rm -rf node_modules
npm install
pm2 restart olt-polling-server
```

### VPS Shows Offline in Dashboard
1. Check if polling server is running:
```bash
curl http://localhost:3001/health
```

2. Check Nginx proxy:
```bash
curl https://olt.yourdomain.com/api/health
```

3. Check .env file has correct Supabase credentials

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates
```

### 502 Bad Gateway
```bash
# Check if Node.js is running
pm2 status

# Restart if needed
pm2 restart olt-polling-server

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues
```bash
sudo chown -R $USER:$USER /var/www/olt.yourdomain.com
chmod -R 755 /var/www/olt.yourdomain.com
```

---

## Quick Reference Commands

```bash
# PM2 Commands
pm2 status                        # Check status
pm2 logs olt-polling-server       # View logs
pm2 restart olt-polling-server    # Restart
pm2 stop olt-polling-server       # Stop
pm2 delete olt-polling-server     # Remove

# Nginx Commands
sudo nginx -t                     # Test config
sudo systemctl reload nginx       # Reload
sudo systemctl restart nginx      # Restart

# SSL Commands
sudo certbot renew               # Renew SSL
sudo certbot certificates        # List certificates

# Rebuild Frontend
cd /var/www/olt.yourdomain.com
npm run build
```

---

## Supported OLT Brands

| Brand | Protocol | Default Port | Support Level |
|-------|----------|--------------|---------------|
| ZTE | SSH | 22 | Full |
| Huawei | SSH | 22 | Full |
| VSOL | SSH/HTTP | 22/80 | Full |
| Fiberhome | SSH | 22 | Full |
| BDCOM | SSH | 22 | Partial |
| Nokia | SSH | 22 | Partial |
| DBC | HTTP | 80 | Full |
| CDATA | HTTP | 80 | Full |
| ECOM | HTTP | 80 | Full |

---

## First Admin Setup

1. Register a new account at `https://olt.yourdomain.com`
2. Run this SQL in Supabase to make yourself admin:

```sql
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

---

## Architecture

```
                    ┌──────────────────┐
                    │   OLT Devices    │
                    │ (SSH/HTTP/Telnet)│
                    └────────┬─────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────┐
│                 Ubuntu 24.04 Server                │
│  ┌──────────────────────────────────────────────┐  │
│  │              Nginx (Port 80/443)             │  │
│  │    SSL Termination + Reverse Proxy           │  │
│  └──────────────┬───────────────┬───────────────┘  │
│                 │               │                  │
│       ┌─────────▼──────┐   ┌────▼────────────┐    │
│       │   Frontend     │   │ Polling Server  │    │
│       │   (React)      │   │ (Node.js:3001)  │    │
│       │   /dist        │   │ /api/*          │    │
│       └────────────────┘   └────────┬────────┘    │
│                                     │             │
└─────────────────────────────────────┼─────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │    Supabase Cloud     │
                          │   (Database + Auth)   │
                          └───────────────────────┘
```

---

**Created for OLTCare v1.0**
**Last Updated: December 2024**
