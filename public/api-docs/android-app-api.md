# ISP Point - Android App API Documentation

This document describes the API endpoints available for building Android/iOS mobile applications for ISP customers.

## Base URL

```
https://kpcmlbztpztrxdwlfhfw.supabase.co/rest/v1
```

## Authentication

All API requests require the following headers:
```
apikey: {SUPABASE_ANON_KEY}
Content-Type: application/json
```

For authenticated requests (after customer login), include:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## 1. Customer Authentication

### Login
Authenticate a customer using phone/username and password.

**RPC Function:** `customer_portal_login`

```http
POST /rpc/customer_portal_login
Content-Type: application/json

{
  "p_tenant_id": "uuid",
  "p_identifier": "phone_or_username",
  "p_password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "customer": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Customer Name",
    "phone": "01XXXXXXXXX",
    "email": "email@example.com",
    "customer_code": "C001",
    "pppoe_username": "user1",
    "status": "active",
    "package_id": "uuid",
    "monthly_bill": 1000,
    "balance": 500,
    "wallet_balance": 250,
    "expire_date": "2025-02-15",
    "referral_code": "ABC123"
  }
}
```

---

## 2. Customer Profile

### Get Customer Profile
Fetch complete customer profile with package details.

**RPC Function:** `get_customer_profile`

```http
POST /rpc/get_customer_profile

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
[{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Customer Name",
  "phone": "01XXXXXXXXX",
  "email": "email@example.com",
  "customer_code": "C001",
  "pppoe_username": "user1",
  "status": "active",
  "monthly_bill": 1000,
  "balance": 500,
  "wallet_balance": 250,
  "expire_date": "2025-02-15",
  "package_name": "Premium 50Mbps",
  "package_price": 1000,
  "download_speed": 50,
  "upload_speed": 50,
  "referral_code": "ABC123"
}]
```

---

## 3. App Configuration

### Get App Config
Retrieve tenant-specific app configuration including branding, feature toggles, and announcements.

**RPC Function:** `get_customer_apps_config`

```http
POST /rpc/get_customer_apps_config

{
  "p_tenant_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "app_name": "My ISP App",
  "app_icon_url": "https://example.com/icon.png",
  "splash_screen_url": "https://example.com/splash.png",
  "dashboard_banner_url": "https://example.com/banner.png",
  "dashboard_banner_link": "https://example.com/promo",
  "dashboard_announcement": "New package available!",
  "dashboard_announcement_enabled": true,
  "live_tv_enabled": true,
  "ftp_enabled": true,
  "news_enabled": true,
  "referral_enabled": true,
  "speed_test_enabled": true,
  "primary_color": "#3B82F6",
  "secondary_color": "#10B981",
  "android_app_url": "https://play.google.com/store/apps/...",
  "ios_app_url": "https://apps.apple.com/...",
  "force_update_enabled": false,
  "min_app_version": "1.0.0",
  "maintenance_mode": false,
  "maintenance_message": null
}
```

---

## 4. App Links (Live TV, FTP, News, Custom)

### Get App Links
Retrieve links for Live TV, FTP servers, News, and custom links.

**RPC Function:** `get_customer_apps_links`

```http
POST /rpc/get_customer_apps_links

{
  "p_tenant_id": "uuid",
  "p_category": "live_tv"  // Optional: "live_tv", "ftp", "news", "custom" or null for all
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "category": "live_tv",
    "title": "BTV Live",
    "url": "https://stream.example.com/btv",
    "icon_url": "https://example.com/btv-icon.png",
    "description": "Bangladesh Television Live Stream",
    "is_active": true,
    "sort_order": 1,
    "requires_login": false,
    "open_in_browser": false
  }
]
```

**Categories:**
- `live_tv` - Live TV streaming links
- `ftp` - FTP server links
- `news` - News section links
- `custom` - Custom/other links

---

## 5. Packages

### Get Available Packages
Retrieve all active ISP packages for the tenant.

```http
GET /isp_packages?tenant_id=eq.{tenant_id}&is_active=eq.true&order=price.asc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Basic 10Mbps",
    "price": 500,
    "download_speed": 10,
    "upload_speed": 10,
    "description": "Basic internet package",
    "features": ["Unlimited Data", "24/7 Support"],
    "is_popular": false
  }
]
```

---

## 6. Billing & Payments

### Get Recharge History
Retrieve customer recharge history.

