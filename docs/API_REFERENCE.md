# API Reference

## Overview

The OLT Monitor SaaS platform uses Supabase as its backend, providing a RESTful API through the Supabase client. This document covers all available API operations organized by module.

## Authentication

All API calls require authentication via Supabase Auth. The platform supports email/password authentication.

### Sign Up
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    emailRedirectTo: `${window.location.origin}/`
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

## Tenants API

### List All Tenants (Super Admin)
```typescript
const { data, error } = await supabase
  .from('tenants')
  .select('*')
  .order('created_at', { ascending: false });
```

### Get Tenant by ID
```typescript
const { data, error } = await supabase
  .from('tenants')
  .select('*')
  .eq('id', tenantId)
  .single();
```

### Create Tenant
```typescript
const { data, error } = await supabase
  .from('tenants')
  .insert({
    name: 'ISP Name',
    email: 'contact@isp.com',
    phone: '+880123456789',
    status: 'trial',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();
```

### Update Tenant
```typescript
const { data, error } = await supabase
  .from('tenants')
  .update({
    status: 'active',
    max_olts: 10
  })
  .eq('id', tenantId)
  .select()
  .single();
```

### Suspend Tenant
```typescript
const { error } = await supabase
  .from('tenants')
  .update({
    status: 'suspended',
    suspended_at: new Date().toISOString(),
    suspended_reason: 'Non-payment'
  })
  .eq('id', tenantId);
```

---

## Packages API

### List Active Packages
```typescript
const { data, error } = await supabase
  .from('packages')
  .select('*')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

### Create Package (Super Admin)
```typescript
const { data, error } = await supabase
  .from('packages')
  .insert({
    name: 'Professional',
    description: 'For growing ISPs',
    price_monthly: 2999,
    price_yearly: 29990,
    max_olts: 5,
    max_onus: 500,
    max_users: 10,
    features: {
      sms_alerts: true,
      email_alerts: true,
      api_access: true
    }
  })
  .select()
  .single();
```

### Update Package
```typescript
const { error } = await supabase
  .from('packages')
  .update({
    price_monthly: 3499,
    is_active: true
  })
  .eq('id', packageId);
```

---

## Subscriptions API

### Get Tenant Subscriptions
```typescript
const { data, error } = await supabase
  .from('subscriptions')
  .select(`
    *,
    packages (*)
  `)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });
