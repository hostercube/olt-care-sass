# OLTCare - GPON/EPON OLT Management System

A modern web application for monitoring and managing Optical Line Terminal (OLT) devices and Optical Network Units (ONUs).

## Features

- 🖥️ **OLT Management**: Add, edit, and monitor multiple OLT devices
- 📊 **Real-time Monitoring**: Live status updates for OLTs and ONUs
- 🔔 **Smart Alerts**: Automatic alerts for offline devices and power issues
- 📈 **Power Monitoring**: Track RX/TX power levels
- 👥 **Multi-user Support**: Role-based access (Admin, Operator, Viewer)
- 🌐 **MikroTik Integration**: PPPoE username lookup from MikroTik routers

## Supported OLT Brands

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

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express (Polling Server)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Project Structure

```
/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom hooks
│   └── integrations/       # Supabase client
├── olt-polling-server/     # Backend polling server
│   ├── src/
│   │   ├── polling/        # OLT polling logic
│   │   └── utils/          # Utilities
│   └── ecosystem.config.cjs
├── dist/                   # Built frontend (after npm run build)
└── UBUNTU_DEPLOYMENT.md    # Full deployment guide
```

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Deployment

See [UBUNTU_DEPLOYMENT.md](./UBUNTU_DEPLOYMENT.md) for complete deployment instructions on Ubuntu 24.04.

## License

Private - For internal use only