```http
GET /customer_recharges?customer_id=eq.{customer_id}&order=created_at.desc&limit=50
```

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": 1000,
    "months": 1,
    "payment_method": "bkash",
    "status": "completed",
    "old_expiry": "2025-01-15",
    "new_expiry": "2025-02-15",
    "recharge_date": "2025-01-15T10:30:00Z"
  }
]
```

### Get Bills
Retrieve customer bills.

```http
GET /customer_bills?customer_id=eq.{customer_id}&order=bill_date.desc&limit=50
```

---

## 7. Referral System

### Get Referral Stats
Get customer's referral statistics.

**RPC Function:** `get_customer_referral_stats`

```http
POST /rpc/get_customer_referral_stats

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
[{
  "total_referrals": 5,
  "successful_referrals": 3,
  "pending_referrals": 2,
  "total_bonus_earned": 300
}]
```

### Generate Referral Code
Generate a unique referral code for the customer.

**RPC Function:** `generate_customer_referral_code`

```http
POST /rpc/generate_customer_referral_code

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
"ABC123XY"
```

### Get Referral Config
Get referral program configuration for the tenant.

**RPC Function:** `get_referral_config`

```http
POST /rpc/get_referral_config

{
  "p_tenant_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "is_enabled": true,
  "bonus_type": "fixed",
  "bonus_amount": 100,
  "bonus_percentage": 0,
  "min_referrals_for_bonus": 1,
  "bonus_validity_days": 30,
  "terms_and_conditions": "..."
}
```

### Track Referral Signup
Track when a new customer signs up using a referral code.

**RPC Function:** `track_referral_signup`

```http
POST /rpc/track_referral_signup

{
  "p_referral_code": "ABC123XY",
  "p_referred_name": "New Customer",
  "p_referred_phone": "01XXXXXXXXX",
  "p_referred_email": "new@example.com",
  "p_tenant_id": "uuid"
}
```

### Get Customer Referrals
Get list of referrals made by a customer.

```http
GET /customer_referrals?referrer_customer_id=eq.{customer_id}&order=created_at.desc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "referral_code": "ABC123XY",
    "referred_name": "John Doe",
    "referred_phone": "01XXXXXXXXX",
    "status": "active",
    "bonus_amount": 100,
    "bonus_paid_at": null,
    "created_at": "2025-01-10T10:00:00Z"
  }
]
```

---

## 8. Wallet System

### Get Wallet Balance
Get customer's current wallet balance.

**RPC Function:** `get_customer_wallet_balance`

```http
POST /rpc/get_customer_wallet_balance

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
250.00
```

### Get Wallet Transactions
Get customer's wallet transaction history.

**RPC Function:** `get_customer_wallet_transactions`

```http
POST /rpc/get_customer_wallet_transactions

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": 100,
    "transaction_type": "referral_bonus",
    "reference_type": "referral",
    "reference_id": "uuid",
    "status": "completed",
    "notes": "Referral bonus for customer signup",
    "created_at": "2025-01-10T10:00:00Z"
  }
]
```

### Create Withdraw Request
Submit a withdraw request from wallet balance.

**RPC Function:** `create_withdraw_request`

```http
POST /rpc/create_withdraw_request

{
  "p_customer_id": "uuid",
  "p_amount": 100,
  "p_payment_method": "bkash",
  "p_payment_details": {
    "account_number": "01XXXXXXXXX"
  }
}
```

**Response:**
```json
"withdraw_request_uuid"
```

### Get Withdraw Requests
Get customer's withdraw request history.

**RPC Function:** `get_customer_withdraw_requests`

```http
POST /rpc/get_customer_withdraw_requests

{
  "p_customer_id": "uuid"
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": 100,
    "payment_method": "bkash",
    "payment_details": {"account_number": "01XXXXXXXXX"},
    "status": "pending",
    "rejection_reason": null,
    "processed_at": null,
    "created_at": "2025-01-10T10:00:00Z"
  }
]
```

---

## 9. Support Tickets

### Create Support Ticket
Create a new support ticket.

**RPC Function:** `create_customer_support_ticket`

```http
POST /rpc/create_customer_support_ticket

{
  "p_customer_id": "uuid",
  "p_subject": "Internet not working",
  "p_description": "My connection is down since morning",
  "p_category": "technical",
  "p_priority": "high"
}
```

### Get Customer Tickets
Retrieve customer's support tickets.

```http
GET /support_tickets?customer_id=eq.{customer_id}&order=created_at.desc
```

---

## 10. Connection Request

### Submit Connection Request
Submit a new internet connection request.

```http
POST /connection_requests

{
  "tenant_id": "uuid",
  "customer_name": "John Doe",
  "phone": "01XXXXXXXXX",
  "email": "john@example.com",
  "address": "123 Main Street",
  "package_id": "uuid",
  "nid_number": "1234567890",
  "preferred_date": "2025-01-20"
}
```

---

## 11. Tenant Branding

### Get Tenant Info
Retrieve tenant branding information for the app.

```http
GET /tenants?id=eq.{tenant_id}&select=company_name,logo_url,favicon_url,subtitle,theme_color,subdomain,custom_domain,landing_page_enabled
```

**Response:**
```json
[
  {
    "company_name": "My ISP Company",
    "logo_url": "https://example.com/logo.png",
    "favicon_url": "https://example.com/favicon.ico",
    "subtitle": "Fast & Reliable Internet",
    "theme_color": "#3B82F6",
    "subdomain": "myisp",
    "custom_domain": "isp.example.com",
    "landing_page_enabled": true
  }
]
```

### Get Referral Link Domain
For generating referral links, use this priority:
1. Custom domain (if available): `https://{custom_domain}/?ref={referral_code}`
2. Subdomain (if available): `https://{subdomain}.isppoint.com/?ref={referral_code}`
3. Fallback to main domain tenant landing: `https://isppoint.com/p/{tenant_slug}/?ref={referral_code}`

