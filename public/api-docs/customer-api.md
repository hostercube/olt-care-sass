# Customer Portal API Documentation

**Version:** 1.0.0  
**Base URL:** `https://your-domain.com/functions/v1/customer-api`

## Overview

This API provides all the endpoints needed to build a Customer Mobile App for ISP subscribers. It enables customers to:

- Login and manage their account
- View real-time network status and bandwidth
- View and pay bills
- Reboot router/ONU
- Request package changes
- Submit support tickets

---

## Authentication

### Login

**Endpoint:** `POST /auth/login`

Login using PPPoE username or phone number with customer code.

**Request Body:**
```json
{
  "username": "customer_pppoe",     // PPPoE username (optional if phone provided)
  "phone": "01712345678",           // Phone number (optional if username provided)
  "customer_code": "CUST001"        // Required - Customer unique code
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "customer": {
      "id": "uuid",
      "name": "Customer Name",
      "phone": "01712345678",
      "email": "customer@email.com",
      "customer_code": "CUST001",
      "status": "active",
      "pppoe_username": "customer_pppoe",
      "monthly_bill": 1000,
      "due_amount": 0,
      "expiry_date": "2026-02-15",
      "package": {
        "id": "uuid",
        "name": "Premium 50Mbps",
        "download_speed": 50,
        "upload_speed": 25,
        "speed_unit": "mbps"
      }
    }
  }
}
```

### Verify Token

**Endpoint:** `POST /auth/verify`

Verify if a token is still valid.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "customer": {
      "id": "uuid",
      "name": "Customer Name",
      "status": "active"
    }
  }
}
```

---

## Authentication Headers

For all protected endpoints, include the token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Customer Profile

### Get Profile

**Endpoint:** `GET /profile`

Get complete customer profile with package and area information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Customer Name",
    "phone": "01712345678",
    "email": "customer@email.com",
    "address": "House 10, Road 5, Dhaka",
    "customer_code": "CUST001",
    "status": "active",
    "pppoe_username": "customer_pppoe",
    "onu_mac": "AA:BB:CC:DD:EE:FF",
    "router_mac": "11:22:33:44:55:66",
    "pon_port": "0/1/1",
    "monthly_bill": 1000,
    "due_amount": 0,
    "expiry_date": "2026-02-15",
    "connection_date": "2024-01-15",
    "package": {
      "id": "uuid",
      "name": "Premium 50Mbps",
      "download_speed": 50,
      "upload_speed": 25,
      "speed_unit": "mbps",
      "price": 1000
    },
    "area": {
      "id": "uuid",
      "name": "Gulshan",
      "district": "Dhaka",
      "upazila": "Gulshan",
      "union_name": null,
      "village": null
    }
  }
}
```

### Update Profile

**Endpoint:** `PUT /profile`

Update customer profile (limited fields).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phone": "01712345678",
  "email": "newemail@example.com",
  "address": "New Address"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated customer object */ },
  "message": "Profile updated"
}
```

---

## Network Status

### Get Network Status

**Endpoint:** `GET /network/status`

Get real-time network status including online status, bandwidth, and ONU information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_online": true,
    "uptime": "5d 12h 30m",
    "rx_bandwidth": 45,           // Current download Mbps
    "tx_bandwidth": 12,           // Current upload Mbps
    "total_download": 50000000000,// Total bytes downloaded
    "total_upload": 10000000000,  // Total bytes uploaded
    "ip_address": "192.168.1.100",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "onu_status": "online",
    "onu_rx_power": -18.5,        // dBm
    "onu_tx_power": 2.1,          // dBm
    "last_online": "2026-01-03T10:00:00Z",
    "last_offline": "2026-01-01T02:30:00Z"
  }
}
```

### Get Bandwidth History

**Endpoint:** `GET /network/bandwidth`

Get bandwidth usage history for charts.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `1h`, `24h`, `7d`, `30d` (default: `1h`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-01-03T10:00:00Z",
      "rx_mbps": 45,
      "tx_mbps": 12
    },
    {
      "timestamp": "2026-01-03T10:01:00Z",
      "rx_mbps": 38,
      "tx_mbps": 8
    }
    // ... more data points
  ]
}
```

---

## Billing

### Get Bills

**Endpoint:** `GET /bills`

Get customer bills with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of records (default: 20)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (`paid`, `unpaid`, `partial`, `overdue`)

**Response:**
```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "uuid",
        "bill_number": "BILL-2026-001",
        "billing_month": "2026-01",
        "amount": 1000,
        "discount": 0,
        "tax": 0,
        "total_amount": 1000,
        "paid_amount": 1000,
        "status": "paid",
        "bill_date": "2026-01-01",
        "due_date": "2026-01-10",
        "paid_date": "2026-01-05"
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### Get Single Bill

**Endpoint:** `GET /bills/:id`

