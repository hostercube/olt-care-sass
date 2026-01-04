import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PaymentRequest {
  gateway: string;
  amount: number;
  tenant_id: string;
  invoice_id?: string;
  customer_id?: string;
  description?: string;
  return_url: string;
  cancel_url: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_for: 'subscription' | 'customer_bill';
}

// SSLCommerz initiate
async function initiateSSLCommerz(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  const formData = new FormData();
  formData.append('store_id', gatewayConfig.store_id);
  formData.append('store_passwd', gatewayConfig.store_password);
  formData.append('total_amount', payment.amount.toString());
  formData.append('currency', 'BDT');
  formData.append('tran_id', paymentId);
  formData.append('success_url', `${supabaseUrl}/functions/v1/payment-callback?gateway=sslcommerz&status=success`);
  formData.append('fail_url', `${supabaseUrl}/functions/v1/payment-callback?gateway=sslcommerz&status=fail`);
  formData.append('cancel_url', `${supabaseUrl}/functions/v1/payment-callback?gateway=sslcommerz&status=cancel`);
  formData.append('ipn_url', `${supabaseUrl}/functions/v1/payment-callback?gateway=sslcommerz&status=ipn`);
  formData.append('cus_name', payment.customer_name || 'Customer');
  formData.append('cus_email', payment.customer_email || 'customer@example.com');
  formData.append('cus_phone', payment.customer_phone || '01700000000');
  formData.append('cus_add1', 'Bangladesh');
  formData.append('cus_city', 'Dhaka');
  formData.append('cus_country', 'Bangladesh');
  formData.append('shipping_method', 'NO');
  formData.append('product_name', payment.description || 'Payment');
  formData.append('product_category', 'Service');
  formData.append('product_profile', 'general');
  formData.append('value_a', payment.return_url);
  formData.append('value_b', payment.tenant_id);
  formData.append('value_c', payment.payment_for);
  formData.append('value_d', payment.customer_id || '');

  const response = await fetch(baseUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('SSLCommerz response:', data);
  
  if (data.status === 'SUCCESS' && data.GatewayPageURL) {
    return data.GatewayPageURL;
  }
  
  throw new Error(data.failedreason || 'SSLCommerz initiation failed');
}

// ShurjoPay initiate
async function initiateShurjoPay(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.shurjopayment.com/api'
    : 'https://engine.shurjopayment.com/api';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  // Step 1: Get token
  const tokenResponse = await fetch(`${baseUrl}/get_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: gatewayConfig.username,
      password: gatewayConfig.password,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  console.log('ShurjoPay token:', tokenData);
  
  if (!tokenData.token) {
    throw new Error('ShurjoPay token generation failed');
  }
  
  // Step 2: Initiate payment
  const paymentResponse = await fetch(`${baseUrl}/secret-pay`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenData.token}`,
    },
    body: JSON.stringify({
      prefix: gatewayConfig.merchant_id || 'SP',
      token: tokenData.token,
      return_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=shurjopay&status=success`,
      cancel_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=shurjopay&status=cancel`,
      store_id: tokenData.store_id,
      amount: payment.amount,
      order_id: paymentId,
      currency: 'BDT',
      customer_name: payment.customer_name || 'Customer',
      customer_phone: payment.customer_phone || '01700000000',
      customer_email: payment.customer_email || 'customer@example.com',
      customer_address: 'Bangladesh',
      customer_city: 'Dhaka',
      customer_state: 'Dhaka',
      customer_postcode: '1000',
      customer_country: 'Bangladesh',
      value1: payment.return_url,
      value2: payment.tenant_id,
      value3: payment.payment_for,
      value4: payment.customer_id || '',
    }),
  });
  
  const paymentData = await paymentResponse.json();
  console.log('ShurjoPay payment:', paymentData);
  
  if (paymentData.checkout_url) {
    return paymentData.checkout_url;
  }
  
  throw new Error('ShurjoPay initiation failed');
}

