# Database Schema Documentation

## Overview

This document describes the complete database schema for the OLT Monitor SaaS platform. The database is built on PostgreSQL with Row-Level Security (RLS) for multi-tenant data isolation.

## Enums

### app_role
User roles in the system:
- `super_admin` - Platform administrator with full access
- `admin` - Tenant administrator
- `operator` - Can manage OLTs and ONUs
- `viewer` - Read-only access

### tenant_status
- `active` - Fully operational tenant
- `trial` - In trial period
- `suspended` - Account suspended (e.g., non-payment)
- `cancelled` - Subscription cancelled

### subscription_status
- `active` - Active subscription
- `pending` - Awaiting payment verification
- `expired` - Subscription period ended
- `cancelled` - Manually cancelled

### billing_cycle
- `monthly` - Monthly billing
- `yearly` - Annual billing

### payment_status
- `pending` - Awaiting verification
- `completed` - Payment verified
- `failed` - Payment failed
- `refunded` - Payment refunded

### payment_method
- `sslcommerz` - SSLCommerz gateway
- `bkash` - bKash mobile payment
- `rocket` - Rocket mobile payment
- `nagad` - Nagad mobile payment
- `manual` - Manual bank transfer

### connection_status
- `online` - Device is online
- `offline` - Device is offline
- `warning` - Device has issues
- `unknown` - Status unknown

### olt_brand
- `ZTE`, `Huawei`, `Fiberhome`, `Nokia`, `BDCOM`, `VSOL`, `DBC`, `CDATA`, `ECOM`, `Other`

### olt_mode
- `EPON` - Ethernet PON
- `GPON` - Gigabit PON

### alert_severity
- `critical`, `warning`, `info`

### alert_type
- `onu_offline`, `power_drop`, `olt_unreachable`, `high_latency`

---

## Core Tables

### profiles
Stores user profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References auth.users(id) |
| email | text | User email |
| full_name | text | Display name |
| avatar_url | text | Profile picture URL |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### user_roles
Maps users to their roles (separate from profiles for security).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| user_id | uuid | References auth.users(id) |
| role | app_role | User's role |

**Unique Constraint:** (user_id, role)

---

## Multi-Tenancy Tables

### tenants
ISP organizations using the platform.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| name | text | Tenant/ISP name |
| company_name | text | Legal company name |
| email | text | Contact email |
| phone | text | Contact phone |
| address | text | Business address |
| logo_url | text | Company logo |
| subdomain | text | Custom subdomain |
| custom_domain | text | Custom domain |
| status | tenant_status | Current status |
| owner_user_id | uuid | Primary owner |
| max_olts | integer | OLT limit from package |
| max_users | integer | User limit from package |
| features | jsonb | Feature flags |
| trial_ends_at | timestamptz | Trial expiration |
| suspended_at | timestamptz | Suspension date |
| suspended_reason | text | Suspension reason |
| notes | text | Admin notes |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### tenant_users
Maps users to tenants with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| user_id | uuid | References auth.users(id) |
| role | app_role | Role within tenant |
| is_owner | boolean | Is tenant owner |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

## Billing Tables

### packages
Subscription packages/plans.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| name | text | Package name |
| description | text | Description |
| price_monthly | numeric | Monthly price |
| price_yearly | numeric | Yearly price |
| max_olts | integer | OLT limit |
| max_onus | integer | ONU limit |
| max_users | integer | User limit |
| features | jsonb | Feature flags |
| is_active | boolean | Available for purchase |
| sort_order | integer | Display order |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

**Features JSONB Structure:**
```json
{
  "sms_alerts": true,
  "email_alerts": true,
  "api_access": false,
  "white_label": false,
  "custom_domain": false
}
```

### subscriptions
Tenant subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| package_id | uuid (FK) | References packages(id) |
| status | subscription_status | Current status |
| billing_cycle | billing_cycle | Monthly/Yearly |
| amount | numeric | Subscription amount |
| starts_at | timestamptz | Start date |
| ends_at | timestamptz | End date |
| auto_renew | boolean | Auto-renewal enabled |
| cancelled_at | timestamptz | Cancellation date |
| cancelled_reason | text | Cancellation reason |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### payments
Payment records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| subscription_id | uuid (FK) | References subscriptions(id) |
| amount | numeric | Payment amount |
| currency | text | Currency (default: BDT) |
| payment_method | payment_method | Payment method used |
| status | payment_status | Payment status |
| transaction_id | text | Gateway transaction ID |
| invoice_number | text | Invoice reference |
| description | text | Payment description |
| notes | text | Admin notes |
| gateway_response | jsonb | Raw gateway response |
| paid_at | timestamptz | Payment timestamp |
| verified_at | timestamptz | Verification timestamp |
| verified_by | uuid | Verified by user ID |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### invoices
Invoice records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| subscription_id | uuid (FK) | References subscriptions(id) |
| payment_id | uuid (FK) | References payments(id) |
| invoice_number | text | Unique invoice number |
| amount | numeric | Subtotal |
| tax_amount | numeric | Tax amount |
| total_amount | numeric | Total amount |
| line_items | jsonb | Invoice line items |
| status | text | unpaid/paid/cancelled |
| due_date | timestamptz | Due date |
| paid_at | timestamptz | Payment date |
| notes | text | Invoice notes |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

## OLT/ONU Tables

