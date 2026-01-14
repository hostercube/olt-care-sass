# Customer Mobile App - Complete API Documentation

This document provides comprehensive API documentation for integrating a customer mobile app (Android/iOS) with the ISP Management System. The app communicates directly with the Supabase backend and VPS polling server for device management.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [Customer Profile](#customer-profile)
4. [Device Management](#device-management)
5. [Package & Recharge](#package--recharge)
6. [Billing](#billing)
7. [Payment Integration](#payment-integration)
8. [Support Tickets](#support-tickets)
9. [Live Bandwidth Monitoring](#live-bandwidth-monitoring)
10. [Realtime Updates](#realtime-updates)
11. [Error Handling](#error-handling)

---

## Setup & Configuration

### Android (Kotlin) Setup

```kotlin
// build.gradle.kts (app level)
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.0")
    implementation("io.ktor:ktor-client-android:2.3.0")
}
```

```kotlin
// SupabaseClient.kt
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

object SupabaseClient {
    val client = createSupabaseClient(
        supabaseUrl = "YOUR_SUPABASE_URL",
        supabaseKey = "YOUR_SUPABASE_ANON_KEY"
    ) {
        install(Postgrest)
        install(Realtime)
    }
}
```

### Flutter/Dart Setup

```yaml
# pubspec.yaml
dependencies:
  supabase_flutter: ^2.0.0
```

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  runApp(MyApp());
}

final supabase = Supabase.instance.client;
```

---

## Authentication

### Login with PPPoE Username & Password

Customers authenticate using their PPPoE credentials (username + password).

#### Flutter Implementation

```dart
class AuthService {
  final supabase = Supabase.instance.client;
  
  /// Authenticate customer with PPPoE credentials
  /// Returns customer data on success, null on failure
  Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      // Call the RPC function for secure authentication
      final response = await supabase.rpc(
        'authenticate_customer_global',
        params: {
          'p_username': username,
          'p_password': password,
        },
      );
      
      if (response != null && response.isNotEmpty) {
        final customer = response[0];
        // Store session locally
        await _saveSession(customer);
        return customer;
      }
      return null;
    } catch (e) {
      print('Login error: $e');
      return null;
    }
  }
  
  /// Login for specific tenant (custom domain)
  Future<Map<String, dynamic>?> loginWithTenant(
    String tenantId,
    String username,
    String password,
  ) async {
    try {
      final response = await supabase.rpc(
        'authenticate_customer',
        params: {
          'p_tenant_id': tenantId,
          'p_username': username,
          'p_password': password,
        },
      );
      
      if (response != null && response.isNotEmpty) {
        final customer = response[0];
        await _saveSession(customer);
        return customer;
      }
      return null;
    } catch (e) {
      print('Login error: $e');
      return null;
    }
  }
  
  Future<void> _saveSession(Map<String, dynamic> customer) async {
    // Use shared_preferences or secure_storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('customer_session', jsonEncode(customer));
  }
  
  Future<Map<String, dynamic>?> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    final session = prefs.getString('customer_session');
    if (session != null) {
      return jsonDecode(session);
    }
    return null;
  }
  
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('customer_session');
  }
}
```

#### Response Structure

```json
{
  "id": "uuid-customer-id",
  "tenant_id": "uuid-tenant-id",
  "name": "Customer Name",
  "pppoe_username": "customer_pppoe"
}
```

---

## Customer Profile

### Get Full Profile with Package Details

```dart
class ProfileService {
  final supabase = Supabase.instance.client;
  
  /// Get complete customer profile with package and area details
  Future<Map<String, dynamic>?> getProfile(String customerId) async {
    try {
      final customer = await supabase
          .from('customers')
          .select('''
            id,
            name,
            phone,
            email,
            customer_code,
            address,
            status,
            expiry_date,
            due_amount,
            monthly_bill,
            connection_date,
            last_payment_date,
            pppoe_username,
            onu_mac,
            package:isp_packages(
              id,
              name,
              speed,
              price,
              validity_days,
              description
            ),
            area:areas(
              id,
              name,
              district,
              upazila
            )
          ''')
          .eq('id', customerId)
          .single();
      
      return customer;
    } catch (e) {
      print('Error fetching profile: $e');
      return null;
    }
  }
  
  /// Get connection status (active/expired/suspended)
  String getConnectionStatus(Map<String, dynamic> customer) {
    final status = customer['status'] as String?;
    final expiryDate = customer['expiry_date'] as String?;
    
    if (status == 'suspended' || status == 'disabled') {
      return 'suspended';
    }
    
    if (expiryDate != null) {
      final expiry = DateTime.parse(expiryDate);
      if (expiry.isBefore(DateTime.now())) {
        return 'expired';
      }
    }
    
    return status ?? 'active';
  }
  
  /// Calculate days remaining until expiry
  int getDaysRemaining(String? expiryDate) {
    if (expiryDate == null) return 0;
    final expiry = DateTime.parse(expiryDate);
    final now = DateTime.now();
    return expiry.difference(now).inDays;
  }
}
```

---

## Device Management

The device management endpoints allow customers to view and control their network devices (Router/ONU). These operations require communication with the VPS polling server.

### Get VPS URL from Tenant Settings

```dart
class DeviceService {
  final supabase = Supabase.instance.client;
  
  /// Get the VPS polling server URL for the tenant
  Future<String?> getVpsUrl(String tenantId) async {
    try {
      final tenant = await supabase
          .from('tenants')
          .select('vps_url')
          .eq('id', tenantId)
          .single();
      
      return tenant['vps_url'] as String?;
    } catch (e) {
      print('Error fetching VPS URL: $e');
      return null;
    }
  }
}
```

### Get Connection Details (PPPoE Session)

```dart
/// Get PPPoE session information from MikroTik
Future<Map<String, dynamic>?> getConnectionDetails({
  required String vpsUrl,
  required String routerId,
  required String pppoeUsername,
}) async {
  try {
    final response = await http.get(
      Uri.parse('$vpsUrl/api/mikrotik/$routerId/pppoe-sessions'),
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> sessions = jsonDecode(response.body);
      
      // Find the customer's session
      final session = sessions.firstWhere(
        (s) => s['name'] == pppoeUsername,
        orElse: () => null,
      );
      
      return session != null ? {
        'isOnline': true,
        'ipAddress': session['address'] ?? 'N/A',
        'uptime': session['uptime'] ?? 'N/A',
        'callerId': session['caller-id'] ?? 'N/A',
        'service': session['service'] ?? 'N/A',
      } : {
        'isOnline': false,
        'ipAddress': 'N/A',
        'uptime': 'N/A',
      };
    }
    return null;
  } catch (e) {
    print('Error fetching connection details: $e');
    return null;
  }
}
```

### Get Device Info (ONU Details from OLT)

```dart
/// Get ONU device information
Future<Map<String, dynamic>?> getOnuInfo({
  required String vpsUrl,
  required String oltId,
  required String ponPort,
  required int onuIndex,
}) async {
  try {
    final response = await http.get(
      Uri.parse('$vpsUrl/api/olt/$oltId/onu/$ponPort/$onuIndex/info'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return {
        'name': data['name'] ?? 'Unknown',
        'macAddress': data['mac_address'] ?? 'N/A',
        'serialNumber': data['serial_number'] ?? 'N/A',
        'status': data['status'] ?? 'unknown',
        'rxPower': data['rx_power']?.toDouble() ?? 0.0,
        'txPower': data['tx_power']?.toDouble() ?? 0.0,
        'distance': data['distance'] ?? 'N/A',
        'lastOnline': data['last_online'],
      };
    }
    return null;
  } catch (e) {
    print('Error fetching ONU info: $e');
    return null;
  }
}
```

### Reboot Router

```dart
/// Reboot MikroTik router (requires VPS support)
Future<Map<String, dynamic>> rebootRouter({
  required String vpsUrl,
  required String routerId,
  required String pppoeUsername,
}) async {
  try {
    final response = await http.post(
      Uri.parse('$vpsUrl/api/mikrotik/$routerId/reboot-user'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': pppoeUsername}),
    );
    
    if (response.statusCode == 200) {
      return {'success': true, 'message': 'Router reboot initiated'};
    }
    return {'success': false, 'message': 'Failed to reboot router'};
  } catch (e) {
    return {'success': false, 'message': 'Connection error: $e'};
  }
}
```

### Reboot ONU

```dart
/// Reboot ONU device
Future<Map<String, dynamic>> rebootOnu({
  required String vpsUrl,
  required String oltId,
  required String ponPort,
  required int onuIndex,
}) async {
  try {
    final response = await http.post(
      Uri.parse('$vpsUrl/api/olt/$oltId/onu/$ponPort/$onuIndex/reboot'),
      headers: {'Content-Type': 'application/json'},
    );
    
    if (response.statusCode == 200) {
      return {'success': true, 'message': 'ONU reboot initiated'};
    }
    return {'success': false, 'message': 'Failed to reboot ONU'};
  } catch (e) {
    return {'success': false, 'message': 'Connection error: $e'};
  }
}
```

### Reset Router (Disconnect PPPoE Session)

```dart
/// Reset PPPoE session (force reconnect)
Future<Map<String, dynamic>> resetRouter({
  required String vpsUrl,
  required String routerId,
  required String pppoeUsername,
}) async {
  try {
    final response = await http.post(
      Uri.parse('$vpsUrl/api/mikrotik/$routerId/disconnect-pppoe'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': pppoeUsername}),
    );
    
    if (response.statusCode == 200) {
      return {'success': true, 'message': 'Session reset successful. Reconnecting...'};
    }
    return {'success': false, 'message': 'Failed to reset session'};
  } catch (e) {
    return {'success': false, 'message': 'Connection error: $e'};
  }
}
```

### Reset ONU

```dart
/// Reset ONU device
Future<Map<String, dynamic>> resetOnu({
  required String vpsUrl,
  required String oltId,
  required String ponPort,
  required int onuIndex,
}) async {
  try {
    final response = await http.post(
      Uri.parse('$vpsUrl/api/olt/$oltId/onu/$ponPort/$onuIndex/reset'),
      headers: {'Content-Type': 'application/json'},
    );
    
    if (response.statusCode == 200) {
      return {'success': true, 'message': 'ONU reset successful'};
    }
    return {'success': false, 'message': 'Failed to reset ONU'};
  } catch (e) {
    return {'success': false, 'message': 'Connection error: $e'};
  }
}
```

### Get Device Status (Combined)

```dart
/// Get complete device status including Router and ONU
Future<Map<String, dynamic>> getFullDeviceStatus({
  required String customerId,
  required String tenantId,
  required String vpsUrl,
}) async {
  try {
    // 1. Get customer details
    final customer = await supabase
        .from('customers')
        .select('''
          pppoe_username,
          mikrotik_id,
          onu_mac,
          router_mac,
          onu_id,
          onu_index,
          pon_port,
          mikrotik:mikrotik_routers(
            id, name, ip_address
          ),
          onu:onus(
            id, name, mac_address, serial_number, rx_power, tx_power, status,
            olt:olts(id, name)
          )
        ''')
        .eq('id', customerId)
        .single();
    
    final result = {
      'pppoeUsername': customer['pppoe_username'],
      'routerMac': customer['router_mac'],
      'onuMac': customer['onu_mac'],
      'router': null,
      'onu': null,
      'session': null,
    };
    
    // 2. Get router info
    if (customer['mikrotik'] != null) {
      result['router'] = {
        'name': customer['mikrotik']['name'],
        'ipAddress': customer['mikrotik']['ip_address'],
      };
    }
    
    // 3. Get ONU info
    if (customer['onu'] != null) {
      final onu = customer['onu'];
      result['onu'] = {
        'name': onu['name'],
        'macAddress': onu['mac_address'],
        'serialNumber': onu['serial_number'],
        'rxPower': onu['rx_power'],
        'txPower': onu['tx_power'],
        'status': onu['status'],
        'oltName': onu['olt']?['name'],
      };
    }
    
    // 4. Get live session info from MikroTik
    if (customer['mikrotik_id'] != null && customer['pppoe_username'] != null) {
      result['session'] = await getConnectionDetails(
        vpsUrl: vpsUrl,
        routerId: customer['mikrotik_id'],
        pppoeUsername: customer['pppoe_username'],
      );
    }
    
    return result;
  } catch (e) {
    print('Error getting device status: $e');
    return {};
  }
}
```

### Signal Quality Helper

```dart
/// Interpret ONU power readings
class SignalQuality {
  static String getRxQuality(double rxPower) {
    if (rxPower >= -25) return 'excellent';
    if (rxPower >= -28) return 'good';
    if (rxPower >= -30) return 'fair';
    return 'poor';
  }
  
  static Color getRxColor(double rxPower) {
    if (rxPower >= -25) return Colors.green;
    if (rxPower >= -28) return Colors.blue;
    if (rxPower >= -30) return Colors.orange;
    return Colors.red;
  }
  
  static String formatPower(double power) {
    return '${power.toStringAsFixed(2)} dBm';
  }
}
```

---

## Package & Recharge

### Get Available Packages

```dart
class PackageService {
  final supabase = Supabase.instance.client;
  
  /// Get all active packages for the tenant
  Future<List<Map<String, dynamic>>> getPackages(String tenantId) async {
    try {
      final packages = await supabase
          .from('isp_packages')
          .select('''
            id,
            name,
            speed,
            price,
            validity_days,
            description,
            features,
            is_featured
          ''')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order', ascending: true);
      
      return List<Map<String, dynamic>>.from(packages);
    } catch (e) {
      print('Error fetching packages: $e');
      return [];
    }
  }
}
```

### Self-Recharge (Package Renewal)

```dart
class RechargeService {
  final supabase = Supabase.instance.client;
  
  /// Recharge options with discounts
  static const List<Map<String, dynamic>> rechargeOptions = [
    {'months': 1, 'label': '1 Month', 'discount': 0},
    {'months': 2, 'label': '2 Months', 'discount': 0},
    {'months': 3, 'label': '3 Months', 'discount': 5},
    {'months': 6, 'label': '6 Months', 'discount': 10},
    {'months': 12, 'label': '12 Months', 'discount': 15},
  ];
  
  /// Calculate recharge pricing
  Map<String, dynamic> calculatePricing({
    required double packagePrice,
    required int months,
    required String? currentExpiry,
    required int validityDays,
  }) {
    final option = rechargeOptions.firstWhere((o) => o['months'] == months);
    final subtotal = packagePrice * months;
    final discountPercent = option['discount'] as int;
    final discountAmount = (subtotal * discountPercent / 100).round();
    final total = subtotal - discountAmount;
    
    // Calculate new expiry date
    DateTime baseDate;
    if (currentExpiry != null) {
      final expiry = DateTime.parse(currentExpiry);
      baseDate = expiry.isAfter(DateTime.now()) ? expiry : DateTime.now();
    } else {
      baseDate = DateTime.now();
    }
    final newExpiry = baseDate.add(Duration(days: validityDays * months));
    
    return {
      'subtotal': subtotal,
      'discountPercent': discountPercent,
      'discountAmount': discountAmount,
      'total': total,
      'newExpiry': newExpiry.toIso8601String().split('T')[0],
    };
  }
  
  /// Process self-recharge after successful payment
  Future<bool> processRecharge({
    required String customerId,
    required String tenantId,
    required double amount,
    required int months,
    required String paymentMethod,
    required String oldExpiry,
    required String newExpiry,
    required double discount,
    required String customerName,
  }) async {
    try {
      // 1. Create recharge record
      await supabase.from('customer_recharges').insert({
        'tenant_id': tenantId,
        'customer_id': customerId,
        'amount': amount,
        'months': months,
        'payment_method': paymentMethod,
        'old_expiry': oldExpiry,
        'new_expiry': newExpiry,
        'discount': discount,
        'notes': 'Mobile app self-recharge',
        'status': 'completed',
        'collected_by_type': 'customer_self',
        'collected_by_name': customerName,
      });
      
      // 2. Update customer record
      await supabase.from('customers').update({
        'expiry_date': newExpiry,
        'last_payment_date': DateTime.now().toIso8601String().split('T')[0],
        'due_amount': 0,
        'status': 'active',
      }).eq('id', customerId);
      
      // 3. Create payment record
      await supabase.from('customer_payments').insert({
        'tenant_id': tenantId,
        'customer_id': customerId,
        'amount': amount,
        'payment_method': paymentMethod,
        'notes': 'Self-recharge for $months month(s)',
      });
      
      return true;
    } catch (e) {
      print('Recharge error: $e');
      return false;
    }
  }
}
```

### Get Recharge History

```dart
/// Get customer recharge history
Future<List<Map<String, dynamic>>> getRechargeHistory(String customerId) async {
  try {
    final recharges = await supabase
        .from('customer_recharges')
        .select('''
          id,
          amount,
          months,
          payment_method,
          old_expiry,
          new_expiry,
          discount,
          status,
          recharge_date,
          collected_by_name
        ''')
        .eq('customer_id', customerId)
        .order('recharge_date', ascending: false)
        .limit(50);
    
    return List<Map<String, dynamic>>.from(recharges);
  } catch (e) {
    print('Error fetching recharge history: $e');
    return [];
  }
}
```

---

## Billing

### Get Bills with Pagination and Filters

```dart
class BillingService {
  final supabase = Supabase.instance.client;
  
  /// Get customer bills with optional filters
  Future<Map<String, dynamic>> getBills({
    required String customerId,
    String? status,
    int? year,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = supabase
          .from('customer_bills')
          .select('''
            id,
            bill_number,
            billing_month,
            bill_date,
            due_date,
            amount,
            total_amount,
            paid_amount,
            status,
            paid_date,
            payment_method
          ''')
          .eq('customer_id', customerId);
      
      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      if (year != null) {
        final startDate = '$year-01-01';
        final endDate = '$year-12-31';
        query = query.gte('bill_date', startDate).lte('bill_date', endDate);
      }
      
      final countQuery = await supabase
          .from('customer_bills')
          .select('id')
          .eq('customer_id', customerId);
      
      final bills = await query
          .order('bill_date', ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      
      return {
        'bills': List<Map<String, dynamic>>.from(bills),
        'total': countQuery.length,
        'page': page,
        'limit': limit,
        'totalPages': (countQuery.length / limit).ceil(),
      };
    } catch (e) {
      print('Error fetching bills: $e');
      return {'bills': [], 'total': 0, 'page': 1, 'totalPages': 0};
    }
  }
  
  /// Get billing statistics
  Future<Map<String, dynamic>> getBillStats(String customerId) async {
    try {
      final bills = await supabase
          .from('customer_bills')
          .select('status, total_amount, paid_amount')
          .eq('customer_id', customerId);
      
      int total = bills.length;
      int paid = 0;
      int unpaid = 0;
      int overdue = 0;
      double totalDue = 0;
      
      for (final bill in bills) {
        switch (bill['status']) {
          case 'paid':
            paid++;
            break;
          case 'unpaid':
            unpaid++;
            totalDue += (bill['total_amount'] ?? 0) - (bill['paid_amount'] ?? 0);
            break;
          case 'overdue':
            overdue++;
            totalDue += (bill['total_amount'] ?? 0) - (bill['paid_amount'] ?? 0);
            break;
        }
      }
      
      return {
        'total': total,
        'paid': paid,
        'unpaid': unpaid,
        'overdue': overdue,
        'totalDue': totalDue,
      };
    } catch (e) {
      return {'total': 0, 'paid': 0, 'unpaid': 0, 'overdue': 0, 'totalDue': 0.0};
    }
  }
}
```

---

## Payment Integration

### Get Available Payment Gateways

```dart
class PaymentService {
  final supabase = Supabase.instance.client;
  
  /// Get enabled payment gateways for tenant
  Future<List<Map<String, dynamic>>> getPaymentGateways(String tenantId) async {
    try {
      final gateways = await supabase
          .from('tenant_payment_gateways')
          .select('''
            id,
            gateway,
            display_name,
            is_enabled,
            sandbox_mode,
            instructions
          ''')
          .eq('tenant_id', tenantId)
          .eq('is_enabled', true)
          .order('sort_order', ascending: true);
      
      return List<Map<String, dynamic>>.from(gateways);
    } catch (e) {
      print('Error fetching gateways: $e');
      return [];
    }
  }
}
```

### Payment Methods Supported

| Gateway | Type | Notes |
|---------|------|-------|
| bkash | Mobile Banking | Most popular in Bangladesh |
| nagad | Mobile Banking | Common alternative |
| rocket | Mobile Banking | DBBL mobile banking |
| sslcommerz | Payment Gateway | Multiple payment options |
| aamarpay | Payment Gateway | BD focused |
| shurjopay | Payment Gateway | BD focused |
| manual | Manual | Cash/bank transfer |

---

## Support Tickets

### Full Ticket Management

```dart
class SupportService {
  final supabase = Supabase.instance.client;
  
  /// Create new support ticket
  Future<Map<String, dynamic>?> createTicket({
    required String tenantId,
    required String customerId,
    required String customerName,
    String? customerPhone,
    String? customerEmail,
    required String subject,
    String? description,
    String? category,
    String priority = 'medium',
  }) async {
    try {
      // Generate ticket number
      final ticketNumber = 'TKT${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';
      
      final ticket = await supabase
          .from('support_tickets')
          .insert({
            'tenant_id': tenantId,
            'ticket_number': ticketNumber,
            'customer_id': customerId,
            'customer_name': customerName,
            'customer_phone': customerPhone,
            'customer_email': customerEmail,
            'subject': subject,
            'description': description,
            'category': category,
            'priority': priority,
            'status': 'open',
          })
          .select()
          .single();
      
      return ticket;
    } catch (e) {
      print('Error creating ticket: $e');
      return null;
    }
  }
  
  /// Get customer tickets with pagination and filters
  Future<Map<String, dynamic>> getTickets({
    required String customerId,
    String? status,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      var query = supabase
          .from('support_tickets')
          .select('''
            id,
            ticket_number,
            subject,
            description,
            status,
            priority,
            category,
            created_at,
            updated_at,
            resolved_at,
            resolution_notes
          ''')
          .eq('customer_id', customerId);
      
      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      final tickets = await query
          .order('created_at', ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      
      return {
        'tickets': List<Map<String, dynamic>>.from(tickets),
        'page': page,
        'limit': limit,
      };
    } catch (e) {
      print('Error fetching tickets: $e');
      return {'tickets': [], 'page': 1, 'limit': limit};
    }
  }
  
  /// Get ticket comments (non-internal only)
  Future<List<Map<String, dynamic>>> getTicketComments(String ticketId) async {
    try {
      final comments = await supabase
          .from('ticket_comments')
          .select('''
            id,
            comment,
            created_by_name,
            created_at
          ''')
          .eq('ticket_id', ticketId)
          .eq('is_internal', false)
          .order('created_at', ascending: true);
      
      return List<Map<String, dynamic>>.from(comments);
    } catch (e) {
      print('Error fetching comments: $e');
      return [];
    }
  }
  
  /// Add reply to ticket
  Future<bool> addReply({
    required String ticketId,
    required String tenantId,
    required String comment,
    required String customerName,
  }) async {
    try {
      await supabase.from('ticket_comments').insert({
        'ticket_id': ticketId,
        'tenant_id': tenantId,
        'comment': comment,
        'is_internal': false,
        'created_by_name': customerName,
      });
      return true;
    } catch (e) {
      print('Error adding reply: $e');
      return false;
    }
  }
  
  /// Get ticket categories
  Future<List<Map<String, dynamic>>> getCategories(String tenantId) async {
    try {
      final categories = await supabase
          .from('ticket_categories')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order');
      
      return List<Map<String, dynamic>>.from(categories);
    } catch (e) {
      return [];
    }
  }
}
```

---

## Live Bandwidth Monitoring

Monitor real-time bandwidth usage from MikroTik router.

### Get Live Bandwidth

```dart
class BandwidthService {
  Timer? _pollingTimer;
  final StreamController<Map<String, dynamic>> _bandwidthController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  Stream<Map<String, dynamic>> get bandwidthStream => _bandwidthController.stream;
  
  /// Start polling for live bandwidth data
  void startMonitoring({
    required String vpsUrl,
    required String routerId,
    required String pppoeUsername,
    int intervalSeconds = 5,
  }) {
    // Initial fetch
    _fetchBandwidth(vpsUrl, routerId, pppoeUsername);
    
    // Start polling
    _pollingTimer = Timer.periodic(
      Duration(seconds: intervalSeconds),
      (_) => _fetchBandwidth(vpsUrl, routerId, pppoeUsername),
    );
  }
  
  void stopMonitoring() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }
  
  Future<void> _fetchBandwidth(String vpsUrl, String routerId, String username) async {
    try {
      final response = await http.get(
        Uri.parse('$vpsUrl/api/mikrotik/$routerId/user-bandwidth/$username'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _bandwidthController.add({
          'downloadMbps': _bytesToMbps(data['rx_byte'] ?? 0),
          'uploadMbps': _bytesToMbps(data['tx_byte'] ?? 0),
          'downloadBytes': data['rx_byte'] ?? 0,
          'uploadBytes': data['tx_byte'] ?? 0,
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      print('Bandwidth fetch error: $e');
    }
  }
  
  double _bytesToMbps(int bytes) {
    return (bytes * 8) / 1000000; // Convert bytes to Mbps
  }
  
  void dispose() {
    stopMonitoring();
    _bandwidthController.close();
  }
}
```

### Bandwidth UI Widget Example

```dart
class BandwidthWidget extends StatefulWidget {
  final String vpsUrl;
  final String routerId;
  final String pppoeUsername;
  
  const BandwidthWidget({
    required this.vpsUrl,
    required this.routerId,
    required this.pppoeUsername,
  });
  
  @override
  State<BandwidthWidget> createState() => _BandwidthWidgetState();
}

class _BandwidthWidgetState extends State<BandwidthWidget> {
  final BandwidthService _bandwidthService = BandwidthService();
  List<Map<String, dynamic>> _history = [];
  
  @override
  void initState() {
    super.initState();
    _bandwidthService.startMonitoring(
      vpsUrl: widget.vpsUrl,
      routerId: widget.routerId,
      pppoeUsername: widget.pppoeUsername,
    );
    
    _bandwidthService.bandwidthStream.listen((data) {
      setState(() {
        _history.add(data);
        if (_history.length > 20) {
          _history.removeAt(0);
        }
      });
    });
  }
  
  @override
  void dispose() {
    _bandwidthService.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final latest = _history.isNotEmpty ? _history.last : null;
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live Bandwidth', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildSpeedIndicator(
                  'Download',
                  latest?['downloadMbps'] ?? 0.0,
                  Colors.green,
                  Icons.arrow_downward,
                ),
                _buildSpeedIndicator(
                  'Upload',
                  latest?['uploadMbps'] ?? 0.0,
                  Colors.blue,
                  Icons.arrow_upward,
                ),
              ],
            ),
            // Add chart here using fl_chart or charts_flutter
          ],
        ),
      ),
    );
  }
  
  Widget _buildSpeedIndicator(String label, double mbps, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        SizedBox(height: 4),
        Text(
          '${mbps.toStringAsFixed(2)} Mbps',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
        ),
        Text(label, style: TextStyle(color: Colors.grey)),
      ],
    );
  }
}
```

### Get Usage Statistics

```dart
/// Get bandwidth usage statistics for a period
Future<Map<String, dynamic>?> getUsageStats({
  required String customerId,
  required String period, // 'day', 'week', 'month'
}) async {
  try {
    // This would typically come from stored bandwidth readings
    DateTime startDate;
    final now = DateTime.now();
    
    switch (period) {
      case 'day':
        startDate = DateTime(now.year, now.month, now.day);
        break;
      case 'week':
        startDate = now.subtract(Duration(days: 7));
        break;
      case 'month':
        startDate = DateTime(now.year, now.month, 1);
        break;
      default:
        startDate = DateTime(now.year, now.month, now.day);
    }
    
    final readings = await supabase
        .from('bandwidth_readings')
        .select('download_bytes, upload_bytes, recorded_at')
        .eq('customer_id', customerId)
        .gte('recorded_at', startDate.toIso8601String())
        .order('recorded_at');
    
    int totalDownload = 0;
    int totalUpload = 0;
    
    for (final reading in readings) {
      totalDownload += reading['download_bytes'] as int? ?? 0;
      totalUpload += reading['upload_bytes'] as int? ?? 0;
    }
    
    return {
      'period': period,
      'totalDownloadGB': totalDownload / (1024 * 1024 * 1024),
      'totalUploadGB': totalUpload / (1024 * 1024 * 1024),
      'totalGB': (totalDownload + totalUpload) / (1024 * 1024 * 1024),
      'readings': readings.length,
    };
  } catch (e) {
    print('Error fetching usage stats: $e');
    return null;
  }
}
```

---

## Realtime Updates

### Subscribe to Profile Changes

```dart
class RealtimeService {
  final supabase = Supabase.instance.client;
  
  /// Subscribe to customer profile updates
  RealtimeChannel subscribeToCustomer(String customerId, Function(Map<String, dynamic>) onUpdate) {
    return supabase
        .channel('customer_$customerId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'customers',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: customerId,
          ),
          callback: (payload) => onUpdate(payload.newRecord),
        )
        .subscribe();
  }
  
  /// Subscribe to new ticket comments
  RealtimeChannel subscribeToTicketComments(String ticketId, Function(Map<String, dynamic>) onNewComment) {
    return supabase
        .channel('ticket_comments_$ticketId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'ticket_comments',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'ticket_id',
            value: ticketId,
          ),
          callback: (payload) {
            // Only show non-internal comments
            if (payload.newRecord['is_internal'] == false) {
              onNewComment(payload.newRecord);
            }
          },
        )
        .subscribe();
  }
  
  /// Unsubscribe from channel
  void unsubscribe(RealtimeChannel channel) {
    supabase.removeChannel(channel);
  }
}
```

---

## Error Handling

### Recommended Error Handling Pattern

```dart
class ApiResult<T> {
  final T? data;
  final String? error;
  final bool success;
  
  ApiResult.success(this.data) : error = null, success = true;
  ApiResult.failure(this.error) : data = null, success = false;
}

class ApiService {
  Future<ApiResult<T>> safeCall<T>(Future<T> Function() operation) async {
    try {
      final result = await operation();
      return ApiResult.success(result);
    } on PostgrestException catch (e) {
      return ApiResult.failure(e.message);
    } on SocketException {
      return ApiResult.failure('No internet connection');
    } catch (e) {
      return ApiResult.failure('An unexpected error occurred');
    }
  }
}

// Usage example:
final result = await apiService.safeCall(() => profileService.getProfile(customerId));
if (result.success) {
  // Use result.data
} else {
  // Show error: result.error
}
```

---

## Complete App Service Example

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class CustomerAppService {
  static final supabase = Supabase.instance.client;
  
  String? _customerId;
  String? _tenantId;
  Map<String, dynamic>? _customerData;
  
  // Auth
  final auth = AuthService();
  final profile = ProfileService();
  final packages = PackageService();
  final recharge = RechargeService();
  final billing = BillingService();
  final support = SupportService();
  final realtime = RealtimeService();
  
  /// Initialize from saved session
  Future<bool> initFromSession() async {
    final session = await auth.getSession();
    if (session != null) {
      _customerId = session['id'];
      _tenantId = session['tenant_id'];
      _customerData = session;
      return true;
    }
    return false;
  }
  
  /// Login
  Future<bool> login(String username, String password) async {
    final customer = await auth.login(username, password);
    if (customer != null) {
      _customerId = customer['id'];
      _tenantId = customer['tenant_id'];
      _customerData = customer;
      return true;
    }
    return false;
  }
  
  /// Get current customer ID
  String? get customerId => _customerId;
  String? get tenantId => _tenantId;
  Map<String, dynamic>? get customerData => _customerData;
  
  /// Logout
  Future<void> logout() async {
    await auth.logout();
    _customerId = null;
    _tenantId = null;
    _customerData = null;
  }
}
```

---

## Complete Device Management Example

```dart
class CustomerDeviceManager {
  final DeviceService _deviceService = DeviceService();
  final BandwidthService _bandwidthService = BandwidthService();
  
  String? _vpsUrl;
  Map<String, dynamic>? _deviceStatus;
  
  /// Initialize device management
  Future<void> initialize(String tenantId) async {
    _vpsUrl = await _deviceService.getVpsUrl(tenantId);
  }
  
  /// Get all device information
  Future<Map<String, dynamic>> getDeviceInfo(String customerId, String tenantId) async {
    if (_vpsUrl == null) {
      return {'error': 'VPS not configured'};
    }
    
    _deviceStatus = await _deviceService.getFullDeviceStatus(
      customerId: customerId,
      tenantId: tenantId,
      vpsUrl: _vpsUrl!,
    );
    
    return _deviceStatus ?? {};
  }
  
  /// Start bandwidth monitoring
  void startBandwidthMonitoring(String routerId, String username) {
    if (_vpsUrl == null) return;
    
    _bandwidthService.startMonitoring(
      vpsUrl: _vpsUrl!,
      routerId: routerId,
      pppoeUsername: username,
    );
  }
  
  /// Reboot user's router
  Future<Map<String, dynamic>> rebootMyRouter() async {
    if (_vpsUrl == null || _deviceStatus == null) {
      return {'success': false, 'message': 'Not initialized'};
    }
    
    return await _deviceService.rebootRouter(
      vpsUrl: _vpsUrl!,
      routerId: _deviceStatus!['router']?['id'] ?? '',
      pppoeUsername: _deviceStatus!['pppoeUsername'] ?? '',
    );
  }
  
  /// Reset PPPoE session
  Future<Map<String, dynamic>> resetMyConnection() async {
    if (_vpsUrl == null || _deviceStatus == null) {
      return {'success': false, 'message': 'Not initialized'};
    }
    
    return await _deviceService.resetRouter(
      vpsUrl: _vpsUrl!,
      routerId: _deviceStatus!['router']?['id'] ?? '',
      pppoeUsername: _deviceStatus!['pppoeUsername'] ?? '',
    );
  }
  
  /// Reboot ONU
  Future<Map<String, dynamic>> rebootMyOnu() async {
    if (_vpsUrl == null || _deviceStatus == null) {
      return {'success': false, 'message': 'Not initialized'};
    }
    
    final onu = _deviceStatus!['onu'];
    if (onu == null) {
      return {'success': false, 'message': 'No ONU configured'};
    }
    
    return await _deviceService.rebootOnu(
      vpsUrl: _vpsUrl!,
      oltId: onu['oltId'] ?? '',
      ponPort: onu['ponPort'] ?? '',
      onuIndex: onu['onuIndex'] ?? 0,
    );
  }
  
  void dispose() {
    _bandwidthService.dispose();
  }
}
```

---

## API Endpoints Summary

### Supabase Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `customers` | Customer profiles | id, tenant_id, pppoe_username, status, expiry_date |
| `isp_packages` | Available packages | id, name, speed, price, validity_days |
| `customer_recharges` | Recharge history | customer_id, amount, months, new_expiry |
| `customer_bills` | Billing history | customer_id, bill_number, status, amount |
| `customer_payments` | Payment records | customer_id, amount, payment_method |
| `support_tickets` | Support tickets | customer_id, ticket_number, status, subject |
| `ticket_comments` | Ticket replies | ticket_id, comment, created_by_name |
| `tenants` | ISP settings | id, vps_url, name |
| `mikrotik_routers` | Router config | id, name, ip_address |
| `onus` | ONU devices | id, mac_address, rx_power, tx_power |
| `olts` | OLT devices | id, name, ip_address |

### VPS Polling Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mikrotik/:routerId/pppoe-sessions` | GET | Get active PPPoE sessions |
| `/api/mikrotik/:routerId/user-bandwidth/:username` | GET | Get live bandwidth for user |
| `/api/mikrotik/:routerId/reboot-user` | POST | Reboot user's router |
| `/api/mikrotik/:routerId/disconnect-pppoe` | POST | Reset PPPoE session |
| `/api/mikrotik/:routerId/enable-pppoe` | POST | Enable PPPoE user |
| `/api/olt/:oltId/onu/:ponPort/:onuIndex/info` | GET | Get ONU details |
| `/api/olt/:oltId/onu/:ponPort/:onuIndex/reboot` | POST | Reboot ONU |
| `/api/olt/:oltId/onu/:ponPort/:onuIndex/reset` | POST | Reset ONU |

### RPC Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `authenticate_customer_global` | Login with PPPoE | p_username, p_password |
| `authenticate_customer` | Login for specific tenant | p_tenant_id, p_username, p_password |

---

## Security Notes

1. **No Edge Functions Required**: All operations use Supabase client directly
2. **RLS Policies**: Data access is controlled through Row Level Security policies
3. **Session Storage**: Use secure storage for customer sessions on mobile
4. **Password Handling**: Passwords are compared server-side via RPC functions
5. **Realtime Subscriptions**: Auto-filter to customer's own data only
6. **VPS Communication**: Device management goes through authenticated VPS polling server
7. **Rate Limiting**: Implement rate limiting for device control operations

---

## Dependencies

### Flutter/Dart

```yaml
dependencies:
  supabase_flutter: ^2.0.0
  shared_preferences: ^2.2.0
  http: ^1.1.0
  fl_chart: ^0.65.0  # For bandwidth graphs
```

### Android (Kotlin)

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.0")
    implementation("io.ktor:ktor-client-android:2.3.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.github.PhilJay:MPAndroidChart:v3.1.0") // For graphs
}
```

---

## Support

For integration support, contact your ISP administrator or refer to the main documentation.

### Quick Start Checklist

1. ✅ Set up Supabase client with project URL and anon key
2. ✅ Implement authentication using `authenticate_customer_global` RPC
3. ✅ Store customer session securely
4. ✅ Fetch customer profile with package and area details
5. ✅ Get VPS URL from tenant settings
6. ✅ Implement device status fetching
7. ✅ Add recharge functionality with payment integration
8. ✅ Implement support ticket system
9. ✅ Add live bandwidth monitoring
10. ✅ Set up realtime subscriptions for updates