// UddoktaPay initiate  
async function initiateUddoktaPay(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.uddoktapay.com/api/checkout-v2'
    : 'https://pay.uddoktapay.com/api/checkout-v2';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'RT-UDDOKTAPAY-API-KEY': gatewayConfig.api_key,
    },
    body: JSON.stringify({
      full_name: payment.customer_name || 'Customer',
      email: payment.customer_email || 'customer@example.com',
      amount: payment.amount.toString(),
      metadata: {
        payment_id: paymentId,
        tenant_id: payment.tenant_id,
        payment_for: payment.payment_for,
        customer_id: payment.customer_id || '',
        return_url: payment.return_url,
      },
      redirect_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=uddoktapay&status=success`,
      cancel_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=uddoktapay&status=cancel`,
      webhook_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=uddoktapay&status=ipn`,
    }),
  });
  
  const data = await response.json();
  console.log('UddoktaPay response:', data);
  
  if (data.payment_url) {
    return data.payment_url;
  }
  
  throw new Error(data.message || 'UddoktaPay initiation failed');
}

// AamarPay initiate
async function initiateAamarPay(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.aamarpay.com/jsonpost.php'
    : 'https://secure.aamarpay.com/jsonpost.php';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      store_id: gatewayConfig.store_id,
      signature_key: gatewayConfig.api_key,
      tran_id: paymentId,
      amount: payment.amount.toString(),
      currency: 'BDT',
      desc: payment.description || 'Payment',
      cus_name: payment.customer_name || 'Customer',
      cus_email: payment.customer_email || 'customer@example.com',
      cus_phone: payment.customer_phone || '01700000000',
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      success_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=aamarpay&status=success`,
      fail_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=aamarpay&status=fail`,
      cancel_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=aamarpay&status=cancel`,
      opt_a: payment.return_url,
      opt_b: payment.tenant_id,
      opt_c: payment.payment_for,
      opt_d: payment.customer_id || '',
      type: 'json',
    }),
  });
  
  const data = await response.json();
  console.log('AamarPay response:', data);
  
  if (data.payment_url) {
    return data.payment_url;
  }
  
  throw new Error(data.error || 'AamarPay initiation failed');
}

