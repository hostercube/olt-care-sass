# OLT Care SaaS - GPON/EPON OLT Management System

A modern SaaS web application for monitoring and managing Optical Line Terminal (OLT) devices and Optical Network Units (ONUs).

## 🌐 Production URLs

- **Frontend**: https://oltapp.isppoint.com
- **Backend API**: https://oltapp.isppoint.com/olt-polling-server
- **Supabase**: https://koodidvsmjfwjcgnmqox.supabase.co

## ✨ Features

- 🖥️ **OLT Management**: Add, edit, and monitor multiple OLT devices
- 📊 **Real-time Monitoring**: Live status updates for OLTs and ONUs
- 🔔 **Smart Alerts**: Automatic alerts for offline devices and power issues
- 📈 **Power Monitoring**: Track RX/TX power levels with history
- 👥 **Multi-tenant SaaS**: Role-based access (Super Admin, Admin, Operator, Viewer)
- 🌐 **MikroTik Integration**: PPPoE username lookup from MikroTik routers
- 💳 **Billing System**: Subscription packages, payments, invoices
- 📱 **SMS/Email Notifications**: Alert notifications via SMS and Email

## 🔧 Supported OLT Brands

| Brand | Protocol | Support Level |
|-------|----------|---------------|
| ZTE | SSH | Full |
| Huawei | SSH | Full |
| VSOL | SSH/HTTP | Full |
| Fiberhome | SSH | Full |
| DBC | HTTP | Full |
| CDATA | HTTP | Full |
| ECOM | HTTP | Full |
| BDCOM | SSH | Partial |
| Nokia | SSH | Partial |

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js (Polling Server)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Process Manager**: PM2
- **Web Server**: Nginx

## 📁 Project Structure

```
oltcaresass/
├── src/                        # Frontend React application
│   ├── components/             # React components
│   ├── pages/                  # Page components
│   ├── hooks/                  # Custom hooks
│   └── integrations/           # Supabase client
├── olt-polling-server/         # Backend polling server
│   ├── src/
│   │   ├── polling/            # OLT polling logic
│   │   └── notifications/      # Alert notifications
│   ├── .env.production         # Backend production config
│   └── ecosystem.config.cjs    # PM2 config
├── public/                     # Static assets
├── .env.production             # Frontend production config
├── COMPLETE_DATABASE_SCHEMA.sql # Database schema for Supabase
├── DEPLOYMENT_INSTRUCTIONS.md  # Full deployment guide
└── dist/                       # Built frontend (after npm run build)
```

## 🚀 Deployment

See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for complete VPS deployment guide.

### Quick Commands

```bash
# Frontend Build
cp .env.production .env
npm install
npm run build

# Backend Start
cd olt-polling-server
cp .env.production .env
npm install
pm2 start ecosystem.config.cjs
```

## 📋 Supabase Credentials

```
Project ID: koodidvsmjfwjcgnmqox
Project URL: https://koodidvsmjfwjcgnmqox.supabase.co
```

## 📄 License

Private - For internal use only
