import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface POSCustomer {
  id: string;
  tenant_id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  due_amount: number;
  total_purchase: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface POSSale {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string | null;
  isp_customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  notes: string | null;
  sold_by: string | null;
  send_sms: boolean;
  sms_sent: boolean;
  created_at: string;
  items?: POSSaleItem[];
  customer?: POSCustomer;
}

export interface POSSaleItem {
  id: string;
  sale_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface POSPayment {
  id: string;
  tenant_id: string;
  customer_id: string;
  sale_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  collected_by: string | null;
  created_at: string;
  customer?: POSCustomer;
  sale?: POSSale;
}

export interface CartItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  available_qty: number;
}

export function usePOS() {
  const { tenantId } = useTenantContext();
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [sales, setSales] = useState<POSSale[]>([]);
  const [payments, setPayments] = useState<POSPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch POS Customers
  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('pos_customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      setCustomers((data || []) as POSCustomer[]);
    } catch (err) {
      console.error('Error fetching POS customers:', err);
    }
  }, [tenantId]);

  // Fetch Sales
  const fetchSales = useCallback(async (limit = 100) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_sales')
        .select('*, customer:pos_customers(*)')
        .eq('tenant_id', tenantId)
        .order('sale_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setSales((data || []) as POSSale[]);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch Payments
  const fetchPayments = useCallback(async (limit = 100) => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('pos_customer_payments')
        .select('*, customer:pos_customers(*), sale:pos_sales(invoice_number)')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setPayments((data || []) as POSPayment[]);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchCustomers();
      fetchSales();
      fetchPayments();
    }
  }, [tenantId, fetchCustomers, fetchSales, fetchPayments]);

  // Create POS Customer
  const createCustomer = async (data: Partial<POSCustomer>) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return null;
    }
    try {
      // Generate customer code
      const { count } = await supabase
        .from('pos_customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      const customerCode = `POS${String((count || 0) + 1).padStart(5, '0')}`;
      
      const { data: newCustomer, error } = await supabase
        .from('pos_customers')
        .insert({
          tenant_id: tenantId,
          customer_code: customerCode,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          company_name: data.company_name || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      toast.success('Customer created');
      fetchCustomers();
      return newCustomer;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create customer');
      return null;
    }
  };

  // Update POS Customer
  const updateCustomer = async (id: string, data: Partial<POSCustomer>) => {
    try {
      const { error } = await supabase
        .from('pos_customers')
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          company_name: data.company_name,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Customer updated');
      fetchCustomers();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer');
      return false;
    }
  };

  // Create Sale
  const createSale = async (
    cart: CartItem[],
    customerInfo: { customerId?: string; name?: string; phone?: string; ispCustomerId?: string },
    payment: { paid: number; method: string; reference?: string },
    options: { discount?: number; tax?: number; notes?: string; sendSms?: boolean }
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return null;
    }

    try {
      const subtotal = cart.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price) - item.discount, 0);
      const discount = options.discount || 0;
      const tax = options.tax || 0;
      const totalAmount = subtotal - discount + tax;
      const dueAmount = Math.max(0, totalAmount - payment.paid);

      // Generate invoice number
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const { count } = await supabase
        .from('pos_sales')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      const invoiceNumber = `INV${year}${month}${String((count || 0) + 1).padStart(5, '0')}`;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('pos_sales')
        .insert({
          tenant_id: tenantId,
          invoice_number: invoiceNumber,
          customer_id: customerInfo.customerId || null,
          isp_customer_id: customerInfo.ispCustomerId || null,
          customer_name: customerInfo.name || 'Walk-in Customer',
          customer_phone: customerInfo.phone || null,
          subtotal,
          discount,
          tax,
          total_amount: totalAmount,
          paid_amount: payment.paid,
          due_amount: dueAmount,
          payment_method: payment.method,
          payment_reference: payment.reference || null,
          status: dueAmount > 0 ? 'partial' : 'completed',
          notes: options.notes || null,
          send_sms: options.sendSms || false,
        } as any)
        .select()
        .single();

      if (saleError || !sale) throw saleError;

      // Add sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_price: (item.quantity * item.unit_price) - item.discount,
      }));

      await supabase.from('pos_sale_items').insert(saleItems);

      // Update inventory
      for (const item of cart) {
        const { data: invItem } = await supabase
          .from('inventory_items')
          .select('quantity')
          .eq('id', item.item_id)
          .single();
        
        if (invItem) {
          const newQty = Math.max(0, (invItem.quantity || 0) - item.quantity);
          await supabase
            .from('inventory_items')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', item.item_id);

          // Add to ledger
          await supabase.from('inventory_ledger').insert({
            tenant_id: tenantId,
            item_id: item.item_id,
            transaction_type: 'sale',
            quantity: -item.quantity,
            unit_price: item.unit_price,
            total_value: item.quantity * item.unit_price,
            stock_before: invItem.quantity,
            stock_after: newQty,
            reference_id: sale.id,
            reference_type: 'pos_sale',
          });
        }
      }

      // Update customer due amount if customer selected
      if (customerInfo.customerId && dueAmount > 0) {
        const { data: customer } = await supabase
          .from('pos_customers')
          .select('due_amount, total_purchase')
          .eq('id', customerInfo.customerId)
          .single();
        
        if (customer) {
          await supabase
            .from('pos_customers')
            .update({
              due_amount: (customer.due_amount || 0) + dueAmount,
              total_purchase: (customer.total_purchase || 0) + totalAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', customerInfo.customerId);
        }
      }

      toast.success(`Sale completed! Invoice: ${invoiceNumber}`);
      fetchSales();
      fetchCustomers();
      return sale;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sale');
      return null;
    }
  };

  // Collect Due Payment
  const collectDuePayment = async (
    customerId: string,
    amount: number,
    paymentMethod: string,
    options: { saleId?: string; reference?: string; notes?: string }
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    try {
      // Create payment record
      await supabase.from('pos_customer_payments').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        sale_id: options.saleId || null,
        amount,
        payment_method: paymentMethod,
        reference: options.reference || null,
        notes: options.notes || null,
      });

      // Update customer due amount
      const { data: customer } = await supabase
        .from('pos_customers')
        .select('due_amount')
        .eq('id', customerId)
        .single();

      if (customer) {
        await supabase
          .from('pos_customers')
          .update({
            due_amount: Math.max(0, (customer.due_amount || 0) - amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);
      }

      // If sale ID provided, update sale
      if (options.saleId) {
        const { data: sale } = await supabase
          .from('pos_sales')
          .select('paid_amount, total_amount')
          .eq('id', options.saleId)
          .single();

        if (sale) {
          const newPaid = (sale.paid_amount || 0) + amount;
          const newDue = Math.max(0, sale.total_amount - newPaid);
          await supabase
            .from('pos_sales')
            .update({
              paid_amount: newPaid,
              due_amount: newDue,
              status: newDue <= 0 ? 'completed' : 'partial',
              updated_at: new Date().toISOString(),
            })
            .eq('id', options.saleId);
        }
      }

      toast.success('Payment collected');
      fetchPayments();
      fetchCustomers();
      fetchSales();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to collect payment');
      return false;
    }
  };

  // Get sale items
  const getSaleItems = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('pos_sale_items')
        .select('*')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching sale items:', err);
      return [];
    }
  };

  // Stats
  const stats = {
    totalCustomers: customers.length,
    customersWithDue: customers.filter(c => c.due_amount > 0).length,
    totalDue: customers.reduce((sum, c) => sum + (c.due_amount || 0), 0),
    todaySales: sales.filter(s => 
      new Date(s.sale_date).toDateString() === new Date().toDateString()
    ).reduce((sum, s) => sum + s.total_amount, 0),
    totalSales: sales.reduce((sum, s) => sum + s.total_amount, 0),
  };

  return {
    customers,
    sales,
    payments,
    loading,
    stats,
    refetch: () => {
      fetchCustomers();
      fetchSales();
      fetchPayments();
    },
    createCustomer,
    updateCustomer,
    createSale,
    collectDuePayment,
    getSaleItems,
  };
}
