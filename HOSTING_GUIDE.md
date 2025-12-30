# OLT Manager - Complete Hosting & Deployment Guide

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Requirements](#system-requirements)
3. [Frontend Deployment (aaPanel/cPanel)](#frontend-deployment)
4. [VPS Polling Server Setup](#vps-polling-server-setup)
5. [Database Configuration](#database-configuration)
6. [Environment Variables](#environment-variables)
7. [Updating the Application](#updating-the-application)
8. [Troubleshooting](#troubleshooting)

---

## 📦 Project Overview

This project consists of TWO parts:

### Part 1: Frontend (React App)
- Built with React, Vite, TypeScript, Tailwind CSS
- Connects to Supabase (Lovable Cloud) for database
- Deploy to any static hosting (aaPanel, cPanel, Netlify, etc.)

### Part 2: Backend Polling Server (Node.js)
- Located in `olt-polling-server/` folder
- Runs on your VPS
- Polls OLTs via SSH/Telnet
- Updates database in real-time

---

## 💻 System Requirements

### Frontend Hosting (aaPanel/cPanel)
- Node.js 18+ (for building)
- Static file hosting
- HTTPS recommended

### VPS Polling Server
- Ubuntu 20.04+ or similar Linux
- Node.js 18+
- PM2 (process manager)
- Network access to OLTs (ports: 22, 23, 443, 8041, 8728)

---

## 🚀 Frontend Deployment (aaPanel/cPanel)

### Step 1: Build the Project

On your local machine or in Lovable:

```bash
# Download/export the project from Lovable
# Then run:
npm install
npm run build
```

This creates a `dist/` folder with the production build.

### Step 2: Upload to Hosting

1. **aaPanel/cPanel:**
   - Go to File Manager
   - Navigate to `public_html` or your domain folder
   - Upload ALL contents of the `dist/` folder
   - NOT the `dist` folder itself, just its contents

2. **File structure should be:**
   ```
   public_html/
   ├── index.html
   ├── assets/
   │   ├── index-xxxxx.js
   │   ├── index-xxxxx.css
   │   └── ...
   └── robots.txt
   ```

### Step 3: Configure SPA Routing

Create `.htaccess` file in `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

### Step 4: Set Environment Variables

Create a `.env` file BEFORE building, or set in aaPanel:

```env
VITE_SUPABASE_URL=https://qsewotfkllgthwwnuyot.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_POLLING_SERVER_URL=http://YOUR_VPS_IP:3001
```

**Important:** Replace `YOUR_VPS_IP` with your actual VPS IP address.

---

## 🖥️ VPS Polling Server Setup

### Step 1: Prepare the VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Verify installations
node -v  # Should show v18.x or higher
npm -v
pm2 -v
```

### Step 2: Upload Polling Server

1. Upload the `olt-polling-server/` folder to your VPS
2. Recommended location: `/home/your-user/olt-polling-server/`

```bash
# Or clone/copy from your local machine
scp -r olt-polling-server/ user@your-vps-ip:/home/user/
```

### Step 3: Configure Environment

```bash
cd /home/your-user/olt-polling-server

# Create .env file
nano .env
```

Add these contents:

```env
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://qsewotfkllgthwwnuyot.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR_SERVICE_ROLE_KEY

# Polling Configuration
POLLING_INTERVAL_MS=300000
PORT=3001

# Optional: MikroTik timeout
MIKROTIK_TIMEOUT_MS=10000
```

**⚠️ Get your SUPABASE_SERVICE_KEY:**
- Go to Lovable → Cloud → Settings
- Or check your Supabase project settings

### Step 4: Install Dependencies & Start

```bash
cd /home/your-user/olt-polling-server

# Install dependencies
npm install

# Start with PM2
pm2 start src/index.js --name olt-poller

# Enable auto-start on reboot
pm2 startup
pm2 save

# View logs
pm2 logs olt-poller
```

### Step 5: Open Firewall Ports

```bash
# Allow port 3001 for API access
sudo ufw allow 3001

# Verify
sudo ufw status
```

---

## 🗄️ Database Configuration

### Required SQL for New Supabase Projects

If you're using your OWN Supabase project, run this SQL in the SQL Editor to set up user roles:

```sql
-- Create a function to automatically create profile and assign role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default 'operator' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add any existing users without roles (run this once)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'operator'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT DO NOTHING;

-- Add any existing users without profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'User')
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### Existing Tables (Already Created)

The following tables already exist in your database:

| Table | Description |
|-------|-------------|
| `olts` | OLT devices configuration |
| `onus` | ONU device data from polling |
| `alerts` | System alerts and notifications |
| `power_readings` | Historical power data |
| `profiles` | User profiles |
| `user_roles` | User permissions |
| `system_settings` | App configuration |

### Table Schema Reference

**olts table:**
- id, name, ip_address, port, username, password_encrypted
- brand, status, total_ports, active_ports, olt_mode
- mikrotik_ip, mikrotik_port, mikrotik_username, mikrotik_password_encrypted
- last_polled, created_at, updated_at

**onus table:**
- id, olt_id, name, pon_port, onu_index
- status, rx_power, tx_power
- mac_address, serial_number, pppoe_username, router_name
- last_online, last_offline, created_at, updated_at

**power_readings table:**
- id, onu_id, rx_power, tx_power, recorded_at

---

## 🔐 Environment Variables Reference

### Frontend (.env)

```env
# Required
VITE_SUPABASE_URL=https://qsewotfkllgthwwnuyot.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# VPS Polling Server URL (for Poll Now button)
VITE_POLLING_SERVER_URL=http://YOUR_VPS_IP:3001
```

### Polling Server (.env)

```env
# Required
SUPABASE_URL=https://qsewotfkllgthwwnuyot.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Optional
POLLING_INTERVAL_MS=300000  # 5 minutes
PORT=3001
MIKROTIK_TIMEOUT_MS=10000
```

---

## 🔄 Updating the Application

### When You Make Changes in Lovable:

#### Frontend Updates (UI changes):

```bash
# 1. Download/export updated code from Lovable

# 2. Build locally
npm install
npm run build

# 3. Upload dist/ contents to public_html
# Delete old files first, then upload new ones

# 4. Clear browser cache and refresh
```

#### Polling Server Updates:

```bash
# 1. Upload new olt-polling-server/ files to VPS

# 2. SSH to VPS
ssh user@your-vps-ip

# 3. Update and restart
cd /home/your-user/olt-polling-server
npm install
pm2 restart olt-poller

# 4. Check logs
pm2 logs olt-poller
```

### Quick Update Checklist:

- [ ] Download updated code from Lovable
- [ ] Run `npm install` and `npm run build`
- [ ] Upload `dist/` contents to hosting
- [ ] If polling server changed, upload and restart PM2
- [ ] Clear browser cache
- [ ] Test the application

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "VPS Offline" Status in Dashboard
```bash
# Check if polling server is running
pm2 status

# Check logs for errors
pm2 logs olt-poller

# Verify environment variables
cat /home/your-user/olt-polling-server/.env
```

#### 2. No ONU Data Showing
- Verify OLT credentials are correct
- Check VPS can reach OLT IP addresses
- Review polling server logs: `pm2 logs olt-poller`
- Ensure SUPABASE_SERVICE_KEY is correct

#### 3. Connection Test Fails
- Check OLT is reachable from VPS: `telnet OLT_IP PORT`
- Verify correct port (22=SSH, 23=Telnet, 8041=HTTP API)
- Check firewall on VPS allows outbound connections

#### 4. 404 Error on Page Refresh
- Create/fix `.htaccess` file (see Frontend Deployment Step 3)
- For Nginx, add: `try_files $uri /index.html;`

#### 5. CORS Errors
- Ensure polling server has CORS enabled (already configured)
- Check VITE_POLLING_SERVER_URL is correct

### Useful Commands

```bash
# PM2 Commands
pm2 status           # Check all processes
pm2 logs olt-poller  # View logs
pm2 restart olt-poller  # Restart
pm2 stop olt-poller  # Stop
pm2 delete olt-poller  # Remove

# Network Testing
curl http://localhost:3001/api/status  # Test API locally
telnet OLT_IP 23     # Test OLT connection
ping OLT_IP          # Test network

# Logs
tail -f /var/log/syslog  # System logs
journalctl -u pm2-user   # PM2 service logs
```

---

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs olt-poller`
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Test OLT connectivity from VPS

---

## ✅ Final Checklist

- [ ] Frontend built and uploaded to hosting
- [ ] `.htaccess` created for SPA routing
- [ ] VPS has Node.js 18+ and PM2 installed
- [ ] Polling server uploaded and configured
- [ ] Environment variables set (both frontend and VPS)
- [ ] PM2 process running and saved
- [ ] Firewall allows port 3001
- [ ] Application accessible and functioning
