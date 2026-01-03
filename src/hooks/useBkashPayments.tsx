import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

interface BkashPayment {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_code: string | null;
  trx_id: string;
  payment_id: string | null;
  amount: number;
  currency: string;
  sender_number: string | null;
  receiver_number: string | null;
  reference: string | null;
  payment_type: string;
  status: string;
  matched_at: string | null;
  created_at: string;
}

export function useBkashPayments() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [payments, setPayments] = useState<BkashPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bkash_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching bkash payments:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const matchPayment = async (paymentId: string, customerId: string) => {
    try {
      // Get customer details
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, customer_code, due_amount, expiry_date, package_id')
        .eq('id', customerId)
        .single();

      if (!customer) {
        toast.error('Customer not found');
        return;
      }

      // Get payment details
      const { data: payment } = await supabase
        .from('bkash_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      // Match payment using RPC
      const { data: matchResult, error: matchError } = await supabase
        .rpc('match_bkash_payment', {
          _trx_id: payment.trx_id,
          _amount: payment.amount,
          _customer_code: customer.customer_code,
          _tenant_id: tenantId,
        });

      if (matchError) throw matchError;

      const result = matchResult as { success?: boolean; error?: string; customer_id?: string } | null;

      if (result?.success) {
        // Update bkash_payments
        await supabase
          .from('bkash_payments')
          .update({
            customer_id: customerId,
            status: 'completed',
            matched_at: new Date().toISOString(),
          })
          .eq('id', paymentId);

        toast.success(`Payment matched to ${customer.name}`);
        fetchPayments();
      } else {
        toast.error(result?.error || 'Failed to match payment');
      }
    } catch (err) {
      console.error('Error matching payment:', err);
      toast.error('Failed to match payment');
    }
  };

  const markAsRefunded = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('bkash_payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      if (error) throw error;
      toast.success('Payment marked as refunded');
      fetchPayments();
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment');
    }
  };

  return {
    payments,
    loading,
    refetch: fetchPayments,
    matchPayment,
    markAsRefunded,
  };
}