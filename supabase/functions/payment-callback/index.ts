import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function handleSSLCommerzCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const status = searchParams.get('status');
  const tranId = body.tran_id || body.get?.('tran_id');
  const valId = body.val_id || body.get?.('val_id');
  const amount = body.amount || body.get?.('amount');
  const returnUrl = body.value_a || body.get?.('value_a');
  const tenantId = body.value_b || body.get?.('value_b');
  const paymentFor = body.value_c || body.get?.('value_c');
  const customerId = body.value_d || body.get?.('value_d');

  console.log('SSLCommerz callback:', { status, tranId, valId, amount, paymentFor });

  // Get payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', tranId)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;

  if (status === 'success' || status === 'ipn') {
    // Verify with SSLCommerz if needed (production)
    // For now, trust the callback
    
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: valId || tranId,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, sslcommerz_response: body },
      })
      .eq('id', tranId);

    // If subscription payment, update invoice
    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: tranId,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    // If customer bill payment
    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, parseFloat(amount), tranId, tenantId);
    }

    return { success: true, paymentId: tranId, returnUrl, cancelUrl };
  }

  // Payment failed or cancelled
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, sslcommerz_response: body },
    })
    .eq('id', tranId);

  return { success: false, paymentId: tranId, returnUrl, cancelUrl };
}

async function handleShurjoPayCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const status = searchParams.get('status');
  const orderId = body.order_id || body.sp_order_id;
  const spCode = body.sp_code;
  const spMessage = body.sp_message;
  const amount = body.amount || body.payable_amount;

  console.log('ShurjoPay callback:', { status, orderId, spCode, spMessage });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const returnUrl = (payment.gateway_response as any)?.return_url || '/';
  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;
  const paymentFor = (payment.gateway_response as any)?.payment_for;
  const customerId = (payment.gateway_response as any)?.customer_id;

  if (spCode === '1000' || status === 'success') {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: body.bank_trx_id || orderId,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, shurjopay_response: body },
      })
      .eq('id', orderId);

    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: orderId,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, parseFloat(amount), orderId, payment.tenant_id);
    }

    return { success: true, paymentId: orderId, returnUrl, cancelUrl };
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, shurjopay_response: body },
    })
    .eq('id', orderId);

  return { success: false, paymentId: orderId, returnUrl, cancelUrl };
}

async function handleUddoktaPayCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const status = searchParams.get('status');
  const invoiceId = body.invoice_id || searchParams.get('invoice_id');
  const paymentId = body.metadata?.payment_id;
  const transactionId = body.transaction_id;
  const amount = body.amount;

  console.log('UddoktaPay callback:', { status, invoiceId, paymentId, transactionId });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const returnUrl = (payment.gateway_response as any)?.return_url || '/';
  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;
  const paymentFor = (payment.gateway_response as any)?.payment_for;
  const customerId = (payment.gateway_response as any)?.customer_id;

  if (body.status === 'COMPLETED' || status === 'success') {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId || invoiceId,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, uddoktapay_response: body },
      })
      .eq('id', paymentId);

    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: paymentId,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, parseFloat(amount), paymentId, payment.tenant_id);
    }

    return { success: true, paymentId, returnUrl, cancelUrl };
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, uddoktapay_response: body },
    })
    .eq('id', paymentId);

  return { success: false, paymentId, returnUrl, cancelUrl };
}

async function handleAamarPayCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const status = searchParams.get('status');
  const payStatus = body.pay_status;
  const tranId = body.mer_txnid;
  const amount = body.amount;
  const returnUrl = body.opt_a;
  const paymentFor = body.opt_c;
  const customerId = body.opt_d;

  console.log('AamarPay callback:', { status, payStatus, tranId });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', tranId)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;

  if (payStatus === 'Successful' || status === 'success') {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: body.pg_txnid || tranId,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, aamarpay_response: body },
      })
      .eq('id', tranId);

    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: tranId,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, parseFloat(amount), tranId, payment.tenant_id);
    }

    return { success: true, paymentId: tranId, returnUrl, cancelUrl };
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, aamarpay_response: body },
    })
    .eq('id', tranId);

  return { success: false, paymentId: tranId, returnUrl, cancelUrl };
}

async function handlePipraPayCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const status = searchParams.get('status');
  const orderId = body.order_id || body.metadata?.payment_id;
  const transactionId = body.transaction_id;
  const amount = body.amount;

  console.log('PipraPay callback:', { status, orderId, transactionId });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const returnUrl = (payment.gateway_response as any)?.return_url || body.metadata?.return_url || '/';
  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;
  const paymentFor = (payment.gateway_response as any)?.payment_for || body.metadata?.payment_for;
  const customerId = (payment.gateway_response as any)?.customer_id || body.metadata?.customer_id;

  if (body.status === 'COMPLETED' || body.status === 'SUCCESS' || status === 'success') {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId || orderId,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, piprapay_response: body },
      })
      .eq('id', orderId);

    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: orderId,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, parseFloat(amount), orderId, payment.tenant_id);
    }

    return { success: true, paymentId: orderId, returnUrl, cancelUrl };
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, piprapay_response: body },
    })
    .eq('id', orderId);

  return { success: false, paymentId: orderId, returnUrl, cancelUrl };
}

