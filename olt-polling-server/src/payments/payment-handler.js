/**
 * Payment Gateway Handler
 * Handles all payment gateway integrations for ISP billing
 */

import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// Gateway configurations
const GATEWAY_CONFIGS = {
  sslcommerz: {
    sandbox: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
    live: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
    validationSandbox: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
    validationLive: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
  },
  shurjopay: {
    sandbox: 'https://sandbox.shurjopayment.com/api/get_token',
    live: 'https://engine.shurjopayment.com/api/get_token',
  },
  uddoktapay: {
    sandbox: 'https://sandbox.uddoktapay.com/api/checkout/v2',
    live: 'https://api.uddoktapay.com/api/checkout/v2',
  },
  aamarpay: {
    sandbox: 'https://sandbox.aamarpay.com/jsonpost.php',
    live: 'https://secure.aamarpay.com/jsonpost.php',
  },
  piprapay: {
    sandbox: 'https://sandbox.pipra.com.bd/api/v1/checkout',
    live: 'https://api.pipra.com.bd/api/v1/checkout',
  },
  bkash: {
    sandbox: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    live: 'https://tokenized.pay.bka.sh/v1.2.0-beta',
  },
  nagad: {
    sandbox: 'https://api.mynagad.com/api/dfs/check-out/initialize',
    live: 'https://api.nagad.com.bd/api/dfs/check-out/initialize',
  },
};

/**
 * Generate unique transaction ID
 */
