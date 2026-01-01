# 🚀 Final Deployment Guide - OLT Manager

## ✅ সব Fixes সম্পন্ন হয়েছে

### PPPoE/ONU Matching Logic (100% Accurate)
- **Method A**: ONU MAC == PPPoE caller-id (সবচেয়ে reliable)
- **Method B**: OLT MAC Table Lookup (router behind ONU)
- **Method C**: Metadata matching (PPP secret comments)
- **1:1 Enforcement**: একই PPPoE user দুই ONU-তে assign হবে না

---

## 📋 VPS Deployment Steps

### Step 1: Update Code from Git

```bash
cd /var/www/olt.isppoint.com
git pull origin main
```

### Step 2: Install Dependencies

```bash
# Frontend dependencies
npm install

# Polling server dependencies
cd olt-polling-server
npm install
cd ..
```

### Step 3: Configure Environment Files

#### Frontend (.env for Vite build)
```bash
# Use your Supabase credentials
cp public/.env.production .env
```

অথবা manually `.env` তৈরি করুন:
```env
VITE_SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw
VITE_SUPABASE_PROJECT_ID=srofhdgdraihxgpmpdye
VITE_POLLING_SERVER_URL=https://olt.isppoint.com/olt-polling-server
```

#### Polling Server (.env)
```bash
cd olt-polling-server
cp .env.production .env
cd ..
```

অথবা manually `olt-polling-server/.env` তৈরি করুন:
```env
SUPABASE_URL=https://srofhdgdraihxgpmpdye.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MjUwNSwiZXhwIjoyMDgyNjU4NTA1fQ.59U6UuXchMAcd86IzPE-zlJumn-ajx18BjVZGLD6NYs
POLLING_INTERVAL_MS=60000
SSH_TIMEOUT_MS=60000
MIKROTIK_TIMEOUT_MS=30000
PORT=3001
NODE_ENV=production
```

### Step 4: Build Frontend

```bash
npm run build
```

### Step 5: Restart Polling Server

```bash
cd olt-polling-server
pm2 restart olt-polling-server
pm2 save
```

Or if first time:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 6: Verify Deployment

```bash
# Check polling server health
curl -s https://olt.isppoint.com/olt-polling-server/health

# Check PM2 status
pm2 status

# View logs
pm2 logs olt-polling-server --lines 100
```

---

## 🧪 Test Full Sync

After deployment, test the VSOL OLT Full Sync:

```bash
# Run Full Sync with progress (SSE)
curl -N -X POST \
  -H "Accept: text/event-stream" \
  https://olt.isppoint.com/olt-polling-server/api/full-sync/6b931f38-42c0-4569-aee9-1d7fe5c59d61

# Or simple JSON response
curl -X POST \
  https://olt.isppoint.com/olt-polling-server/api/full-sync/6b931f38-42c0-4569-aee9-1d7fe5c59d61
```

---

## 📊 Expected Matching Output

Logs should show:
```
=== MATCHING DATA AVAILABLE ===
ONU count: 4
PPPoE sessions: 2 (active connections with caller-id)
PPP secrets: 10 (stored credentials)
OLT MAC table: 4 entries
================================

✅ DIRECT MATCH: ONU MAC 4CAE1C6484B10 == PPPoE caller-id -> robbany1
✅ MAC TABLE MATCH: ONU 0/4:2 <- Router MAC 788CB559B8E5 <- PPPoE robbany2

=== ENRICHMENT RESULT ===
Total ONUs: 4
Enriched: 2 ONUs got PPPoE/router data
Unique PPPoE users matched: 2 (1:1 strict)
Match methods used:
  - onu-mac-equals-caller-id: 1 ONUs
  - mac-table-lookup: 1 ONUs
=========================
```

---

## 🔒 Important Notes

1. **ONU MAC ≠ Router MAC** - এটা স্বাভাবিক! ONU এর নিজের MAC আলাদা, গ্রাহকের router এর MAC আলাদা।

2. **PPPoE caller-id** = সাধারণত **Router MAC** (ONU MAC না!)

3. **1:1 Matching** - একই PPPoE username কখনই দুই ONU-তে থাকবে না।

4. **MAC Table Lookup** - VSOL OLT থেকে MAC table পড়ে router MAC -> ONU mapping করে।

---

## 🛠️ Troubleshooting

### ONU data not showing
```bash
# Check if polling server is running
pm2 status

# Check logs for errors
pm2 logs olt-polling-server --lines 200

# Verify Supabase connection
grep SUPABASE olt-polling-server/.env
```

### PPPoE not matching
```bash
# Check MikroTik connection
curl -X POST https://olt.isppoint.com/olt-polling-server/test-mikrotik \
  -H "Content-Type: application/json" \
  -d '{"mikrotik":{"ip":"163.223.241.1","port":8090,"username":"admin","password":"yourpass"}}'
```

### Duplicate PPPoE users on multiple ONUs
```bash
# Use Database Cleanup in UI or:
curl -X POST https://olt.isppoint.com/olt-polling-server/api/cleanup-duplicates/6b931f38-42c0-4569-aee9-1d7fe5c59d61?dryRun=true
```

---

## ✨ Features Ready

- ✅ ONU polling via Telnet/SSH
- ✅ MikroTik PPPoE enrichment
- ✅ 1:1 strict matching (no duplicates)
- ✅ OLT MAC table lookup
- ✅ Full Sync with SSE progress
- ✅ Database Cleanup tools
- ✅ Data Quality panels
- ✅ Real-time updates

---

**শেষ! 🎉 Deploy করুন এবং Full Sync test করুন।**