async function handleBkashCallback(supabase: any, body: any, searchParams: URLSearchParams): Promise<{ success: boolean; paymentId: string; returnUrl: string; cancelUrl: string }> {
  const paymentID = body.paymentID || searchParams.get('paymentID');
  const status = body.status || searchParams.get('status');
  const invoiceNumber = body.merchantInvoiceNumber;

  console.log('bKash callback:', { paymentID, status, invoiceNumber });

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', invoiceNumber)
    .single();

  if (!payment) {
    throw new Error('Payment not found');
  }

  const returnUrl = (payment.gateway_response as any)?.return_url || '/';
  const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;
  const paymentFor = (payment.gateway_response as any)?.payment_for;
  const customerId = (payment.gateway_response as any)?.customer_id;

  if (status === 'success' || status === 'Completed') {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: body.trxID || paymentID,
        paid_at: new Date().toISOString(),
        gateway_response: { ...payment.gateway_response, bkash_response: body },
      })
      .eq('id', invoiceNumber);

    if (payment.invoice_number) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: invoiceNumber,
        })
        .eq('invoice_number', payment.invoice_number);
    }

    if (paymentFor === 'customer_bill' && customerId) {
      await handleCustomerBillPayment(supabase, customerId, payment.amount, invoiceNumber, payment.tenant_id);
    }

    return { success: true, paymentId: invoiceNumber, returnUrl, cancelUrl };
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { ...payment.gateway_response, bkash_response: body },
    })
    .eq('id', invoiceNumber);

  return { success: false, paymentId: invoiceNumber, returnUrl, cancelUrl };
}

async function handleCustomerBillPayment(supabase: any, customerId: string, amount: number, paymentId: string, tenantId: string) {
  // Get customer details
  const { data: customer } = await supabase
    .from('customers')
    .select('*, isp_packages(*)')
    .eq('id', customerId)
    .single();

  if (!customer) {
    console.error('Customer not found for bill payment:', customerId);
    return;
  }

  // Calculate new expiry
  const validityDays = customer.isp_packages?.validity_days || 30;
  let newExpiry: Date;
  
  if (!customer.expiry_date || new Date(customer.expiry_date) < new Date()) {
    newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + validityDays);
  } else {
    newExpiry = new Date(customer.expiry_date);
    newExpiry.setDate(newExpiry.getDate() + validityDays);
  }

  // Update customer
  await supabase
    .from('customers')
    .update({
      due_amount: Math.max(0, (customer.due_amount || 0) - amount),
      expiry_date: newExpiry.toISOString().split('T')[0],
      last_payment_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    .eq('id', customerId);

  // Create customer payment record
  await supabase
    .from('customer_payments')
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      amount: amount,
      payment_method: 'online',
      payment_gateway: 'auto',
      transaction_id: paymentId,
      notes: 'Online payment via gateway',
    });

  // Create recharge record
  await supabase
    .from('customer_recharges')
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      amount: amount,
      months: 1,
      old_expiry: customer.expiry_date,
      new_expiry: newExpiry.toISOString().split('T')[0],
      payment_method: 'online',
      transaction_id: paymentId,
      status: 'completed',
    });

  console.log('Customer bill payment processed:', { customerId, amount, newExpiry });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const gateway = searchParams.get('gateway');
    const status = searchParams.get('status');

    console.log('Payment callback received:', { gateway, status, url: req.url });

    // Parse body based on content type
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {};
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    console.log('Callback body:', body);

    let result: { success: boolean; paymentId: string; returnUrl: string; cancelUrl: string };

    switch (gateway) {
      case 'sslcommerz':
        result = await handleSSLCommerzCallback(supabase, body, searchParams);
        break;
      case 'shurjopay':
        result = await handleShurjoPayCallback(supabase, body, searchParams);
        break;
      case 'uddoktapay':
        result = await handleUddoktaPayCallback(supabase, body, searchParams);
        break;
      case 'aamarpay':
        result = await handleAamarPayCallback(supabase, body, searchParams);
        break;
      case 'piprapay':
        result = await handlePipraPayCallback(supabase, body, searchParams);
        break;
      case 'bkash':
        result = await handleBkashCallback(supabase, body, searchParams);
        break;
      default:
        // Generic handler - try to extract from body
        const paymentId = body.order_id || body.tran_id || body.payment_id || body.invoice_id;
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single();

        if (payment) {
          const returnUrl = (payment.gateway_response as any)?.return_url || '/';
          const cancelUrl = (payment.gateway_response as any)?.cancel_url || returnUrl;
          result = { success: status === 'success', paymentId, returnUrl, cancelUrl };
        } else {
          throw new Error('Unknown gateway or payment not found');
        }
    }

    // Redirect to appropriate URL
    const redirectUrl = result.success 
      ? `${result.returnUrl}?payment_id=${result.paymentId}&status=success`
      : `${result.cancelUrl}?payment_id=${result.paymentId}&status=failed`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error: any) {
    console.error('Payment callback error:', error);
    
    // Redirect to a generic error page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': '/?payment_error=true',
      },
    });
  }
});