function generateTransactionId() {
  return `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Initiate SSLCommerz payment
 */
async function initiateSSLCommerz(config, paymentData) {
  const { store_id, store_password, is_sandbox } = config;
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.sslcommerz.sandbox : GATEWAY_CONFIGS.sslcommerz.live;

  const formData = new URLSearchParams({
    store_id,
    store_passwd: store_password,
    total_amount: paymentData.amount.toString(),
    currency: 'BDT',
    tran_id: paymentData.transaction_id,
    success_url: paymentData.return_url,
    fail_url: paymentData.cancel_url,
    cancel_url: paymentData.cancel_url,
    ipn_url: paymentData.ipn_url || paymentData.return_url,
    cus_name: paymentData.customer_name || 'Customer',
    cus_email: paymentData.customer_email || 'customer@example.com',
    cus_phone: paymentData.customer_phone || '01700000000',
    cus_add1: 'Bangladesh',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    shipping_method: 'NO',
    product_name: paymentData.description || 'ISP Bill Payment',
    product_category: 'Service',
    product_profile: 'general',
  });

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await response.json();
    logger.info('SSLCommerz response:', data);

    if (data.status === 'SUCCESS') {
      return {
        success: true,
        checkout_url: data.GatewayPageURL,
        session_key: data.sessionkey,
      };
    } else {
      return {
        success: false,
        error: data.failedreason || 'SSLCommerz initialization failed',
      };
    }
  } catch (error) {
    logger.error('SSLCommerz error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate ShurjoPay payment
 */
async function initiateShurjoPay(config, paymentData) {
  const { username, password, prefix, is_sandbox } = config;
  const tokenUrl = is_sandbox ? GATEWAY_CONFIGS.shurjopay.sandbox : GATEWAY_CONFIGS.shurjopay.live;

  try {
    // Get token first
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.token) {
      return { success: false, error: 'Failed to get ShurjoPay token' };
    }

    // Make payment request
    const paymentUrl = is_sandbox
      ? 'https://sandbox.shurjopayment.com/api/secret-pay'
      : 'https://engine.shurjopayment.com/api/secret-pay';

    const paymentResponse = await fetch(paymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.token}`,
      },
      body: JSON.stringify({
        prefix: prefix || 'ISP',
        token: tokenData.token,
        store_id: tokenData.store_id,
        amount: paymentData.amount,
        order_id: paymentData.transaction_id,
        currency: 'BDT',
        customer_name: paymentData.customer_name || 'Customer',
        customer_phone: paymentData.customer_phone || '01700000000',
        customer_email: paymentData.customer_email || 'customer@example.com',
        customer_address: 'Bangladesh',
        customer_city: 'Dhaka',
        client_ip: '127.0.0.1',
        return_url: paymentData.return_url,
        cancel_url: paymentData.cancel_url,
      }),
    });

    const paymentResult = await paymentResponse.json();
    logger.info('ShurjoPay response:', paymentResult);

    if (paymentResult.checkout_url) {
      return {
        success: true,
        checkout_url: paymentResult.checkout_url,
        sp_order_id: paymentResult.sp_order_id,
      };
    } else {
      return { success: false, error: paymentResult.message || 'ShurjoPay initialization failed' };
    }
  } catch (error) {
    logger.error('ShurjoPay error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate UddoktaPay payment
 */
async function initiateUddoktaPay(config, paymentData) {
  const { api_key, is_sandbox } = config;
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.uddoktapay.sandbox : GATEWAY_CONFIGS.uddoktapay.live;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': api_key,
      },
      body: JSON.stringify({
        full_name: paymentData.customer_name || 'Customer',
        email: paymentData.customer_email || 'customer@example.com',
        amount: paymentData.amount.toString(),
        metadata: {
          transaction_id: paymentData.transaction_id,
          payment_for: paymentData.payment_for,
          customer_id: paymentData.customer_id,
          invoice_id: paymentData.invoice_id,
        },
        redirect_url: paymentData.return_url,
        cancel_url: paymentData.cancel_url,
        webhook_url: paymentData.ipn_url || paymentData.return_url,
      }),
    });

    const data = await response.json();
    logger.info('UddoktaPay response:', data);

    if (data.status && data.payment_url) {
      return {
        success: true,
        checkout_url: data.payment_url,
        invoice_id: data.invoice_id,
      };
    } else {
      return { success: false, error: data.message || 'UddoktaPay initialization failed' };
    }
  } catch (error) {
    logger.error('UddoktaPay error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate AamarPay payment
 */
async function initiateAamarPay(config, paymentData) {
  const { store_id, signature_key, is_sandbox } = config;
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.aamarpay.sandbox : GATEWAY_CONFIGS.aamarpay.live;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id,
        signature_key,
        tran_id: paymentData.transaction_id,
        amount: paymentData.amount.toString(),
        currency: 'BDT',
        desc: paymentData.description || 'ISP Bill Payment',
        cus_name: paymentData.customer_name || 'Customer',
        cus_email: paymentData.customer_email || 'customer@example.com',
        cus_phone: paymentData.customer_phone || '01700000000',
        cus_add1: 'Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        success_url: paymentData.return_url,
        fail_url: paymentData.cancel_url,
        cancel_url: paymentData.cancel_url,
        type: 'json',
      }),
    });

    const data = await response.json();
    logger.info('AamarPay response:', data);

    if (data.result === 'true' && data.payment_url) {
      return {
        success: true,
        checkout_url: data.payment_url,
      };
    } else {
      return { success: false, error: data.reason || 'AamarPay initialization failed' };
    }
  } catch (error) {
    logger.error('AamarPay error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate PipraPay payment
 */
async function initiatePipraPay(config, paymentData) {
  const { api_key, api_secret, is_sandbox } = config;
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.piprapay.sandbox : GATEWAY_CONFIGS.piprapay.live;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': api_key,
        'X-API-SECRET': api_secret,
      },
      body: JSON.stringify({
        order_id: paymentData.transaction_id,
        amount: paymentData.amount,
        currency: 'BDT',
        customer_name: paymentData.customer_name || 'Customer',
        customer_email: paymentData.customer_email || 'customer@example.com',
        customer_phone: paymentData.customer_phone || '01700000000',
        description: paymentData.description || 'ISP Bill Payment',
        success_url: paymentData.return_url,
        cancel_url: paymentData.cancel_url,
        callback_url: paymentData.ipn_url || paymentData.return_url,
      }),
    });

    const data = await response.json();
    logger.info('PipraPay response:', data);

    if (data.success && data.checkout_url) {
      return {
        success: true,
        checkout_url: data.checkout_url,
      };
    } else {
      return { success: false, error: data.message || 'PipraPay initialization failed' };
    }
  } catch (error) {
    logger.error('PipraPay error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate bKash payment
 */
async function initiateBkash(config, paymentData) {
  const { app_key, app_secret, username, password, is_sandbox } = config;
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.bkash.sandbox : GATEWAY_CONFIGS.bkash.live;

  try {
    // Get grant token
    const grantResponse = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username,
        password,
      },
      body: JSON.stringify({
        app_key,
        app_secret,
      }),
    });

    const grantData = await grantResponse.json();

    if (!grantData.id_token) {
      return { success: false, error: 'Failed to get bKash token' };
    }

    // Create payment
    const paymentResponse = await fetch(`${baseUrl}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: grantData.id_token,
        'X-App-Key': app_key,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: paymentData.customer_phone || '01700000000',
        callbackURL: paymentData.return_url,
        amount: paymentData.amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: paymentData.transaction_id,
      }),
    });

    const paymentResult = await paymentResponse.json();
    logger.info('bKash response:', paymentResult);

    if (paymentResult.bkashURL) {
      return {
        success: true,
        checkout_url: paymentResult.bkashURL,
        payment_id: paymentResult.paymentID,
      };
    } else {
      return { success: false, error: paymentResult.statusMessage || 'bKash initialization failed' };
    }
  } catch (error) {
    logger.error('bKash error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate Nagad payment
 */
async function initiateNagad(config, paymentData) {
  const { merchant_id, public_key, private_key, is_sandbox } = config;
  
  // Nagad requires complex signature generation
  // This is a simplified version - in production, use proper PKCS signing
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const orderId = paymentData.transaction_id;

    // For Nagad, we'll return a message as it requires complex crypto implementation
    logger.info('Nagad payment requested - requires proper key-based signing');
    
    return {
      success: false,
      error: 'Nagad integration requires proper cryptographic implementation. Please contact support.',
    };
  } catch (error) {
    logger.error('Nagad error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main payment initiation function
 */
export async function initiatePayment(supabase, gateway, paymentData) {
  const transactionId = generateTransactionId();
  paymentData.transaction_id = transactionId;

  // Get gateway configuration
  const { data: gatewayConfig, error: configError } = await supabase
    .from('tenant_payment_gateways')
    .select('*')
    .eq('tenant_id', paymentData.tenant_id)
    .eq('gateway_type', gateway)
    .eq('is_enabled', true)
    .single();

  if (configError || !gatewayConfig) {
    logger.error(`Gateway config not found for ${gateway}:`, configError);
    return {
      success: false,
      error: `Payment gateway ${gateway} is not configured or enabled`,
    };
  }

  const config = {
    ...gatewayConfig.config,
    is_sandbox: gatewayConfig.is_sandbox,
  };

  let result;

  switch (gateway) {
    case 'sslcommerz':
      result = await initiateSSLCommerz(config, paymentData);
      break;
    case 'shurjopay':
      result = await initiateShurjoPay(config, paymentData);
      break;
    case 'uddoktapay':
      result = await initiateUddoktaPay(config, paymentData);
      break;
    case 'aamarpay':
      result = await initiateAamarPay(config, paymentData);
      break;
    case 'piprapay':
      result = await initiatePipraPay(config, paymentData);
      break;
    case 'bkash':
      result = await initiateBkash(config, paymentData);
      break;
    case 'nagad':
      result = await initiateNagad(config, paymentData);
      break;
    default:
      return { success: false, error: `Unsupported gateway: ${gateway}` };
  }

  if (result.success) {
    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: paymentData.tenant_id,
        amount: paymentData.amount,
        gateway: gateway,
        status: 'pending',
        transaction_id: transactionId,
        invoice_id: paymentData.invoice_id || null,
        metadata: {
          payment_for: paymentData.payment_for,
          customer_id: paymentData.customer_id,
          customer_name: paymentData.customer_name,
          checkout_url: result.checkout_url,
          gateway_response: result,
        },
      })
      .select()
      .single();

    if (paymentError) {
      logger.error('Failed to create payment record:', paymentError);
    }

    return {
      success: true,
      payment_id: payment?.id,
      transaction_id: transactionId,
      checkout_url: result.checkout_url,
    };
  }

  return result;
}

/**
 * Handle payment callback/verification
 */
export async function handlePaymentCallback(supabase, gateway, callbackData) {
  logger.info(`Payment callback received for ${gateway}:`, callbackData);

  let transactionId;
  let isSuccess = false;
  let gatewayResponse = callbackData;

  // Extract transaction ID and status based on gateway
  switch (gateway) {
    case 'sslcommerz':
      transactionId = callbackData.tran_id;
      isSuccess = callbackData.status === 'VALID' || callbackData.status === 'VALIDATED';
      break;
    case 'shurjopay':
      transactionId = callbackData.order_id;
      isSuccess = callbackData.sp_code === '1000';
      break;
    case 'uddoktapay':
      transactionId = callbackData.metadata?.transaction_id;
      isSuccess = callbackData.status === 'COMPLETED';
      break;
    case 'aamarpay':
      transactionId = callbackData.mer_txnid;
      isSuccess = callbackData.pay_status === 'Successful';
      break;
    case 'piprapay':
      transactionId = callbackData.order_id;
      isSuccess = callbackData.status === 'success';
      break;
    case 'bkash':
      transactionId = callbackData.merchantInvoiceNumber;
      isSuccess = callbackData.transactionStatus === 'Completed';
      break;
    case 'nagad':
      transactionId = callbackData.order_id;
      isSuccess = callbackData.status === 'Success';
      break;
    default:
      transactionId = callbackData.transaction_id || callbackData.tran_id || callbackData.order_id;
      isSuccess = callbackData.status === 'success' || callbackData.status === 'completed';
  }

  if (!transactionId) {
    logger.error('No transaction ID found in callback data');
    return { success: false, error: 'Transaction ID not found' };
  }

  // Find payment record
  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();

  if (findError || !payment) {
    logger.error('Payment not found:', transactionId);
    return { success: false, error: 'Payment not found' };
  }

  // Update payment status
  const newStatus = isSuccess ? 'completed' : 'failed';
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: newStatus,
      metadata: {
        ...payment.metadata,
        callback_response: gatewayResponse,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);

  if (updateError) {
    logger.error('Failed to update payment:', updateError);
    return { success: false, error: 'Failed to update payment' };
  }

  // If successful payment, process based on payment type
  if (isSuccess) {
    const paymentFor = payment.metadata?.payment_for;

    if (paymentFor === 'subscription' && payment.invoice_id) {
      // Update invoice status
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: payment.id,
        })
        .eq('id', payment.invoice_id);

      // Update subscription status
      const { data: invoice } = await supabase
        .from('invoices')
        .select('subscription_id')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice?.subscription_id) {
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', invoice.subscription_id);
      }
    } else if (paymentFor === 'customer_bill') {
      // Handle customer bill payment
      const customerId = payment.metadata?.customer_id;
      if (customerId) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (customer) {
          // Calculate new expiry date
          const currentExpiry = customer.expiry_date ? new Date(customer.expiry_date) : new Date();
          const now = new Date();
          const startDate = currentExpiry > now ? currentExpiry : now;
          const newExpiry = new Date(startDate);
          newExpiry.setMonth(newExpiry.getMonth() + 1);

          // Update customer
          await supabase
            .from('customers')
            .update({
              expiry_date: newExpiry.toISOString().split('T')[0],
              due_amount: Math.max(0, (customer.due_amount || 0) - payment.amount),
              last_payment_date: new Date().toISOString().split('T')[0],
              status: 'active',
            })
            .eq('id', customerId);

          // Create recharge record
          await supabase.from('customer_recharges').insert({
            customer_id: customerId,
            tenant_id: payment.tenant_id,
            amount: payment.amount,
            payment_method: gateway,
            transaction_id: transactionId,
            old_expiry: customer.expiry_date,
            new_expiry: newExpiry.toISOString().split('T')[0],
            status: 'completed',
            months: 1,
          });
        }
      }
    }
  }

  return {
    success: true,
    payment_id: payment.id,
    status: newStatus,
    redirect_url: isSuccess
      ? `${payment.metadata?.return_url || '/'}?status=success&payment_id=${payment.id}`
      : `${payment.metadata?.cancel_url || '/'}?status=failed&payment_id=${payment.id}`,
  };
}

export { generateTransactionId };
