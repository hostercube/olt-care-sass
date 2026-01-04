import type { PaymentMethod } from "@/types/saas";

// Get VPS URL from environment - fallback to polling server URL
const VPS_URL = import.meta.env.VITE_VPS_URL || import.meta.env.VITE_POLLING_SERVER_URL || 'https://oltapp.isppoint.com/olt-polling-server';

export interface PaymentInitiateRequest {
  gateway: PaymentMethod;
  amount: number;
  tenant_id: string;
  invoice_id?: string;
  customer_id?: string;
  description?: string;

  /**
   * Where the gateway should send success/fail callbacks (backend URL).
   * If omitted, backend will fall back to return_url.
   */
  gateway_callback_url?: string;

  /**
   * SPA routes where user should finally land after backend processes callback.
   */
  return_url: string;
  cancel_url: string;

  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_for: 'subscription' | 'customer_bill';
}

export interface PaymentInitiateResponse {
  success: boolean;
  payment_id?: string;
  checkout_url?: string | null;
  error?: string;
  message?: string;
  transaction_id?: string;
  // bKash PGW Checkout.js mode
  bkash_mode?: 'tokenized' | 'checkout_js' | null;
  bkash_config?: {
    paymentID: string;
    scriptUrl: string;
    baseUrl: string;
    app_key: string;
    id_token: string;
    merchantInvoiceNumber: string;
    amount: string;
    currency: string;
  } | null;
}

export async function initiatePayment(request: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
  try {
    const response = await fetch(`${VPS_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to initiate payment',
      };
    }

    return data as PaymentInitiateResponse;
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate payment',
    };
  }
}

export function redirectToCheckout(checkoutUrl: string): void {
  window.location.href = checkoutUrl;
}

export function getPaymentStatus(searchParams: URLSearchParams): {
  paymentId: string | null;
  status: 'success' | 'failed' | 'cancelled' | null;
} {
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status') as 'success' | 'failed' | 'cancelled' | null;
  return { paymentId, status };
}

export function getGatewayDisplayName(gateway: PaymentMethod): string {
  const names: Record<PaymentMethod, string> = {
    sslcommerz: 'SSLCommerz',
    bkash: 'bKash',
    rocket: 'Rocket',
    nagad: 'Nagad',
    uddoktapay: 'UddoktaPay',
    shurjopay: 'ShurjoPay',
    aamarpay: 'aamarPay',
    portwallet: 'PortWallet',
    piprapay: 'PipraPay',
    manual: 'Manual Payment',
  };
  return names[gateway] || gateway;
}

export function isOnlineGateway(gateway: PaymentMethod): boolean {
  return gateway !== 'manual' && gateway !== 'rocket';
}

// Get callback URL for payment gateways
export function getPaymentCallbackUrl(gateway: string): string {
  // MUST use /olt-polling-server path because Nginx proxies this to the backend
  // Without this prefix, Nginx tries to serve static files and returns 405 on POST
  return `${VPS_URL}/payments/callback/${gateway}`;
}
