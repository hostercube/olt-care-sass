# Deployment Guide

This guide covers deploying the OLT Monitor SaaS platform to production.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- A Supabase project (provided via Lovable Cloud)
- VPS for OLT Polling Server (Ubuntu 20.04+ recommended)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Supabase      │◀────│  Polling Server │
│   (Lovable)     │     │   (Cloud DB)    │     │    (VPS)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   React SPA              PostgreSQL DB           Node.js Worker
   Tailwind CSS           Auth & RLS              Telnet/SSH/API
   Supabase SDK           Realtime                OLT Connections
```

---

## Part 1: Frontend Deployment (Lovable)

The frontend is automatically deployed via Lovable's publishing system.

### Steps:

1. Click **Publish** in the top-right of the Lovable editor
2. Choose your domain:
   - Use Lovable subdomain: `yourapp.lovable.app`
   - Or connect custom domain in Settings → Domains

### Custom Domain Setup:

1. Go to Project Settings → Domains
2. Add your domain (e.g., `monitor.yourisp.com`)
3. Configure DNS:
   ```
   Type: CNAME
   Name: monitor (or @)
   Value: [provided by Lovable]
   ```
4. Wait for SSL certificate provisioning (5-15 minutes)

---

## Part 2: Database Setup

The database is automatically provisioned via Lovable Cloud. However, you need to:

### 1. Create Super Admin User

After deploying, create the first super admin:

1. Sign up through the app at `/auth`
2. Get the user ID from Supabase:
   ```sql
   SELECT id FROM auth.users WHERE email = 'admin@example.com';
   ```
3. Assign super_admin role:
   ```sql
   UPDATE public.user_roles 
   SET role = 'super_admin' 
   WHERE user_id = '[USER_ID]';
   ```

### 2. Configure Initial Packages

Create subscription packages in the Super Admin panel (`/admin/packages`) or via SQL:

```sql
INSERT INTO public.packages (name, description, price_monthly, price_yearly, max_olts, max_users, features)
VALUES 
  ('Starter', 'For small ISPs', 999, 9990, 1, 3, '{"sms_alerts": false, "email_alerts": true}'),
  ('Professional', 'For growing ISPs', 2999, 29990, 5, 10, '{"sms_alerts": true, "email_alerts": true}'),
  ('Enterprise', 'Unlimited access', 9999, 99990, 100, 100, '{"sms_alerts": true, "email_alerts": true, "api_access": true, "white_label": true}');
```

### 3. Configure Payment Gateways

In Super Admin → Gateway Settings, configure:
- bKash, Nagad, Rocket credentials
- SSLCommerz API keys
- Manual payment instructions

---

## Part 3: OLT Polling Server Deployment

The polling server runs on a VPS to connect to OLTs via Telnet/SSH.

### Server Requirements

- Ubuntu 20.04+ or Debian 11+
- 1 CPU, 1GB RAM minimum
- Network access to OLT management IPs
- Node.js 18+

### Installation Steps

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Clone repository
git clone https://github.com/yourusername/olt-monitor.git
cd olt-monitor/olt-polling-server

# 5. Install dependencies
npm install

# 6. Create environment file
cp .env.example .env
nano .env
```

### Environment Configuration

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Polling Configuration
POLL_INTERVAL_MS=30000
POLL_TIMEOUT_MS=60000
MAX_CONCURRENT_POLLS=5

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=[YOUR_32_CHAR_HEX_KEY]

# Logging
LOG_LEVEL=info
```

### Start the Service

```bash
# Start with PM2
pm2 start ecosystem.config.cjs

# Enable startup on reboot
pm2 startup
pm2 save

# View logs
pm2 logs olt-poller
```

### Verify Operation

```bash
# Check process status
pm2 status

# Check logs
pm2 logs olt-poller --lines 50

# Monitor resources
pm2 monit
```

---

## Part 4: Security Configuration

### 1. Enable Email Confirmation (Production)

For production, enable email confirmation in Supabase:

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Confirm email"
3. Configure SMTP settings

### 2. RLS Verification

Verify all tables have proper RLS policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 3. API Key Security

- Never commit `.env` files
- Use service role key only on backend servers
- Frontend should only use anon key

### 4. Network Security

For the polling server:

```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp  # If running web interface
sudo ufw enable
```

---

## Part 5: Monitoring & Maintenance

### Health Checks

1. **Frontend**: Monitor via Lovable's built-in analytics
2. **Database**: Check Supabase dashboard for query performance
3. **Polling Server**: Use PM2 monitoring

### Log Rotation

Configure PM2 log rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Strategy

1. **Database**: Supabase handles automatic backups
2. **Configuration**: Keep `.env` and configs in secure storage
3. **Code**: Use Git for version control

### Update Procedure

```bash
# Frontend updates are automatic via Lovable

# For polling server:
cd olt-polling-server
git pull origin main
npm install
pm2 restart olt-poller
```

---

## Part 6: Scaling

### Database Scaling

Upgrade Supabase instance size in Settings → Cloud → Advanced Settings if experiencing:
- Slow queries
- Connection timeouts
- High CPU usage

### Polling Server Scaling

For many OLTs (50+), consider:

1. Increase VPS resources
2. Run multiple polling instances
3. Implement load balancing

```javascript
// ecosystem.config.cjs - Scale to 2 instances
module.exports = {
  apps: [{
    name: 'olt-poller',
    script: 'src/index.js',
    instances: 2,
    exec_mode: 'cluster'
  }]
};
```

---

## Troubleshooting

### Common Issues

**Issue: Frontend not loading**
- Check Lovable publish status
- Verify custom domain DNS

**Issue: Authentication failing**
- Check Supabase Auth settings
- Verify email confirmation settings

**Issue: OLTs not being polled**
- Check polling server logs: `pm2 logs`
- Verify network connectivity to OLTs
- Check OLT credentials

**Issue: Data not updating**
- Verify RLS policies
- Check Supabase realtime settings
- Confirm tenant_id matching

### Support Channels

- Lovable Documentation: https://docs.lovable.dev
- Supabase Documentation: https://supabase.com/docs
- GitHub Issues: [Your repository issues page]

---

## Checklist

Before going live:

- [ ] Super admin account created
- [ ] Subscription packages configured
- [ ] Payment gateways set up
- [ ] Email settings configured (production)
- [ ] Polling server running
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] RLS policies verified
- [ ] Backup strategy in place
- [ ] Monitoring configured
