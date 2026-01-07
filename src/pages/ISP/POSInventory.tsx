import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePOS, CartItem, POSCustomer } from '@/hooks/usePOS';
import { 
  Package, Plus, Edit, Trash2, Loader2, ShoppingCart, Users, DollarSign,
  FileText, Download, Search, Printer, Send, X, Check, CreditCard,
  TrendingUp, AlertTriangle, History, Wallet, Building2, Phone, BarChart3, Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  sale_price: number;
  location: string | null;
  category?: { name: string };
}

interface Supplier {
  id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  current_balance?: number;
  is_active?: boolean;
}

interface PurchaseOrderData {
  id: string;
  order_number: string;
  supplier_id: string | null;
  order_date: string;
  total: number;
  paid_amount: number;
  status: string;
  supplier?: { name: string } | null;
}

interface ISPCustomer {
  id: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
  email: string | null;
}

export default function POSInventory() {
  const { tenantId } = useTenantContext();
  const pos = usePOS();
  const [activeTab, setActiveTab] = useState('pos');
  const [loading, setLoading] = useState(true);
  
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrderData[]>([]);
  const [ispCustomers, setIspCustomers] = useState<ISPCustomer[]>([]);
  
  // POS state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [selectedIspCustomer, setSelectedIspCustomer] = useState<ISPCustomer | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showDuePayment, setShowDuePayment] = useState(false);
  const [customerTab, setCustomerTab] = useState<'pos' | 'isp'>('pos');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Dialog states
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  // Reports state
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '', sku: '', category_id: '', quantity: '0', min_quantity: '5',
    unit_price: '0', sale_price: '0', location: '',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [supplierForm, setSupplierForm] = useState({
    name: '', company_name: '', phone: '', email: '', address: '',
  });
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', email: '', address: '', company_name: '', notes: '',
  });
  const [checkoutForm, setCheckoutForm] = useState({
    discount: '0', tax: '0', paid: '0', method: 'cash', reference: '', notes: '', sendSms: false,
  });
  const [duePaymentForm, setDuePaymentForm] = useState({
    customerId: '', amount: '0', method: 'cash', reference: '', notes: '',
  });
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '', items: [] as { itemId: string; quantity: number; price: number }[], notes: '', paidAmount: '0',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [catRes, itemRes, supRes, purRes, ispRes] = await Promise.all([
        supabase.from('inventory_categories').select('id, name').eq('tenant_id', tenantId).order('name'),
        supabase.from('inventory_items').select('*, category:inventory_categories(name)').eq('tenant_id', tenantId).order('name'),
        supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('purchase_orders').select('*, supplier:suppliers(name)').eq('tenant_id', tenantId).order('order_date', { ascending: false }).limit(50),
        supabase.from('customers').select('id, name, customer_code, phone, email').eq('tenant_id', tenantId).order('name').limit(500),
      ]);
      setCategories((catRes.data || []) as any[]);
      setItems((itemRes.data || []) as InventoryItem[]);
      setSuppliers((supRes.data || []) as Supplier[]);
      setPurchases((purRes.data || []) as PurchaseOrderData[]);
      setIspCustomers((ispRes.data || []) as ISPCustomer[]);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered items for search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIspCustomers = ispCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.customer_code?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone?.includes(customerSearchQuery)
  );

  // Cart functions
  const addToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      toast.error('Item out of stock');
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.sale_price,
        discount: 0,
        available_qty: item.quantity,
      }];
    });
  };

  const updateCartItem = (itemId: string, field: keyof CartItem, value: number) => {
    setCart(prev => prev.map(c => {
      if (c.item_id === itemId) {
        if (field === 'quantity' && value > c.available_qty) {
          toast.error('Not enough stock');
          return c;
        }
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.quantity * c.unit_price) - c.discount, 0);

  // Save item
  const handleSaveItem = async () => {
    if (!tenantId || !itemForm.name) return;
    setSaving(true);
    try {
      const data = {
        tenant_id: tenantId,
        name: itemForm.name,
        sku: itemForm.sku || null,
        category_id: itemForm.category_id && itemForm.category_id !== 'none' ? itemForm.category_id : null,
        quantity: parseInt(itemForm.quantity) || 0,
        min_quantity: parseInt(itemForm.min_quantity) || 5,
        unit_price: parseFloat(itemForm.unit_price) || 0,
        sale_price: parseFloat(itemForm.sale_price) || 0,
        location: itemForm.location || null,
      };

      if (editingItem) {
        await supabase.from('inventory_items').update(data).eq('id', editingItem.id);
        toast.success('Item updated');
      } else {
        await supabase.from('inventory_items').insert(data);
        toast.success('Item added');
      }
      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '', sku: '', category_id: '', quantity: '0', min_quantity: '5',
      unit_price: '0', sale_price: '0', location: '',
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || '',
      category_id: item.category_id || '',
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      unit_price: item.unit_price.toString(),
      sale_price: item.sale_price.toString(),
      location: item.location || '',
    });
    setShowItemDialog(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await supabase.from('inventory_items').delete().eq('id', itemId);
      toast.success('Item deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  // Save category
  const handleSaveCategory = async () => {
    if (!tenantId || !categoryForm.name) return;
    setSaving(true);
    try {
      await supabase.from('inventory_categories').insert({
        tenant_id: tenantId,
        name: categoryForm.name,
        description: categoryForm.description || null,
      });
      toast.success('Category added');
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // Save supplier
  const handleSaveSupplier = async () => {
    if (!tenantId || !supplierForm.name) return;
    setSaving(true);
    try {
      const data = {
        tenant_id: tenantId,
        name: supplierForm.name,
        company_name: supplierForm.company_name || null,
        phone: supplierForm.phone || null,
        email: supplierForm.email || null,
        address: supplierForm.address || null,
      };

      if (editingSupplier) {
        await supabase.from('suppliers').update(data).eq('id', editingSupplier.id);
        toast.success('Supplier updated');
      } else {
        await supabase.from('suppliers').insert(data);
        toast.success('Supplier added');
      }
      setShowSupplierDialog(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', company_name: '', phone: '', email: '', address: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      company_name: supplier.company_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setShowSupplierDialog(true);
  };

  // Save POS Customer
  const handleSaveCustomer = async () => {
    if (!customerForm.name) return;
    setSaving(true);
    const result = await pos.createCustomer(customerForm);
    if (result) {
      setSelectedCustomer(result as POSCustomer);
      setShowNewCustomer(false);
      setCustomerForm({ name: '', phone: '', email: '', address: '', company_name: '', notes: '' });
    }
    setSaving(false);
  };

  // Select ISP customer for sale
  const selectIspCustomerForSale = (customer: ISPCustomer) => {
    setSelectedIspCustomer(customer);
    setSelectedCustomer(null);
    setShowCustomerDialog(false);
  };

  // Select POS customer for sale
  const selectPosCustomerForSale = (customer: POSCustomer) => {
    setSelectedCustomer(customer);
    setSelectedIspCustomer(null);
    setShowCustomerDialog(false);
  };

  // Process checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setSaving(true);
    
    const customerInfo = selectedIspCustomer 
      ? { customerId: undefined, name: selectedIspCustomer.name, phone: selectedIspCustomer.phone || undefined, ispCustomerId: selectedIspCustomer.id }
      : { customerId: selectedCustomer?.id, name: selectedCustomer?.name, phone: selectedCustomer?.phone || undefined };
    
    const result = await pos.createSale(
      cart,
      customerInfo,
      {
        paid: parseFloat(checkoutForm.paid) || 0,
        method: checkoutForm.method,
        reference: checkoutForm.reference || undefined,
      },
      {
        discount: parseFloat(checkoutForm.discount) || 0,
        tax: parseFloat(checkoutForm.tax) || 0,
        notes: checkoutForm.notes || undefined,
        sendSms: checkoutForm.sendSms,
      }
    );

    if (result) {
      setCart([]);
      setSelectedCustomer(null);
      setSelectedIspCustomer(null);
      setShowCheckout(false);
      setCheckoutForm({ discount: '0', tax: '0', paid: '0', method: 'cash', reference: '', notes: '', sendSms: false });
      fetchData();
      
      // Show invoice dialog
      setSelectedSale(result);
      const items = await pos.getSaleItems(result.id);
      setSaleItems(items || []);
      setShowInvoice(true);
    }
    setSaving(false);
  };

  // Collect due payment
  const handleDuePayment = async () => {
    if (!duePaymentForm.customerId || !duePaymentForm.amount) return;
    setSaving(true);
    await pos.collectDuePayment(
      duePaymentForm.customerId,
      parseFloat(duePaymentForm.amount),
      duePaymentForm.method,
      {
        reference: duePaymentForm.reference || undefined,
        notes: duePaymentForm.notes || undefined,
      }
    );
    setShowDuePayment(false);
    setDuePaymentForm({ customerId: '', amount: '0', method: 'cash', reference: '', notes: '' });
    setSaving(false);
  };

  // Create purchase order
  const handleCreatePurchase = async () => {
    if (!tenantId || !purchaseForm.supplierId || purchaseForm.items.length === 0) return;
    setSaving(true);
    try {
      const total = purchaseForm.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
      const paidAmount = parseFloat(purchaseForm.paidAmount) || 0;
      const year = new Date().getFullYear().toString().slice(-2);
      const { count } = await supabase.from('purchase_orders')
        .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
      const orderNumber = `PO${year}${String((count || 0) + 1).padStart(5, '0')}`;

      const { data: po, error } = await supabase.from('purchase_orders').insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        supplier_id: purchaseForm.supplierId,
        total,
        paid_amount: paidAmount,
        notes: purchaseForm.notes || null,
      }).select().single();

      if (error || !po) throw error;

      const poItems = purchaseForm.items.map(i => ({
        purchase_order_id: po.id,
        item_id: i.itemId,
        quantity: i.quantity,
        unit_price: i.price,
      }));
      await supabase.from('purchase_order_items').insert(poItems);

      toast.success('Purchase order created');
      setShowPurchaseDialog(false);
      setPurchaseForm({ supplierId: '', items: [], notes: '', paidAmount: '0' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  // Receive purchase order
  const handleReceivePurchase = async (poId: string) => {
    if (!tenantId) return;
    try {
      const { data: poItems } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', poId);
      if (!poItems) return;

      for (const item of poItems) {
        const { data: invItem } = await supabase.from('inventory_items').select('quantity').eq('id', item.item_id).single();
        const currentQty = invItem?.quantity || 0;
        const newQty = currentQty + item.quantity;

        await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', item.item_id);
        await supabase.from('inventory_ledger').insert({
          tenant_id: tenantId,
          item_id: item.item_id,
          transaction_type: 'purchase',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_value: item.quantity * item.unit_price,
          stock_before: currentQty,
          stock_after: newQty,
          reference_id: poId,
          reference_type: 'purchase_order',
        });
        await supabase.from('purchase_order_items').update({ received_quantity: item.quantity }).eq('id', item.id);
      }

      await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', poId);
      toast.success('Purchase received');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive purchase');
    }
  };

  // View sale invoice
  const handleViewInvoice = async (sale: any) => {
    setSelectedSale(sale);
    const items = await pos.getSaleItems(sale.id);
    setSaleItems(items || []);
    setShowInvoice(true);
  };

  // Print invoice
  const handlePrintInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${selectedSale?.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice-header { text-align: center; margin-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .totals { text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Report calculations
  const getReportData = useCallback(() => {
    const startDate = startOfMonth(new Date(reportMonth));
    const endDate = endOfMonth(new Date(reportMonth));
    
    const monthSales = pos.sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= startDate && saleDate <= endDate;
    });
    
    const monthPayments = pos.payments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    const monthPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.order_date);
      return purchaseDate >= startDate && purchaseDate <= endDate;
    });
    
    return {
      totalSales: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
      totalPaid: monthSales.reduce((sum, s) => sum + s.paid_amount, 0),
      totalDue: monthSales.reduce((sum, s) => sum + s.due_amount, 0),
      salesCount: monthSales.length,
      purchaseTotal: monthPurchases.reduce((sum, p) => sum + p.total, 0),
      purchaseCount: monthPurchases.length,
      collectionTotal: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      collectionCount: monthPayments.length,
    };
  }, [pos.sales, pos.payments, purchases, reportMonth]);

  const exportReportCSV = () => {
    const report = getReportData();
    const csvContent = `Inventory Report - ${reportMonth}
    
Sales Summary
Total Sales,${report.salesCount}
Total Sales Amount,${report.totalSales}
Total Paid,${report.totalPaid}
Total Due,${report.totalDue}

Purchase Summary
Total Purchases,${report.purchaseCount}
Total Purchase Amount,${report.purchaseTotal}

Collection Summary
Total Collections,${report.collectionCount}
Total Collection Amount,${report.collectionTotal}
`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${reportMonth}.csv`;
    a.click();
  };

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const reportData = getReportData();

  return (
    <DashboardLayout title="Inventory Management" subtitle="Manage products, stock, sales, and purchases">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold">৳{totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold text-green-600">৳{pos.stats.todaySales.toLocaleString()}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold text-orange-600">৳{pos.stats.totalDue.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full mb-6">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">POS</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Suppliers</span>
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Purchase</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="dues" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Dues</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* POS Tab */}
        <TabsContent value="pos">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search products..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredItems.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className={`p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                            item.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku || 'No SKU'}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-primary">৳{item.sale_price}</span>
                            <Badge variant={item.quantity <= item.min_quantity ? 'destructive' : 'secondary'} className="text-xs">
                              {item.quantity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Cart */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart ({cart.length})
                    </CardTitle>
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                        Clear
                      </Button>
                    )}
                  </div>
                  {selectedCustomer || selectedIspCustomer ? (
                    <div className="flex items-center justify-between bg-muted p-2 rounded">
                      <div>
                        <p className="font-medium text-sm">{selectedCustomer?.name || selectedIspCustomer?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer?.phone || selectedIspCustomer?.phone}
                          {selectedIspCustomer && <Badge variant="outline" className="ml-2 text-xs">ISP</Badge>}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setSelectedIspCustomer(null); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCustomerDialog(true)} className="flex-1">
                        <Users className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowNewCustomer(true)} className="flex-1">
                        <Plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map(item => (
                          <div key={item.item_id} className="flex items-center justify-between border-b pb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">৳{item.unit_price} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.item_id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 h-8"
                                min={1}
                                max={item.available_qty}
                              />
                              <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.item_id)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>৳{cartTotal.toLocaleString()}</span>
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={cart.length === 0}
                      onClick={() => {
                        setCheckoutForm(prev => ({ ...prev, paid: cartTotal.toString() }));
                        setShowCheckout(true);
                      }}
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Products</CardTitle>
                <CardDescription>Manage your products and stock levels</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Category
                </Button>
                <Button onClick={() => { resetItemForm(); setEditingItem(null); setShowItemDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                    ) : (
                      items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="font-mono text-sm">{item.sku || '-'}</TableCell>
                          <TableCell>{item.category?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={item.quantity <= item.min_quantity ? 'destructive' : 'secondary'}>
                              {item.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>৳{item.unit_price}</TableCell>
                          <TableCell>৳{item.sale_price}</TableCell>
                          <TableCell>{item.location || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Manage your product suppliers</CardDescription>
              </div>
              <Button onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', company_name: '', phone: '', email: '', address: '' }); setShowSupplierDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell></TableRow>
                  ) : (
                    suppliers.map(supplier => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.company_name || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{supplier.address || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Tab */}
        <TabsContent value="purchase">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Track product purchases from suppliers</CardDescription>
              </div>
              <Button onClick={() => setShowPurchaseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
                  ) : (
                    purchases.map(po => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono">{po.order_number}</TableCell>
                        <TableCell>{(po.supplier as any)?.name || '-'}</TableCell>
                        <TableCell>{format(new Date(po.order_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>৳{po.total.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">৳{(po.paid_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className={po.total - (po.paid_amount || 0) > 0 ? 'text-orange-600' : ''}>
                          ৳{(po.total - (po.paid_amount || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={po.status === 'received' ? 'default' : po.status === 'pending' ? 'secondary' : 'outline'}>
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {po.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => handleReceivePurchase(po.id)}>
                              <Check className="h-4 w-4 mr-1" />
                              Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>View all POS sales and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pos.loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : pos.sales.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sales found</TableCell></TableRow>
                    ) : (
                      pos.sales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono">{sale.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sale.customer_name || 'Walk-in'}</p>
                              {sale.customer_phone && <p className="text-xs text-muted-foreground">{sale.customer_phone}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(sale.sale_date), 'dd MMM yyyy HH:mm')}</TableCell>
                          <TableCell>৳{sale.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">৳{sale.paid_amount.toLocaleString()}</TableCell>
                          <TableCell className={sale.due_amount > 0 ? 'text-orange-600' : ''}>
                            ৳{sale.due_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sale.status === 'completed' ? 'default' : sale.status === 'partial' ? 'secondary' : 'outline'}>
                              {sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(sale)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>POS Customers</CardTitle>
                <CardDescription>Manage walk-in and regular customers (separate from ISP subscribers)</CardDescription>
              </div>
              <Button onClick={() => setShowNewCustomer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Total Purchase</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.customers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                  ) : (
                    pos.customers.map(customer => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-mono">{customer.customer_code}</TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.company_name || '-'}</TableCell>
                        <TableCell>৳{customer.total_purchase.toLocaleString()}</TableCell>
                        <TableCell className={customer.due_amount > 0 ? 'text-orange-600 font-medium' : ''}>
                          ৳{customer.due_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.due_amount > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDuePaymentForm(prev => ({ 
                                  ...prev, 
                                  customerId: customer.id,
                                  amount: customer.due_amount.toString(),
                                }));
                                setShowDuePayment(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Collect
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues">
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Due Collections</CardTitle>
                  <CardDescription>Track and collect pending payments</CardDescription>
                </div>
                <Button onClick={() => setShowDuePayment(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Collect Payment
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Customers with Due */}
                  <div>
                    <h3 className="font-semibold mb-4">Customers with Due</h3>
                    <ScrollArea className="h-[400px]">
                      {pos.customers.filter(c => c.due_amount > 0).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No pending dues</p>
                      ) : (
                        <div className="space-y-3">
                          {pos.customers.filter(c => c.due_amount > 0).map(customer => (
                            <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.phone}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-600">৳{customer.due_amount.toLocaleString()}</p>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="h-auto p-0"
                                  onClick={() => {
                                    setDuePaymentForm(prev => ({ 
                                      ...prev, 
                                      customerId: customer.id,
                                      amount: customer.due_amount.toString(),
                                    }));
                                    setShowDuePayment(true);
                                  }}
                                >
                                  Collect
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Recent Payments */}
                  <div>
                    <h3 className="font-semibold mb-4">Recent Payments</h3>
                    <ScrollArea className="h-[400px]">
                      {pos.payments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No payments yet</p>
                      ) : (
                        <div className="space-y-3">
                          {pos.payments.slice(0, 20).map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{(payment.customer as any)?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payment.payment_date), 'dd MMM yyyy HH:mm')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">৳{payment.amount.toLocaleString()}</p>
                                <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Reports</CardTitle>
                  <CardDescription>Sales, purchase, and collection reports</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Input 
                    type="month" 
                    value={reportMonth} 
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-40"
                  />
                  <Button variant="outline" onClick={exportReportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-muted-foreground mb-2">Sales Summary</h4>
                      <p className="text-3xl font-bold text-green-600">৳{reportData.totalSales.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{reportData.salesCount} sales</p>
                      <div className="mt-2 text-sm">
                        <p>Paid: <span className="text-green-600">৳{reportData.totalPaid.toLocaleString()}</span></p>
                        <p>Due: <span className="text-orange-600">৳{reportData.totalDue.toLocaleString()}</span></p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-muted-foreground mb-2">Purchase Summary</h4>
                      <p className="text-3xl font-bold text-blue-600">৳{reportData.purchaseTotal.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{reportData.purchaseCount} purchases</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-muted-foreground mb-2">Collection Summary</h4>
                      <p className="text-3xl font-bold text-primary">৳{reportData.collectionTotal.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{reportData.collectionCount} collections</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Low Stock Alert */}
                {lowStockItems.length > 0 && (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Low Stock Alert ({lowStockItems.length} items)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Current Stock</TableHead>
                            <TableHead>Min Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockItems.slice(0, 10).map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell><Badge variant="destructive">{item.quantity}</Badge></TableCell>
                              <TableCell>{item.min_quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Select Customer Dialog - Updated with ISP customers */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as 'pos' | 'isp')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pos">POS Customers</TabsTrigger>
              <TabsTrigger value="isp" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                ISP Customers
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search customers..." 
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <TabsContent value="pos">
              <ScrollArea className="h-[300px]">
                {pos.customers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No POS customers found</p>
                ) : (
                  <div className="space-y-2">
                    {pos.customers.filter(c => 
                      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                    ).map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => selectPosCustomerForSale(customer)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                      >
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone} 
                          {customer.due_amount > 0 && <span className="text-orange-600 ml-2">Due: ৳{customer.due_amount}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="isp">
              <ScrollArea className="h-[300px]">
                {filteredIspCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No ISP customers found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredIspCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => selectIspCustomerForSale(customer)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{customer.name}</p>
                          <Badge variant="outline" className="text-xs">{customer.customer_code}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{customer.phone || customer.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add POS Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={customerForm.name} onChange={(e) => setCustomerForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={customerForm.phone} onChange={(e) => setCustomerForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={customerForm.email} onChange={(e) => setCustomerForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={customerForm.company_name} onChange={(e) => setCustomerForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={customerForm.address} onChange={(e) => setCustomerForm(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomer} disabled={saving || !customerForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>৳{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Discount:</span>
                <span>-৳{parseFloat(checkoutForm.discount) || 0}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax:</span>
                <span>+৳{parseFloat(checkoutForm.tax) || 0}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>৳{(cartTotal - (parseFloat(checkoutForm.discount) || 0) + (parseFloat(checkoutForm.tax) || 0)).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount (৳)</Label>
                <Input type="number" value={checkoutForm.discount} onChange={(e) => setCheckoutForm(p => ({ ...p, discount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tax (৳)</Label>
                <Input type="number" value={checkoutForm.tax} onChange={(e) => setCheckoutForm(p => ({ ...p, tax: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paid Amount *</Label>
                <Input type="number" value={checkoutForm.paid} onChange={(e) => setCheckoutForm(p => ({ ...p, paid: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={checkoutForm.method} onValueChange={(v) => setCheckoutForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference / Transaction ID</Label>
              <Input value={checkoutForm.reference} onChange={(e) => setCheckoutForm(p => ({ ...p, reference: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={checkoutForm.notes} onChange={(e) => setCheckoutForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Send SMS to customer</Label>
              <Switch checked={checkoutForm.sendSms} onCheckedChange={(c) => setCheckoutForm(p => ({ ...p, sendSms: c }))} />
            </div>

            {parseFloat(checkoutForm.paid) < (cartTotal - (parseFloat(checkoutForm.discount) || 0) + (parseFloat(checkoutForm.tax) || 0)) && (
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  Due amount: ৳{((cartTotal - (parseFloat(checkoutForm.discount) || 0) + (parseFloat(checkoutForm.tax) || 0)) - (parseFloat(checkoutForm.paid) || 0)).toLocaleString()}
                  {!selectedCustomer && !selectedIspCustomer && ' - Please select a customer to track due'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Due Payment Dialog */}
      <Dialog open={showDuePayment} onOpenChange={setShowDuePayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Due Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={duePaymentForm.customerId} onValueChange={(v) => setDuePaymentForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {pos.customers.filter(c => c.due_amount > 0).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - Due: ৳{c.due_amount}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={duePaymentForm.amount} onChange={(e) => setDuePaymentForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={duePaymentForm.method} onValueChange={(v) => setDuePaymentForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={duePaymentForm.reference} onChange={(e) => setDuePaymentForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={duePaymentForm.notes} onChange={(e) => setDuePaymentForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuePayment(false)}>Cancel</Button>
            <Button onClick={handleDuePayment} disabled={saving || !duePaymentForm.customerId || !duePaymentForm.amount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Collect Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={itemForm.sku} onChange={(e) => setItemForm(p => ({ ...p, sku: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={itemForm.category_id} onValueChange={(v) => setItemForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Alert</Label>
                <Input type="number" value={itemForm.min_quantity} onChange={(e) => setItemForm(p => ({ ...p, min_quantity: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price (৳)</Label>
                <Input type="number" value={itemForm.unit_price} onChange={(e) => setItemForm(p => ({ ...p, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sale Price (৳)</Label>
                <Input type="number" value={itemForm.sale_price} onChange={(e) => setItemForm(p => ({ ...p, sale_price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Shelf</Label>
              <Input value={itemForm.location} onChange={(e) => setItemForm(p => ({ ...p, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={saving || !itemForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={categoryForm.description} onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={supplierForm.name} onChange={(e) => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={supplierForm.company_name} onChange={(e) => setSupplierForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={supplierForm.phone} onChange={(e) => setSupplierForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={supplierForm.email} onChange={(e) => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={supplierForm.address} onChange={(e) => setSupplierForm(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSupplier} disabled={saving || !supplierForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSupplier ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={purchaseForm.supplierId} onValueChange={(v) => setPurchaseForm(p => ({ ...p, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paid Amount</Label>
                <Input 
                  type="number" 
                  value={purchaseForm.paidAmount} 
                  onChange={(e) => setPurchaseForm(p => ({ ...p, paidAmount: e.target.value }))} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPurchaseForm(p => ({ ...p, items: [...p.items, { itemId: '', quantity: 1, price: 0 }] }))}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                {purchaseForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                    <Select value={item.itemId} onValueChange={(v) => {
                      const selectedItem = items.find(i => i.id === v);
                      setPurchaseForm(p => ({
                        ...p,
                        items: p.items.map((i, iIdx) => iIdx === idx ? { 
                          ...i, 
                          itemId: v,
                          price: selectedItem?.unit_price || 0
                        } : i)
                      }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => setPurchaseForm(p => ({
                        ...p,
                        items: p.items.map((i, iIdx) => iIdx === idx ? { ...i, quantity: parseInt(e.target.value) || 0 } : i)
                      }))}
                    />
                    <Input 
                      type="number" 
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => setPurchaseForm(p => ({
                        ...p,
                        items: p.items.map((i, iIdx) => iIdx === idx ? { ...i, price: parseFloat(e.target.value) || 0 } : i)
                      }))}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setPurchaseForm(p => ({ ...p, items: p.items.filter((_, iIdx) => iIdx !== idx) }))}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
              <div className="text-right font-bold">
                Total: ৳{purchaseForm.items.reduce((sum, i) => sum + (i.quantity * i.price), 0).toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={purchaseForm.notes} onChange={(e) => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePurchase} disabled={saving || !purchaseForm.supplierId || purchaseForm.items.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          <div id="invoice-content" className="space-y-4">
            {selectedSale && (
              <>
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  <p className="text-sm text-muted-foreground">#{selectedSale.invoice_number}</p>
                  <p className="text-sm">{format(new Date(selectedSale.sale_date), 'dd MMM yyyy HH:mm')}</p>
                </div>
                
                {selectedSale.customer_name && (
                  <div className="border-b pb-3">
                    <p className="font-semibold">Customer:</p>
                    <p>{selectedSale.customer_name}</p>
                    {selectedSale.customer_phone && <p className="text-sm text-muted-foreground">{selectedSale.customer_phone}</p>}
                  </div>
                )}
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">৳{item.unit_price}</TableCell>
                        <TableCell className="text-right">৳{(item.quantity * item.unit_price).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>৳{selectedSale.subtotal?.toLocaleString() || selectedSale.total_amount.toLocaleString()}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span>-৳{selectedSale.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedSale.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>+৳{selectedSale.tax.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>৳{selectedSale.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span>৳{selectedSale.paid_amount.toLocaleString()}</span>
                  </div>
                  {selectedSale.due_amount > 0 && (
                    <div className="flex justify-between text-orange-600 font-medium">
                      <span>Due:</span>
                      <span>৳{selectedSale.due_amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>Close</Button>
            <Button onClick={handlePrintInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
