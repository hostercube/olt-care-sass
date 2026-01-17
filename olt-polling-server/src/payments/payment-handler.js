/**
 * Payment Gateway Handler
 * Handles all payment gateway integrations for ISP billing
 */

import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Process auto-recharge for customer online payment with reseller commission chain
 * When a customer pays online, this:
 * 1. Extends customer's expiry date
 * 2. Credits commission to the entire reseller chain (reseller -> sub-reseller -> sub-sub-reseller)
 */
async function processCustomerAutoRecharge(supabase, customerId, amount, tenantId, paymentId) {
  logger.info(`Processing auto-recharge for customer ${customerId}, amount: ${amount}`);

  // Get customer with package info
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select(`
      *,
      package:isp_packages(id, name, price, validity_days)
    `)
    .eq('id', customerId)
    .single();

  if (customerError || !customer) {
    logger.error('Customer not found for auto-recharge:', customerError);
    throw new Error('Customer not found');
  }

  const validityDays = customer.package?.validity_days || 30;
  const packagePrice = customer.package?.price || customer.monthly_bill || amount;
  const months = Math.max(1, Math.round(amount / packagePrice));

  // Calculate new expiry date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let baseExpiry;
  if (customer.expiry_date) {
    const currentExpiry = new Date(customer.expiry_date);
    baseExpiry = currentExpiry < today ? today : currentExpiry;
  } else {
    baseExpiry = today;
  }
  
  const newExpiry = new Date(baseExpiry);
  newExpiry.setDate(newExpiry.getDate() + (validityDays * months));

  // Update customer
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      expiry_date: newExpiry.toISOString(),
      status: 'active',
      last_payment_date: new Date().toISOString(),
      due_amount: Math.max(0, (customer.due_amount || 0) - amount),
    })
    .eq('id', customerId);

  if (updateError) {
    logger.error('Failed to update customer expiry:', updateError);
    throw updateError;
  }

  // Create recharge record
  await supabase.from('customer_recharges').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    reseller_id: customer.reseller_id,
    amount,
    months,
    old_expiry: customer.expiry_date,
    new_expiry: newExpiry.toISOString(),
    payment_method: 'online_payment',
    status: 'completed',
    notes: `Auto-recharge via online payment (Payment ID: ${paymentId})`,
  });

  // Create customer payment record
  await supabase.from('customer_payments').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    amount,
    payment_method: 'online_payment',
    notes: `Online payment - auto recharged for ${months} month(s)`,
  });

  logger.info(`Customer ${customerId} recharged successfully. New expiry: ${newExpiry.toISOString()}`);

  // Process reseller commission chain if customer has a reseller
  if (customer.reseller_id) {
    await processResellerCommissionChain(supabase, customer.reseller_id, customerId, amount, months, tenantId);
  }

  return { success: true, newExpiry: newExpiry.toISOString() };
}

/**
 * Process commission for entire reseller chain
 * Credits commission to reseller, sub-reseller, and sub-sub-reseller
 */
