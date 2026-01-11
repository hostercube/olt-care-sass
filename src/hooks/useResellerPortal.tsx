import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Reseller, ResellerTransaction } from '@/types/reseller';

interface ResellerSession {
  id: string;
  name: string;
  username: string;
  tenant_id: string;
  level: number;
  role: string;
  balance: number;
  is_impersonation: boolean;
  logged_in_at: string;
}

interface Customer {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  expiry_date: string | null;
  monthly_bill: number | null;
  due_amount: number | null;
  package_id: string | null;
  package?: { id: string; name: string; price: number } | null;
  area?: { id: string; name: string } | null;
  reseller_id: string | null;
  mikrotik_id: string | null;
  onu_id: string | null;
  pppoe_username: string | null;
  connection_date: string | null;
  created_at: string;
}

interface BillingSummary {
  totalCustomers: number;
  activeCustomers: number;
  expiredCustomers: number;
  totalMonthlyRevenue: number;
  totalDue: number;
  totalCollections: number;
  rechargesThisMonth: number;
  commissionsEarned: number;
}

export function useResellerPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ResellerSession | null>(null);
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subResellers, setSubResellers] = useState<Reseller[]>([]);
  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [packages, setPackages] = useState<{ id: string; name: string; price: number }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [mikrotikRouters, setMikrotikRouters] = useState<{ id: string; name: string }[]>([]);
  const [olts, setOlts] = useState<{ id: string; name: string }[]>([]);

  // Check session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('reseller_session');
    if (!storedSession) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
    } catch (e) {
      localStorage.removeItem('reseller_session');
      setLoading(false);
    }
  }, []);

  // Fetch reseller data when session is available
  useEffect(() => {
    if (session?.id) {
      fetchResellerData();
    } else if (session === null) {
      setLoading(false);
    }
  }, [session?.id]);

  const fetchResellerData = async () => {
    if (!session?.id) return;
    
    setLoading(true);
    try {
      // Fetch fresh reseller data
      const { data: resellerData, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error || !resellerData) {
        logout();
        return;
      }

      setReseller(resellerData as unknown as Reseller);
      setSession(prev => prev ? { ...prev, balance: (resellerData as any).balance } : null);

      // Fetch all related data in parallel
      await Promise.all([
        fetchCustomers(session.id, resellerData as any),
        fetchSubResellers(session.id),
        fetchTransactions(session.id),
        fetchPackages((resellerData as any).tenant_id),
        fetchAreas((resellerData as any).tenant_id),
        fetchDevices(resellerData as any),
      ]);

      // Calculate billing summary
      calculateBillingSummary(session.id);
    } catch (err) {
      console.error('Error fetching reseller data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async (resellerId: string, resellerData: Reseller) => {
    try {
      let customerIds: string[] = [];
      
      // Get direct customers
      const directQuery = supabase
        .from('customers')
        .select('id')
        .eq('reseller_id', resellerId);
      
      const { data: directCustomers } = await directQuery;
      customerIds = (directCustomers || []).map(c => c.id);

      // If can view sub-customers, get sub-reseller customers too
      if (resellerData.can_view_sub_customers) {
        const { data: subResellersData } = await supabase
          .from('resellers')
          .select('id')
          .eq('parent_id', resellerId);

        if (subResellersData?.length) {
          const subResellerIds = subResellersData.map(s => s.id);
          const { data: subCustomers } = await supabase
            .from('customers')
            .select('id')
            .in('reseller_id', subResellerIds);
          
          customerIds = [...customerIds, ...(subCustomers || []).map(c => c.id)];
        }
      }

      // Fetch full customer data
      if (customerIds.length > 0) {
        const { data: fullCustomers } = await supabase
          .from('customers')
          .select(`
            *,
            package:isp_packages(id, name, price),
            area:areas(id, name)
          `)
          .in('id', customerIds)
          .order('name');

        setCustomers((fullCustomers as any[]) || []);
      } else {
        // Also fetch customers assigned directly
        const { data: directCustomersFull } = await supabase
          .from('customers')
          .select(`
            *,
            package:isp_packages(id, name, price),
            area:areas(id, name)
          `)
          .eq('reseller_id', resellerId)
          .order('name');

        setCustomers((directCustomersFull as any[]) || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const fetchSubResellers = async (resellerId: string) => {
    try {
      const { data } = await supabase
        .from('resellers')
        .select('*')
        .eq('parent_id', resellerId)
        .eq('is_active', true)
        .order('name');

      setSubResellers((data as unknown as Reseller[]) || []);
    } catch (err) {
      console.error('Error fetching sub-resellers:', err);
      setSubResellers([]);
    }
  };

  const fetchTransactions = async (resellerId: string) => {
    try {
      const { data } = await supabase
        .from('reseller_transactions' as any)
        .select(`
          *,
          customer:customers(id, name, customer_code)
        `)
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false })
        .limit(100);

      setTransactions((data as unknown as ResellerTransaction[]) || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    }
  };

  const fetchPackages = async (tenantId: string) => {
    try {
      const { data } = await supabase
        .from('isp_packages')
        .select('id, name, price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const fetchAreas = async (tenantId: string) => {
    try {
      const { data } = await supabase
        .from('areas')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');

      setAreas(data || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  const fetchDevices = async (resellerData: Reseller) => {
    try {
      // Fetch MikroTik routers
      let mikrotikQuery = supabase
        .from('mikrotik_routers')
        .select('id, name')
        .eq('tenant_id', resellerData.tenant_id);

      // Filter by allowed IDs if set
      const allowedMikrotik = (resellerData as any).allowed_mikrotik_ids as string[] | null;
      if (allowedMikrotik && allowedMikrotik.length > 0) {
        mikrotikQuery = mikrotikQuery.in('id', allowedMikrotik);
      }

      const { data: mikrotikData } = await mikrotikQuery;
      setMikrotikRouters(mikrotikData || []);

      // Fetch OLTs
      let oltQuery = supabase
        .from('olts')
        .select('id, name')
        .eq('tenant_id', resellerData.tenant_id);

      const allowedOlts = (resellerData as any).allowed_olt_ids as string[] | null;
      if (allowedOlts && allowedOlts.length > 0) {
        oltQuery = oltQuery.in('id', allowedOlts);
      }

      const { data: oltData } = await oltQuery;
      setOlts(oltData || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const calculateBillingSummary = async (resellerId: string) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get customer stats
      const activeCount = customers.filter(c => c.status === 'active').length;
      const expiredCount = customers.filter(c => c.status === 'expired').length;
      const totalMonthly = customers.reduce((sum, c) => sum + (c.monthly_bill || 0), 0);
      const totalDue = customers.reduce((sum, c) => sum + (c.due_amount || 0), 0);

      // Get recharges this month
      const { data: monthlyRecharges } = await supabase
        .from('customer_recharges')
        .select('amount')
        .eq('reseller_id', resellerId)
        .gte('created_at', startOfMonth);

      const rechargesThisMonth = (monthlyRecharges || []).reduce((sum, r) => sum + (r.amount || 0), 0);

      // Get commissions earned
      const { data: commissions } = await supabase
        .from('reseller_transactions' as any)
        .select('amount')
        .eq('reseller_id', resellerId)
        .eq('type', 'commission');

      const commissionsEarned = (commissions || []).reduce((sum: number, c: any) => sum + Math.abs(c.amount || 0), 0);

      // Get total collections
      const { data: resellerData } = await supabase
        .from('resellers')
        .select('total_collections')
        .eq('id', resellerId)
        .single();

      setBillingSummary({
        totalCustomers: customers.length,
        activeCustomers: activeCount,
        expiredCustomers: expiredCount,
        totalMonthlyRevenue: totalMonthly,
        totalDue,
        totalCollections: (resellerData as any)?.total_collections || 0,
        rechargesThisMonth,
        commissionsEarned,
      });
    } catch (err) {
      console.error('Error calculating billing summary:', err);
    }
  };

  // Recalculate billing when customers change
  useEffect(() => {
    if (session?.id && customers.length >= 0) {
      calculateBillingSummary(session.id);
    }
  }, [customers, session?.id]);

  const logout = useCallback(() => {
    localStorage.removeItem('reseller_session');
    setSession(null);
    setReseller(null);
    toast.success('Logged out successfully');
    navigate('/reseller/login');
  }, [navigate]);

  // Customer operations
  const createCustomer = async (data: Partial<Customer>): Promise<boolean> => {
    if (!reseller?.can_add_customers) {
      toast.error('You do not have permission to add customers');
      return false;
    }

    try {
      const customerData = {
        ...data,
        tenant_id: reseller.tenant_id,
        reseller_id: reseller.id,
      };

      const { error } = await supabase
        .from('customers')
        .insert(customerData as any);

      if (error) throw error;

      toast.success('Customer created successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error creating customer:', err);
      toast.error(err.message || 'Failed to create customer');
      return false;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<boolean> => {
    if (!reseller?.can_edit_customers) {
      toast.error('You do not have permission to edit customers');
      return false;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;

      toast.success('Customer updated successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error updating customer:', err);
      toast.error(err.message || 'Failed to update customer');
      return false;
    }
  };

  const rechargeCustomer = async (customerId: string, amount: number, months: number = 1): Promise<boolean> => {
    if (!reseller?.can_recharge_customers) {
      toast.error('You do not have permission to recharge customers');
      return false;
    }

    if (reseller.balance < amount) {
      toast.error(`Insufficient balance. Available: ৳${reseller.balance.toLocaleString()}`);
      return false;
    }

    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Customer not found');

      // Calculate new expiry
      const currentExpiry = customer.expiry_date ? new Date(customer.expiry_date) : new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setMonth(newExpiry.getMonth() + months);

      // Update customer expiry and status
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          expiry_date: newExpiry.toISOString(),
          status: 'active',
          last_payment_date: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (customerError) throw customerError;

      // Create recharge record
      const { error: rechargeError } = await supabase
        .from('customer_recharges')
        .insert({
          tenant_id: reseller.tenant_id,
          customer_id: customerId,
          reseller_id: reseller.id,
          amount,
          months,
          old_expiry: customer.expiry_date,
          new_expiry: newExpiry.toISOString(),
          payment_method: 'reseller_wallet',
          status: 'completed',
        });

      if (rechargeError) throw rechargeError;

      // Deduct from reseller balance and create transaction
      const newBalance = reseller.balance - amount;
      
      const { error: txError } = await supabase
        .from('reseller_transactions' as any)
        .insert({
          tenant_id: reseller.tenant_id,
          reseller_id: reseller.id,
          type: 'customer_payment',
          amount: -amount,
          balance_before: reseller.balance,
          balance_after: newBalance,
          customer_id: customerId,
          description: `Recharge for ${customer.name} (${months} month${months > 1 ? 's' : ''})`,
        });

      if (txError) throw txError;

      // Update reseller balance
      const { error: balanceError } = await supabase
        .from('resellers')
        .update({ 
          balance: newBalance,
          total_collections: (reseller.total_collections || 0) + amount,
        })
        .eq('id', reseller.id);

      if (balanceError) throw balanceError;

      toast.success(`Customer recharged successfully for ${months} month${months > 1 ? 's' : ''}`);
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error recharging customer:', err);
      toast.error(err.message || 'Failed to recharge customer');
      return false;
    }
  };

  // Sub-reseller operations
  const createSubReseller = async (data: Partial<Reseller>): Promise<boolean> => {
    if (!reseller?.can_create_sub_reseller) {
      toast.error('You do not have permission to create sub-resellers');
      return false;
    }

    // Check limit
    if (reseller.max_sub_resellers > 0 && subResellers.length >= reseller.max_sub_resellers) {
      toast.error(`You can only create up to ${reseller.max_sub_resellers} sub-resellers`);
      return false;
    }

    try {
      const subResellerData = {
        ...data,
        tenant_id: reseller.tenant_id,
        parent_id: reseller.id,
        level: reseller.level + 1,
        role: reseller.level === 1 ? 'sub_reseller' : 'sub_sub_reseller',
        is_active: true,
        balance: 0,
        // Inherit device restrictions from parent if not specified
        allowed_mikrotik_ids: data.allowed_mikrotik_ids || (reseller as any).allowed_mikrotik_ids || [],
        allowed_olt_ids: data.allowed_olt_ids || (reseller as any).allowed_olt_ids || [],
      };

      const { error } = await supabase
        .from('resellers')
        .insert(subResellerData as any);

      if (error) throw error;

      toast.success('Sub-reseller created successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error creating sub-reseller:', err);
      toast.error(err.message || 'Failed to create sub-reseller');
      return false;
    }
  };

  const fundSubReseller = async (subResellerId: string, amount: number, description: string): Promise<boolean> => {
    if (!reseller?.can_transfer_balance) {
      toast.error('You do not have permission to transfer balance');
      return false;
    }

    if (reseller.balance < amount) {
      toast.error(`Insufficient balance. Available: ৳${reseller.balance.toLocaleString()}`);
      return false;
    }

    try {
      const subReseller = subResellers.find(s => s.id === subResellerId);
      if (!subReseller) throw new Error('Sub-reseller not found');

      const fromNewBalance = reseller.balance - amount;
      const toNewBalance = subReseller.balance + amount;

      // Debit transaction
      await supabase
        .from('reseller_transactions' as any)
        .insert({
          tenant_id: reseller.tenant_id,
          reseller_id: reseller.id,
          type: 'transfer_out',
          amount: -amount,
          balance_before: reseller.balance,
          balance_after: fromNewBalance,
          to_reseller_id: subResellerId,
          description: description || `Transfer to ${subReseller.name}`,
        });

      // Credit transaction
      await supabase
        .from('reseller_transactions' as any)
        .insert({
          tenant_id: reseller.tenant_id,
          reseller_id: subResellerId,
          type: 'transfer_in',
          amount,
          balance_before: subReseller.balance,
          balance_after: toNewBalance,
          from_reseller_id: reseller.id,
          description: description || `Transfer from ${reseller.name}`,
        });

      // Update balances
      await supabase
        .from('resellers')
        .update({ balance: fromNewBalance })
        .eq('id', reseller.id);

      await supabase
        .from('resellers')
        .update({ balance: toNewBalance })
        .eq('id', subResellerId);

      toast.success(`৳${amount.toLocaleString()} transferred to ${subReseller.name}`);
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error funding sub-reseller:', err);
      toast.error(err.message || 'Failed to transfer balance');
      return false;
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string; email?: string; address?: string }): Promise<boolean> => {
    if (!reseller) return false;

    try {
      const { error } = await supabase
        .from('resellers')
        .update({
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
        } as any)
        .eq('id', reseller.id);

      if (error) throw error;

      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Failed to update profile');
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!reseller) return false;

    try {
      // Verify current password
      if ((reseller as any).password !== currentPassword) {
        toast.error('Current password is incorrect');
        return false;
      }

      const { error } = await supabase
        .from('resellers')
        .update({ password: newPassword } as any)
        .eq('id', reseller.id);

      if (error) throw error;

      toast.success('Password changed successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error(err.message || 'Failed to change password');
      return false;
    }
  };

  return {
    session,
    reseller,
    loading,
    customers,
    subResellers,
    transactions,
    billingSummary,
    packages,
    areas,
    mikrotikRouters,
    olts,
    logout,
    refetch: fetchResellerData,
    createCustomer,
    updateCustomer,
    rechargeCustomer,
    createSubReseller,
    fundSubReseller,
    updateProfile,
    changePassword,
  };
}