// PipraPay initiate
async function initiatePipraPay(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.piprapay.com/api/v1/checkout'
    : 'https://api.piprapay.com/api/v1/checkout';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayConfig.api_key}`,
    },
    body: JSON.stringify({
      amount: payment.amount,
      currency: 'BDT',
      order_id: paymentId,
      customer_name: payment.customer_name || 'Customer',
      customer_email: payment.customer_email || 'customer@example.com',
      customer_phone: payment.customer_phone || '01700000000',
      description: payment.description || 'Payment',
      success_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=piprapay&status=success`,
      cancel_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=piprapay&status=cancel`,
      ipn_url: `${supabaseUrl}/functions/v1/payment-callback?gateway=piprapay&status=ipn`,
      metadata: {
        payment_id: paymentId,
        tenant_id: payment.tenant_id,
        payment_for: payment.payment_for,
        customer_id: payment.customer_id || '',
        return_url: payment.return_url,
      },
    }),
  });
  
  const data = await response.json();
  console.log('PipraPay response:', data);
  
  if (data.checkout_url || data.payment_url) {
    return data.checkout_url || data.payment_url;
  }
  
  throw new Error(data.message || 'PipraPay initiation failed');
}

// bKash initiate (tokenized checkout)
async function initiateBkash(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  // Step 1: Grant token
  const tokenResponse = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'username': gatewayConfig.username,
      'password': gatewayConfig.password,
    },
    body: JSON.stringify({
      app_key: gatewayConfig.app_key,
      app_secret: gatewayConfig.app_secret,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  console.log('bKash token:', tokenData);
  
  if (!tokenData.id_token) {
    throw new Error('bKash token generation failed');
  }
  
  // Step 2: Create payment
  const paymentResponse = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': tokenData.id_token,
      'X-APP-Key': gatewayConfig.app_key,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: payment.customer_phone || '01700000000',
      callbackURL: `${supabaseUrl}/functions/v1/payment-callback?gateway=bkash&status=callback`,
      amount: payment.amount.toString(),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: paymentId,
    }),
  });
  
  const paymentData = await paymentResponse.json();
  console.log('bKash payment:', paymentData);
  
  if (paymentData.bkashURL) {
    // Store token for later use in callback
    return paymentData.bkashURL;
  }
  
  throw new Error(paymentData.statusMessage || 'bKash initiation failed');
}

// Nagad initiate
async function initiateNagad(gatewayConfig: any, payment: PaymentRequest, paymentId: string, sandboxMode: boolean): Promise<string> {
  const baseUrl = sandboxMode 
    ? 'https://sandbox.mynagad.com:10061/remote-payment-gateway-1.0/api/dfs'
    : 'https://api.mynagad.com/api/dfs';
  
  // Nagad has complex signature generation - simplified version
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  // For Nagad, we'll use their hosted checkout approach
  const initResponse = await fetch(`${baseUrl}/check-out/initialize/${gatewayConfig.merchant_id}/${paymentId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-KM-IP-V4': '127.0.0.1',
      'X-KM-Client-Type': 'PC_WEB',
      'X-KM-Api-Version': 'v-0.2.0',
    },
    body: JSON.stringify({
      dateTime: timestamp,
      sensitiveData: JSON.stringify({
        merchantId: gatewayConfig.merchant_id,
        datetime: timestamp,
        orderId: paymentId,
        challenge: crypto.randomUUID(),
      }),
      signature: 'generated_signature', // Would need proper crypto implementation
    }),
  });
  
  const initData = await initResponse.json();
  console.log('Nagad init:', initData);
  
  // Nagad checkout flow is complex - for now return a placeholder
  // In production, need full crypto signature implementation
  if (initData.callBackUrl) {
    return initData.callBackUrl;
  }
  
  throw new Error('Nagad initiation failed - requires proper signature implementation');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PaymentRequest = await req.json();
    console.log('Payment request:', body);

    const { gateway, amount, tenant_id, invoice_id, customer_id, description, return_url, cancel_url, customer_name, customer_email, customer_phone, payment_for } = body;

    // Validate required fields
    if (!gateway || !amount || !tenant_id || !return_url || !payment_for) {
      throw new Error('Missing required fields: gateway, amount, tenant_id, return_url, payment_for');
    }

    // Get gateway config from tenant_payment_gateways (for ISP) or payment_gateway_settings (for Super Admin)
    let gatewayConfig: any = null;
    let sandboxMode = false;
    
    // First try tenant gateways
    const { data: tenantGateway, error: tenantGatewayError } = await supabase
      .from('tenant_payment_gateways')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('gateway', gateway)
      .eq('is_enabled', true)
      .single();
    
    if (tenantGateway) {
      gatewayConfig = tenantGateway.config;
      sandboxMode = tenantGateway.sandbox_mode;
    } else {
      // Fallback to global gateway settings
      const { data: globalGateway, error: globalGatewayError } = await supabase
        .from('payment_gateway_settings')
        .select('*')
        .eq('gateway', gateway)
        .eq('is_enabled', true)
        .single();
      
      if (globalGateway) {
        gatewayConfig = globalGateway.config;
        sandboxMode = globalGateway.sandbox_mode;
      }
    }

    if (!gatewayConfig) {
      throw new Error(`Payment gateway ${gateway} is not configured or enabled`);
    }

    // Create pending payment record
    const paymentData: any = {
      tenant_id,
      amount,
      payment_method: gateway,
      status: 'pending',
      description: description || `${payment_for === 'subscription' ? 'Subscription' : 'Bill'} Payment`,
    };

    if (payment_for === 'subscription' && invoice_id) {
      paymentData.invoice_number = invoice_id;
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    const paymentId = payment.id;
    console.log('Created payment:', paymentId);

    // Store metadata for callback
    await supabase
      .from('payments')
      .update({
        gateway_response: {
          return_url,
          cancel_url,
          payment_for,
          customer_id,
          invoice_id,
        },
      })
      .eq('id', paymentId);

    // Initiate payment based on gateway
    let checkoutUrl: string;
    const paymentRequest = { ...body, payment_for };

    switch (gateway) {
      case 'sslcommerz':
        checkoutUrl = await initiateSSLCommerz(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'shurjopay':
        checkoutUrl = await initiateShurjoPay(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'uddoktapay':
        checkoutUrl = await initiateUddoktaPay(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'aamarpay':
        checkoutUrl = await initiateAamarPay(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'piprapay':
        checkoutUrl = await initiatePipraPay(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'bkash':
        checkoutUrl = await initiateBkash(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'nagad':
        checkoutUrl = await initiateNagad(gatewayConfig, paymentRequest, paymentId, sandboxMode);
        break;
      case 'manual':
        // For manual payments, just return success
        return new Response(JSON.stringify({
          success: true,
          payment_id: paymentId,
          checkout_url: null,
          message: 'Manual payment created. Please complete payment and submit transaction ID.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }

    // Update payment with transaction details
    await supabase
      .from('payments')
      .update({
        transaction_id: paymentId, // Using payment ID as initial transaction ref
      })
      .eq('id', paymentId);

    return new Response(JSON.stringify({
      success: true,
      payment_id: paymentId,
      checkout_url: checkoutUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Payment initiation failed',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