> Note: `{tenant_slug}` is the tenant’s slug (same one used in the tenant landing URL).

---

## 12. Image Upload

### Upload Image to Storage
Upload images for profile, icons, etc.

```javascript
// Using Supabase Storage
const { data, error } = await supabase.storage
  .from('tenant-assets')
  .upload(`customer-apps/${fileName}`, file, {
    cacheControl: '3600',
    upsert: false
  });

// Get public URL
const { data: urlData } = supabase.storage
  .from('tenant-assets')
  .getPublicUrl(data.path);
```

---

## Error Handling

All API errors return a standard format:
```json
{
  "code": "PGRST116",
  "message": "Error description",
  "details": null,
  "hint": null
}
```

Common error codes:
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `422` - Validation error
- `INSUFFICIENT_BALANCE` - Not enough wallet balance

---

## Rate Limiting

API requests are subject to rate limiting:
- **Anonymous requests:** 100 requests per minute
- **Authenticated requests:** 1000 requests per minute

---

## Webhooks (Optional)

For payment notifications and status updates, configure webhooks in the tenant settings.

---

## SDK Integration

For easier integration, use the Supabase client libraries:

### JavaScript/React Native
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Login
const { data, error } = await supabase.rpc('customer_portal_login', {
  p_tenant_id: tenantId,
  p_identifier: phone,
  p_password: password
})

// Get profile
const { data: profile } = await supabase.rpc('get_customer_profile', {
  p_customer_id: customerId
})

// Get app config
const { data: config } = await supabase.rpc('get_customer_apps_config', {
  p_tenant_id: tenantId
})

// Get referral stats
const { data: stats } = await supabase.rpc('get_customer_referral_stats', {
  p_customer_id: customerId
})

// Get wallet balance
const { data: balance } = await supabase.rpc('get_customer_wallet_balance', {
  p_customer_id: customerId
})

// Submit withdraw request
const { data: requestId } = await supabase.rpc('create_withdraw_request', {
  p_customer_id: customerId,
  p_amount: 100,
  p_payment_method: 'bkash',
  p_payment_details: { account_number: '01XXXXXXXXX' }
})
```

### Flutter/Dart
```dart
final supabase = Supabase.instance.client;

// Login
final response = await supabase.rpc('customer_portal_login', params: {
  'p_tenant_id': tenantId,
  'p_identifier': phone,
  'p_password': password,
});

// Get profile
final profile = await supabase.rpc('get_customer_profile', params: {
  'p_customer_id': customerId,
});

// Get app config
final config = await supabase.rpc('get_customer_apps_config', params: {
  'p_tenant_id': tenantId,
});

// Get referral stats
final stats = await supabase.rpc('get_customer_referral_stats', params: {
  'p_customer_id': customerId,
});

// Get wallet balance
final balance = await supabase.rpc('get_customer_wallet_balance', params: {
  'p_customer_id': customerId,
});

// Submit withdraw request
final requestId = await supabase.rpc('create_withdraw_request', params: {
  'p_customer_id': customerId,
  'p_amount': 100,
  'p_payment_method': 'bkash',
  'p_payment_details': {'account_number': '01XXXXXXXXX'},
});
```

### Kotlin/Android
```kotlin
val supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Login
val response = supabase.rpc("customer_portal_login", mapOf(
    "p_tenant_id" to tenantId,
    "p_identifier" to phone,
    "p_password" to password
))

// Get profile
val profile = supabase.rpc("get_customer_profile", mapOf(
    "p_customer_id" to customerId
))

// Get wallet balance
val balance = supabase.rpc("get_customer_wallet_balance", mapOf(
    "p_customer_id" to customerId
))
```

---

## Feature Flags

Before displaying features, check the app config:

```javascript
const config = await supabase.rpc('get_customer_apps_config', { p_tenant_id: tenantId });

// Check feature availability
const showLiveTV = config.live_tv_enabled;
const showFTP = config.ftp_enabled;
const showNews = config.news_enabled;
const showReferral = config.referral_enabled;
const showSpeedTest = config.speed_test_enabled;

// Check maintenance mode
if (config.maintenance_mode) {
  showMaintenanceScreen(config.maintenance_message);
}

// Check force update
if (config.force_update_enabled) {
  const currentVersion = getAppVersion();
  if (isVersionLower(currentVersion, config.min_app_version)) {
    showForceUpdateDialog();
  }
}
```

---

## Contact

For API support and integration assistance, contact the system administrator.
