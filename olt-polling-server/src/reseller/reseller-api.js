/**
 * Reseller Portal API Handler
 * Backend APIs for Reseller/Sub-Reseller/Sub-Sub-Reseller portal
 * Uses service role to bypass RLS since resellers use localStorage session (not Supabase Auth)
 */

import { logger } from '../utils/logger.js';

/**
 * Verify reseller session from request headers
 */
export async function verifyResellerSession(supabase, req) {
  const resellerId = req.headers['x-reseller-id'];
  const sessionToken = req.headers['x-reseller-session'];
  
  if (!resellerId) {
    return { valid: false, error: 'Missing reseller ID' };
  }
  
  // Fetch reseller to verify they exist and are active
  const { data: reseller, error } = await supabase
    .from('resellers')
    .select('*')
    .eq('id', resellerId)
    .eq('is_active', true)
    .single();
  
  if (error || !reseller) {
    return { valid: false, error: 'Invalid or inactive reseller' };
  }
  
  return { valid: true, reseller };
}

/**
 * Get allowed areas for a reseller with inheritance from parent
 */
async function getAllowedAreas(supabase, reseller) {
  const tenantId = reseller.tenant_id;
  let allowedAreaIds = reseller.allowed_area_ids;
  
  // If no area restriction, inherit from parent
  if (!allowedAreaIds || allowedAreaIds.length === 0) {
    if (reseller.parent_id) {
      const { data: parent } = await supabase
        .from('resellers')
        .select('allowed_area_ids, parent_id')
        .eq('id', reseller.parent_id)
        .single();
      
      if (parent?.allowed_area_ids?.length > 0) {
        allowedAreaIds = parent.allowed_area_ids;
      } else if (parent?.parent_id) {
        // Check grandparent
        const { data: grandparent } = await supabase
          .from('resellers')
          .select('allowed_area_ids')
          .eq('id', parent.parent_id)
          .single();
        
        if (grandparent?.allowed_area_ids?.length > 0) {
          allowedAreaIds = grandparent.allowed_area_ids;
        }
      }
    }
  }
  
  // Fetch areas
  let query = supabase
    .from('areas')
    .select('id, name, description, district, upazila, union_name, village')
    .eq('tenant_id', tenantId)
    .order('name');
  
  if (allowedAreaIds && allowedAreaIds.length > 0) {
    query = query.in('id', allowedAreaIds);
  }
  
  const { data: areas, error } = await query;
  
  if (error) {
    logger.error('Error fetching areas:', error);
    return [];
  }
  
  return areas || [];
}

/**
 * Get reseller transactions
 */
