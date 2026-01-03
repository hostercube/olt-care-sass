import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { CustomerBill, BillStatus } from '@/types/isp';
import { toast } from 'sonner';

export function useCustomerBills(customerId?: string) {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [bills, setBills] = useState<CustomerBill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('customer_bills')
        .select(`
          *,
          customer:customers(id, name, phone, customer_code)
        `)
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBills((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin, customerId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const createBill = async (data: Partial<CustomerBill>) => {
    try {
      // Generate bill number
      const { data: billNumber } = await supabase
        .rpc('generate_bill_number', { _tenant_id: tenantId });

      const billData = {
        ...data,
        tenant_id: tenantId,
        bill_number: billNumber || `INV${Date.now()}`,
        total_amount: (data.amount || 0) - (data.discount || 0) + (data.tax || 0),
      };

      const { data: newBill, error } = await supabase
        .from('customer_bills')
        .insert(billData as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Bill created successfully');
      fetchBills();
      return newBill;
    } catch (err) {
      console.error('Error creating bill:', err);
      toast.error('Failed to create bill');
      throw err;
    }
  };

  const updateBill = async (id: string, data: Partial<CustomerBill>) => {
    try {
      const { error } = await supabase
        .from('customer_bills')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Bill updated successfully');
      fetchBills();
    } catch (err) {
      console.error('Error updating bill:', err);
      toast.error('Failed to update bill');
      throw err;
    }
  };

  const recordPayment = async (billId: string, amount: number, paymentMethod: string) => {
    try {
      const bill = bills.find(b => b.id === billId);
      if (!bill) throw new Error('Bill not found');

      const newPaidAmount = (bill.paid_amount || 0) + amount;
      const isPaidInFull = newPaidAmount >= bill.total_amount;
      
      // Create payment record
      const { error: paymentError } = await supabase
        .from('customer_payments')
        .insert({
          tenant_id: tenantId,
          customer_id: bill.customer_id,
          bill_id: billId,
          amount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
        } as any);

      if (paymentError) throw paymentError;

      // Update bill
      const { error: billError } = await supabase
        .from('customer_bills')
        .update({
          paid_amount: newPaidAmount,
          status: isPaidInFull ? 'paid' : 'partial',
          paid_date: isPaidInFull ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', billId);

      if (billError) throw billError;

      // Update customer due amount
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          due_amount: Math.max(0, bill.total_amount - newPaidAmount),
          last_payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', bill.customer_id);

      if (customerError) throw customerError;

      toast.success('Payment recorded successfully');
      fetchBills();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error('Failed to record payment');
      throw err;
    }
  };

  // Stats
  const stats = {
    total: bills.length,
    unpaid: bills.filter(b => b.status === 'unpaid').length,
    paid: bills.filter(b => b.status === 'paid').length,
    partial: bills.filter(b => b.status === 'partial').length,
    overdue: bills.filter(b => b.status === 'overdue').length,
    totalAmount: bills.reduce((sum, b) => sum + b.total_amount, 0),
    totalPaid: bills.reduce((sum, b) => sum + (b.paid_amount || 0), 0),
    totalDue: bills.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0),
  };

  return {
    bills,
    loading,
    stats,
    refetch: fetchBills,
    createBill,
    updateBill,
    recordPayment,
  };
}
