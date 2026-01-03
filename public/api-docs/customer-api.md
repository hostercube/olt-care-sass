# Customer Mobile App - Supabase Direct Integration

This document provides the API documentation for integrating a customer mobile app directly with Supabase. No edge functions are used - all operations are performed directly through the Supabase client.

## Setup

### Dependencies (Flutter/Dart)

```yaml
dependencies:
  supabase_flutter: ^2.0.0
```

### Initialize Supabase

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

### Customer Login

Customers login using their phone number and customer code. First verify the customer exists, then use Supabase Auth.

```dart
class CustomerAuthService {
  final supabase = Supabase.instance.client;
  
  /// Login with phone and customer code
  Future<Map<String, dynamic>?> login(String phone, String customerCode) async {
    // Verify customer exists
    final customer = await supabase
        .from('customers')
        .select('id, name, email, phone, customer_code, tenant_id')
        .eq('phone', phone)
        .eq('customer_code', customerCode)
        .single();
    
    if (customer == null) {
      throw Exception('Invalid credentials');
    }
    
    // Store customer info locally
    return customer;
  }
}
```

---

## Customer Profile

### Get Customer Profile

```dart
class CustomerProfileService {
  final supabase = Supabase.instance.client;
  
  /// Get full customer profile with package details
  Future<Map<String, dynamic>> getProfile(String customerId) async {
    final customer = await supabase
        .from('customers')
        .select('''
          *,
          package:isp_packages(*),
          area:areas(*),
          onu:onus(*)
        ''')
        .eq('id', customerId)
        .single();
    
    return customer;
  }
}
```

---

## Billing

### Get Customer Bills

```dart
class BillingService {
  final supabase = Supabase.instance.client;
  
  /// Get all bills for customer
  Future<List<Map<String, dynamic>>> getBills(String customerId) async {
    final bills = await supabase
        .from('customer_bills')
        .select()
        .eq('customer_id', customerId)
        .order('bill_date', ascending: false);
    
    return List<Map<String, dynamic>>.from(bills);
  }
  
  /// Get unpaid bills
  Future<List<Map<String, dynamic>>> getUnpaidBills(String customerId) async {
    final bills = await supabase
        .from('customer_bills')
        .select()
        .eq('customer_id', customerId)
        .neq('status', 'paid')
        .order('due_date', ascending: true);
    
    return List<Map<String, dynamic>>.from(bills);
  }
}
```

---

## Payments

### Get Payment History

```dart
class PaymentService {
  final supabase = Supabase.instance.client;
  
  /// Get all payments for customer
  Future<List<Map<String, dynamic>>> getPayments(String customerId) async {
    final payments = await supabase
        .from('customer_payments')
        .select()
        .eq('customer_id', customerId)
        .order('payment_date', ascending: false);
    
    return List<Map<String, dynamic>>.from(payments);
  }
}
```

---

## ISP Packages

### Get Available Packages

```dart
class PackageService {
  final supabase = Supabase.instance.client;
  
  /// Get all active packages for tenant
  Future<List<Map<String, dynamic>>> getPackages(String tenantId) async {
    final packages = await supabase
        .from('isp_packages')
        .select()
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order', ascending: true);
    
    return List<Map<String, dynamic>>.from(packages);
  }
}
```

---

## ONU Information

### Get ONU Details

```dart
class ONUService {
  final supabase = Supabase.instance.client;
  
  /// Get ONU details for customer
  Future<Map<String, dynamic>?> getONUDetails(String onuId) async {
    final onu = await supabase
        .from('onus')
        .select('*, olt:olts(name, ip_address, brand)')
        .eq('id', onuId)
        .single();
    
    return onu;
  }
  
  /// Get ONU power readings
  Future<List<Map<String, dynamic>>> getONUPowerReadings(String onuId) async {
    final readings = await supabase
        .from('power_readings')
        .select()
        .eq('onu_id', onuId)
        .order('recorded_at', ascending: false)
        .limit(100);
    
    return List<Map<String, dynamic>>.from(readings);
  }
}
```

---

## Realtime Subscriptions

### Subscribe to Updates

```dart
class RealtimeService {
  final supabase = Supabase.instance.client;
  
  /// Subscribe to customer profile changes
  RealtimeChannel subscribeToCustomer(String customerId, Function(dynamic) onUpdate) {
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
  
  /// Subscribe to ONU status changes
  RealtimeChannel subscribeToONUStatus(String onuId, Function(dynamic) onStatusChange) {
    return supabase
        .channel('onu_$onuId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'onus',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: onuId,
          ),
          callback: (payload) => onStatusChange(payload.newRecord),
        )
        .subscribe();
  }
}
```

---

## Complete Flutter Service Example

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class CustomerAppService {
  static final supabase = Supabase.instance.client;
  
  String? _customerId;
  String? _tenantId;
  Map<String, dynamic>? _customerData;
  
  /// Initialize with customer credentials
  Future<bool> login(String phone, String customerCode) async {
    try {
      final customer = await supabase
          .from('customers')
          .select('''
            *,
            package:isp_packages(*),
            area:areas(*),
            onu:onus(*)
          ''')
          .eq('phone', phone)
          .eq('customer_code', customerCode)
          .single();
      
      if (customer != null) {
        _customerId = customer['id'];
        _tenantId = customer['tenant_id'];
        _customerData = customer;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /// Get current customer data
  Map<String, dynamic>? get customerData => _customerData;
  
  /// Refresh customer data
  Future<void> refreshProfile() async {
    if (_customerId == null) return;
    
    _customerData = await supabase
        .from('customers')
        .select('''
          *,
          package:isp_packages(*),
          area:areas(*),
          onu:onus(*)
        ''')
        .eq('id', _customerId!)
        .single();
  }
  
  /// Get bills
  Future<List<Map<String, dynamic>>> getBills() async {
    if (_customerId == null) return [];
    
    final bills = await supabase
        .from('customer_bills')
        .select()
        .eq('customer_id', _customerId!)
        .order('bill_date', ascending: false);
    
    return List<Map<String, dynamic>>.from(bills);
  }
  
  /// Get payments
  Future<List<Map<String, dynamic>>> getPayments() async {
    if (_customerId == null) return [];
    
    final payments = await supabase
        .from('customer_payments')
        .select()
        .eq('customer_id', _customerId!)
        .order('payment_date', ascending: false);
    
    return List<Map<String, dynamic>>.from(payments);
  }
  
  /// Get available packages
  Future<List<Map<String, dynamic>>> getPackages() async {
    if (_tenantId == null) return [];
    
    final packages = await supabase
        .from('isp_packages')
        .select()
        .eq('tenant_id', _tenantId!)
        .eq('is_active', true)
        .order('sort_order');
    
    return List<Map<String, dynamic>>.from(packages);
  }
  
  /// Logout
  void logout() {
    _customerId = null;
    _tenantId = null;
    _customerData = null;
  }
}
```

---

## Notes

1. **No Edge Functions**: All operations are performed directly through Supabase client
2. **RLS Policies**: Data access is controlled through Row Level Security policies
3. **Realtime**: Use Supabase realtime subscriptions for live updates
4. **Authentication**: Customer authentication is based on phone + customer_code matching