async function processResellerCommissionChain(supabase, resellerId, customerId, amount, months, tenantId) {
  logger.info(`Processing commission chain for reseller ${resellerId}`);

  // Get the full reseller chain (up to 3 levels: reseller -> parent -> grandparent)
  const resellerChain = [];
  let currentResellerId = resellerId;

  while (currentResellerId && resellerChain.length < 3) {
    const { data: reseller, error } = await supabase
      .from('resellers')
      .select('*')
      .eq('id', currentResellerId)
      .single();

    if (error || !reseller) break;

    resellerChain.push(reseller);
    currentResellerId = reseller.parent_id;
  }

  logger.info(`Found ${resellerChain.length} resellers in chain`);

  // Process commission for each reseller in the chain
  for (let i = 0; i < resellerChain.length; i++) {
    const reseller = resellerChain[i];
    
    // Calculate commission based on reseller settings
    let commission = 0;
    const rateType = reseller.rate_type || 'discount';
    const commissionType = reseller.commission_type || 'percentage';
    const commissionValue = reseller.commission_value || reseller.customer_rate || 0;

    if (commissionValue > 0) {
      if (commissionType === 'percentage') {
        commission = Math.round((amount * commissionValue) / 100);
      } else {
        // Flat rate per month
        commission = commissionValue * months;
      }
    }

    if (commission <= 0) {
      logger.info(`No commission for reseller ${reseller.id} (${reseller.name})`);
      continue;
    }

    // Credit commission to reseller
    const newBalance = (reseller.balance || 0) + commission;

    // Create commission transaction
    await supabase.from('reseller_transactions').insert({
      tenant_id: tenantId,
      reseller_id: reseller.id,
      type: 'commission',
      amount: commission,
      balance_before: reseller.balance || 0,
      balance_after: newBalance,
      customer_id: customerId,
      description: `Commission from customer online payment (${months} month${months > 1 ? 's' : ''}) - Level ${i + 1}`,
    });

    // Update reseller balance
    await supabase
      .from('resellers')
      .update({
        balance: newBalance,
        total_collections: (reseller.total_collections || 0) + (i === 0 ? amount : 0), // Only first reseller gets collection credit
      })
      .eq('id', reseller.id);

    logger.info(`Credited ৳${commission} commission to ${reseller.name} (Level ${i + 1}). New balance: ৳${newBalance}`);
  }
}

/**
 * Process automatic wallet top-up for reseller after online payment
 * Credits the amount to reseller's balance and creates transaction record
 */
async function processResellerAutoTopup(supabase, resellerId, amount, tenantId, paymentId, topupRequestId = null) {
  logger.info(`Processing auto top-up for reseller ${resellerId}, amount: ${amount}`);

  // Get reseller
  const { data: reseller, error: resellerError } = await supabase
    .from('resellers')
    .select('*')
    .eq('id', resellerId)
    .single();

  if (resellerError || !reseller) {
    logger.error('Reseller not found for auto top-up:', resellerError);
    throw new Error('Reseller not found');
  }

  const oldBalance = reseller.balance || 0;
  const newBalance = oldBalance + amount;

  // Update reseller balance
  const { error: updateError } = await supabase
    .from('resellers')
    .update({ balance: newBalance })
    .eq('id', resellerId);

  if (updateError) {
    logger.error('Failed to update reseller balance:', updateError);
    throw updateError;
  }

  // Create transaction record
  await supabase.from('reseller_transactions').insert({
    tenant_id: tenantId,
    reseller_id: resellerId,
    type: 'topup',
    amount: amount,
    balance_before: oldBalance,
    balance_after: newBalance,
    description: `Wallet top-up via online payment (Payment ID: ${paymentId})`,
  });

  // Update topup request status if exists
  if (topupRequestId) {
    await supabase
      .from('reseller_topup_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
      })
      .eq('id', topupRequestId);
  }

  logger.info(`Reseller ${resellerId} wallet topped up. Old: ${oldBalance}, New: ${newBalance}`);
  return { success: true, newBalance };
}

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
    // Tokenized API (new)
    tokenizedSandbox: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    tokenizedLive: 'https://tokenized.pay.bka.sh/v1.2.0-beta',
    // PGW Checkout.js (old)
    pgwSandbox: 'https://checkout.sandbox.bka.sh/v1.2.0-beta',
    pgwLive: 'https://checkout.pay.bka.sh/v1.2.0-beta',
    // Checkout.js script
    checkoutJsSandbox: 'https://scripts.sandbox.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout.js',
    checkoutJsLive: 'https://scripts.pay.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout.js',
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
 * Required credentials for each gateway
 */
const GATEWAY_REQUIRED_CREDENTIALS = {
  sslcommerz: ['store_id', 'store_password'],
  shurjopay: ['username', 'password'],
  bkash: ['app_key', 'app_secret', 'username', 'password'],
  nagad: ['merchant_id', 'merchant_number', 'public_key', 'private_key'],
  uddoktapay: ['api_key'],
  aamarpay: ['store_id', 'signature_key'],
  piprapay: ['api_key', 'api_secret'],
  portwallet: ['app_key', 'secret_key'],
};

