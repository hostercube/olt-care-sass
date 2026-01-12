import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Activity logging helper
const logBandwidthActivity = async (
  tenantId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      user_id: user?.id || null,
      tenant_id: tenantId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details as Json,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Types
export interface BandwidthCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BandwidthItem {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: BandwidthCategory;
}

export interface BandwidthProvider {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  account_number: string | null;
  bank_details: string | null;
  notes: string | null;
  total_due: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BandwidthClient {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  contact_person: string | null;
  account_number: string | null;
  bank_details: string | null;
  notes: string | null;
  status: string | null;
  reference_by: string | null;
  nttn_info: string | null;
  vlan_name: string | null;
  vlan_ip: string | null;
  scr_link_id: string | null;
  activation_date: string | null;
  ip_address: string | null;
  pop_name: string | null;
  username: string | null;
  total_receivable: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseBillItem {
  id?: string;
  bill_id?: string;
  item_id: string | null;
  item_name: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_percent: number;
  vat_amount: number;
  from_date: string;
  to_date: string;
  total: number;
}

export interface BandwidthPurchaseBill {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  invoice_number: string;
  billing_date: string;
  from_date: string | null;
  to_date: string | null;
  subtotal: number;
  vat_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  payment_method: string | null;
  paid_by: string | null;
  received_by: string | null;
  remarks: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  provider?: BandwidthProvider;
  items?: PurchaseBillItem[];
}

export interface SalesInvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: string | null;
  item_name: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_percent: number;
  vat_amount: number;
  from_date: string;
  to_date: string;
  total: number;
}

export interface BandwidthSalesInvoice {
  id: string;
  tenant_id: string;
  client_id: string | null;
  invoice_number: string;
  billing_date: string;
  due_date: string | null;
  from_date: string | null;
  to_date: string | null;
  subtotal: number;
  vat_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  remarks: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: BandwidthClient;
  items?: SalesInvoiceItem[];
}

export interface BandwidthBillCollection {
  id: string;
  tenant_id: string;
  client_id: string | null;
  invoice_id: string | null;
  receipt_number: string;
  collection_date: string;
  amount: number;
  payment_method: string;
  received_by: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: BandwidthClient;
  invoice?: BandwidthSalesInvoice;
}

export interface BandwidthProviderPayment {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  bill_id: string | null;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  paid_by: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  provider?: BandwidthProvider;
  bill?: BandwidthPurchaseBill;
}

export function useBandwidthManagement() {
  const { tenantId } = useTenantContext();
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [categories, setCategories] = useState<BandwidthCategory[]>([]);
  const [items, setItems] = useState<BandwidthItem[]>([]);
  const [providers, setProviders] = useState<BandwidthProvider[]>([]);
  const [clients, setClients] = useState<BandwidthClient[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<BandwidthPurchaseBill[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<BandwidthSalesInvoice[]>([]);
  const [billCollections, setBillCollections] = useState<BandwidthBillCollection[]>([]);
  const [providerPayments, setProviderPayments] = useState<BandwidthProviderPayment[]>([]);

  // ==================== CATEGORIES ====================
  const fetchCategories = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_item_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createCategory = async (data: Partial<BandwidthCategory>) => {
    if (!tenantId) return;
    try {
      const { error } = await supabase
        .from('bandwidth_item_categories')
        .insert({ name: data.name || '', description: data.description, is_active: data.is_active, tenant_id: tenantId });
      
      if (error) throw error;
      toast.success('Category created successfully');
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const updateCategory = async (id: string, data: Partial<BandwidthCategory>) => {
    try {
      const { error } = await supabase
        .from('bandwidth_item_categories')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Category updated successfully');
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_item_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  // ==================== ITEMS ====================
  const fetchItems = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_items')
        .select('*, category:bandwidth_item_categories(*)')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createItem = async (data: Partial<BandwidthItem>) => {
    if (!tenantId) return;
    try {
      const { error } = await supabase
        .from('bandwidth_items')
        .insert({ name: data.name || '', description: data.description, category_id: data.category_id, unit: data.unit, unit_price: data.unit_price, is_active: data.is_active, tenant_id: tenantId });
      
      if (error) throw error;
      toast.success('Item created successfully');
      fetchItems();
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    }
  };

  const updateItem = async (id: string, data: Partial<BandwidthItem>) => {
    try {
      const { error } = await supabase
        .from('bandwidth_items')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Item updated successfully');
      fetchItems();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  // ==================== PROVIDERS ====================
  const fetchProviders = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_providers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createProvider = async (data: Partial<BandwidthProvider>) => {
    if (!tenantId) return;
    try {
      const { error } = await supabase
        .from('bandwidth_providers')
        .insert({ name: data.name || '', company_name: data.company_name, email: data.email, phone: data.phone, address: data.address, contact_person: data.contact_person, account_number: data.account_number, bank_details: data.bank_details, notes: data.notes, tenant_id: tenantId });
      
      if (error) throw error;
      toast.success('Provider created successfully');
      fetchProviders();
    } catch (error: any) {
      console.error('Error creating provider:', error);
      toast.error('Failed to create provider');
    }
  };

  const updateProvider = async (id: string, data: Partial<BandwidthProvider>) => {
    try {
      const { error } = await supabase
        .from('bandwidth_providers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Provider updated successfully');
      fetchProviders();
    } catch (error: any) {
      console.error('Error updating provider:', error);
      toast.error('Failed to update provider');
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_providers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Provider deleted successfully');
      fetchProviders();
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast.error('Failed to delete provider');
    }
  };

  // ==================== CLIENTS ====================
  const fetchClients = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createClient = async (data: Partial<BandwidthClient> & { password?: string }) => {
    if (!tenantId) return;
    try {
      const insertData: any = {
        name: data.name || '',
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        contact_person: data.contact_person,
        account_number: data.account_number,
        bank_details: data.bank_details,
        notes: data.notes,
        status: data.status || 'active',
        reference_by: data.reference_by,
        nttn_info: data.nttn_info,
        vlan_name: data.vlan_name,
        vlan_ip: data.vlan_ip,
        scr_link_id: data.scr_link_id,
        activation_date: data.activation_date || null,
        ip_address: data.ip_address,
        pop_name: data.pop_name,
        username: data.username,
        tenant_id: tenantId
      };
      
      // Only add password_hash if password is provided
      if ((data as any).password) {
        insertData.password_hash = (data as any).password; // In real app, should hash this
      }
      
      const { error } = await supabase
        .from('bandwidth_clients')
        .insert(insertData);
      
      if (error) throw error;
      toast.success('Client created successfully');
      fetchClients();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error('Failed to create client');
    }
  };

  const updateClient = async (id: string, data: Partial<BandwidthClient> & { password?: string }) => {
    try {
      const updateData: any = {
        name: data.name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        contact_person: data.contact_person,
        account_number: data.account_number,
        bank_details: data.bank_details,
        notes: data.notes,
        status: data.status,
        reference_by: data.reference_by,
        nttn_info: data.nttn_info,
        vlan_name: data.vlan_name,
        vlan_ip: data.vlan_ip,
        scr_link_id: data.scr_link_id,
        activation_date: data.activation_date || null,
        ip_address: data.ip_address,
        pop_name: data.pop_name,
        username: data.username,
      };
      
      // Only update password_hash if password is provided
      if ((data as any).password) {
        updateData.password_hash = (data as any).password;
      }
      
      const { error } = await supabase
        .from('bandwidth_clients')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Client updated successfully');
      fetchClients();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  // ==================== PURCHASE BILLS ====================
  const fetchPurchaseBills = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_purchase_bills')
        .select('*, provider:bandwidth_providers(*), items:bandwidth_purchase_bill_items(*)')
        .eq('tenant_id', tenantId)
        .order('billing_date', { ascending: false });
      
      if (error) throw error;
      setPurchaseBills(data || []);
    } catch (error: any) {
      console.error('Error fetching purchase bills:', error);
      toast.error('Failed to fetch purchase bills');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createPurchaseBill = async (billData: Partial<BandwidthPurchaseBill>, items: PurchaseBillItem[]) => {
    if (!tenantId) return;
    try {
      // Generate invoice number
      const invoiceNumber = `PB-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: bill, error: billError } = await supabase
        .from('bandwidth_purchase_bills')
        .insert({ ...billData, tenant_id: tenantId, invoice_number: invoiceNumber })
        .select()
        .single();
      
      if (billError) throw billError;

      // Insert bill items
      if (items.length > 0) {
        const billItems = items.map(item => ({
          ...item,
          bill_id: bill.id,
        }));
        
        const { error: itemsError } = await supabase
          .from('bandwidth_purchase_bill_items')
          .insert(billItems);
        
        if (itemsError) throw itemsError;
      }

      // Update provider's total due
      if (billData.provider_id && billData.due_amount) {
        const provider = providers.find(p => p.id === billData.provider_id);
        if (provider) {
          await supabase
            .from('bandwidth_providers')
            .update({ total_due: (provider.total_due || 0) + (billData.due_amount || 0) })
            .eq('id', billData.provider_id);
        }
      }

      toast.success('Purchase bill created successfully');
      fetchPurchaseBills();
      fetchProviders();
    } catch (error: any) {
      console.error('Error creating purchase bill:', error);
      toast.error('Failed to create purchase bill');
    }
  };

  const updatePurchaseBill = async (id: string, data: Partial<BandwidthPurchaseBill>) => {
    try {
      const { error } = await supabase
        .from('bandwidth_purchase_bills')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Purchase bill updated successfully');
      fetchPurchaseBills();
    } catch (error: any) {
      console.error('Error updating purchase bill:', error);
      toast.error('Failed to update purchase bill');
    }
  };

  const deletePurchaseBill = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_purchase_bills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Purchase bill deleted successfully');
      fetchPurchaseBills();
    } catch (error: any) {
      console.error('Error deleting purchase bill:', error);
      toast.error('Failed to delete purchase bill');
    }
  };

  // ==================== SALES INVOICES ====================
  const fetchSalesInvoices = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_sales_invoices')
        .select('*, client:bandwidth_clients(*), items:bandwidth_sales_invoice_items(*)')
        .eq('tenant_id', tenantId)
        .order('billing_date', { ascending: false });
      
      if (error) throw error;
      setSalesInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching sales invoices:', error);
      toast.error('Failed to fetch sales invoices');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createSalesInvoice = async (invoiceData: Partial<BandwidthSalesInvoice>, items: SalesInvoiceItem[]) => {
    if (!tenantId) return;
    try {
      // Generate invoice number
      const invoiceNumber = `SI-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('bandwidth_sales_invoices')
        .insert({ ...invoiceData, tenant_id: tenantId, invoice_number: invoiceNumber })
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;

      // Insert invoice items
      if (items.length > 0) {
        const invoiceItems = items.map(item => ({
          ...item,
          invoice_id: invoice.id,
        }));
        
        const { error: itemsError } = await supabase
          .from('bandwidth_sales_invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) throw itemsError;
      }

      // Update client's total receivable
      if (invoiceData.client_id && invoiceData.due_amount) {
        const client = clients.find(c => c.id === invoiceData.client_id);
        if (client) {
          await supabase
            .from('bandwidth_clients')
            .update({ total_receivable: (client.total_receivable || 0) + (invoiceData.due_amount || 0) })
            .eq('id', invoiceData.client_id);
        }
      }

      toast.success('Sales invoice created successfully');
      fetchSalesInvoices();
      fetchClients();
    } catch (error: any) {
      console.error('Error creating sales invoice:', error);
      toast.error('Failed to create sales invoice');
    }
  };

  const updateSalesInvoice = async (id: string, data: Partial<BandwidthSalesInvoice>) => {
    try {
      const { error } = await supabase
        .from('bandwidth_sales_invoices')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Sales invoice updated successfully');
      fetchSalesInvoices();
    } catch (error: any) {
      console.error('Error updating sales invoice:', error);
      toast.error('Failed to update sales invoice');
    }
  };

  const deleteSalesInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bandwidth_sales_invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Sales invoice deleted successfully');
      fetchSalesInvoices();
    } catch (error: any) {
      console.error('Error deleting sales invoice:', error);
      toast.error('Failed to delete sales invoice');
    }
  };

  // ==================== BILL COLLECTIONS ====================
  const fetchBillCollections = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_bill_collections')
        .select('*, client:bandwidth_clients(*), invoice:bandwidth_sales_invoices(*)')
        .eq('tenant_id', tenantId)
        .order('collection_date', { ascending: false });
      
      if (error) throw error;
      setBillCollections(data || []);
    } catch (error: any) {
      console.error('Error fetching bill collections:', error);
      toast.error('Failed to fetch bill collections');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createBillCollection = async (data: Partial<BandwidthBillCollection>) => {
    if (!tenantId) return;
    try {
      const receiptNumber = `RC-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('bandwidth_bill_collections')
        .insert({ receipt_number: receiptNumber, client_id: data.client_id, invoice_id: data.invoice_id, collection_date: data.collection_date, amount: data.amount || 0, payment_method: data.payment_method, received_by: data.received_by, remarks: data.remarks, tenant_id: tenantId });
      
      if (error) throw error;

      // Update invoice paid amount if linked
      if (data.invoice_id && data.amount) {
        const invoice = salesInvoices.find(i => i.id === data.invoice_id);
        if (invoice) {
          const newPaidAmount = (invoice.paid_amount || 0) + data.amount;
          const newDueAmount = invoice.total_amount - newPaidAmount;
          const newStatus = newDueAmount <= 0 ? 'paid' : 'partial';
          
          await supabase
            .from('bandwidth_sales_invoices')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', data.invoice_id);
        }
      }

      // Update client's total receivable
      if (data.client_id && data.amount) {
        const client = clients.find(c => c.id === data.client_id);
        if (client) {
          await supabase
            .from('bandwidth_clients')
            .update({ total_receivable: Math.max(0, (client.total_receivable || 0) - data.amount) })
            .eq('id', data.client_id);
        }
      }

      toast.success('Bill collection recorded successfully');
      fetchBillCollections();
      fetchSalesInvoices();
      fetchClients();
    } catch (error: any) {
      console.error('Error creating bill collection:', error);
      toast.error('Failed to record bill collection');
    }
  };

  const updateBillCollection = async (id: string, data: Partial<BandwidthBillCollection>, oldAmount?: number) => {
    try {
      // Find the existing collection to get original values
      const existingCollection = billCollections.find(c => c.id === id);
      if (!existingCollection) throw new Error('Collection not found');
      
      const originalAmount = oldAmount ?? existingCollection.amount;
      const newAmount = data.amount ?? originalAmount;
      const amountDifference = newAmount - originalAmount;
      
      const { error } = await supabase
        .from('bandwidth_bill_collections')
        .update({
          collection_date: data.collection_date,
          amount: data.amount,
          payment_method: data.payment_method,
          received_by: data.received_by,
          remarks: data.remarks,
        })
        .eq('id', id);
      
      if (error) throw error;

      // Update invoice paid amount if linked and amount changed
      if (existingCollection.invoice_id && amountDifference !== 0) {
        const invoice = salesInvoices.find(i => i.id === existingCollection.invoice_id);
        if (invoice) {
          const newPaidAmount = (invoice.paid_amount || 0) + amountDifference;
          const newDueAmount = invoice.total_amount - newPaidAmount;
          const newStatus = newDueAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'due';
          
          await supabase
            .from('bandwidth_sales_invoices')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', existingCollection.invoice_id);
        }
      }

      // Update client's total receivable if amount changed
      if (existingCollection.client_id && amountDifference !== 0) {
        const client = clients.find(c => c.id === existingCollection.client_id);
        if (client) {
          await supabase
            .from('bandwidth_clients')
            .update({ total_receivable: Math.max(0, (client.total_receivable || 0) - amountDifference) })
            .eq('id', existingCollection.client_id);
        }
      }

      // Log activity
      await logBandwidthActivity(tenantId, 'update_collection', 'bandwidth_bill_collection', id, {
        receipt_number: existingCollection.receipt_number,
        client_name: existingCollection.client?.name,
        old_amount: originalAmount,
        new_amount: newAmount,
        payment_method: data.payment_method,
      });

      toast.success('Bill collection updated successfully');
      fetchBillCollections();
      fetchSalesInvoices();
      fetchClients();
    } catch (error: any) {
      console.error('Error updating bill collection:', error);
      toast.error('Failed to update bill collection');
    }
  };

  const deleteBillCollection = async (id: string) => {
    try {
      // Find collection to reverse its effects
      const collection = billCollections.find(c => c.id === id);
      if (!collection) throw new Error('Collection not found');

      // Reverse invoice paid amount if linked
      if (collection.invoice_id && collection.amount) {
        const invoice = salesInvoices.find(i => i.id === collection.invoice_id);
        if (invoice) {
          const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - collection.amount);
          const newDueAmount = invoice.total_amount - newPaidAmount;
          const newStatus = newDueAmount >= invoice.total_amount ? 'due' : newPaidAmount > 0 ? 'partial' : 'due';
          
          await supabase
            .from('bandwidth_sales_invoices')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', collection.invoice_id);
        }
      }

      // Reverse client's total receivable
      if (collection.client_id && collection.amount) {
        const client = clients.find(c => c.id === collection.client_id);
        if (client) {
          await supabase
            .from('bandwidth_clients')
            .update({ total_receivable: (client.total_receivable || 0) + collection.amount })
            .eq('id', collection.client_id);
        }
      }

      const { error } = await supabase
        .from('bandwidth_bill_collections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // Log activity
      await logBandwidthActivity(tenantId, 'delete_collection', 'bandwidth_bill_collection', id, {
        receipt_number: collection.receipt_number,
        client_name: collection.client?.name,
        amount: collection.amount,
        payment_method: collection.payment_method,
      });

      toast.success('Bill collection deleted successfully');
      fetchBillCollections();
      fetchSalesInvoices();
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting bill collection:', error);
      toast.error('Failed to delete bill collection');
    }
  };

  // ==================== PROVIDER PAYMENTS ====================
  const fetchProviderPayments = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bandwidth_provider_payments')
        .select('*, provider:bandwidth_providers(*), bill:bandwidth_purchase_bills(*)')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      setProviderPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching provider payments:', error);
      toast.error('Failed to fetch provider payments');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const createProviderPayment = async (data: Partial<BandwidthProviderPayment>) => {
    if (!tenantId) return;
    try {
      const paymentNumber = `PP-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('bandwidth_provider_payments')
        .insert({ payment_number: paymentNumber, provider_id: data.provider_id, bill_id: data.bill_id, payment_date: data.payment_date, amount: data.amount || 0, payment_method: data.payment_method, paid_by: data.paid_by, remarks: data.remarks, tenant_id: tenantId });
      
      if (error) throw error;

      // Update bill paid amount if linked
      if (data.bill_id && data.amount) {
        const bill = purchaseBills.find(b => b.id === data.bill_id);
        if (bill) {
          const newPaidAmount = (bill.paid_amount || 0) + data.amount;
          const newDueAmount = bill.total_amount - newPaidAmount;
          const newStatus = newDueAmount <= 0 ? 'paid' : 'partial';
          
          await supabase
            .from('bandwidth_purchase_bills')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', data.bill_id);
        }
      }

      // Update provider's total due
      if (data.provider_id && data.amount) {
        const provider = providers.find(p => p.id === data.provider_id);
        if (provider) {
          await supabase
            .from('bandwidth_providers')
            .update({ total_due: Math.max(0, (provider.total_due || 0) - data.amount) })
            .eq('id', data.provider_id);
        }
      }

      toast.success('Provider payment recorded successfully');
      fetchProviderPayments();
      fetchPurchaseBills();
      fetchProviders();
    } catch (error: any) {
      console.error('Error creating provider payment:', error);
      toast.error('Failed to record provider payment');
    }
  };

  const updateProviderPayment = async (id: string, data: Partial<BandwidthProviderPayment>, oldAmount?: number) => {
    try {
      // Find the existing payment to get original values
      const existingPayment = providerPayments.find(p => p.id === id);
      if (!existingPayment) throw new Error('Payment not found');
      
      const originalAmount = oldAmount ?? existingPayment.amount;
      const newAmount = data.amount ?? originalAmount;
      const amountDifference = newAmount - originalAmount;
      
      const { error } = await supabase
        .from('bandwidth_provider_payments')
        .update({
          payment_date: data.payment_date,
          amount: data.amount,
          payment_method: data.payment_method,
          paid_by: data.paid_by,
          remarks: data.remarks,
        })
        .eq('id', id);
      
      if (error) throw error;

      // Update bill paid amount if linked and amount changed
      if (existingPayment.bill_id && amountDifference !== 0) {
        const bill = purchaseBills.find(b => b.id === existingPayment.bill_id);
        if (bill) {
          const newPaidAmount = (bill.paid_amount || 0) + amountDifference;
          const newDueAmount = bill.total_amount - newPaidAmount;
          const newStatus = newDueAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'due';
          
          await supabase
            .from('bandwidth_purchase_bills')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', existingPayment.bill_id);
        }
      }

      // Update provider's total due if amount changed
      if (existingPayment.provider_id && amountDifference !== 0) {
        const provider = providers.find(p => p.id === existingPayment.provider_id);
        if (provider) {
          await supabase
            .from('bandwidth_providers')
            .update({ total_due: Math.max(0, (provider.total_due || 0) - amountDifference) })
            .eq('id', existingPayment.provider_id);
        }
      }

      // Log activity
      await logBandwidthActivity(tenantId, 'update_payment', 'bandwidth_provider_payment', id, {
        payment_number: existingPayment.payment_number,
        provider_name: existingPayment.provider?.name,
        old_amount: originalAmount,
        new_amount: newAmount,
        payment_method: data.payment_method,
      });

      toast.success('Provider payment updated successfully');
      fetchProviderPayments();
      fetchPurchaseBills();
      fetchProviders();
    } catch (error: any) {
      console.error('Error updating provider payment:', error);
      toast.error('Failed to update provider payment');
    }
  };

  const deleteProviderPayment = async (id: string) => {
    try {
      // Find payment to reverse its effects
      const payment = providerPayments.find(p => p.id === id);
      if (!payment) throw new Error('Payment not found');

      // Reverse bill paid amount if linked
      if (payment.bill_id && payment.amount) {
        const bill = purchaseBills.find(b => b.id === payment.bill_id);
        if (bill) {
          const newPaidAmount = Math.max(0, (bill.paid_amount || 0) - payment.amount);
          const newDueAmount = bill.total_amount - newPaidAmount;
          const newStatus = newDueAmount >= bill.total_amount ? 'due' : newPaidAmount > 0 ? 'partial' : 'due';
          
          await supabase
            .from('bandwidth_purchase_bills')
            .update({ 
              paid_amount: newPaidAmount, 
              due_amount: newDueAmount,
              payment_status: newStatus
            })
            .eq('id', payment.bill_id);
        }
      }

      // Reverse provider's total due
      if (payment.provider_id && payment.amount) {
        const provider = providers.find(p => p.id === payment.provider_id);
        if (provider) {
          await supabase
            .from('bandwidth_providers')
            .update({ total_due: (provider.total_due || 0) + payment.amount })
            .eq('id', payment.provider_id);
        }
      }

      const { error } = await supabase
        .from('bandwidth_provider_payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // Log activity
      await logBandwidthActivity(tenantId, 'delete_payment', 'bandwidth_provider_payment', id, {
        payment_number: payment.payment_number,
        provider_name: payment.provider?.name,
        amount: payment.amount,
        payment_method: payment.payment_method,
      });

      toast.success('Provider payment deleted successfully');
      fetchProviderPayments();
      fetchPurchaseBills();
      fetchProviders();
    } catch (error: any) {
      console.error('Error deleting provider payment:', error);
      toast.error('Failed to delete provider payment');
    }
  };

  // Initial fetch
  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchItems();
      fetchProviders();
      fetchClients();
      fetchPurchaseBills();
      fetchSalesInvoices();
      fetchBillCollections();
      fetchProviderPayments();
    }
  }, [tenantId, fetchCategories, fetchItems, fetchProviders, fetchClients, fetchPurchaseBills, fetchSalesInvoices, fetchBillCollections, fetchProviderPayments]);

  // Stats calculations
  const stats = {
    totalProviders: providers.length,
    totalClients: clients.length,
    totalPurchases: purchaseBills.reduce((sum, b) => sum + b.total_amount, 0),
    totalSales: salesInvoices.reduce((sum, i) => sum + i.total_amount, 0),
    totalPayable: providers.reduce((sum, p) => sum + (p.total_due || 0), 0),
    totalReceivable: clients.reduce((sum, c) => sum + (c.total_receivable || 0), 0),
    totalCollected: billCollections.reduce((sum, c) => sum + c.amount, 0),
    totalPaid: providerPayments.reduce((sum, p) => sum + p.amount, 0),
  };

  return {
    loading,
    // Data
    categories,
    items,
    providers,
    clients,
    purchaseBills,
    salesInvoices,
    billCollections,
    providerPayments,
    stats,
    // Category CRUD
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    // Item CRUD
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    // Provider CRUD
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    // Client CRUD
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    // Purchase Bill CRUD
    fetchPurchaseBills,
    createPurchaseBill,
    updatePurchaseBill,
    deletePurchaseBill,
    // Sales Invoice CRUD
    fetchSalesInvoices,
    createSalesInvoice,
    updateSalesInvoice,
    deleteSalesInvoice,
    // Bill Collection CRUD
    fetchBillCollections,
    createBillCollection,
    updateBillCollection,
    deleteBillCollection,
    // Provider Payment CRUD
    fetchProviderPayments,
    createProviderPayment,
    updateProviderPayment,
    deleteProviderPayment,
  };
}