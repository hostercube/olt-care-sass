/**
 * Reseller Portal API Client
 * Connects to VPS backend for all reseller operations
 */

const BACKEND_URL = 'https://oltapp.isppoint.com/olt-polling-server';

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Get headers with reseller session
 */
function getHeaders(): HeadersInit {
  const session = localStorage.getItem('reseller_session');
  const parsed = session ? JSON.parse(session) : null;
  
  return {
    'Content-Type': 'application/json',
    'X-Reseller-ID': parsed?.id || '',
    'X-Reseller-Session': parsed?.logged_in_at || '',
  };
}

/**
 * Make API request
 */
async function apiRequest<T>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const options: RequestInit = {
      method,
      headers: getHeaders(),
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    // Add query params for GET
    let url = `${BACKEND_URL}/api/reseller${endpoint}`;
    if (body && method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    return { success: false, error: error.message || 'Network error' };
  }
}

// ============= Profile & Session =============

export async function fetchResellerProfile() {
  return apiRequest('/profile');
}

// ============= Areas =============

export async function fetchResellerAreas() {
  return apiRequest('/areas');
}

// ============= Transactions =============

export interface TransactionFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export async function fetchResellerTransactions(filters?: TransactionFilters) {
  return apiRequest('/transactions', 'GET', filters);
}

// ============= Recharges =============

export interface RechargeFilters {
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export async function fetchResellerRecharges(filters?: RechargeFilters) {
  return apiRequest('/recharges', 'GET', filters);
}

// ============= Customers =============

export async function fetchResellerCustomers(includeSub: boolean = false) {
  return apiRequest('/customers', 'GET', { includeSub: includeSub ? 'true' : 'false' });
}

export async function createResellerCustomer(data: any) {
  return apiRequest('/customers', 'POST', data);
}

export async function updateResellerCustomer(customerId: string, data: any) {
  return apiRequest(`/customers/${customerId}`, 'PUT', data);
}

export async function rechargeCustomer(customerId: string, amount: number, months: number = 1, paymentMethod: string = 'reseller_wallet') {
  return apiRequest('/customer-recharge', 'POST', {
    customerId,
    amount,
    months,
    paymentMethod,
  });
}

// ============= Sub-Resellers =============

export async function fetchSubResellers() {
  return apiRequest('/sub-resellers');
}

export async function fetchSubResellerTransactions(subResellerId: string) {
  return apiRequest(`/sub-reseller/${subResellerId}/transactions`);
}

export async function addSubResellerBalance(subResellerId: string, amount: number, description?: string) {
  return apiRequest('/sub-reseller/add-balance', 'POST', {
    subResellerId,
    amount,
    description,
  });
}

export async function deductSubResellerBalance(subResellerId: string, amount: number, description?: string) {
  return apiRequest('/sub-reseller/deduct-balance', 'POST', {
    subResellerId,
    amount,
    description,
  });
}

// ============= Packages & Devices =============

export async function fetchResellerPackages() {
  return apiRequest('/packages');
}

export async function fetchResellerMikrotikRouters() {
  return apiRequest('/mikrotik-routers');
}

export async function fetchResellerOlts() {
  return apiRequest('/olts');
}