```

### Create Subscription
```typescript
const { data, error } = await supabase
  .from('subscriptions')
  .insert({
    tenant_id: tenantId,
    package_id: packageId,
    billing_cycle: 'monthly',
    amount: 2999,
    status: 'pending',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();
```

### Activate Subscription
```typescript
const { error } = await supabase
  .from('subscriptions')
  .update({
    status: 'active'
  })
  .eq('id', subscriptionId);
```

---

## Payments API

### List Payments
```typescript
const { data, error } = await supabase
  .from('payments')
  .select(`
    *,
    tenants (name, email)
  `)
  .order('created_at', { ascending: false });
```

### Create Payment
```typescript
const { data, error } = await supabase
  .from('payments')
  .insert({
    tenant_id: tenantId,
    subscription_id: subscriptionId,
    amount: 2999,
    payment_method: 'bkash',
    transaction_id: 'TXN123456',
    status: 'pending'
  })
  .select()
  .single();
```

### Verify Payment (Super Admin)
```typescript
const { error } = await supabase
  .from('payments')
  .update({
    status: 'completed',
    verified_at: new Date().toISOString(),
    verified_by: adminUserId,
    paid_at: new Date().toISOString()
  })
  .eq('id', paymentId);
```

### Reject Payment
```typescript
const { error } = await supabase
  .from('payments')
  .update({
    status: 'failed',
    notes: 'Invalid transaction ID'
  })
  .eq('id', paymentId);
```

---

## OLTs API

### List OLTs
```typescript
// For tenants (filtered by RLS)
const { data, error } = await supabase
  .from('olts')
  .select('*')
  .order('created_at', { ascending: false });

// With tenant filter (for super admin views)
const { data, error } = await supabase
  .from('olts')
  .select('*')
  .eq('tenant_id', tenantId);
```

### Create OLT
```typescript
const { data, error } = await supabase
  .from('olts')
  .insert({
    tenant_id: tenantId,
    name: 'Main OLT',
    ip_address: '192.168.1.100',
    port: 22,
    username: 'admin',
    password_encrypted: encryptedPassword,
    brand: 'ZTE',
    olt_mode: 'GPON'
  })
  .select()
  .single();
```

### Update OLT
```typescript
const { error } = await supabase
  .from('olts')
  .update({
    status: 'online',
    last_polled: new Date().toISOString()
  })
  .eq('id', oltId);
```

### Delete OLT
```typescript
const { error } = await supabase
  .from('olts')
  .delete()
  .eq('id', oltId);
```

---

## ONUs API

### List ONUs by OLT
```typescript
const { data, error } = await supabase
  .from('onus')
  .select('*')
  .eq('olt_id', oltId)
  .order('pon_port', { ascending: true });
```

### Search ONUs
```typescript
const { data, error } = await supabase
  .from('onus')
  .select('*, olts(name)')
  .or(`name.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,pppoe_username.ilike.%${searchTerm}%`);
```

### Update ONU
```typescript
const { error } = await supabase
  .from('onus')
  .update({
    pppoe_username: 'customer_username',
    router_name: 'Customer Router'
  })
  .eq('id', onuId);
```

### Bulk Upsert ONUs (from polling)
```typescript
const { error } = await supabase
  .from('onus')
  .upsert(onuDataArray, {
    onConflict: 'olt_id,pon_port,onu_index'
  });
```

---

## Alerts API

### List Alerts
```typescript
const { data, error } = await supabase
  .from('alerts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

### Get Unread Alert Count
```typescript
const { count, error } = await supabase
  .from('alerts')
  .select('*', { count: 'exact', head: true })
  .eq('is_read', false);
```

### Mark Alert as Read
```typescript
const { error } = await supabase
  .from('alerts')
  .update({ is_read: true })
  .eq('id', alertId);
```

### Mark All Alerts as Read
```typescript
const { error } = await supabase
  .from('alerts')
  .update({ is_read: true })
  .eq('is_read', false);
```

---

## Power Readings API

### Get ONU Power History
```typescript
const { data, error } = await supabase
  .from('power_readings')
  .select('*')
  .eq('onu_id', onuId)
  .order('recorded_at', { ascending: false })
  .limit(100);
```

### Insert Power Reading
```typescript
const { error } = await supabase
  .from('power_readings')
  .insert({
    onu_id: onuId,
    rx_power: -22.5,
    tx_power: 2.1
  });
```

---

## User Roles API

### Get User Role
```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();
```

### Check Super Admin Status
```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('role', 'super_admin')
  .maybeSingle();

const isSuperAdmin = !!data;
```

### Assign Role (Admin only)
```typescript
const { error } = await supabase
  .from('user_roles')
  .upsert({
    user_id: userId,
    role: 'operator'
  });
```

---

## Activity Logs API

### Log Activity
```typescript
const { error } = await supabase
  .from('activity_logs')
  .insert({
    tenant_id: tenantId,
    user_id: userId,
    action: 'olt.created',
    entity_type: 'olt',
    entity_id: oltId,
    details: { name: 'Main OLT' }
  });
```

### Get Activity Logs
```typescript
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## Realtime Subscriptions

### Subscribe to ONU Changes
```typescript
const channel = supabase
  .channel('onu-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'onus'
    },
    (payload) => {
      console.log('ONU change:', payload);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

### Subscribe to Alerts
```typescript
const channel = supabase
  .channel('new-alerts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts'
    },
    (payload) => {
      showNotification(payload.new);
    }
  )
  .subscribe();
```

---

## Error Handling

All API calls should handle errors appropriately:

```typescript
const { data, error } = await supabase
  .from('olts')
  .select('*');

if (error) {
  console.error('Error fetching OLTs:', error.message);
  toast({
    title: 'Error',
    description: 'Failed to fetch OLTs',
    variant: 'destructive'
  });
  return;
}

// Use data
```

### Common Error Codes

| Code | Description |
|------|-------------|
| PGRST116 | No rows returned (use `.maybeSingle()`) |
| 23505 | Unique constraint violation |
| 42501 | RLS policy violation |
| 23503 | Foreign key violation |

---

## Rate Limits

Supabase imposes rate limits based on your plan. For high-volume operations like polling, implement appropriate delays and batch operations.
