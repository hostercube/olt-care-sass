# ISP Point - Full ISP Management System

A comprehensive ISP Management System combining OLT Care (GPON/EPON monitoring), MikroTik automation, billing, CRM, and customer management.

## 🌐 Production URLs

- **Frontend**: https://oltapp.isppoint.com
- **Backend API**: https://oltapp.isppoint.com/olt-polling-server
- **Supabase**: https://kpcmlbztpztrxdwlfhfw.supabase.co

## 📦 Git Repository

```bash
git clone https://github.com/hostercube/olt-care-sass.git
```

## ✨ Features

### OLT Care Module
- 🖥️ **OLT Management**: Add, edit, and monitor multiple OLT devices
- 📊 **Real-time ONU Monitoring**: Live status, power levels, temperature, distance
- 🔔 **Smart Alerts**: Automatic alerts for offline devices and power issues
- 📈 **Power History**: Track RX/TX power levels with history charts
- 🌐 **MikroTik Integration**: PPPoE username auto-matching via MAC address

### ISP Management Module
- 👥 **Customer Management**: Full CRM with ONU/Router linking
- 💰 **Billing System**: Monthly bill generation, due tracking, partial payments
- ⚡ **Billing Automation**: Auto-disable expired, auto-enable on payment
- 📦 **Package Management**: Speed/price configuration
- 🗺️ **Area Management**: Zone-based customer organization
- 👤 **Reseller System**: Sub-reseller support with commissions

### SaaS Features
- 🏢 **Multi-tenant Architecture**: Isolated tenant data
- 💳 **Payment Gateways**: SSLCommerz, bKash, Nagad, Rocket, Manual
- 📧 **Email/SMS Notifications**: Customizable templates
- 🔐 **Role-based Access**: Super Admin, Admin, Operator, Staff, Reseller

## 🔧 Supported OLT Brands

| Brand | Protocol | Support Level |
|-------|----------|---------------|
| ZTE | SSH/Telnet | Full |
| Huawei | SSH/Telnet | Full |
| VSOL | Telnet/SSH | Full (Primary) |
| Fiberhome | Telnet | Full |
| BDCOM | Telnet | Full |
| CDATA | Telnet/HTTP | Full |
| DBC | Telnet/HTTP | Full |
| ECOM | Telnet/HTTP | Full |
| Nokia | SSH | Partial |

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js (Polling Server)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth with RLS
- **Process Manager**: PM2
- **Web Server**: Nginx

## 📁 Project Structure

```
isp-point/
├── src/                        # Frontend React application
│   ├── components/             # React components
│   ├── pages/                  # Page components
│   │   ├── ISP/                # ISP Management pages
│   │   │   ├── CustomerManagement.tsx
│   │   │   ├── Billing.tsx
│   │   │   ├── BillingAutomation.tsx
│   │   │   ├── Packages.tsx
│   │   │   ├── AreasManagement.tsx
│   │   │   ├── ResellersManagement.tsx
│   │   │   └── MikroTikManagement.tsx
│   │   └── SuperAdmin/         # Super Admin pages
│   ├── hooks/                  # Custom hooks
│   └── integrations/           # Supabase client
├── olt-polling-server/         # Backend polling server
│   ├── src/
│   │   ├── polling/            # OLT polling logic
│   │   │   ├── parsers/        # Brand-specific parsers
│   │   │   ├── mikrotik-client.js
│   │   │   └── telnet-client.js
│   │   └── notifications/      # Alert notifications
│   ├── .env.production         # Backend production config
│   └── ecosystem.config.cjs    # PM2 config
├── public/                     # Static assets
├── .env.production             # Frontend production config
├── COMPLETE_DATABASE_SCHEMA.sql # Database schema
├── DEPLOYMENT_INSTRUCTIONS.md  # Full deployment guide
└── dist/                       # Built frontend
```

## 🚀 Quick Deployment

### 1. Database Setup (Supabase)
```sql
-- Run COMPLETE_DATABASE_SCHEMA.sql in Supabase SQL Editor
-- Then create Super Admin user:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'admin@your-domain.com';
```

### 2. Frontend Build
```bash
cp .env.production .env
npm install
npm run build
# Serve dist/ folder via Nginx
```

### 3. Backend Start
```bash
cd olt-polling-server
cp .env.production .env
npm install
pm2 start ecosystem.config.cjs
```

## 📊 Database Schema (27+ Tables)

### Core Tables
- `olts` - OLT devices
- `onus` - ONU/ONT devices
- `alerts` - System alerts
- `power_readings` - Power history

### ISP Tables
- `customers` - Customer profiles
- `customer_bills` - Monthly bills
- `customer_payments` - Payment records
- `isp_packages` - Internet packages
- `areas` - Service areas
- `resellers` - Reseller accounts
- `billing_rules` - Automation rules
- `automation_logs` - Execution logs
- `mikrotik_routers` - MikroTik devices
- `pppoe_profiles` - PPPoE profiles

### SaaS Tables
- `tenants` - Organization accounts
- `tenant_users` - User-tenant mapping
- `subscriptions` - Tenant subscriptions
- `packages` - SaaS pricing packages
- `payments` - SaaS payments
- `invoices` - SaaS invoices

## 📋 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Backend (olt-polling-server/.env)
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
POLLING_INTERVAL=30000
```

## 📚 Documentation

- [Deployment Instructions](./DEPLOYMENT_INSTRUCTIONS.md) - Complete VPS deployment guide
- [Database Schema](./COMPLETE_DATABASE_SCHEMA.sql) - Full database schema
- [OLT Protocols](./olt-polling-server/OLT_PROTOCOLS.md) - OLT connection guide

## 🔒 Security Features

- Row Level Security (RLS) on all tables
- JWT authentication
- Role-based access control
- Tenant data isolation
- Activity logging

## 📄 License

Private - For internal use only

---

**ISP Point** - Network Operations Management System
© 2025 ISP Point
