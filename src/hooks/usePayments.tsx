import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types/saas';

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenant:tenants(name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data
      const transformedData = (data || []).map(item => ({
        ...item,
        amount: Number(item.amount),
        payment_method: item.payment_method as PaymentMethod,
        status: item.status as PaymentStatus,
        gateway_response: item.gateway_response as Record<string, unknown> | null
      })) as Payment[];
      
      setPayments(transformedData);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const verifyPayment = async (id: string, verifiedBy: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed' as PaymentStatus,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Payment Verified',
        description: 'The payment has been verified and marked as completed',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify payment',
        variant: 'destructive',
      });
    }
  };

  const rejectPayment = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'failed' as PaymentStatus,
          notes: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Payment Rejected',
        description: 'The payment has been rejected',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject payment',
        variant: 'destructive',
      });
    }
  };

  const refundPayment = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'refunded' as PaymentStatus,
          notes: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Payment Refunded',
        description: 'The payment has been marked as refunded',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error refunding payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to refund payment',
        variant: 'destructive',
      });
    }
  };

  const createPayment = async (paymentData: {
    tenant_id: string;
    amount: number;
    payment_method: PaymentMethod;
    transaction_id?: string;
    invoice_number?: string;
    status?: PaymentStatus;
    description?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          currency: 'BDT',
        });

      if (error) throw error;

      toast({
        title: 'Payment Submitted',
        description: 'Your payment has been submitted for verification',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    payments,
    loading,
    fetchPayments,
    createPayment,
    verifyPayment,
    rejectPayment,
    refundPayment,
  };
}
