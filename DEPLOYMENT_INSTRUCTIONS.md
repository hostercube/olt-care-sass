# OLT Care SaaS - Deployment Instructions

## আপনার Live Server এ Deploy করার জন্য নির্দেশিকা

### Project Details
- **Frontend URL**: https://oltapp.isppoint.com
- **Backend URL**: https://oltapp.isppoint.com/olt-polling-server
- **Supabase Project**: oltcaresass (koodidvsmjfwjcgnmqox)

---

## Step 1: Frontend Deployment

### 1.1 Clone/Upload কোড

```bash
cd /var/www/oltapp.isppoint.com
```

### 1.2 Environment Setup

আপনার VPS এ `.env` ফাইল তৈরি করুন:

```bash
cp public/.env.production .env
```

অথবা manually `.env` ফাইল তৈরি করুন:

```env
VITE_SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjc5NzIsImV4cCI6MjA4Mjk0Mzk3Mn0.yPQpGWhlm6N9PzeQ4FQztK5LJmRU8BEfiSnDLHSn2Ac
VITE_SUPABASE_PROJECT_ID=koodidvsmjfwjcgnmqox
VITE_POLLING_SERVER_URL=https://oltapp.isppoint.com/olt-polling-server
```

### 1.3 Build করুন

```bash
npm install
npm run build
```

### 1.4 Nginx Configuration

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name oltapp.isppoint.com;

    # SSL Configuration (if using)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    root /var/www/oltapp.isppoint.com/dist;
    index index.html;

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend Proxy
    location /olt-polling-server/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

---

## Step 2: Backend (OLT Polling Server) Deployment

### 2.1 Navigate to Backend Directory

```bash
cd /var/www/oltapp.isppoint.com/olt-polling-server
```

### 2.2 Environment Setup

```bash
cp .env.production .env
```

অথবা manually `.env` ফাইল তৈরি করুন:

```env
SUPABASE_URL=https://koodidvsmjfwjcgnmqox.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb2RpZHZzbWpmd2pjZ25tcW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2Nzk3MiwiZXhwIjoyMDgyOTQzOTcyfQ.VOOCGUxPyLMQP4E-f--72bsql-BLVAXUNcbrUXFqyZs
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
MIKROTIK_TIMEOUT_MS=30000
API_TIMEOUT_MS=30000
PORT=3001
NODE_ENV=production
DEBUG=false
```

### 2.3 Install Dependencies এবং Start

```bash
npm install
npm install -g pm2

# PM2 দিয়ে চালান
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Step 3: Supabase Database Setup

আপনার Supabase project এ SQL Editor এ এই SQL রান করুন:

### 3.1 Tables তৈরি করুন

আপনার `COMPLETE_DATABASE_SCHEMA.sql` ফাইলের SQL Supabase SQL Editor এ রান করুন।

### 3.2 Super Admin User তৈরি করুন

প্রথমে আপনার app এ signup করুন, তারপর এই SQL রান করুন:

```sql
-- আপনার email দিয়ে replace করুন
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'your-admin-email@example.com';
```

---

## Step 4: Verification

1. **Frontend**: https://oltapp.isppoint.com এ যান
2. **Backend Health Check**: https://oltapp.isppoint.com/olt-polling-server/health
3. **Login**: আপনার super admin credentials দিয়ে login করুন

---

## Important Notes

⚠️ **Security Warning**: 
- Service role key কখনো public করবেন না
- `.env` files `.gitignore` এ আছে তা নিশ্চিত করুন

📝 **Supabase Credentials**:
- Project ID: `koodidvsmjfwjcgnmqox`
- Project URL: `https://koodidvsmjfwjcgnmqox.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (public/.env.production এ আছে)
- Service Role: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (olt-polling-server/.env.production এ আছে)

---

## Troubleshooting

### Backend না চললে
```bash
pm2 logs olt-polling-server
pm2 restart olt-polling-server
```

### Frontend build error
```bash
rm -rf node_modules
npm install
npm run build
```

### Database connection error
Supabase dashboard এ গিয়ে RLS policies check করুন।
