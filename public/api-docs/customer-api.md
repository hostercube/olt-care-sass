# Customer Mobile App - Complete API Documentation

This document provides comprehensive API documentation for integrating a customer mobile app (Android/iOS) with the ISP Management System. The app communicates directly with the Supabase backend.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [Customer Profile](#customer-profile)
4. [Package & Recharge](#package--recharge)
5. [Billing](#billing)
6. [Payment Integration](#payment-integration)
7. [Support Tickets](#support-tickets)
8. [Realtime Updates](#realtime-updates)
9. [Error Handling](#error-handling)

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

## Security Notes

1. **No Edge Functions Required**: All operations use Supabase client directly
2. **RLS Policies**: Data access is controlled through Row Level Security policies
3. **Session Storage**: Use secure storage for customer sessions on mobile
4. **Password Handling**: Passwords are compared server-side via RPC functions
5. **Realtime Subscriptions**: Auto-filter to customer's own data only

---

## Support

For integration support, contact your ISP administrator or refer to the main documentation.
