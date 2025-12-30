# OLTCare Deployment Guide

## 📋 Overview
This guide will help you deploy OLTCare on your own server (aaPanel/cPanel) with your own Supabase instance.

---

## 🗄️ Part 1: Supabase Database Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save your:
   - Project URL: `https://YOUR_PROJECT_ID.supabase.co`
   - Anon Key (public)
   - Service Role Key (secret - for VPS polling server)

### Step 2: Run Database Schema
Go to Supabase Dashboard → SQL Editor → Run this complete schema:

```sql
-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE public.alert_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE public.alert_type AS ENUM ('onu_offline', 'power_drop', 'olt_unreachable', 'high_latency');
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE public.connection_status AS ENUM ('online', 'offline', 'warning', 'unknown');
CREATE TYPE public.olt_brand AS ENUM ('ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'Other');

-- =============================================
-- TABLES
-- =============================================

-- Profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL DEFAULT 'operator'::app_role,
    UNIQUE (user_id, role)
);

-- OLTs table
CREATE TABLE public.olts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand public.olt_brand NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    status public.connection_status NOT NULL DEFAULT 'unknown'::connection_status,
    last_polled TIMESTAMP WITH TIME ZONE,
    total_ports INTEGER NOT NULL DEFAULT 8,
    active_ports INTEGER NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ONUs table
CREATE TABLE public.onus (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    olt_id UUID NOT NULL REFERENCES public.olts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pon_port TEXT NOT NULL,
    onu_index INTEGER NOT NULL,
    serial_number TEXT,
    mac_address TEXT,
    router_name TEXT,
    pppoe_username TEXT,
    rx_power NUMERIC,
    tx_power NUMERIC,
    status public.connection_status NOT NULL DEFAULT 'unknown'::connection_status,
    last_online TIMESTAMP WITH TIME ZONE,
    last_offline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type public.alert_type NOT NULL,
    severity public.alert_severity NOT NULL,
    device_id UUID,
    device_name TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Power readings table (historical data)
CREATE TABLE public.power_readings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    onu_id UUID NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
    rx_power NUMERIC NOT NULL,
    tx_power NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System settings table
CREATE TABLE public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- First user gets admin role, others get operator
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update updated_at column
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

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_olts_updated_at
  BEFORE UPDATE ON public.olts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onus_updated_at
  BEFORE UPDATE ON public.onus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- OLTs policies
CREATE POLICY "Authenticated users can view OLTs" ON public.olts
  FOR SELECT USING (true);

CREATE POLICY "Operators and admins can insert OLTs" ON public.olts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators and admins can update OLTs" ON public.olts
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins can delete OLTs" ON public.olts
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ONUs policies
CREATE POLICY "Authenticated users can view ONUs" ON public.onus
  FOR SELECT USING (true);

CREATE POLICY "Operators and admins can manage ONUs" ON public.onus
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Alerts policies
CREATE POLICY "Authenticated users can view alerts" ON public.alerts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update alerts" ON public.alerts
  FOR UPDATE USING (true);

CREATE POLICY "System can insert alerts" ON public.alerts
  FOR INSERT WITH CHECK (true);

-- Power readings policies
CREATE POLICY "Authenticated users can view power readings" ON public.power_readings
  FOR SELECT USING (true);

CREATE POLICY "System can insert power readings" ON public.power_readings
  FOR INSERT WITH CHECK (true);

-- System settings policies
CREATE POLICY "Authenticated users can view settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### Step 3: Configure Auth Settings
1. Go to Supabase Dashboard → Authentication → Settings
2. Set Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `https://your-domain.com`
   - `https://your-domain.com/auth`
4. Enable "Confirm email" = OFF (for easier testing)

---

## 🌐 Part 2: Frontend Deployment (aaPanel)

### Step 1: Update Supabase Configuration
Edit `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_ANON_KEY";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

### Step 2: Build the Project
```bash
npm install
npm run build
```

### Step 3: Upload to aaPanel
1. Upload the `dist/` folder contents to your domain's public directory
2. Configure Nginx/Apache for SPA routing:

**Nginx config:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**
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

---

## 🖥️ Part 3: VPS Polling Server Setup

### Step 1: Upload Files
Upload `olt-polling-server/` folder to your VPS

### Step 2: Create .env file
```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=30000
PORT=3001
```

### Step 3: Install & Run
```bash
cd olt-polling-server
npm install
node src/index.js
```

### Step 4: Run with PM2 (recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name "olt-poller"
pm2 save
pm2 startup
```

---

## 🔑 Part 4: First Admin Setup

1. Open your website: `https://your-domain.com/auth`
2. Click "Sign Up" tab
3. Create first account (will be admin automatically):
   - Email: `admin@yourdomain.com`
   - Password: `YourSecurePassword123!`
   - Full Name: `Admin`
4. Login with these credentials

---

## 📁 Project Structure

```
your-project/
├── dist/                    # Build output (upload to web server)
├── olt-polling-server/      # VPS Node.js server
│   ├── src/
│   │   ├── index.js         # Main server
│   │   ├── polling/
│   │   │   ├── olt-poller.js
│   │   │   └── parsers/
│   │   │       ├── zte-parser.js
│   │   │       └── huawei-parser.js
│   │   └── utils/
│   │       └── logger.js
│   ├── .env                 # Your config (create this)
│   └── package.json
└── src/                     # React source code
```

---

## 🔧 Troubleshooting

### Issue: OLT shows "Unknown" status
- Make sure the polling server is running on VPS
- Check VPS can reach OLT IP via SSH
- Check polling server logs: `pm2 logs olt-poller`

### Issue: Login not working
- Check Supabase Site URL and Redirect URLs
- Make sure "Confirm email" is disabled for testing

### Issue: 404 on page refresh
- Configure SPA routing in Nginx/Apache (see above)

---

## 📞 Support

For help, check:
- Supabase docs: https://supabase.com/docs
- Node.js SSH: https://github.com/mscdex/ssh2

---

## 📝 Required Keys from Supabase

| Key | Where to Use | Where to Find |
|-----|--------------|---------------|
| Project URL | Frontend & VPS | Dashboard → Settings → API |
| Anon Key | Frontend | Dashboard → Settings → API |
| Service Role Key | VPS Only | Dashboard → Settings → API |