### olts
OLT devices.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| name | text | OLT name |
| ip_address | text | Management IP |
| port | integer | SSH/Telnet port |
| username | text | Login username |
| password_encrypted | text | Encrypted password |
| brand | olt_brand | OLT manufacturer |
| olt_mode | olt_mode | EPON/GPON |
| status | connection_status | Current status |
| total_ports | integer | Total PON ports |
| active_ports | integer | Active PON ports |
| last_polled | timestamptz | Last poll time |
| mikrotik_ip | text | MikroTik router IP |
| mikrotik_port | integer | MikroTik API port |
| mikrotik_username | text | MikroTik username |
| mikrotik_password_encrypted | text | Encrypted password |
| created_by | uuid | Created by user |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### onus
ONU/ONT devices.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| olt_id | uuid (FK) | References olts(id) |
| name | text | ONU name/description |
| pon_port | text | PON port identifier |
| onu_index | integer | ONU index on port |
| serial_number | text | ONU serial number |
| mac_address | text | MAC address |
| status | connection_status | Current status |
| rx_power | numeric | Receive power (dBm) |
| tx_power | numeric | Transmit power (dBm) |
| temperature | numeric | Temperature (°C) |
| distance | numeric | Distance (meters) |
| alive_time | text | Uptime string |
| vendor_id | text | Vendor identifier |
| model_id | text | Model identifier |
| hardware_version | text | Hardware version |
| software_version | text | Software/firmware version |
| pppoe_username | text | PPPoE username |
| router_name | text | Associated router name |
| router_mac | text | Router MAC address |
| offline_reason | text | Last offline reason |
| last_online | timestamptz | Last online time |
| last_offline | timestamptz | Last offline time |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

## Monitoring Tables

### power_readings
Historical power readings for ONUs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| onu_id | uuid (FK) | References onus(id) |
| rx_power | numeric | Receive power (dBm) |
| tx_power | numeric | Transmit power (dBm) |
| recorded_at | timestamptz | Recording timestamp |

### onu_status_history
ONU status change history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| onu_id | uuid (FK) | References onus(id) |
| status | text | Status value |
| duration_seconds | integer | Duration in this status |
| changed_at | timestamptz | Change timestamp |

### device_health_history
Device health metrics history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| device_id | uuid | Device identifier |
| device_name | text | Device name |
| device_type | text | Device type |
| cpu_percent | numeric | CPU usage % |
| memory_percent | numeric | Memory usage % |
| free_memory_bytes | bigint | Free memory |
| total_memory_bytes | bigint | Total memory |
| uptime_seconds | bigint | Uptime in seconds |
| recorded_at | timestamptz | Recording timestamp |

### alerts
System alerts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| device_id | uuid | Related device ID |
| device_name | text | Device name |
| title | text | Alert title |
| message | text | Alert message |
| type | alert_type | Alert type |
| severity | alert_severity | Severity level |
| is_read | boolean | Read status |
| created_at | timestamptz | Creation timestamp |

---

## Configuration Tables

### system_settings
Global system settings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| key | text (unique) | Setting key |
| value | jsonb | Setting value |
| updated_at | timestamptz | Last update |

### payment_gateway_settings
Payment gateway configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| gateway | payment_method | Gateway type |
| display_name | text | Display name |
| is_enabled | boolean | Enabled status |
| sandbox_mode | boolean | Test mode |
| config | jsonb | Gateway config |
| instructions | text | Payment instructions |
| sort_order | integer | Display order |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### sms_gateway_settings
SMS gateway configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| provider | text | Provider name |
| api_url | text | API endpoint |
| api_key | text | API key |
| sender_id | text | Sender ID |
| is_enabled | boolean | Enabled status |
| config | jsonb | Additional config |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

## Audit Tables

### activity_logs
User activity audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| user_id | uuid | Acting user ID |
| action | text | Action performed |
| entity_type | text | Entity type affected |
| entity_id | text | Entity ID affected |
| details | jsonb | Additional details |
| ip_address | text | Client IP |
| user_agent | text | Client user agent |
| created_at | timestamptz | Timestamp |

### olt_debug_logs
OLT polling debug logs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| olt_id | uuid (FK) | References olts(id) |
| olt_name | text | OLT name |
| connection_method | text | Telnet/SSH/HTTP |
| commands_sent | text[] | Commands executed |
| raw_output | text | Raw response |
| parsed_count | integer | ONUs parsed |
| duration_ms | integer | Duration in ms |
| error_message | text | Error if any |
| created_at | timestamptz | Timestamp |

### onu_edit_history
ONU edit history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| onu_id | uuid (FK) | References onus(id) |
| field_name | text | Field edited |
| old_value | text | Previous value |
| new_value | text | New value |
| edited_by | uuid | Editor user ID |
| edited_at | timestamptz | Edit timestamp |

### sms_logs
SMS sending logs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| tenant_id | uuid (FK) | References tenants(id) |
| phone_number | text | Recipient number |
| message | text | Message content |
| status | text | pending/sent/failed |
| error_message | text | Error if failed |
| provider_response | jsonb | Raw response |
| sent_at | timestamptz | Send timestamp |
| created_at | timestamptz | Creation timestamp |

---

## Database Functions

### is_super_admin()
Returns `true` if the current user has the `super_admin` role.

### has_role(_user_id uuid, _role app_role)
Returns `true` if the specified user has the specified role.

### get_user_tenant_id()
Returns the tenant ID for the current user.

### is_tenant_active(_tenant_id uuid)
Returns `true` if the specified tenant has `active` status.

### is_authenticated()
Returns `true` if a user is currently authenticated.

### handle_new_user()
Trigger function that creates a profile and assigns default role for new users.

### update_updated_at_column()
Trigger function to auto-update `updated_at` timestamps.

---

## Row-Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **Super admins** can access all data
2. **Tenant users** can only access their tenant's data
3. **Regular users** can only access their own data
4. **Public tables** (like packages) are readable by anyone

See individual table policies in the migration files for complete details.
