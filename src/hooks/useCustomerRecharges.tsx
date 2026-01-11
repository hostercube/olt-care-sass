import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { CustomerRecharge, MultiCollection, BillGeneration } from '@/types/erp';

export function useCustomerRecharges() {
  const [recharges, setRecharges] = useState<CustomerRecharge[]>([]);
  const [collections, setCollections] = useState<MultiCollection[]>([]);
  const [billGenerations, setBillGenerations] = useState<BillGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchRecharges = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('customer_recharges').select('*, customers(*)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('recharge_date', { ascending: false }).limit(100);
    if (error) {
      console.error('Error fetching recharges:', error);
    } else {
      setRecharges((data || []) as CustomerRecharge[]);
    }
    setLoading(false);
  }, [isSuperAdmin, tenantId]);

  const fetchCollections = useCallback(async () => {
    const query = supabase.from('multi_collections').select('*');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('collection_date', { ascending: false });
    if (error) {
      console.error('Error fetching collections:', error);
    } else {
      setCollections((data || []) as MultiCollection[]);
    }
  }, [isSuperAdmin, tenantId]);

  const fetchBillGenerations = useCallback(async () => {
    const query = supabase.from('bill_generations').select('*');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('generated_at', { ascending: false });
    if (error) {
      console.error('Error fetching bill generations:', error);
    } else {
      setBillGenerations((data || []) as BillGeneration[]);
    }
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchRecharges();
    fetchCollections();
    fetchBillGenerations();
  }, [fetchRecharges, fetchCollections, fetchBillGenerations]);

  const rechargeCustomer = async (
    customerId: string,
    amount: number,
    months: number,
    paymentMethod: string,
    discount = 0,
    notes?: string,
    collectedByType: string = 'tenant_admin',
    collectedByName: string = 'Tenant Admin'
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    // Get customer's current expiry and reseller info
    const { data: customer } = await supabase
      .from('customers')
      .select('expiry_date, package_id, reseller_id, monthly_bill, isp_packages(validity_days, price)')
      .eq('id', customerId)
      .single();

    if (!customer) {
      toast.error('Customer not found');
      return false;
    }

    const validityDays = (customer.isp_packages as any)?.validity_days || 30;
    const packagePrice = (customer.isp_packages as any)?.price || customer.monthly_bill || amount;
    const oldExpiry = customer.expiry_date;
    
    // Calculate new expiry
    let baseDate = oldExpiry && new Date(oldExpiry) > new Date() 
      ? new Date(oldExpiry) 
      : new Date();
    baseDate.setDate(baseDate.getDate() + (validityDays * months));
    const newExpiry = baseDate.toISOString().split('T')[0];

    // Handle reseller commission if customer belongs to a reseller
    let resellerId = customer.reseller_id;
    let deductFromReseller = false;
    let deductAmount = 0;
    let commission = 0;

    if (resellerId) {
      // Get reseller details
      const { data: reseller } = await supabase
        .from('resellers')
        .select('id, name, balance, commission_type, commission_value, rate_type, customer_rate')
        .eq('id', resellerId)
        .single();

      if (reseller) {
        // Calculate commission based on reseller settings
        // rate_type: 'discount' means reseller gets discount from package price
        // commission_type: 'percentage' or 'flat'
        const rateType = reseller.rate_type || 'discount';
        const commissionType = reseller.commission_type || 'percentage';

        // IMPORTANT: don't fallback percentage commission to legacy customer_rate.
        // If commission_type is 'percentage' but commission_value is empty, commission should be 0.
        const rawCommissionValue = (reseller as any).commission_value;
        const legacyCustomerRate = (reseller as any).customer_rate;

        const toNumber = (v: any) => {
          const n = typeof v === 'string' ? parseFloat(v) : Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const commissionValue =
          commissionType === 'percentage'
            ? toNumber(rawCommissionValue)
            : toNumber(rawCommissionValue ?? legacyCustomerRate);

        const totalPackagePrice = packagePrice * months;

        if (commissionValue > 0) {
          if (commissionType === 'percentage') {
            // Percentage commission: e.g., 25% of package price
            commission = Math.round((totalPackagePrice * commissionValue) / 100);
          } else {
            // Flat rate per month: e.g., 2 taka per month
            commission = Math.round(commissionValue * months);
          }
        }

        // Calculate what reseller should pay
        // For rate_type 'discount': reseller pays (package price - commission)
        // Example: Package = 100, Commission = 25% = 25, Reseller pays = 75
        if (rateType === 'discount' || rateType === 'per_customer') {
          deductAmount = totalPackagePrice - commission;
        } else {
          // For other rate types, reseller pays full amount (no discount)
          deductAmount = totalPackagePrice;
        }

        // Ensure deductAmount is not negative
        deductAmount = Math.max(0, deductAmount);

        // Check if reseller has enough balance
        if (reseller.balance >= deductAmount) {
          deductFromReseller = true;
        } else {
          // Not enough balance - still continue with recharge but log it
          console.log(`Reseller ${reseller.name} has insufficient balance: ৳${reseller.balance}, needed: ৳${deductAmount}`);
          toast.info(`Reseller ${reseller.name} has insufficient balance. Recharge recorded but balance not deducted.`);
        }
      }
    }

    // Create recharge record with tracking
    const effectiveDiscount = (discount ?? 0) > 0 ? (discount ?? 0) : commission;

    const rechargeData: any = {
      tenant_id: tenantId,
      customer_id: customerId,
      amount,
      months,
      payment_method: paymentMethod,
      old_expiry: oldExpiry,
      new_expiry: newExpiry,
      discount: effectiveDiscount,
      notes,
      status: 'completed',
      collected_by_type: collectedByType,
      collected_by_name: collectedByName,
    };

    if (resellerId) {
      rechargeData.reseller_id = resellerId;
    }

    const { error: rechargeError } = await supabase.from('customer_recharges').insert(rechargeData);

    if (rechargeError) {
      toast.error('Failed to record recharge');
      console.error(rechargeError);
      return false;
    }

    // Update customer
    const { error: customerError } = await supabase.from('customers').update({
      expiry_date: newExpiry,
      last_payment_date: new Date().toISOString().split('T')[0],
      due_amount: 0,
      status: 'active',
    }).eq('id', customerId);

    if (customerError) {
      toast.error('Failed to update customer');
      return false;
    }

    // Deduct from reseller balance if applicable
    if (deductFromReseller && resellerId && deductAmount > 0) {
      // Get current reseller balance again to avoid race conditions
      const { data: currentReseller } = await supabase
        .from('resellers')
        .select('balance, name, total_collections')
        .eq('id', resellerId)
        .single();

      if (currentReseller && currentReseller.balance >= deductAmount) {
        const newBalance = currentReseller.balance - deductAmount;

        // Create reseller transaction
        await supabase.from('reseller_transactions').insert({
          tenant_id: tenantId,
          reseller_id: resellerId,
          type: 'customer_recharge',
          amount: -deductAmount,
          balance_before: currentReseller.balance,
          balance_after: newBalance,
          customer_id: customerId,
          description: `Customer recharge by ${collectedByName} (${months} month${months > 1 ? 's' : ''}). Package: ৳${packagePrice * months}, Commission: ৳${commission}`,
        } as any);

        // Update reseller balance
        await supabase
          .from('resellers')
          .update({ 
            balance: newBalance,
            total_collections: (currentReseller as any).total_collections ? (currentReseller as any).total_collections + amount : amount,
          })
          .eq('id', resellerId);

        console.log(`Deducted ৳${deductAmount} from reseller ${currentReseller.name}. New balance: ৳${newBalance}`);
      }
    }

    // Create payment record
    await supabase.from('customer_payments').insert({
      tenant_id: tenantId,
      customer_id: customerId,
      amount,
      payment_method: paymentMethod,
      notes: `Recharge for ${months} month(s)`,
    });

    toast.success('Customer recharged successfully');
    fetchRecharges();
    return true;
  };

  const createMultiCollection = async (
    items: { customerId: string; amount: number; months: number }[],
    paymentMethod: string,
    notes?: string
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Create multi collection record
    const { data: collection, error: collectionError } = await supabase
      .from('multi_collections')
      .insert({
        tenant_id: tenantId,
        total_amount: totalAmount,
        total_customers: items.length,
        payment_method: paymentMethod,
        notes,
      })
      .select()
      .single();

    if (collectionError || !collection) {
      toast.error('Failed to create multi collection');
      return false;
    }

    // Process each customer
    for (const item of items) {
      await rechargeCustomer(item.customerId, item.amount, item.months, paymentMethod);
      
      // Add to collection items
      await supabase.from('multi_collection_items').insert({
        multi_collection_id: collection.id,
        customer_id: item.customerId,
        amount: item.amount,
        months: item.months,
      });
    }

    toast.success(`Successfully collected from ${items.length} customers`);
    fetchCollections();
    return true;
  };

  const generateBills = async (billingMonth: string) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    // Get all active customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, monthly_bill')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (customersError) {
      toast.error('Failed to fetch customers');
      return false;
    }

    let totalBills = 0;
    let totalAmount = 0;

    for (const customer of customers || []) {
      const billAmount = customer.monthly_bill || 0;
      if (billAmount <= 0) continue;

      // Generate bill number
      const billNumber = `INV${billingMonth.replace('-', '')}${String(totalBills + 1).padStart(4, '0')}`;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const { error: billError } = await supabase.from('customer_bills').insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        bill_number: billNumber,
        billing_month: billingMonth,
        amount: billAmount,
        total_amount: billAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'unpaid',
      });

      if (!billError) {
        totalBills++;
        totalAmount += billAmount;
      }
    }

    // Record bill generation
    await supabase.from('bill_generations').insert({
      tenant_id: tenantId,
      billing_month: billingMonth,
      total_bills: totalBills,
      total_amount: totalAmount,
    });

    toast.success(`Generated ${totalBills} bills totaling ৳${totalAmount.toLocaleString()}`);
    fetchBillGenerations();
    return true;
  };

  return {
    recharges,
    collections,
    billGenerations,
    loading,
    refetch: fetchRecharges,
    refetchCollections: fetchCollections,
    refetchBillGenerations: fetchBillGenerations,
    rechargeCustomer,
    createMultiCollection,
    generateBills,
  };
}
