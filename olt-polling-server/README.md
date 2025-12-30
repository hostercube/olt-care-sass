# OLT Polling Server

Node.js server that polls OLT devices via SSH/Telnet/HTTP and syncs data to Supabase.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
nano .env  # Edit with your Supabase credentials

# 3. Create logs directory
mkdir -p logs

# 4. Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Required |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Required |
| `POLLING_INTERVAL_MS` | Polling interval in milliseconds | 60000 |
| `SSH_TIMEOUT_MS` | SSH connection timeout | 60000 |
| `MIKROTIK_TIMEOUT_MS` | MikroTik API timeout | 30000 |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | production |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | Polling status |
| POST | `/poll/:oltId` | Poll specific OLT |
| POST | `/poll-all` | Poll all OLTs |
| POST | `/api/test-connection` | Test OLT/MikroTik connection |

## PM2 Commands

```bash
pm2 status                      # Check status
pm2 logs olt-polling-server     # View logs
pm2 restart olt-polling-server  # Restart
pm2 stop olt-polling-server     # Stop
```

## Supported OLT Brands

- **Full Support**: ZTE, Huawei, VSOL, Fiberhome, DBC, CDATA, ECOM
- **Partial Support**: BDCOM, Nokia

## Troubleshooting

### Server won't start
1. Check `.env` file exists and has correct values
2. Run `npm install` to ensure dependencies are installed
3. Check logs: `pm2 logs olt-polling-server`

### Connection errors
1. Verify OLT IP is reachable from server
2. Check SSH/Telnet credentials
3. Ensure firewall allows outbound connections

## License

Private - For internal use only