/**
 * Validate gateway credentials and return missing ones
 */
function validateGatewayCredentials(gateway, config) {
  const required = GATEWAY_REQUIRED_CREDENTIALS[gateway] || [];
  const missing = required.filter(key => !config[key] || config[key].toString().trim() === '');
  return missing;
}

/**
 * Initiate SSLCommerz payment
 */
async function initiateSSLCommerz(config, paymentData) {
  const { store_id, store_password, is_sandbox } = config;
  
  // Validate required credentials with detailed error
  const missing = validateGatewayCredentials('sslcommerz', config);
  if (missing.length > 0) {
    const errorMsg = `SSLCommerz credentials missing: ${missing.join(', ')}. Please configure these in Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg, missing_credentials: missing };
  }
  
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
      // Check for common credential errors
      const failReason = data.failedreason || '';
      if (failReason.toLowerCase().includes('store') || failReason.toLowerCase().includes('invalid')) {
        return {
          success: false,
          error: `SSLCommerz: ${failReason}. Please verify your Store ID and Password are correct.`,
        };
      }
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
  
  // Validate credentials
  const missing = validateGatewayCredentials('shurjopay', config);
  if (missing.length > 0) {
    const errorMsg = `ShurjoPay credentials missing: ${missing.join(', ')}. Please configure these in Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg, missing_credentials: missing };
  }
  
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
      // Provide more helpful error
      const errMsg = tokenData.message || 'Failed to authenticate with ShurjoPay';
      return { success: false, error: `ShurjoPay: ${errMsg}. Please verify your username and password.` };
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
  
  // Validate credentials
  const missing = validateGatewayCredentials('uddoktapay', config);
  if (missing.length > 0) {
    const errorMsg = `UddoktaPay credentials missing: ${missing.join(', ')}. Please configure these in Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg, missing_credentials: missing };
  }
  
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
  
  // Validate credentials
  const missing = validateGatewayCredentials('aamarpay', config);
  if (missing.length > 0) {
    const errorMsg = `aamarPay credentials missing: ${missing.join(', ')}. Please configure these in Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg, missing_credentials: missing };
  }
  
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
  
  // Validate credentials
  const missing = validateGatewayCredentials('piprapay', config);
  if (missing.length > 0) {
    const errorMsg = `PipraPay credentials missing: ${missing.join(', ')}. Please configure these in Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg, missing_credentials: missing };
  }
  
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
 * Initiate bKash payment - supports both Tokenized and PGW Checkout.js modes
 */
async function initiateBkash(config, paymentData) {
  const { app_key, app_secret, username, password, is_sandbox, bkash_mode } = config;
  
  logger.info(`Initiating bKash payment with mode: ${bkash_mode || 'tokenized'}`, {
    is_sandbox,
    hasAppKey: !!app_key,
    hasAppSecret: !!app_secret,
    hasUsername: !!username,
    hasPassword: !!password,
    configKeys: Object.keys(config),
  });
  
  // Validate required credentials with user-friendly error
  const missingCreds = [];
  if (!app_key) missingCreds.push('App Key');
  if (!app_secret) missingCreds.push('App Secret');
  if (!username) missingCreds.push('Username');
  if (!password) missingCreds.push('Password');
  
  if (missingCreds.length > 0) {
    const errorMsg = `bKash credentials missing: ${missingCreds.join(', ')}. Please configure bKash API credentials in Super Admin > Gateway Settings.`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
  
  const mode = bkash_mode || 'tokenized';
  logger.info(`Using bKash mode: ${mode}`);

  if (mode === 'checkout_js') {
    return initiateBkashCheckoutJS(config, paymentData);
  }

  // Default: Tokenized API
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.bkash.tokenizedSandbox : GATEWAY_CONFIGS.bkash.tokenizedLive;

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
    logger.info('bKash Tokenized grant response:', grantData);

    if (!grantData.id_token) {
      return { success: false, error: grantData.statusMessage || 'Failed to get bKash token. Check your credentials.' };
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
    logger.info('bKash Tokenized create response:', paymentResult);

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
    logger.error('bKash Tokenized error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate bKash payment using PGW Checkout.js (old method)
 * Now uses redirect flow (same as Tokenized) since popup requires complex client-side handling.
 * PGW Checkout.js API actually supports the same redirect flow as Tokenized API.
 */
async function initiateBkashCheckoutJS(config, paymentData) {
  const { app_key, app_secret, username, password, is_sandbox } = config;
  
  // Validate required credentials
  if (!app_key || !app_secret || !username || !password) {
    logger.error('bKash PGW credentials not configured');
    return { success: false, error: 'bKash credentials not configured. Please configure app_key, app_secret, username and password in gateway settings.' };
  }
  
  // Use the PGW endpoint which also supports redirect flow
  const baseUrl = is_sandbox ? GATEWAY_CONFIGS.bkash.pgwSandbox : GATEWAY_CONFIGS.bkash.pgwLive;

  try {
    // Grant token
    const grantResponse = await fetch(`${baseUrl}/checkout/token/grant`, {
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
    logger.info('bKash PGW grant response:', grantData);

    if (!grantData.id_token) {
      return { success: false, error: grantData.statusMessage || 'Failed to get bKash PGW token. Check your credentials.' };
    }

    // Create payment with redirect mode
    const createResponse = await fetch(`${baseUrl}/checkout/payment/create`, {
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

    const createData = await createResponse.json();
    logger.info('bKash PGW create response:', createData);

    if (createData.paymentID) {
      // bkashURL should be available for redirect
      if (createData.bkashURL) {
        return {
          success: true,
          checkout_url: createData.bkashURL,
          payment_id: createData.paymentID,
          bkash_mode: 'checkout_js',
        };
      }
      
      // If bkashURL is not available, try to execute payment to get redirect URL
      // This can happen with some bKash configurations
      logger.warn('bKash PGW did not return bkashURL, trying execute endpoint');
      
      // Execute the payment to get the actual payment page
      const executeResponse = await fetch(`${baseUrl}/checkout/payment/execute/${createData.paymentID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: grantData.id_token,
          'X-App-Key': app_key,
        },
      });
      
      const executeData = await executeResponse.json();
      logger.info('bKash PGW execute response:', executeData);
      
      // If we still can't get a redirect URL, fall back to Tokenized API
      logger.warn('bKash PGW execute did not return redirect, falling back to Tokenized API');
      
      // Use Tokenized API as fallback (it always provides bkashURL)
      const tokenizedBaseUrl = config.is_sandbox ? GATEWAY_CONFIGS.bkash.tokenizedSandbox : GATEWAY_CONFIGS.bkash.tokenizedLive;
      
      const tokenGrantResponse = await fetch(`${tokenizedBaseUrl}/tokenized/checkout/token/grant`, {
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
      
      const tokenGrantData = await tokenGrantResponse.json();
      
      if (!tokenGrantData.id_token) {
        return { success: false, error: 'bKash payment setup failed. Please try again.' };
      }
      
      const tokenPaymentResponse = await fetch(`${tokenizedBaseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: tokenGrantData.id_token,
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
      
      const tokenPaymentResult = await tokenPaymentResponse.json();
      logger.info('bKash Tokenized fallback response:', tokenPaymentResult);
      
      if (tokenPaymentResult.bkashURL) {
        return {
          success: true,
          checkout_url: tokenPaymentResult.bkashURL,
          payment_id: tokenPaymentResult.paymentID,
          bkash_mode: 'tokenized',
        };
      }
      
      return { success: false, error: tokenPaymentResult.statusMessage || 'bKash payment initialization failed' };
    } else {
      return { success: false, error: createData.statusMessage || 'bKash PGW create failed' };
    }
  } catch (error) {
    logger.error('bKash PGW Checkout.js error:', error);
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
 * Calculate transaction fee
 */
function calculateTransactionFee(amount, feePercent) {
  if (!feePercent || feePercent <= 0) return { fee: 0, totalAmount: amount, netAmount: amount };
  const fee = Math.round((amount * feePercent) / 100);
  return {
    fee,
    totalAmount: amount + fee, // What customer pays
    netAmount: amount, // Original amount (what callback should return)
  };
}

/**
 * Main payment initiation function
 */
export async function initiatePayment(supabase, gateway, paymentData) {
  const transactionId = generateTransactionId();
  paymentData.transaction_id = transactionId;

  // IMPORTANT:
  // - "return_url" and "cancel_url" coming from frontend are the SPA routes we want users to land on.
  // - Many gateways (e.g. SSLCommerz) POST to success/fail URLs.
  //   Static SPA hosts will return 405 for POST.
  // So we send gateways to our backend callback URL, then backend redirects to the frontend URLs.
  const frontendReturnUrl = paymentData.return_url;
  const frontendCancelUrl = paymentData.cancel_url || paymentData.return_url;
  const gatewayCallbackUrl = paymentData.gateway_callback_url || paymentData.return_url;

  // Try tenant-specific gateway first, then fall back to global settings
  let gatewayConfig = null;
  let isSandbox = true;
  let configData = {};
  let transactionFeePercent = 0;
  let useGlobalFallback = false;

  // First try tenant-specific gateways
  const { data: tenantGateway } = await supabase
    .from('tenant_payment_gateways')
    .select('*')
    .eq('tenant_id', paymentData.tenant_id)
    .eq('gateway', gateway)
    .eq('is_enabled', true)
    .single();

  if (tenantGateway) {
    const tenantConfig = tenantGateway.config || {};
    const hasCredentials = Object.keys(tenantConfig).length > 0 && 
      Object.values(tenantConfig).some(v => v && v.toString().trim() !== '');
    
    if (hasCredentials) {
      // Tenant has credentials configured, use them
      gatewayConfig = tenantGateway;
      configData = tenantConfig;
      isSandbox = tenantGateway.sandbox_mode !== false;
      transactionFeePercent = tenantGateway.transaction_fee_percent || 0;
    } else {
      // Tenant gateway enabled but no credentials - will try global fallback
      logger.info(`Tenant gateway ${gateway} enabled but no credentials, trying global fallback`);
      useGlobalFallback = true;
    }
  } else {
    useGlobalFallback = true;
  }
  
  // Fall back to global payment gateway settings if needed
  if (useGlobalFallback) {
    const { data: globalGateway, error: globalError } = await supabase
      .from('payment_gateway_settings')
      .select('*')
      .eq('gateway', gateway)
      .eq('is_enabled', true)
      .single();

    if (globalError || !globalGateway) {
      logger.error(`Gateway config not found for ${gateway}:`, globalError);
      return {
        success: false,
        error: `Payment gateway ${gateway} is not configured or enabled. Please configure API credentials in Gateway Settings.`,
      };
    }
    
    const globalConfig = globalGateway.config || {};
    const hasGlobalCredentials = Object.keys(globalConfig).length > 0 &&
      Object.values(globalConfig).some(v => v && v.toString().trim() !== '');
    
    if (!hasGlobalCredentials && gateway !== 'manual' && gateway !== 'rocket') {
      // Global gateway also has no credentials
      const requiredFields = GATEWAY_REQUIRED_CREDENTIALS[gateway] || [];
      return {
        success: false,
        error: `Payment gateway ${gateway} is enabled but API credentials are not configured. Required: ${requiredFields.join(', ')}. Please configure in Super Admin > Gateway Settings.`,
      };
    }
    
    gatewayConfig = globalGateway;
    configData = globalConfig;
    isSandbox = globalGateway.sandbox_mode !== false;
    transactionFeePercent = globalGateway.transaction_fee_percent || 0;
  }

  // Calculate transaction fee
  const originalAmount = paymentData.amount;
  const { fee, totalAmount, netAmount } = calculateTransactionFee(originalAmount, transactionFeePercent);
  
  logger.info(`Payment fee calculation: original=${originalAmount}, fee=${fee} (${transactionFeePercent}%), total=${totalAmount}`);

  // Use totalAmount (with fee) for the actual payment to gateway
  const amountToCharge = totalAmount;

  // For manual payment, just create the payment record and return
  if (gateway === 'manual' || gateway === 'rocket') {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: paymentData.tenant_id,
        amount: totalAmount, // Total amount including fee
        net_amount: netAmount, // Original amount without fee
        gateway_fee: fee,
        fee_percent: transactionFeePercent,
        payment_method: gateway,
        status: 'pending',
        transaction_id: transactionId,
        invoice_number: paymentData.invoice_id || null,
        description: paymentData.description,
        gateway_response: {
          return_url: frontendReturnUrl,
          cancel_url: frontendCancelUrl,
          payment_for: paymentData.payment_for,
          customer_id: paymentData.customer_id,
          instructions: gatewayConfig.instructions,
          original_amount: originalAmount,
          fee_amount: fee,
          fee_percent: transactionFeePercent,
        },
      })
      .select()
      .single();

    if (paymentError) {
      logger.error('Failed to create manual payment record:', paymentError);
      return { success: false, error: 'Failed to create payment record' };
    }

    return {
      success: true,
      payment_id: payment?.id,
      transaction_id: transactionId,
      checkout_url: null, // No redirect for manual payments
      message: gatewayConfig.instructions || 'Please complete the payment manually',
      fee_info: fee > 0 ? { fee, total_amount: totalAmount, net_amount: netAmount, fee_percent: transactionFeePercent } : null,
    };
  }

  // bkash_mode from column first, then config fallback
  const bkashMode = gatewayConfig?.bkash_mode || configData.bkash_mode || 'tokenized';
  
  logger.info(`Payment gateway ${gateway} config:`, {
    bkash_mode: bkashMode,
    isSandbox,
    hasAppKey: !!configData.app_key,
    hasAppSecret: !!configData.app_secret,
    hasUsername: !!configData.username,
    hasPassword: !!configData.password,
    gatewayConfigBkashMode: gatewayConfig?.bkash_mode,
    configDataBkashMode: configData.bkash_mode,
  });

  const config = {
    ...configData,
    is_sandbox: isSandbox,
    bkash_mode: bkashMode,
  };

  // Send gateways to backend callback URL (handles POST + redirects to SPA)
  // Use amountToCharge (includes fee) for the actual gateway payment
  const outboundPaymentData = {
    ...paymentData,
    amount: amountToCharge, // Amount with fee for gateway
    return_url: gatewayCallbackUrl,
    cancel_url: gatewayCallbackUrl,
    ipn_url: gatewayCallbackUrl,
  };

  let result;

  switch (gateway) {
    case 'sslcommerz':
      result = await initiateSSLCommerz(config, outboundPaymentData);
      break;
    case 'shurjopay':
      result = await initiateShurjoPay(config, outboundPaymentData);
      break;
    case 'uddoktapay':
      result = await initiateUddoktaPay(config, outboundPaymentData);
      break;
    case 'aamarpay':
      result = await initiateAamarPay(config, outboundPaymentData);
      break;
    case 'piprapay':
      result = await initiatePipraPay(config, outboundPaymentData);
      break;
    case 'bkash':
      result = await initiateBkash(config, outboundPaymentData);
      break;
    case 'nagad':
      result = await initiateNagad(config, outboundPaymentData);
      break;
    default:
      return { success: false, error: `Unsupported gateway: ${gateway}` };
  }

  if (result.success) {
    // Create pending payment record with gateway_response containing FRONTEND return/cancel URLs
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: paymentData.tenant_id,
        amount: totalAmount, // Total amount including fee
        net_amount: netAmount, // Original amount without fee
        gateway_fee: fee,
        fee_percent: transactionFeePercent,
        payment_method: gateway,
        status: 'pending',
        transaction_id: transactionId,
        invoice_number: paymentData.invoice_id || null,
        description: paymentData.description || `${gateway} Payment`,
        gateway_response: {
          return_url: frontendReturnUrl,
          cancel_url: frontendCancelUrl,
          payment_for: paymentData.payment_for,
          customer_id: paymentData.customer_id,
          gateway_callback_url: gatewayCallbackUrl,
          gateway_init: result,
          bkash_mode: gateway === 'bkash' ? bkashMode : undefined,
          original_amount: originalAmount,
          fee_amount: fee,
          fee_percent: transactionFeePercent,
          // For reseller topup, store reseller_id and topup_request_id
          reseller_id: paymentData.reseller_id,
          topup_request_id: paymentData.topup_request_id,
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
      bkash_mode: result.bkash_mode || null,
      bkash_config: result.bkash_config || null,
      fee_info: fee > 0 ? { fee, total_amount: totalAmount, net_amount: netAmount, fee_percent: transactionFeePercent } : null,
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
  // NOTE: many gateways send slightly different payloads between GET/POST/webhook.
  // We try multiple fields and also normalize JSON string fields.
  const safeJsonParse = (v) => {
    if (!v || typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  switch (gateway) {
    case 'sslcommerz':
      transactionId = callbackData.tran_id || callbackData.tranId || callbackData.transaction_id;
      isSuccess = ['VALID', 'VALIDATED', 'SUCCESS'].includes(String(callbackData.status || '').toUpperCase());
      break;
    case 'shurjopay':
      transactionId = callbackData.order_id || callbackData.orderId || callbackData.transaction_id;
      isSuccess = String(callbackData.sp_code || '') === '1000' || String(callbackData.spCode || '') === '1000';
      break;
    case 'uddoktapay': {
      const md = safeJsonParse(callbackData.metadata);
      transactionId = md?.transaction_id || callbackData.transaction_id || callbackData.tran_id;
      isSuccess = String(callbackData.status || '').toUpperCase() === 'COMPLETED';
      break;
    }
    case 'aamarpay':
      transactionId = callbackData.mer_txnid || callbackData.mer_txn_id || callbackData.tran_id || callbackData.transaction_id;
      isSuccess = String(callbackData.pay_status || callbackData.payStatus || '').toLowerCase() === 'successful';
      break;
    case 'piprapay':
      transactionId = callbackData.order_id || callbackData.orderId || callbackData.order_id || callbackData.transaction_id;
      isSuccess = String(callbackData.status || '').toLowerCase() === 'success';
      break;
    case 'bkash':
      transactionId =
        callbackData.merchantInvoiceNumber ||
        callbackData.merchantInvoiceNo ||
        callbackData.merchantInvoice ||
        callbackData.tran_id ||
        callbackData.transaction_id;
      isSuccess =
        String(callbackData.transactionStatus || callbackData.status || '').toLowerCase() === 'completed' ||
        String(callbackData.transactionStatus || callbackData.status || '').toLowerCase() === 'success';
      break;
    case 'nagad':
      transactionId = callbackData.order_id || callbackData.orderId || callbackData.transaction_id;
      isSuccess = String(callbackData.status || '').toLowerCase() === 'success';
      break;
    default:
      transactionId = callbackData.transaction_id || callbackData.tran_id || callbackData.order_id || callbackData.mer_txnid;
      isSuccess = ['success', 'completed', 'valid', 'validated'].includes(String(callbackData.status || '').toLowerCase());
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

  // Get original gateway_response to extract return_url
  const originalGatewayResponse = payment.gateway_response || {};
  const returnUrl = originalGatewayResponse.return_url || '/billing/history';
  const cancelUrl = originalGatewayResponse.cancel_url || returnUrl;
  const paymentFor = originalGatewayResponse.payment_for;
  const customerId = originalGatewayResponse.customer_id;

  // Update payment status
  const newStatus = isSuccess ? 'completed' : 'failed';
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: newStatus,
      paid_at: isSuccess ? new Date().toISOString() : null,
      gateway_response: {
        ...originalGatewayResponse,
        callback_data: gatewayResponse,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);

  if (updateError) {
    logger.error('Failed to update payment:', updateError);
    return { success: false, error: 'Failed to update payment' };
  }

// Handle customer bill payment - AUTO RECHARGE with reseller commission
  if (isSuccess && paymentFor === 'customer_bill' && customerId) {
    try {
      await processCustomerAutoRecharge(supabase, customerId, payment.amount, payment.tenant_id, payment.id);
    } catch (rechargeError) {
      logger.error('Auto recharge failed:', rechargeError);
      // Don't fail the callback, just log the error
    }
  }

  // Handle reseller wallet top-up - AUTO CREDIT BALANCE
  if (isSuccess && paymentFor === 'reseller_topup') {
    const resellerId = originalGatewayResponse.reseller_id;
    const topupRequestId = originalGatewayResponse.topup_request_id;
    
    if (resellerId) {
      try {
        await processResellerAutoTopup(supabase, resellerId, payment.amount, payment.tenant_id, payment.id, topupRequestId);
        logger.info(`Reseller ${resellerId} wallet auto-credited with ${payment.amount}`);
      } catch (topupError) {
        logger.error('Reseller auto topup failed:', topupError);
      }
    }
  }

  // CRITICAL: Always update tenant status to 'active' when payment is successful for subscription payments
  if (isSuccess && payment.tenant_id && paymentFor !== 'customer_bill') {
    // Check and update tenant status from 'pending' or 'trial' to 'active'
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('status')
      .eq('id', payment.tenant_id)
      .single();
    
    if (tenantData && (tenantData.status === 'pending' || tenantData.status === 'trial')) {
      await supabase
        .from('tenants')
        .update({ 
          status: 'active',
          trial_ends_at: null, // Clear trial since they are now a paying customer
        })
        .eq('id', payment.tenant_id);
      logger.info(`Tenant ${payment.tenant_id} status updated to active after successful payment`);
    }
  }

  // If successful payment for subscription with invoice
  if (isSuccess && payment.invoice_number) {
    // Update invoice status by invoice number
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, subscription_id')
      .eq('invoice_number', payment.invoice_number)
      .single();
    
    if (invoice) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: payment.id,
        })
        .eq('id', invoice.id);

      // Update subscription status
      if (invoice.subscription_id) {
        // Get the subscription to extend it
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*, package:packages(*)')
          .eq('id', invoice.subscription_id)
          .single();

        if (subscription) {
          const currentEnd = new Date(subscription.ends_at);
          const now = new Date();
          const startDate = currentEnd > now ? currentEnd : now;
          
          // Calculate new end date based on billing cycle
          let newEndDate = new Date(startDate);
          if (subscription.billing_cycle === 'yearly') {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          } else if (subscription.billing_cycle === 'quarterly') {
            newEndDate.setMonth(newEndDate.getMonth() + 3);
          } else {
            newEndDate.setMonth(newEndDate.getMonth() + 1);
          }

          await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              ends_at: newEndDate.toISOString(),
            })
            .eq('id', invoice.subscription_id);
        }
      }
    }
  }

  // Build redirect URL using stored return_url from payment record
  const redirectUrl = isSuccess
    ? `${returnUrl}?status=success&payment_id=${payment.id}`
    : `${cancelUrl}?status=failed&payment_id=${payment.id}`;

  return {
    success: true,
    payment_id: payment.id,
    status: newStatus,
    redirect_url: redirectUrl,
  };
}

export { generateTransactionId };