async function getResellerTransactions(supabase, resellerId, filters = {}) {
  let query = supabase
    .from('reseller_transactions')
    .select(`
      *,
      customer:customers(id, name, customer_code)
    `)
    .eq('reseller_id', resellerId)
    .order('created_at', { ascending: false });
  
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(500);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Error fetching transactions:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get customer recharge history for reseller
 */
async function getResellerRecharges(supabase, resellerId, filters = {}) {
  let query = supabase
    .from('customer_recharges')
    .select(`
      *,
      customer:customers(id, name, customer_code)
    `)
    .eq('reseller_id', resellerId)
    .order('recharge_date', { ascending: false });
  
  if (filters.source && filters.source !== 'all') {
    query = query.eq('payment_method', filters.source);
  }
  
  if (filters.dateFrom) {
    query = query.gte('recharge_date', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('recharge_date', filters.dateTo + 'T23:59:59');
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(500);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Error fetching recharges:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get customers for reseller
 */
async function getResellerCustomers(supabase, reseller, includeSubCustomers = false) {
  const resellerId = reseller.id;
  let customerIds = [];
  
  // Get direct customers
  const { data: directCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('reseller_id', resellerId);
  
  customerIds = (directCustomers || []).map(c => c.id);
  
  // If can view sub-customers, get sub-reseller customers too
  if (includeSubCustomers && reseller.can_view_sub_customers) {
    const { data: subResellers } = await supabase
      .from('resellers')
      .select('id')
      .eq('parent_id', resellerId);
    
    if (subResellers?.length) {
      const subResellerIds = subResellers.map(s => s.id);
      const { data: subCustomers } = await supabase
        .from('customers')
        .select('id')
        .in('reseller_id', subResellerIds);
      
      customerIds = [...customerIds, ...(subCustomers || []).map(c => c.id)];
    }
  }
  
  if (customerIds.length === 0) {
    return [];
  }
  
  // Fetch full customer data
  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      *,
      package:isp_packages(id, name, price),
      area:areas(id, name)
    `)
    .in('id', customerIds)
    .order('name');
  
  if (error) {
    logger.error('Error fetching customers:', error);
    return [];
  }
  
  return customers || [];
}

/**
 * Get sub-resellers for a reseller
 */
async function getSubResellers(supabase, resellerId) {
  const { data, error } = await supabase
    .from('resellers')
    .select('*')
    .eq('parent_id', resellerId)
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    logger.error('Error fetching sub-resellers:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Recharge customer from reseller wallet
 */
async function rechargeCustomerFromWallet(supabase, reseller, customerId, amount, months, paymentMethod = 'reseller_wallet') {
  logger.info(`Reseller ${reseller.id} recharging customer ${customerId} for ${amount} (${months} months)`);
  
  // Calculate commission/discount
  let deductAmount = amount;
  let commission = 0;
  
  const rateType = reseller.rate_type || 'discount';
  const commissionType = reseller.commission_type || 'percentage';
  const commissionValue = reseller.commission_value || reseller.customer_rate || 0;
  
  if (commissionValue > 0) {
    if (commissionType === 'percentage') {
      commission = Math.round((amount * commissionValue) / 100);
    } else {
      commission = commissionValue * months;
    }
    
    if (rateType === 'discount') {
      deductAmount = amount - commission;
    }
  }
  
  // Check balance
  if (reseller.balance < deductAmount) {
    return { success: false, error: `Insufficient balance. Need ৳${deductAmount}, have ৳${reseller.balance}` };
  }
  
  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select(`*, package:isp_packages(id, name, price, validity_days)`)
    .eq('id', customerId)
    .single();
  
  if (customerError || !customer) {
    return { success: false, error: 'Customer not found' };
  }
  
  // Calculate new expiry
  const validityDays = customer.package?.validity_days || 30;
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
  
  const oldExpiry = customer.expiry_date;
  const newBalance = reseller.balance - deductAmount;
  
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
    logger.error('Failed to update customer:', updateError);
    return { success: false, error: 'Failed to update customer' };
  }
  
  // Create recharge record
  await supabase.from('customer_recharges').insert({
    tenant_id: reseller.tenant_id,
    customer_id: customerId,
    reseller_id: reseller.id,
    amount,
    months,
    discount: commission,
    old_expiry: oldExpiry,
    new_expiry: newExpiry.toISOString(),
    payment_method: paymentMethod,
    status: 'completed',
    notes: `Recharged by ${reseller.name} (${reseller.role || 'reseller'})`,
  });
  
  // Create transaction record
  await supabase.from('reseller_transactions').insert({
    tenant_id: reseller.tenant_id,
    reseller_id: reseller.id,
    type: 'customer_payment',
    amount: -deductAmount,
    balance_before: reseller.balance,
    balance_after: newBalance,
    customer_id: customerId,
    description: `Recharge for ${customer.name} (${months} month${months > 1 ? 's' : ''})`,
  });
  
  // Update reseller balance
  await supabase
    .from('resellers')
    .update({
      balance: newBalance,
      total_collections: (reseller.total_collections || 0) + amount,
    })
    .eq('id', reseller.id);
  
  logger.info(`Customer ${customerId} recharged successfully. New expiry: ${newExpiry.toISOString()}`);
  
  return { 
    success: true, 
    newExpiry: newExpiry.toISOString(),
    amountDeducted: deductAmount,
    commission,
    newBalance,
  };
}

/**
 * Add balance to sub-reseller
 */
async function addSubResellerBalance(supabase, reseller, subResellerId, amount, description = '') {
  logger.info(`Reseller ${reseller.id} adding ${amount} to sub-reseller ${subResellerId}`);
  
  // Check if sub-reseller belongs to this reseller
  const { data: subReseller, error } = await supabase
    .from('resellers')
    .select('*')
    .eq('id', subResellerId)
    .eq('parent_id', reseller.id)
    .single();
  
  if (error || !subReseller) {
    return { success: false, error: 'Sub-reseller not found or not authorized' };
  }
  
  // Check balance
  if (reseller.balance < amount) {
    return { success: false, error: `Insufficient balance. Need ৳${amount}, have ৳${reseller.balance}` };
  }
  
  const resellerNewBalance = reseller.balance - amount;
  const subResellerNewBalance = (subReseller.balance || 0) + amount;
  
  // Update reseller balance and create transaction
  await supabase
    .from('resellers')
    .update({ balance: resellerNewBalance })
    .eq('id', reseller.id);
  
  await supabase.from('reseller_transactions').insert({
    tenant_id: reseller.tenant_id,
    reseller_id: reseller.id,
    type: 'transfer_out',
    amount: -amount,
    balance_before: reseller.balance,
    balance_after: resellerNewBalance,
    to_reseller_id: subResellerId,
    description: description || `Balance transfer to ${subReseller.name}`,
  });
  
  // Update sub-reseller balance and create transaction
  await supabase
    .from('resellers')
    .update({ balance: subResellerNewBalance })
    .eq('id', subResellerId);
  
  await supabase.from('reseller_transactions').insert({
    tenant_id: reseller.tenant_id,
    reseller_id: subResellerId,
    type: 'transfer_in',
    amount: amount,
    balance_before: subReseller.balance || 0,
    balance_after: subResellerNewBalance,
    from_reseller_id: reseller.id,
    description: description || `Balance received from ${reseller.name}`,
  });
  
  return { 
    success: true, 
    resellerNewBalance,
    subResellerNewBalance,
  };
}

/**
 * Deduct balance from sub-reseller
 */
async function deductSubResellerBalance(supabase, reseller, subResellerId, amount, description = '') {
  logger.info(`Reseller ${reseller.id} deducting ${amount} from sub-reseller ${subResellerId}`);
  
  // Check if sub-reseller belongs to this reseller
  const { data: subReseller, error } = await supabase
    .from('resellers')
    .select('*')
    .eq('id', subResellerId)
    .eq('parent_id', reseller.id)
    .single();
  
  if (error || !subReseller) {
    return { success: false, error: 'Sub-reseller not found or not authorized' };
  }
  
  // Check sub-reseller balance
  if ((subReseller.balance || 0) < amount) {
    return { success: false, error: `Sub-reseller has insufficient balance. Has ৳${subReseller.balance || 0}` };
  }
  
  const resellerNewBalance = reseller.balance + amount;
  const subResellerNewBalance = (subReseller.balance || 0) - amount;
  
  // Update reseller balance and create transaction
  await supabase
    .from('resellers')
    .update({ balance: resellerNewBalance })
    .eq('id', reseller.id);
  
  await supabase.from('reseller_transactions').insert({
    tenant_id: reseller.tenant_id,
    reseller_id: reseller.id,
    type: 'transfer_in',
    amount: amount,
    balance_before: reseller.balance,
    balance_after: resellerNewBalance,
    from_reseller_id: subResellerId,
    description: description || `Balance deducted from ${subReseller.name}`,
  });
  
  // Update sub-reseller balance and create transaction
  await supabase
    .from('resellers')
    .update({ balance: subResellerNewBalance })
    .eq('id', subResellerId);
  
  await supabase.from('reseller_transactions').insert({
    tenant_id: reseller.tenant_id,
    reseller_id: subResellerId,
    type: 'deduction',
    amount: -amount,
    balance_before: subReseller.balance || 0,
    balance_after: subResellerNewBalance,
    to_reseller_id: reseller.id,
    description: description || `Balance deducted by ${reseller.name}`,
  });
  
  return { 
    success: true, 
    resellerNewBalance,
    subResellerNewBalance,
  };
}

/**
 * Get packages for tenant
 */
async function getPackages(supabase, tenantId) {
  const { data, error } = await supabase
    .from('isp_packages')
    .select('id, name, price, validity_days')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  
  return data || [];
}

/**
 * Get MikroTik routers for reseller
 */
async function getMikrotikRouters(supabase, reseller) {
  let query = supabase
    .from('mikrotik_routers')
    .select('id, name')
    .eq('tenant_id', reseller.tenant_id);
  
  const allowedIds = reseller.allowed_mikrotik_ids;
  if (allowedIds && allowedIds.length > 0) {
    query = query.in('id', allowedIds);
  }
  
  const { data } = await query;
  return data || [];
}

/**
 * Get OLTs for reseller
 */
async function getOlts(supabase, reseller) {
  let query = supabase
    .from('olts')
    .select('id, name')
    .eq('tenant_id', reseller.tenant_id);
  
  const allowedIds = reseller.allowed_olt_ids;
  if (allowedIds && allowedIds.length > 0) {
    query = query.in('id', allowedIds);
  }
  
  const { data } = await query;
  return data || [];
}

/**
 * Create customer
 */
async function createCustomer(supabase, reseller, customerData) {
  const { error, data } = await supabase
    .from('customers')
    .insert({
      ...customerData,
      tenant_id: reseller.tenant_id,
      reseller_id: reseller.id,
    })
    .select()
    .single();
  
  if (error) {
    logger.error('Error creating customer:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, customer: data };
}

/**
 * Update customer
 */
async function updateCustomer(supabase, reseller, customerId, customerData) {
  // Verify customer belongs to this reseller or sub-reseller
  const { data: customer } = await supabase
    .from('customers')
    .select('reseller_id')
    .eq('id', customerId)
    .single();
  
  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }
  
  // Check if customer belongs to reseller or sub-reseller
  let authorized = customer.reseller_id === reseller.id;
  
  if (!authorized && reseller.can_control_sub_customers) {
    const { data: subResellers } = await supabase
      .from('resellers')
      .select('id')
      .eq('parent_id', reseller.id);
    
    const subResellerIds = (subResellers || []).map(s => s.id);
    authorized = subResellerIds.includes(customer.reseller_id);
  }
  
  if (!authorized) {
    return { success: false, error: 'Not authorized to edit this customer' };
  }
  
  const { error } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', customerId);
  
  if (error) {
    logger.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Setup reseller API routes
 */
export function setupResellerRoutes(app, supabase) {
  // Verify session middleware
  const authMiddleware = async (req, res, next) => {
    const result = await verifyResellerSession(supabase, req);
    if (!result.valid) {
      return res.status(401).json({ success: false, error: result.error });
    }
    req.reseller = result.reseller;
    next();
  };
  
  // Get reseller profile and data
  app.get('/api/reseller/profile', authMiddleware, async (req, res) => {
    try {
      const reseller = req.reseller;
      
      // Fetch role if exists
      let role = null;
      if (reseller.role_id) {
        const { data: roleData } = await supabase
          .from('reseller_roles')
          .select('*')
          .eq('id', reseller.role_id)
          .single();
        role = roleData;
      }
      
      res.json({ 
        success: true, 
        reseller,
        role,
      });
    } catch (error) {
      logger.error('Error fetching reseller profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get allowed areas (with inheritance)
  app.get('/api/reseller/areas', authMiddleware, async (req, res) => {
    try {
      const areas = await getAllowedAreas(supabase, req.reseller);
      res.json({ success: true, areas });
    } catch (error) {
      logger.error('Error fetching areas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get transactions
  app.get('/api/reseller/transactions', authMiddleware, async (req, res) => {
    try {
      const { type, dateFrom, dateTo, limit } = req.query;
      const transactions = await getResellerTransactions(supabase, req.reseller.id, {
        type, dateFrom, dateTo, limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, transactions });
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get recharge history
  app.get('/api/reseller/recharges', authMiddleware, async (req, res) => {
    try {
      const { source, dateFrom, dateTo, limit } = req.query;
      const recharges = await getResellerRecharges(supabase, req.reseller.id, {
        source, dateFrom, dateTo, limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, recharges });
    } catch (error) {
      logger.error('Error fetching recharges:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get customers
  app.get('/api/reseller/customers', authMiddleware, async (req, res) => {
    try {
      const includeSubCustomers = req.query.includeSub === 'true';
      const customers = await getResellerCustomers(supabase, req.reseller, includeSubCustomers);
      res.json({ success: true, customers });
    } catch (error) {
      logger.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get sub-resellers
  app.get('/api/reseller/sub-resellers', authMiddleware, async (req, res) => {
    try {
      const subResellers = await getSubResellers(supabase, req.reseller.id);
      res.json({ success: true, subResellers });
    } catch (error) {
      logger.error('Error fetching sub-resellers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get sub-reseller transactions
  app.get('/api/reseller/sub-reseller/:subId/transactions', authMiddleware, async (req, res) => {
    try {
      const { subId } = req.params;
      
      // Verify sub-reseller belongs to this reseller
      const { data: subReseller } = await supabase
        .from('resellers')
        .select('id')
        .eq('id', subId)
        .eq('parent_id', req.reseller.id)
        .single();
      
      if (!subReseller) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const transactions = await getResellerTransactions(supabase, subId, { limit: 100 });
      res.json({ success: true, transactions });
    } catch (error) {
      logger.error('Error fetching sub-reseller transactions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Recharge customer
  app.post('/api/reseller/customer-recharge', authMiddleware, async (req, res) => {
    try {
      const { customerId, amount, months, paymentMethod } = req.body;
      
      if (!customerId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }
      
      const result = await rechargeCustomerFromWallet(
        supabase, 
        req.reseller, 
        customerId, 
        parseFloat(amount), 
        parseInt(months) || 1,
        paymentMethod || 'reseller_wallet'
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error recharging customer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Add sub-reseller balance
  app.post('/api/reseller/sub-reseller/add-balance', authMiddleware, async (req, res) => {
    try {
      const { subResellerId, amount, description } = req.body;
      
      if (!subResellerId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }
      
      const result = await addSubResellerBalance(
        supabase, 
        req.reseller, 
        subResellerId, 
        parseFloat(amount),
        description
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error adding sub-reseller balance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Deduct sub-reseller balance
  app.post('/api/reseller/sub-reseller/deduct-balance', authMiddleware, async (req, res) => {
    try {
      const { subResellerId, amount, description } = req.body;
      
      if (!subResellerId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }
      
      const result = await deductSubResellerBalance(
        supabase, 
        req.reseller, 
        subResellerId, 
        parseFloat(amount),
        description
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error deducting sub-reseller balance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get packages
  app.get('/api/reseller/packages', authMiddleware, async (req, res) => {
    try {
      const packages = await getPackages(supabase, req.reseller.tenant_id);
      res.json({ success: true, packages });
    } catch (error) {
      logger.error('Error fetching packages:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get MikroTik routers
  app.get('/api/reseller/mikrotik-routers', authMiddleware, async (req, res) => {
    try {
      const routers = await getMikrotikRouters(supabase, req.reseller);
      res.json({ success: true, routers });
    } catch (error) {
      logger.error('Error fetching mikrotik routers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get OLTs
  app.get('/api/reseller/olts', authMiddleware, async (req, res) => {
    try {
      const olts = await getOlts(supabase, req.reseller);
      res.json({ success: true, olts });
    } catch (error) {
      logger.error('Error fetching OLTs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Create customer
  app.post('/api/reseller/customers', authMiddleware, async (req, res) => {
    try {
      const result = await createCustomer(supabase, req.reseller, req.body);
      res.json(result);
    } catch (error) {
      logger.error('Error creating customer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update customer
  app.put('/api/reseller/customers/:customerId', authMiddleware, async (req, res) => {
    try {
      const result = await updateCustomer(supabase, req.reseller, req.params.customerId, req.body);
      res.json(result);
    } catch (error) {
      logger.error('Error updating customer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Also add routes without /api prefix for nginx proxy
  app.get('/reseller/profile', (req, res) => { req.url = '/api/reseller/profile'; app.handle(req, res); });
  app.get('/reseller/areas', (req, res) => { req.url = '/api/reseller/areas'; app.handle(req, res); });
  app.get('/reseller/transactions', (req, res) => { req.url = '/api/reseller/transactions'; app.handle(req, res); });
  app.get('/reseller/recharges', (req, res) => { req.url = '/api/reseller/recharges'; app.handle(req, res); });
  app.get('/reseller/customers', (req, res) => { req.url = '/api/reseller/customers'; app.handle(req, res); });
  app.get('/reseller/sub-resellers', (req, res) => { req.url = '/api/reseller/sub-resellers'; app.handle(req, res); });
  app.get('/reseller/packages', (req, res) => { req.url = '/api/reseller/packages'; app.handle(req, res); });
  app.get('/reseller/mikrotik-routers', (req, res) => { req.url = '/api/reseller/mikrotik-routers'; app.handle(req, res); });
  app.get('/reseller/olts', (req, res) => { req.url = '/api/reseller/olts'; app.handle(req, res); });
  app.post('/reseller/customer-recharge', (req, res) => { req.url = '/api/reseller/customer-recharge'; app.handle(req, res); });
  app.post('/reseller/customers', (req, res) => { req.url = '/api/reseller/customers'; app.handle(req, res); });
  app.put('/reseller/customers/:customerId', (req, res) => { req.url = `/api/reseller/customers/${req.params.customerId}`; app.handle(req, res); });
  app.post('/reseller/sub-reseller/add-balance', (req, res) => { req.url = '/api/reseller/sub-reseller/add-balance'; app.handle(req, res); });
  app.post('/reseller/sub-reseller/deduct-balance', (req, res) => { req.url = '/api/reseller/sub-reseller/deduct-balance'; app.handle(req, res); });
  
  logger.info('✓ Reseller Portal API routes registered');
}
