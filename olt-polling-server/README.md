# OLT Polling Server for VPS

This is a standalone Node.js application that runs on your VPS to poll OLT devices via SSH and sync data to your Supabase database.

## Features

- SSH connection to OLT devices (ZTE, Huawei, Fiberhome, etc.)
- Automatic ONU discovery and status monitoring
- Power level readings (RX/TX)
- Real-time sync to Supabase database
- Configurable polling intervals
- Alert generation for offline ONUs and power issues

## Prerequisites

- Node.js 18+ installed on your VPS
- Network access from VPS to OLT devices
- Supabase project credentials

## Installation

```bash
# Clone or copy this folder to your VPS
cd olt-polling-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start the server
npm start

# For production with PM2
npm install -g pm2
pm2 start npm --name "olt-poller" -- start
pm2 save
pm2 startup
```

## Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=30000
```

## Supported OLT Brands

- ZTE (C300, C320, C600)
- Huawei (MA5800, MA5683T)
- Fiberhome (AN5516-01, AN5516-06)
- Nokia
- BDCOM
- VSOL

## API Endpoints

The server also exposes a REST API for manual operations:

- `GET /health` - Health check
- `POST /poll/:oltId` - Trigger immediate poll for specific OLT
- `POST /poll-all` - Trigger poll for all OLTs
- `GET /status` - Get current polling status

## Logs

Logs are stored in `./logs/` directory with daily rotation.
