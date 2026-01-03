import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { Supplier, PurchaseOrder, SalesOrder, InventoryLedger } from '@/types/erp';

export function useInventoryAdvanced() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [ledger, setLedger] = useState<InventoryLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchSuppliers = useCallback(async () => {
    const query = supabase.from('suppliers').select('*').eq('is_active', true);
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('name');
    if (error) {
      console.error('Error fetching suppliers:', error);
    } else {
      setSuppliers((data || []) as Supplier[]);
    }
  }, [isSuperAdmin, tenantId]);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('purchase_orders').select('*, suppliers(*)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('order_date', { ascending: false });
    if (error) {
      console.error('Error fetching purchase orders:', error);
    } else {
      const mapped = (data || []).map((po: any) => ({
        ...po,
        supplier: po.suppliers,
      }));
      setPurchaseOrders(mapped as PurchaseOrder[]);
    }
    setLoading(false);
  }, [isSuperAdmin, tenantId]);

  const fetchSalesOrders = useCallback(async () => {
    const query = supabase.from('sales_orders').select('*, customers(name)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('order_date', { ascending: false });
    if (error) {
      console.error('Error fetching sales orders:', error);
    } else {
      setSalesOrders((data || []) as SalesOrder[]);
    }
  }, [isSuperAdmin, tenantId]);

  const fetchLedger = useCallback(async (itemId?: string) => {
    const query = supabase.from('inventory_ledger').select('*, inventory_items(name)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    if (itemId) {
      query.eq('item_id', itemId);
    }
    const { data, error } = await query.order('entry_date', { ascending: false }).limit(100);
    if (error) {
      console.error('Error fetching inventory ledger:', error);
    } else {
      setLedger((data || []) as InventoryLedger[]);
    }
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchSalesOrders();
    fetchLedger();
  }, [fetchSuppliers, fetchPurchaseOrders, fetchSalesOrders, fetchLedger]);

  // Supplier Management
  const createSupplier = async (data: Partial<Supplier>) => {
    if (!tenantId) { toast.error('No tenant context'); return false; }
    const { error } = await (supabase.from as any)('suppliers').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed to create supplier'); return false; }
    toast.success('Supplier created');
    fetchSuppliers();
    return true;
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    const { error } = await supabase.from('suppliers').update(data).eq('id', id);
    if (error) {
      toast.error('Failed to update supplier');
      return false;
    }
    toast.success('Supplier updated');
    fetchSuppliers();
    return true;
  };

  // Purchase Order Management
  const createPurchaseOrder = async (
    supplierId: string,
    items: { itemId: string; quantity: number; unitPrice: number }[],
    notes?: string
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Generate PO number
    const { data: countData } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    const orderNumber = `PO${year}${String((countData?.length || 0) + 1).padStart(5, '0')}`;

    const { data: po, error } = await supabase.from('purchase_orders').insert({
      tenant_id: tenantId,
      order_number: orderNumber,
      supplier_id: supplierId,
      subtotal,
      total: subtotal,
      notes,
    }).select().single();

    if (error || !po) {
      toast.error('Failed to create purchase order');
      return false;
    }

    // Add items
    const poItems = items.map(item => ({
      purchase_order_id: po.id,
      item_id: item.itemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    await supabase.from('purchase_order_items').insert(poItems);

    toast.success('Purchase order created');
    fetchPurchaseOrders();
    return true;
  };

  const receivePurchaseOrder = async (poId: string) => {
    if (!tenantId) return false;

    // Get PO items
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', poId);

    if (!items) return false;

    // Update inventory for each item
    for (const item of items) {
      // Get current stock
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', item.item_id)
        .single();

      const currentStock = inventoryItem?.quantity || 0;
      const newStock = currentStock + item.quantity;

      // Update inventory
      await supabase.from('inventory_items').update({
        quantity: newStock,
      }).eq('id', item.item_id);

      // Record in ledger
      await supabase.from('inventory_ledger').insert({
        tenant_id: tenantId,
        item_id: item.item_id,
        transaction_type: 'purchase',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_value: item.quantity * item.unit_price,
        stock_before: currentStock,
        stock_after: newStock,
        reference_id: poId,
        reference_type: 'purchase_order',
      });

      // Update received quantity
      await supabase.from('purchase_order_items').update({
        received_quantity: item.quantity,
      }).eq('id', item.id);
    }

    // Mark PO as received
    await supabase.from('purchase_orders').update({
      status: 'received',
    }).eq('id', poId);

    toast.success('Purchase order received');
    fetchPurchaseOrders();
    fetchLedger();
    return true;
  };

  // Sales Order Management
  const createSalesOrder = async (
    customerId: string | null,
    customerName: string,
    items: { itemId: string; quantity: number; unitPrice: number }[],
    notes?: string
  ) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Generate SO number
    const { data: countData } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    const orderNumber = `SO${year}${String((countData?.length || 0) + 1).padStart(5, '0')}`;

    const { data: so, error } = await supabase.from('sales_orders').insert({
      tenant_id: tenantId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: customerName,
      subtotal,
      total: subtotal,
      notes,
    }).select().single();

    if (error || !so) {
      toast.error('Failed to create sales order');
      return false;
    }

    // Add items and update inventory
    for (const item of items) {
      await supabase.from('sales_order_items').insert({
        sales_order_id: so.id,
        item_id: item.itemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      });

      // Get current stock
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', item.itemId)
        .single();

      const currentStock = inventoryItem?.quantity || 0;
      const newStock = Math.max(0, currentStock - item.quantity);

      // Update inventory
      await supabase.from('inventory_items').update({
        quantity: newStock,
      }).eq('id', item.itemId);

      // Record in ledger
      await supabase.from('inventory_ledger').insert({
        tenant_id: tenantId,
        item_id: item.itemId,
        transaction_type: 'sale',
        quantity: -item.quantity,
        unit_price: item.unitPrice,
        total_value: item.quantity * item.unitPrice,
        stock_before: currentStock,
        stock_after: newStock,
        reference_id: so.id,
        reference_type: 'sales_order',
      });
    }

    toast.success('Sales order created');
    fetchSalesOrders();
    fetchLedger();
    return true;
  };

  return {
    suppliers,
    purchaseOrders,
    salesOrders,
    ledger,
    loading,
    refetchSuppliers: fetchSuppliers,
    refetchPurchaseOrders: fetchPurchaseOrders,
    refetchSalesOrders: fetchSalesOrders,
    refetchLedger: fetchLedger,
    createSupplier,
    updateSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
    createSalesOrder,
  };
}
