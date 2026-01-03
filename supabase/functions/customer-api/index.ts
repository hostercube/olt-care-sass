import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/customer-api', '');
    const tenantId = req.headers.get('x-tenant-id');

    // Parse request body if present
    let body: any = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // ============================================
    // AUTHENTICATION ENDPOINTS
    // ============================================

    // POST /auth/login - Customer login
    if (path === '/auth/login' && req.method === 'POST') {
      const { username, customer_code, phone } = body;

      if (!customer_code || (!username && !phone)) {
        return jsonResponse({ success: false, error: 'Missing credentials' }, 400);
      }

      let query = supabase
        .from('customers')
        .select(`
          id, name, phone, email, customer_code, status, 
          pppoe_username, monthly_bill, due_amount, expiry_date,
          package:isp_packages(id, name, download_speed, upload_speed, speed_unit),
          area:areas(id, name)
        `)
        .eq('customer_code', customer_code);

      if (username) {
        query = query.eq('pppoe_username', username);
      } else if (phone) {
        query = query.eq('phone', phone);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return jsonResponse({ success: false, error: 'Invalid credentials' }, 401);
      }

      // Generate session token
      const token = btoa(JSON.stringify({ id: data.id, exp: Date.now() + 86400000 * 30 }));

      return jsonResponse({
        success: true,
        data: {
          token,
          customer: data
        }
      });
    }

    // POST /auth/verify - Verify token
    if (path === '/auth/verify' && req.method === 'POST') {
      const { token } = body;
      try {
        const decoded = JSON.parse(atob(token));
        if (decoded.exp < Date.now()) {
          return jsonResponse({ success: false, error: 'Token expired' }, 401);
        }

        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, status')
          .eq('id', decoded.id)
          .single();

        return jsonResponse({ success: true, data: { valid: !!customer, customer } });
      } catch {
        return jsonResponse({ success: false, error: 'Invalid token' }, 401);
      }
    }

    // ============================================
    // CUSTOMER PROFILE ENDPOINTS
    // ============================================

    // GET /profile - Get customer profile
    if (path === '/profile' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, name, phone, email, address, customer_code, status,
          pppoe_username, onu_mac, router_mac, pon_port,
          monthly_bill, due_amount, expiry_date, connection_date,
          package:isp_packages(id, name, download_speed, upload_speed, speed_unit, price),
          area:areas(id, name, district, upazila, union_name, village)
        `)
        .eq('id', customerId)
        .single();

      if (error) {
        return jsonResponse({ success: false, error: 'Customer not found' }, 404);
      }

      return jsonResponse({ success: true, data });
    }

    // PUT /profile - Update customer profile (limited fields)
    if (path === '/profile' && req.method === 'PUT') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Only allow updating certain fields
      const allowedFields = ['phone', 'email', 'address'];
      const updates: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        return jsonResponse({ success: false, error: 'Update failed' }, 400);
      }

      return jsonResponse({ success: true, data, message: 'Profile updated' });
    }

    // ============================================
    // NETWORK STATUS ENDPOINTS
    // ============================================

    // GET /network/status - Get real-time network status
    if (path === '/network/status' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Get customer with ONU data
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          id, status, pppoe_username, onu_id, mikrotik_id, onu_mac
        `)
        .eq('id', customerId)
        .single();

      if (!customer) {
        return jsonResponse({ success: false, error: 'Customer not found' }, 404);
      }

      // Get ONU data if exists
      let onuData: any = null;
      if (customer.onu_id) {
        const { data: onu } = await supabase
          .from('onus')
          .select('id, status, rx_power, tx_power, last_online, last_offline, alive_time, mac_address')
          .eq('id', customer.onu_id)
          .single();
        onuData = onu;
      }

      // Simulated real-time data (in production, fetch from MikroTik API)
      const networkStatus = {
        is_online: customer.status === 'active',
        uptime: onuData?.alive_time || '0d 0h 0m',
        rx_bandwidth: Math.floor(Math.random() * 100), // Mbps
        tx_bandwidth: Math.floor(Math.random() * 30), // Mbps
        total_download: Math.floor(Math.random() * 100000000000), // bytes
        total_upload: Math.floor(Math.random() * 20000000000), // bytes
        ip_address: '192.168.1.' + Math.floor(Math.random() * 255),
        mac_address: onuData?.mac_address || customer.onu_mac || 'N/A',
        onu_status: onuData?.status || 'unknown',
        onu_rx_power: onuData?.rx_power,
        onu_tx_power: onuData?.tx_power,
        last_online: onuData?.last_online,
        last_offline: onuData?.last_offline,
      };

      return jsonResponse({ success: true, data: networkStatus });
    }

    // GET /network/bandwidth - Get bandwidth history
    if (path === '/network/bandwidth' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Generate sample bandwidth data (in production, fetch from MikroTik/logs)
      const data = [];
      const now = Date.now();
      for (let i = 60; i >= 0; i--) {
        data.push({
          timestamp: new Date(now - i * 60000).toISOString(),
          rx_mbps: Math.floor(Math.random() * 50),
          tx_mbps: Math.floor(Math.random() * 15),
        });
      }

      return jsonResponse({ success: true, data });
    }

    // ============================================
    // BILLING ENDPOINTS
    // ============================================

    // GET /bills - Get customer bills
    if (path === '/bills' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const status = url.searchParams.get('status');

      let query = supabase
        .from('customer_bills')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId)
        .order('bill_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      return jsonResponse({
        success: true,
        data: {
          bills: data,
          pagination: { total: count, limit, offset }
        }
      });
    }

    // GET /bills/:id - Get single bill
    if (path.match(/^\/bills\/[a-z0-9-]+$/) && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const billId = path.split('/').pop();
      const { data, error } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('id', billId)
        .eq('customer_id', customerId)
        .single();

      if (error || !data) {
        return jsonResponse({ success: false, error: 'Bill not found' }, 404);
      }

      return jsonResponse({ success: true, data });
    }

    // ============================================
    // PAYMENT ENDPOINTS
    // ============================================

    // GET /payments - Get payment history
    if (path === '/payments' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error, count } = await supabase
        .from('customer_payments')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      return jsonResponse({
        success: true,
        data: {
          payments: data,
          pagination: { total: count, limit, offset }
        }
      });
    }

    // POST /payments/initiate - Initiate online payment
    if (path === '/payments/initiate' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const { amount, payment_method, bill_id } = body;

      if (!amount || !payment_method) {
        return jsonResponse({ success: false, error: 'Amount and payment method required' }, 400);
      }

      // Get customer
      const { data: customer } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', customerId)
        .single();

      if (!customer) {
        return jsonResponse({ success: false, error: 'Customer not found' }, 404);
      }

      // Create pending payment record
      const { data: payment, error } = await supabase
        .from('customer_payments')
        .insert({
          customer_id: customerId,
          tenant_id: customer.tenant_id,
          amount,
          payment_method,
          bill_id,
        })
        .select()
        .single();

      if (error) {
        return jsonResponse({ success: false, error: 'Payment initiation failed' }, 400);
      }

      // In production, integrate with payment gateway here
      return jsonResponse({
        success: true,
        data: {
          payment_id: payment.id,
          amount,
          status: 'pending',
          // payment_url: 'https://gateway.com/pay/...' // Gateway redirect URL
        },
        message: 'Payment initiated'
      });
    }

    // ============================================
    // DEVICE CONTROL ENDPOINTS
    // ============================================

    // POST /device/reboot-router - Reboot customer router
    if (path === '/device/reboot-router' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // In production, send reboot command to MikroTik
      // This is a placeholder
      return jsonResponse({
        success: true,
        message: 'Router reboot command sent. Please wait 1-2 minutes.',
        data: { command: 'reboot', status: 'sent' }
      });
    }

    // POST /device/reboot-onu - Reboot ONU
    if (path === '/device/reboot-onu' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Get customer ONU
      const { data: customer } = await supabase
        .from('customers')
        .select('onu_id')
        .eq('id', customerId)
        .single();

      if (!customer?.onu_id) {
        return jsonResponse({ success: false, error: 'ONU not assigned' }, 400);
      }

      // In production, send reboot command to OLT
      return jsonResponse({
        success: true,
        message: 'ONU reboot command sent. Please wait 2-3 minutes.',
        data: { command: 'reboot_onu', status: 'sent' }
      });
    }

    // POST /device/disconnect - Disconnect current session
    if (path === '/device/disconnect' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // In production, disconnect PPPoE session from MikroTik
      return jsonResponse({
        success: true,
        message: 'Session disconnected. Reconnecting...',
        data: { command: 'disconnect', status: 'sent' }
      });
    }

    // ============================================
    // PACKAGE ENDPOINTS
    // ============================================

    // GET /packages - Get available packages
    if (path === '/packages' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Get customer tenant
      const { data: customer } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', customerId)
        .single();

      if (!customer) {
        return jsonResponse({ success: false, error: 'Customer not found' }, 404);
      }

      const { data: packages } = await supabase
        .from('isp_packages')
        .select('id, name, description, download_speed, upload_speed, speed_unit, price, validity_days')
        .eq('tenant_id', customer.tenant_id)
        .eq('is_active', true)
        .order('sort_order');

      return jsonResponse({ success: true, data: packages || [] });
    }

    // POST /packages/change - Request package change
    if (path === '/packages/change' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const { package_id } = body;
      if (!package_id) {
        return jsonResponse({ success: false, error: 'Package ID required' }, 400);
      }

      // In production, create a package change request
      return jsonResponse({
        success: true,
        message: 'Package change request submitted. Our team will contact you shortly.',
        data: { request_type: 'package_change', package_id }
      });
    }

    // ============================================
    // SUPPORT ENDPOINTS
    // ============================================

    // GET /support/tickets - Get support tickets (if enabled)
    if (path === '/support/tickets' && req.method === 'GET') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      // Placeholder - implement when support tickets table exists
      return jsonResponse({ success: true, data: [] });
    }

    // POST /support/tickets - Create support ticket
    if (path === '/support/tickets' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const { subject, message, category } = body;
      if (!subject || !message) {
        return jsonResponse({ success: false, error: 'Subject and message required' }, 400);
      }

      // Placeholder - implement when support tickets table exists
      return jsonResponse({
        success: true,
        message: 'Support ticket created',
        data: { ticket_id: 'TKT-' + Date.now() }
      });
    }

    // ============================================
    // RECHARGE ENDPOINTS
    // ============================================

    // POST /recharge - Recharge account
    if (path === '/recharge' && req.method === 'POST') {
      const customerId = getCustomerIdFromAuth(req);
      if (!customerId) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }

      const { amount, payment_method, months } = body;

      if (!amount || !payment_method) {
        return jsonResponse({ success: false, error: 'Amount and payment method required' }, 400);
      }

      // Get customer
      const { data: customer } = await supabase
        .from('customers')
        .select('tenant_id, monthly_bill')
        .eq('id', customerId)
        .single();

      if (!customer) {
        return jsonResponse({ success: false, error: 'Customer not found' }, 404);
      }

      // Create payment
      const { data: payment, error } = await supabase
        .from('customer_payments')
        .insert({
          customer_id: customerId,
          tenant_id: customer.tenant_id,
          amount,
          payment_method,
          notes: `Recharge for ${months || 1} month(s)`
        })
        .select()
        .single();

      if (error) {
        return jsonResponse({ success: false, error: 'Recharge failed' }, 400);
      }

      return jsonResponse({
        success: true,
        message: 'Recharge initiated',
        data: { payment_id: payment.id, amount, status: 'pending' }
      });
    }

    // 404 for unknown endpoints
    return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);

  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});

// Helper functions
function jsonResponse(data: ApiResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function getCustomerIdFromAuth(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(atob(token));
    if (decoded.exp < Date.now()) return null;
    return decoded.id;
  } catch {
    return null;
  }
}
