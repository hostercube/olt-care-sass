import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types/saas';

export function usePayments(tenantId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('payments')
        .select(`
          *,
          tenant:tenants(name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

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
  }, [toast, tenantId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const verifyPayment = async (id: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First get the payment to find invoice_number
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !payment) throw fetchError || new Error('Payment not found');

      // Update the payment
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed' as PaymentStatus,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', id);

      if (error) throw error;

      // If payment has invoice_number, update invoice and subscription
      if (payment.invoice_number) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, subscription_id')
          .eq('invoice_number', payment.invoice_number)
          .single();

        if (invoice) {
          // Update invoice to paid
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_id: id,
            })
            .eq('id', invoice.id);

          // Update subscription to active and extend end date
          if (invoice.subscription_id) {
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
              const newEndDate = new Date(startDate);
              const billingCycle = subscription.billing_cycle as string;
              if (billingCycle === 'yearly') {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
              } else if (billingCycle === 'quarterly') {
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

      toast({
        title: 'Payment Verified',
        description: 'The payment has been verified and subscription activated',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify payment',
        variant: 'destructive',
      });
      throw error;
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
      throw error;
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
      throw error;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Payment Deleted',
        description: 'The payment has been deleted',
      });

      await fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment',
        variant: 'destructive',
      });
      throw error;
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
    deletePayment,
  };
}
