import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, InvoiceLineItem } from '@/types/saas';

export function useInvoices(tenantId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          *,
          tenant:tenants(name, email, company_name),
          subscription:subscriptions(billing_cycle, package:packages(name))
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data
      const transformedData = (data || []).map(item => {
        // Parse line_items properly
        let lineItems: InvoiceLineItem[] = [];
        if (Array.isArray(item.line_items)) {
          lineItems = item.line_items.map((li: any) => ({
            description: li.description || '',
            quantity: li.quantity || 1,
            unit_price: li.unit_price || li.amount || 0,
            total: li.total || li.amount || 0,
          }));
        }

        return {
          id: item.id,
          tenant_id: item.tenant_id,
          subscription_id: item.subscription_id,
          payment_id: item.payment_id,
          invoice_number: item.invoice_number,
          amount: Number(item.amount),
          tax_amount: item.tax_amount ? Number(item.tax_amount) : 0,
          total_amount: Number(item.total_amount),
          status: item.status,
          due_date: item.due_date,
          paid_at: item.paid_at,
          notes: item.notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
          line_items: lineItems,
          tenant: item.tenant as any,
        };
      }) as Invoice[];
      
      setInvoices(transformedData);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, tenantId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const generateInvoice = async (tenantId: string, subscriptionId: string, amount: number, dueDate: Date) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const lineItems = [{ description: 'Subscription', quantity: 1, unit_price: amount, total: amount }];
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          invoice_number: invoiceNumber,
          amount: amount,
          tax_amount: 0,
          total_amount: amount,
          due_date: dueDate.toISOString(),
          status: 'unpaid',
          line_items: lineItems as any,
        });

      if (error) throw error;

      toast({
        title: 'Invoice Generated',
        description: `Invoice ${invoiceNumber} has been created`,
      });

      await fetchInvoices();
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoice',
        variant: 'destructive',
      });
    }
  };

  const markInvoicePaid = async (id: string, paymentId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: paymentId,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Invoice Updated',
        description: 'Invoice has been marked as paid',
      });

      await fetchInvoices();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice',
        variant: 'destructive',
      });
    }
  };

  const cancelInvoice = async (id: string) => {
    try {
      // First check if invoice can be cancelled
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'unpaid' && invoice.status !== 'overdue') {
        throw new Error('Only unpaid or overdue invoices can be cancelled');
      }

      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Invoice Cancelled',
        description: 'The invoice has been cancelled.',
      });

      await fetchInvoices();
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invoice',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    invoices,
    loading,
    fetchInvoices,
    generateInvoice,
    markInvoicePaid,
    cancelInvoice,
  };
}