Get detailed information for a specific bill.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bill_number": "BILL-2026-001",
    "billing_month": "2026-01",
    "amount": 1000,
    "discount": 0,
    "tax": 0,
    "total_amount": 1000,
    "paid_amount": 1000,
    "status": "paid",
    "bill_date": "2026-01-01",
    "due_date": "2026-01-10",
    "paid_date": "2026-01-05",
    "payment_method": "bkash",
    "payment_reference": "TXN123456",
    "notes": null
  }
}
```

---

## Payments

### Get Payment History

**Endpoint:** `GET /payments`

Get payment history with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of records (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "amount": 1000,
        "payment_method": "bkash",
        "payment_date": "2026-01-05T10:30:00Z",
        "transaction_id": "TXN123456",
        "notes": "January 2026 bill payment"
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### Initiate Payment

**Endpoint:** `POST /payments/initiate`

Initiate an online payment.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 1000,
  "payment_method": "bkash",      // bkash, nagad, rocket, card
  "bill_id": "uuid"               // Optional - specific bill to pay
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "amount": 1000,
    "status": "pending",
    "payment_url": "https://gateway.com/pay/..." // Redirect URL for payment
  },
  "message": "Payment initiated"
}
```

---

## Recharge

### Recharge Account

**Endpoint:** `POST /recharge`

Recharge customer account.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 1000,
  "payment_method": "bkash",
  "months": 1                     // Number of months to recharge
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recharge initiated",
  "data": {
    "payment_id": "uuid",
    "amount": 1000,
    "status": "pending"
  }
}
```

---

## Device Control

### Reboot Router

**Endpoint:** `POST /device/reboot-router`

Send reboot command to customer's router.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Router reboot command sent. Please wait 1-2 minutes.",
  "data": {
    "command": "reboot",
    "status": "sent"
  }
}
```

### Reboot ONU

**Endpoint:** `POST /device/reboot-onu`

Send reboot command to customer's ONU device.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "ONU reboot command sent. Please wait 2-3 minutes.",
  "data": {
    "command": "reboot_onu",
    "status": "sent"
  }
}
```

### Disconnect Session

**Endpoint:** `POST /device/disconnect`

Disconnect current PPPoE session (useful for reconnecting).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session disconnected. Reconnecting...",
  "data": {
    "command": "disconnect",
    "status": "sent"
  }
}
```

---

## Packages

### Get Available Packages

**Endpoint:** `GET /packages`

Get list of available packages for upgrade/downgrade.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Basic 20Mbps",
      "description": "Perfect for browsing and social media",
      "download_speed": 20,
      "upload_speed": 10,
      "speed_unit": "mbps",
      "price": 500,
      "validity_days": 30
    },
    {
      "id": "uuid",
      "name": "Premium 50Mbps",
      "description": "For streaming and gaming",
      "download_speed": 50,
      "upload_speed": 25,
      "speed_unit": "mbps",
      "price": 1000,
      "validity_days": 30
    }
  ]
}
```

### Request Package Change

**Endpoint:** `POST /packages/change`

Request to change current package.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "package_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Package change request submitted. Our team will contact you shortly.",
  "data": {
    "request_type": "package_change",
    "package_id": "uuid"
  }
}
```

---

## Support

### Get Support Tickets

**Endpoint:** `GET /support/tickets`

Get list of support tickets.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TKT-123456",
      "subject": "Internet disconnection issue",
      "status": "open",
      "category": "connectivity",
      "created_at": "2026-01-03T10:00:00Z"
    }
  ]
}
```

### Create Support Ticket

**Endpoint:** `POST /support/tickets`

Create a new support ticket.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "subject": "Internet disconnection issue",
  "message": "My internet has been disconnecting frequently...",
  "category": "connectivity"       // connectivity, billing, package, other
}
```

**Response:**
```json
{
  "success": true,
  "message": "Support ticket created",
  "data": {
    "ticket_id": "TKT-1704268800000"
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or expired token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Maximum 100 requests per minute per customer
- Exceeded requests will receive HTTP 429 Too Many Requests

---

## Webhooks (Optional)

For real-time updates, your app can subscribe to webhooks:

### Available Events:
- `payment.completed` - When a payment is verified
- `bill.generated` - When a new bill is generated
- `package.changed` - When package is changed
- `expiry.warning` - 3 days before expiry
- `service.suspended` - When service is suspended

---

## Example Implementation (Flutter/Dart)

```dart
class CustomerApiClient {
  static const baseUrl = 'https://your-domain.com/functions/v1/customer-api';
  String? _token;

  Future<Map<String, dynamic>> login(String customerCode, String phone) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'customer_code': customerCode,
        'phone': phone,
      }),
    );
    
    final data = jsonDecode(response.body);
    if (data['success']) {
      _token = data['data']['token'];
    }
    return data;
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await http.get(
      Uri.parse('$baseUrl/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      },
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> getNetworkStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/network/status'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      },
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> rebootRouter() async {
    final response = await http.post(
      Uri.parse('$baseUrl/device/reboot-router'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      },
    );
    return jsonDecode(response.body);
  }
}
```

---

## Contact

For API support and integration help:
- Email: api-support@your-isp.com
- Documentation: https://docs.your-isp.com
