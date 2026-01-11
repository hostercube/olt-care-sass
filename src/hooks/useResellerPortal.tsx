import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Reseller, ResellerTransaction, ResellerRoleDefinition, ResellerPermissionKey } from '@/types/reseller';
import * as resellerApi from '@/lib/reseller-api';

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

type AreaPayload = {
  name: string;
  description?: string | null;
  district?: string | null;
  upazila?: string | null;
  union_name?: string | null;
  village?: string | null;
};

export function useResellerPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ResellerSession | null>(null);
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [resellerRole, setResellerRole] = useState<ResellerRoleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subResellers, setSubResellers] = useState<Reseller[]>([]);
  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [packages, setPackages] = useState<{ id: string; name: string; price: number }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string; upazila?: string | null; district?: string | null }[]>([]);
  const [mikrotikRouters, setMikrotikRouters] = useState<{ id: string; name: string }[]>([]);
  const [olts, setOlts] = useState<{ id: string; name: string }[]>([]);

  // Helper function to check permission from role or fallback to legacy flags
  const hasPermission = useCallback((permission: ResellerPermissionKey): boolean => {
    // First check role-based permissions if role exists
    if (resellerRole?.permissions && resellerRole.permissions[permission] !== undefined) {
      return !!resellerRole.permissions[permission];
    }
    
    // Fallback to legacy permission flags on reseller object
    if (!reseller) return false;
    
    const legacyMap: Partial<Record<ResellerPermissionKey, boolean>> = {
      customer_view: true,
      customer_create: reseller.can_add_customers,
      customer_edit: reseller.can_edit_customers,
      customer_delete: reseller.can_delete_customers,
      customer_recharge: reseller.can_recharge_customers,
      customer_status_change: reseller.can_edit_customers,
      customer_view_profile: true,
      customer_view_balance: true,
      customer_export: true,
      sub_customer_view: reseller.can_view_sub_customers,
      sub_customer_edit: reseller.can_control_sub_customers,
      sub_customer_recharge: reseller.can_control_sub_customers,
      sub_customer_status_change: reseller.can_control_sub_customers,
      sub_reseller_view: true,
      sub_reseller_create: reseller.can_create_sub_reseller,
      sub_reseller_edit: reseller.can_create_sub_reseller,
      sub_reseller_delete: reseller.can_create_sub_reseller,
      sub_reseller_balance_add: reseller.can_transfer_balance,
      sub_reseller_balance_deduct: reseller.can_transfer_balance,
      sub_reseller_view_customers: reseller.can_view_sub_customers,
      sub_reseller_view_transactions: reseller.can_view_sub_customers,
      balance_transfer: reseller.can_transfer_balance,
      report_view: reseller.can_view_reports,
      report_export: reseller.can_view_reports,
      analytics_view: reseller.can_view_reports,
      profile_edit: true,
      password_change: true,
      billing_view: true,
      transaction_view: true,
      transaction_export: true,
      recharge_history_view: true,
      wallet_view: true,
      auto_recharge_view: true,
      auto_recharge_manage: false,
      area_view: true,
      area_create: false,
      area_edit: false,
      area_delete: false,
    };
    
    return legacyMap[permission] ?? false;
  }, [resellerRole, reseller]);

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
      // Fetch all data in parallel from VPS backend
      const [
        profileRes,
        areasRes,
        transactionsRes,
        customersRes,
        subResellersRes,
        packagesRes,
        mikrotikRes,
        oltsRes,
      ] = await Promise.all([
        resellerApi.fetchResellerProfile(),
        resellerApi.fetchResellerAreas(),
        resellerApi.fetchResellerTransactions({ limit: 500 }),
        resellerApi.fetchResellerCustomers(true),
        resellerApi.fetchSubResellers(),
        resellerApi.fetchResellerPackages(),
        resellerApi.fetchResellerMikrotikRouters(),
        resellerApi.fetchResellerOlts(),
      ]);

      if (!profileRes.success) {
        console.error('Failed to fetch profile:', profileRes.error);
        logout();
        return;
      }

      const resellerData = profileRes.reseller;
      setReseller(resellerData as unknown as Reseller);
      setResellerRole(profileRes.role as unknown as ResellerRoleDefinition | null);
      setSession(prev => prev ? { ...prev, balance: resellerData.balance } : null);

      // Set areas from backend (with inheritance applied)
      setAreas(areasRes.areas || []);
      
      // Set transactions
      setTransactions((transactionsRes.transactions || []) as unknown as ResellerTransaction[]);
      
      // Set customers
      setCustomers((customersRes.customers || []) as any[]);
      
      // Set sub-resellers
      setSubResellers((subResellersRes.subResellers || []) as unknown as Reseller[]);
      
      // Set packages
      setPackages(packagesRes.packages || []);
      
      // Set devices
      setMikrotikRouters(mikrotikRes.routers || []);
      setOlts(oltsRes.olts || []);

      // Calculate billing summary
      calculateBillingSummary(customersRes.customers || [], transactionsRes.transactions || [], resellerData);
    } catch (err) {
      console.error('Error fetching reseller data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateBillingSummary = (customers: Customer[], transactions: ResellerTransaction[], resellerData: any) => {
    const activeCount = customers.filter(c => c.status === 'active').length;
    const expiredCount = customers.filter(c => c.status === 'expired').length;
    const totalMonthly = customers.reduce((sum, c) => sum + (c.monthly_bill || 0), 0);
    const totalDue = customers.reduce((sum, c) => sum + (c.due_amount || 0), 0);

    // Get commissions earned
    const commissionsEarned = transactions
      .filter(t => t.type === 'commission' || t.type === 'auto_recharge_commission')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    // Get recharges this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const rechargesThisMonth = transactions
      .filter(t => t.type === 'customer_payment' && t.created_at >= startOfMonth)
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    setBillingSummary({
      totalCustomers: customers.length,
      activeCustomers: activeCount,
      expiredCustomers: expiredCount,
      totalMonthlyRevenue: totalMonthly,
      totalDue,
      totalCollections: resellerData?.total_collections || 0,
      rechargesThisMonth,
      commissionsEarned,
    });
  };

  const logout = useCallback(() => {
    localStorage.removeItem('reseller_session');
    setSession(null);
    setReseller(null);
    toast.success('Logged out successfully');
    navigate('/reseller/login');
  }, [navigate]);

  // Customer operations
  const createCustomer = async (data: Partial<Customer>): Promise<boolean> => {
    if (!hasPermission('customer_create')) {
      toast.error('You do not have permission to add customers');
      return false;
    }

    try {
      const result = await resellerApi.createResellerCustomer(data);

      if (!result.success) {
        toast.error(result.error || 'Failed to create customer');
        return false;
      }

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
    if (!hasPermission('customer_edit')) {
      toast.error('You do not have permission to edit customers');
      return false;
    }

    try {
      const result = await resellerApi.updateResellerCustomer(id, data);

      if (!result.success) {
        toast.error(result.error || 'Failed to update customer');
        return false;
      }

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
    if (!hasPermission('customer_recharge')) {
      toast.error('You do not have permission to recharge customers');
      return false;
    }

    try {
      const result = await resellerApi.rechargeCustomer(customerId, amount, months, 'reseller_wallet');

      if (!result.success) {
        toast.error(result.error || 'Failed to recharge customer');
        return false;
      }

      toast.success(`Customer recharged! New expiry: ${new Date(result.newExpiry).toLocaleDateString()}`);
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
    if (!hasPermission('sub_reseller_create')) {
      toast.error('You do not have permission to create sub-resellers');
      return false;
    }

    try {
      const result = await resellerApi.createSubReseller(data);

      if (!result.success) {
        toast.error(result.error || 'Failed to create sub-reseller');
        return false;
      }

      toast.success('Sub-reseller created successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error creating sub-reseller:', err);
      toast.error(err.message || 'Failed to create sub-reseller');
      return false;
    }
  };

  const updateSubReseller = async (id: string, data: Partial<Reseller>): Promise<boolean> => {
    if (!hasPermission('sub_reseller_edit')) {
      toast.error('You do not have permission to edit sub-resellers');
      return false;
    }

    try {
      const result = await resellerApi.updateSubReseller(id, data);

      if (!result.success) {
        toast.error(result.error || 'Failed to update sub-reseller');
        return false;
      }

      toast.success('Sub-reseller updated successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error updating sub-reseller:', err);
      toast.error(err.message || 'Failed to update sub-reseller');
      return false;
    }
  };

  const fundSubReseller = async (subResellerId: string, amount: number, description?: string): Promise<boolean> => {
    if (!hasPermission('sub_reseller_balance_add')) {
      toast.error('You do not have permission to add balance');
      return false;
    }

    try {
      const result = await resellerApi.addSubResellerBalance(subResellerId, amount, description);

      if (!result.success) {
        toast.error(result.error || 'Failed to add balance');
        return false;
      }

      toast.success('Balance added successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error adding balance:', err);
      toast.error(err.message || 'Failed to add balance');
      return false;
    }
  };

  const deductSubReseller = async (subResellerId: string, amount: number, description?: string): Promise<boolean> => {
    if (!hasPermission('sub_reseller_balance_deduct')) {
      toast.error('You do not have permission to deduct balance');
      return false;
    }

    try {
      const result = await resellerApi.deductSubResellerBalance(subResellerId, amount, description);

      if (!result.success) {
        toast.error(result.error || 'Failed to deduct balance');
        return false;
      }

      toast.success('Balance deducted successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error deducting balance:', err);
      toast.error(err.message || 'Failed to deduct balance');
      return false;
    }
  };

  const updateProfile = async (data: Partial<Reseller>): Promise<boolean> => {
    if (!hasPermission('profile_edit')) {
      toast.error('You do not have permission to edit profile');
      return false;
    }

    try {
      const result = await resellerApi.updateResellerProfile(data);

      if (!result.success) {
        toast.error(result.error || 'Failed to update profile');
        return false;
      }

      toast.success('Profile updated successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Failed to update profile');
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!hasPermission('password_change')) {
      toast.error('You do not have permission to change password');
      return false;
    }

    try {
      const result = await resellerApi.changeResellerPassword(currentPassword, newPassword);

      if (!result.success) {
        toast.error(result.error || 'Failed to change password');
        return false;
      }

      toast.success('Password changed successfully');
      return true;
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error(err.message || 'Failed to change password');
      return false;
    }
  };

  // Area operations
  const createArea = async (data: AreaPayload): Promise<boolean> => {
    if (!hasPermission('area_create')) {
      toast.error('You do not have permission to create areas');
      return false;
    }
    try {
      const result = await resellerApi.createResellerArea(data);
      if (!result.success) {
        toast.error(result.error || 'Failed to create area');
        return false;
      }
      toast.success('Area created successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error creating area:', err);
      toast.error(err.message || 'Failed to create area');
      return false;
    }
  };

  const updateArea = async (id: string, data: Partial<AreaPayload>): Promise<boolean> => {
    if (!hasPermission('area_edit')) {
      toast.error('You do not have permission to edit areas');
      return false;
    }
    try {
      const result = await resellerApi.updateResellerArea(id, data);
      if (!result.success) {
        toast.error(result.error || 'Failed to update area');
        return false;
      }
      toast.success('Area updated successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error updating area:', err);
      toast.error(err.message || 'Failed to update area');
      return false;
    }
  };

  const deleteArea = async (id: string): Promise<boolean> => {
    if (!hasPermission('area_delete')) {
      toast.error('You do not have permission to delete areas');
      return false;
    }
    try {
      const result = await resellerApi.deleteResellerArea(id);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete area');
        return false;
      }
      toast.success('Area deleted successfully');
      await fetchResellerData();
      return true;
    } catch (err: any) {
      console.error('Error deleting area:', err);
      toast.error(err.message || 'Failed to delete area');
      return false;
    }
  };

  return {
    session,
    reseller,
    resellerRole,
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
    hasPermission,
    createCustomer,
    updateCustomer,
    rechargeCustomer,
    createSubReseller,
    updateSubReseller,
    fundSubReseller,
    deductSubReseller,
    createArea,
    updateArea,
    deleteArea,
    updateProfile,
    changePassword,
  };
}
