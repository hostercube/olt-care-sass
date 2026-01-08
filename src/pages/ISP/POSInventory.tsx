import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePOS, CartItem, POSCustomer } from '@/hooks/usePOS';
import { useInventoryExtended, UNIT_TYPES, DEFAULT_UNITS } from '@/hooks/useInventoryExtended';
import { BarcodeScanner, useBarcodeScanner } from '@/components/pos/BarcodeScanner';
import { printInvoice } from '@/components/pos/POSInvoicePrint';
import { printReport, generateDuesReport, generateCustomerListReport, generateSalesReport, generateInventoryReport, generateSupplierDuesReport } from '@/components/pos/POSReportGenerator';
import { 
  Package, Plus, Edit, Trash2, Loader2, ShoppingCart, Users, DollarSign,
  FileText, Download, Search, Printer, X, Check, CreditCard,
  TrendingUp, AlertTriangle, History, Wallet, Building2, BarChart3, Layers,
  Eye, MinusCircle, PlusCircle, Filter, Calendar, ArrowUpDown, ScanLine, 
  Tag, Ruler, Settings2, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  brand_id: string | null;
  unit_id: string | null;
  barcode: string | null;
  color: string | null;
  size: string | null;
  weight: number | null;
  dimensions: string | null;
  warranty_period: string | null;
  image_url: string | null;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  sale_price: number;
  location: string | null;
  category?: { name: string };
  brand?: { name: string };
  unit?: { name: string; short_name: string };
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

interface SupplierPayment {
  id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  supplier?: { name: string };
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
  const inventoryExt = useInventoryExtended();
  const [activeTab, setActiveTab] = useState('pos');
  const [loading, setLoading] = useState(true);
  
  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  // Brand/Unit management
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [brandForm, setBrandForm] = useState({ name: '', description: '' });
  const [unitForm, setUnitForm] = useState({ name: '', short_name: '', unit_type: 'quantity' });
  const [invoiceSettingsForm, setInvoiceSettingsForm] = useState({
    invoice_header: '', invoice_footer: '', invoice_terms: '', invoice_prefix: 'INV', thermal_printer_enabled: false
  });
  const [invoiceType, setInvoiceType] = useState<'thermal' | 'a4'>('a4');
  
  // Barcode scanner hook for continuous scanning
  const handleBarcodeScan = useCallback((barcode: string) => {
    const item = items.find(i => (i as any).barcode === barcode || i.sku === barcode);
    if (item) {
      addToCart(item);
      toast.success(`Added: ${item.name}`);
    } else {
      toast.error(`Product not found: ${barcode}`);
    }
  }, []);
  
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrderData[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
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
  
  // Customer profile sheet
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<POSCustomer | null>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [customerPaymentsHistory, setCustomerPaymentsHistory] = useState<any[]>([]);
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false);
  const [balanceAdjustType, setBalanceAdjustType] = useState<'add' | 'deduct'>('add');
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('0');
  const [balanceAdjustNotes, setBalanceAdjustNotes] = useState('');
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: '', phone: '', email: '', address: '', company_name: '', notes: '',
  });
  
  // Supplier payment
  const [showSupplierPayment, setShowSupplierPayment] = useState(false);
  const [supplierPaymentForm, setSupplierPaymentForm] = useState({
    supplierId: '', purchaseOrderId: '', amount: '0', method: 'cash', reference: '', notes: '',
  });
  const [selectedSupplierPurchases, setSelectedSupplierPurchases] = useState<PurchaseOrderData[]>([]);
  
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
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Reports state
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportFilter, setReportFilter] = useState<'all' | 'sales' | 'purchases' | 'payments'>('all');
  const [reportDateFrom, setReportDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportDateTo, setReportDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Pagination and filter state for all tables
  const [productsSearch, setProductsSearch] = useState('');
  const [productsCategory, setProductsCategory] = useState('all');
  const [productsPage, setProductsPage] = useState(1);
  const [productsPageSize, setProductsPageSize] = useState(20);

  const [categoriesSearch, setCategoriesSearch] = useState('');
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoriesPageSize, setCategoriesPageSize] = useState(20);

  const [suppliersSearch, setSuppliersSearch] = useState('');
  const [suppliersPage, setSuppliersPage] = useState(1);
  const [suppliersPageSize, setSuppliersPageSize] = useState(20);

  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesStatus, setPurchasesStatus] = useState('all');
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesPageSize, setPurchasesPageSize] = useState(20);

  const [salesSearch, setSalesSearch] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(20);

  const [customersSearch, setCustomersSearch] = useState('');
  const [customersPage, setCustomersPage] = useState(1);
  const [customersPageSize, setCustomersPageSize] = useState(20);

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '', sku: '', category_id: '', brand_id: '', unit_id: '', barcode: '',
    color: '', size: '', weight: '', dimensions: '', warranty_period: '',
    quantity: '0', min_quantity: '5', unit_price: '0', sale_price: '0', location: '',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [fullCategories, setFullCategories] = useState<{ id: string; name: string; description: string | null }[]>([]);
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
      const [catRes, itemRes, supRes, purRes, ispRes, supPayRes] = await Promise.all([
        supabase.from('inventory_categories').select('id, name, description').eq('tenant_id', tenantId).order('name'),
        supabase.from('inventory_items').select('*, category:inventory_categories(name)').eq('tenant_id', tenantId).order('name'),
        supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('purchase_orders').select('*, supplier:suppliers(name)').eq('tenant_id', tenantId).order('order_date', { ascending: false }).limit(100),
        supabase.from('customers').select('id, name, customer_code, phone, email').eq('tenant_id', tenantId).order('name').limit(500),
        supabase.from('supplier_payments').select('*, supplier:suppliers(name)').eq('tenant_id', tenantId).order('payment_date', { ascending: false }).limit(100),
      ]);
      const categoryData = (catRes.data || []) as { id: string; name: string; description: string | null }[];
      setCategories(categoryData.map(c => ({ id: c.id, name: c.name })));
      setFullCategories(categoryData);
      setItems((itemRes.data || []) as InventoryItem[]);
      setSuppliers((supRes.data || []) as Supplier[]);
      setPurchases((purRes.data || []) as PurchaseOrderData[]);
      setIspCustomers((ispRes.data || []) as ISPCustomer[]);
      setSupplierPayments((supPayRes.data || []) as SupplierPayment[]);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered items for POS search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIspCustomers = ispCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.customer_code?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone?.includes(customerSearchQuery)
  );

  // Filtered and paginated data using useMemo
  const filteredProductsData = useMemo(() => {
    let filtered = items.filter(item =>
      item.name.toLowerCase().includes(productsSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(productsSearch.toLowerCase())
    );
    if (productsCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === productsCategory);
    }
    return filtered;
  }, [items, productsSearch, productsCategory]);

  const paginatedProducts = useMemo(() => {
    const start = (productsPage - 1) * productsPageSize;
    return filteredProductsData.slice(start, start + productsPageSize);
  }, [filteredProductsData, productsPage, productsPageSize]);

  const filteredCategoriesData = useMemo(() => {
    return fullCategories.filter(cat =>
      cat.name.toLowerCase().includes(categoriesSearch.toLowerCase()) ||
      (cat.description || '').toLowerCase().includes(categoriesSearch.toLowerCase())
    );
  }, [fullCategories, categoriesSearch]);

  const paginatedCategories = useMemo(() => {
    const start = (categoriesPage - 1) * categoriesPageSize;
    return filteredCategoriesData.slice(start, start + categoriesPageSize);
  }, [filteredCategoriesData, categoriesPage, categoriesPageSize]);

  const filteredSuppliersData = useMemo(() => {
    return suppliers.filter(sup =>
      sup.name.toLowerCase().includes(suppliersSearch.toLowerCase()) ||
      (sup.company_name || '').toLowerCase().includes(suppliersSearch.toLowerCase()) ||
      (sup.phone || '').includes(suppliersSearch)
    );
  }, [suppliers, suppliersSearch]);

  const paginatedSuppliers = useMemo(() => {
    const start = (suppliersPage - 1) * suppliersPageSize;
    return filteredSuppliersData.slice(start, start + suppliersPageSize);
  }, [filteredSuppliersData, suppliersPage, suppliersPageSize]);

  const filteredPurchasesData = useMemo(() => {
    let filtered = purchases.filter(po =>
      po.order_number.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
      (po.supplier?.name || '').toLowerCase().includes(purchasesSearch.toLowerCase())
    );
    if (purchasesStatus !== 'all') {
      filtered = filtered.filter(po => po.status === purchasesStatus);
    }
    return filtered;
  }, [purchases, purchasesSearch, purchasesStatus]);

  const paginatedPurchases = useMemo(() => {
    const start = (purchasesPage - 1) * purchasesPageSize;
    return filteredPurchasesData.slice(start, start + purchasesPageSize);
  }, [filteredPurchasesData, purchasesPage, purchasesPageSize]);

  const filteredSalesData = useMemo(() => {
    return pos.sales.filter(sale =>
      (sale.invoice_number || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
      (sale.customer_name || '').toLowerCase().includes(salesSearch.toLowerCase())
    );
  }, [pos.sales, salesSearch]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return filteredSalesData.slice(start, start + salesPageSize);
  }, [filteredSalesData, salesPage, salesPageSize]);

  const filteredCustomersData = useMemo(() => {
    return pos.customers.filter(cust =>
      cust.name.toLowerCase().includes(customersSearch.toLowerCase()) ||
      (cust.phone || '').includes(customersSearch) ||
      (cust.customer_code || '').toLowerCase().includes(customersSearch.toLowerCase())
    );
  }, [pos.customers, customersSearch]);

  const paginatedCustomers = useMemo(() => {
    const start = (customersPage - 1) * customersPageSize;
    return filteredCustomersData.slice(start, start + customersPageSize);
  }, [filteredCustomersData, customersPage, customersPageSize]);

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
        brand_id: itemForm.brand_id && itemForm.brand_id !== 'none' ? itemForm.brand_id : null,
        unit_id: itemForm.unit_id && itemForm.unit_id !== 'none' ? itemForm.unit_id : null,
        barcode: itemForm.barcode || null,
        color: itemForm.color || null,
        size: itemForm.size || null,
        weight: itemForm.weight ? parseFloat(itemForm.weight) : null,
        dimensions: itemForm.dimensions || null,
        warranty_period: itemForm.warranty_period || null,
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

  // Brand management handlers
  const handleSaveBrand = async () => {
    if (!brandForm.name) return;
    setSaving(true);
    if (editingBrand) {
      await inventoryExt.updateBrand(editingBrand.id, brandForm);
    } else {
      await inventoryExt.createBrand(brandForm);
    }
    setShowBrandDialog(false);
    setEditingBrand(null);
    setBrandForm({ name: '', description: '' });
    setSaving(false);
  };

  const handleEditBrand = (brand: any) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, description: brand.description || '' });
    setShowBrandDialog(true);
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('Delete this brand?')) return;
    await inventoryExt.deleteBrand(id);
  };

  // Unit management handlers
  const handleSaveUnit = async () => {
    if (!unitForm.name || !unitForm.short_name) return;
    setSaving(true);
    if (editingUnit) {
      await inventoryExt.updateUnit(editingUnit.id, unitForm);
    } else {
      await inventoryExt.createUnit(unitForm);
    }
    setShowUnitDialog(false);
    setEditingUnit(null);
    setUnitForm({ name: '', short_name: '', unit_type: 'quantity' });
    setSaving(false);
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setUnitForm({ name: unit.name, short_name: unit.short_name, unit_type: unit.unit_type });
    setShowUnitDialog(true);
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    await inventoryExt.deleteUnit(id);
  };

  // Invoice settings handler
  const handleSaveInvoiceSettings = async () => {
    setSaving(true);
    await inventoryExt.updateTenantInvoiceSettings(invoiceSettingsForm);
    setShowInvoiceSettings(false);
    setSaving(false);
  };

  // Load invoice settings
  useEffect(() => {
    if (inventoryExt.tenantInfo) {
      setInvoiceSettingsForm({
        invoice_header: inventoryExt.tenantInfo.invoice_header || '',
        invoice_footer: inventoryExt.tenantInfo.invoice_footer || '',
        invoice_terms: inventoryExt.tenantInfo.invoice_terms || '',
        invoice_prefix: inventoryExt.tenantInfo.invoice_prefix || 'INV',
        thermal_printer_enabled: inventoryExt.tenantInfo.thermal_printer_enabled || false,
      });
    }
  }, [inventoryExt.tenantInfo]);

  const resetItemForm = () => {
    setItemForm({
      name: '', sku: '', category_id: '', brand_id: '', unit_id: '', barcode: '',
      color: '', size: '', weight: '', dimensions: '', warranty_period: '',
      quantity: '0', min_quantity: '5', unit_price: '0', sale_price: '0', location: '',
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || '',
      category_id: item.category_id || '',
      brand_id: item.brand_id || '',
      unit_id: item.unit_id || '',
      barcode: item.barcode || '',
      color: item.color || '',
      size: item.size || '',
      weight: item.weight?.toString() || '',
      dimensions: item.dimensions || '',
      warranty_period: item.warranty_period || '',
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
      const data = {
        tenant_id: tenantId,
        name: categoryForm.name,
        description: categoryForm.description || null,
      };

      if (editingCategory) {
        await supabase.from('inventory_categories').update(data).eq('id', editingCategory.id);
        toast.success('Category updated');
      } else {
        await supabase.from('inventory_categories').insert(data);
        toast.success('Category added');
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = (category: { id: string; name: string; description?: string | null }) => {
    setEditingCategory({ id: category.id, name: category.name, description: category.description || undefined });
    setCategoryForm({ name: category.name, description: category.description || '' });
    setShowCategoryDialog(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const itemsWithCategory = items.filter(i => i.category_id === categoryId);
    if (itemsWithCategory.length > 0) {
      toast.error(`Cannot delete category - ${itemsWithCategory.length} products are using it`);
      return;
    }
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await supabase.from('inventory_categories').delete().eq('id', categoryId);
      toast.success('Category deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    const supplierPurchases = purchases.filter(p => p.supplier_id === supplierId);
    if (supplierPurchases.length > 0) {
      toast.error(`Cannot delete supplier - ${supplierPurchases.length} purchase orders are linked`);
      return;
    }
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await supabase.from('suppliers').delete().eq('id', supplierId);
      toast.success('Supplier deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
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

  // Update POS Customer
  const handleUpdateCustomer = async () => {
    if (!selectedProfileCustomer || !editCustomerForm.name) return;
    setSaving(true);
    const result = await pos.updateCustomer(selectedProfileCustomer.id, editCustomerForm);
    if (result) {
      setShowEditCustomer(false);
      loadCustomerProfile(selectedProfileCustomer.id);
    }
    setSaving(false);
  };

  // Adjust customer balance
  const handleBalanceAdjust = async () => {
    if (!selectedProfileCustomer || !balanceAdjustAmount) return;
    setSaving(true);
    try {
      const amount = parseFloat(balanceAdjustAmount) || 0;
      if (amount <= 0) {
        toast.error('Invalid amount');
        setSaving(false);
        return;
      }

      const currentDue = selectedProfileCustomer.due_amount || 0;
      let newDue: number;
      
      if (balanceAdjustType === 'add') {
        newDue = currentDue + amount;
      } else {
        newDue = Math.max(0, currentDue - amount);
        // If deducting, create a payment record
        await supabase.from('pos_customer_payments').insert({
          tenant_id: tenantId,
          customer_id: selectedProfileCustomer.id,
          amount: amount,
          payment_method: 'adjustment',
          notes: balanceAdjustNotes || `Balance adjustment - ${balanceAdjustType}`,
        });
      }

      await supabase.from('pos_customers').update({
        due_amount: newDue,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedProfileCustomer.id);

      toast.success(`Balance ${balanceAdjustType === 'add' ? 'added' : 'deducted'} successfully`);
      setShowBalanceAdjust(false);
      setBalanceAdjustAmount('0');
      setBalanceAdjustNotes('');
      loadCustomerProfile(selectedProfileCustomer.id);
      pos.refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust balance');
    } finally {
      setSaving(false);
    }
  };

  // Load customer profile
  const loadCustomerProfile = async (customerId: string) => {
    const customer = pos.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    setSelectedProfileCustomer(customer);
    setEditCustomerForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      company_name: customer.company_name || '',
      notes: customer.notes || '',
    });
    
    // Fetch customer sales
    const { data: sales } = await supabase
      .from('pos_sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('sale_date', { ascending: false })
      .limit(50);
    setCustomerSales(sales || []);
    
    // Fetch customer payments
    const { data: payments } = await supabase
      .from('pos_customer_payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('payment_date', { ascending: false })
      .limit(50);
    setCustomerPaymentsHistory(payments || []);
    
    setShowCustomerProfile(true);
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

  // Supplier payment
  const handleOpenSupplierPayment = (supplierId?: string) => {
    if (supplierId) {
      const supplierPOs = purchases.filter(p => p.supplier_id === supplierId && p.total > (p.paid_amount || 0));
      setSelectedSupplierPurchases(supplierPOs);
      setSupplierPaymentForm(prev => ({ ...prev, supplierId }));
    } else {
      setSelectedSupplierPurchases([]);
    }
    setShowSupplierPayment(true);
  };

  const handleSupplierPayment = async () => {
    if (!tenantId || !supplierPaymentForm.supplierId || !supplierPaymentForm.amount) return;
    setSaving(true);
    try {
      const amount = parseFloat(supplierPaymentForm.amount) || 0;
      
      // Create payment record
      await supabase.from('supplier_payments').insert({
        tenant_id: tenantId,
        supplier_id: supplierPaymentForm.supplierId,
        purchase_order_id: supplierPaymentForm.purchaseOrderId || null,
        amount,
        payment_method: supplierPaymentForm.method,
        reference: supplierPaymentForm.reference || null,
        notes: supplierPaymentForm.notes || null,
      });

      // Update purchase order if selected
      if (supplierPaymentForm.purchaseOrderId) {
        const po = purchases.find(p => p.id === supplierPaymentForm.purchaseOrderId);
        if (po) {
          const newPaid = (po.paid_amount || 0) + amount;
          await supabase.from('purchase_orders').update({
            paid_amount: newPaid,
            status: newPaid >= po.total ? 'paid' : po.status,
          }).eq('id', supplierPaymentForm.purchaseOrderId);
        }
      }

      // Update supplier balance
      const supplier = suppliers.find(s => s.id === supplierPaymentForm.supplierId);
      if (supplier) {
        await supabase.from('suppliers').update({
          current_balance: Math.max(0, (supplier.current_balance || 0) - amount),
        }).eq('id', supplierPaymentForm.supplierId);
      }

      toast.success('Payment recorded');
      setShowSupplierPayment(false);
      setSupplierPaymentForm({ supplierId: '', purchaseOrderId: '', amount: '0', method: 'cash', reference: '', notes: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
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

      // Update supplier balance
      const dueAmount = total - paidAmount;
      if (dueAmount > 0) {
        const supplier = suppliers.find(s => s.id === purchaseForm.supplierId);
        if (supplier) {
          await supabase.from('suppliers').update({
            current_balance: (supplier.current_balance || 0) + dueAmount,
          }).eq('id', purchaseForm.supplierId);
        }
      }

      // Record initial payment if any
      if (paidAmount > 0) {
        await supabase.from('supplier_payments').insert({
          tenant_id: tenantId,
          supplier_id: purchaseForm.supplierId,
          purchase_order_id: po.id,
          amount: paidAmount,
          payment_method: 'cash',
          notes: 'Initial payment with purchase order',
        });
      }

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

  // Report calculations with date filtering
  const getReportData = useCallback(() => {
    const startDate = new Date(reportDateFrom);
    const endDate = new Date(reportDateTo);
    endDate.setHours(23, 59, 59, 999);
    
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

    const monthSupplierPayments = supplierPayments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    return {
      totalSales: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
      totalPaid: monthSales.reduce((sum, s) => sum + s.paid_amount, 0),
      totalDue: monthSales.reduce((sum, s) => sum + s.due_amount, 0),
      salesCount: monthSales.length,
      purchaseTotal: monthPurchases.reduce((sum, p) => sum + p.total, 0),
      purchaseCount: monthPurchases.length,
      purchasePaid: monthPurchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
      collectionTotal: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      collectionCount: monthPayments.length,
      supplierPaymentTotal: monthSupplierPayments.reduce((sum, p) => sum + p.amount, 0),
      supplierPaymentCount: monthSupplierPayments.length,
      profit: monthSales.reduce((sum, s) => sum + s.total_amount, 0) - monthPurchases.reduce((sum, p) => sum + p.total, 0),
      sales: monthSales,
      purchases: monthPurchases,
      payments: monthPayments,
      supplierPayments: monthSupplierPayments,
    };
  }, [pos.sales, pos.payments, purchases, supplierPayments, reportDateFrom, reportDateTo]);

  const exportReportCSV = () => {
    const report = getReportData();
    let csvContent = `Inventory Report (${reportDateFrom} to ${reportDateTo})\n\n`;
    
    csvContent += `SUMMARY\n`;
    csvContent += `Total Sales,${report.salesCount},৳${report.totalSales}\n`;
    csvContent += `Total Paid,${report.salesCount},৳${report.totalPaid}\n`;
    csvContent += `Total Due,,৳${report.totalDue}\n`;
    csvContent += `Total Purchases,${report.purchaseCount},৳${report.purchaseTotal}\n`;
    csvContent += `Collections,${report.collectionCount},৳${report.collectionTotal}\n`;
    csvContent += `Supplier Payments,${report.supplierPaymentCount},৳${report.supplierPaymentTotal}\n`;
    csvContent += `Gross Profit,,৳${report.profit}\n\n`;
    
    csvContent += `\nSALES DETAILS\n`;
    csvContent += `Invoice,Date,Customer,Total,Paid,Due\n`;
    report.sales.forEach(s => {
      csvContent += `${s.invoice_number},${format(new Date(s.sale_date), 'yyyy-MM-dd')},${s.customer_name || 'Walk-in'},${s.total_amount},${s.paid_amount},${s.due_amount}\n`;
    });

    csvContent += `\nPURCHASE DETAILS\n`;
    csvContent += `Order,Date,Supplier,Total,Paid,Due\n`;
    report.purchases.forEach(p => {
      csvContent += `${p.order_number},${format(new Date(p.order_date), 'yyyy-MM-dd')},${(p.supplier as any)?.name || '-'},${p.total},${p.paid_amount || 0},${p.total - (p.paid_amount || 0)}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${reportDateFrom}-to-${reportDateTo}.csv`;
    a.click();
  };

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const reportData = getReportData();
  const suppliersWithDue = suppliers.filter(s => (s.current_balance || 0) > 0);
  const totalSupplierDue = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0);

  return (
    <DashboardLayout title="Inventory Management" subtitle="Manage products, stock, sales, purchases, and customers">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
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
                <p className="text-sm text-muted-foreground">Customer Due</p>
                <p className="text-2xl font-bold text-orange-600">৳{pos.stats.totalDue.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Supplier Due</p>
                <p className="text-2xl font-bold text-red-600">৳{totalSupplierDue.toLocaleString()}</p>
              </div>
              <Building2 className="h-8 w-8 text-red-500" />
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
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">Units</span>
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
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
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
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowBarcodeScanner(true)}>
                        <ScanLine className="h-4 w-4 mr-1" />
                        Scan
                      </Button>
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
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
                      onClick={() => setShowCheckout(true)}
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
                <CardTitle>Products</CardTitle>
                <CardDescription>Manage your inventory items ({filteredProductsData.length} total)</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); resetItemForm(); setShowItemDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or SKU..." 
                    value={productsSearch}
                    onChange={(e) => { setProductsSearch(e.target.value); setProductsPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={productsCategory} onValueChange={(v) => { setProductsCategory(v); setProductsPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : paginatedProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                  ) : (
                    paginatedProducts.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                        <TableCell>{item.category?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={item.quantity <= item.min_quantity ? 'destructive' : 'secondary'}>
                            {item.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>৳{item.unit_price}</TableCell>
                        <TableCell>৳{item.sale_price}</TableCell>
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
              <TablePagination
                totalItems={filteredProductsData.length}
                currentPage={productsPage}
                pageSize={productsPageSize}
                onPageChange={setProductsPage}
                onPageSizeChange={setProductsPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Organize your products into categories ({filteredCategoriesData.length} total)</CardDescription>
              </div>
              <Button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setShowCategoryDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search categories..." 
                  value={categoriesSearch}
                  onChange={(e) => { setCategoriesSearch(e.target.value); setCategoriesPage(1); }}
                  className="pl-9"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No categories found</TableCell></TableRow>
                  ) : (
                    paginatedCategories.map(category => {
                      const productCount = items.filter(i => i.category_id === category.id).length;
                      return (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{productCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={filteredCategoriesData.length}
                currentPage={categoriesPage}
                pageSize={categoriesPageSize}
                onPageChange={setCategoriesPage}
                onPageSizeChange={setCategoriesPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Brands</CardTitle>
                <CardDescription>Manage product brands ({inventoryExt.brands.length} total)</CardDescription>
              </div>
              <Button onClick={() => { setEditingBrand(null); setBrandForm({ name: '', description: '' }); setShowBrandDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryExt.brands.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No brands found</TableCell></TableRow>
                  ) : inventoryExt.brands.map(brand => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>{brand.description || '-'}</TableCell>
                      <TableCell><Badge variant={brand.is_active ? 'default' : 'secondary'}>{brand.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditBrand(brand)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBrand(brand.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Units</CardTitle>
                <CardDescription>Manage measurement units ({inventoryExt.units.length} total)</CardDescription>
              </div>
              <Button onClick={() => { setEditingUnit(null); setUnitForm({ name: '', short_name: '', unit_type: 'quantity' }); setShowUnitDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryExt.units.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No units found</TableCell></TableRow>
                  ) : inventoryExt.units.map(unit => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.short_name}</TableCell>
                      <TableCell><Badge variant="outline">{unit.unit_type}</Badge></TableCell>
                      <TableCell><Badge variant={unit.is_active ? 'default' : 'secondary'}>{unit.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUnit(unit)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(unit.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Manage your product suppliers ({filteredSuppliersData.length} total)</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenSupplierPayment()}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay Supplier
                </Button>
                <Button onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', company_name: '', phone: '', email: '', address: '' }); setShowSupplierDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, company, or phone..." 
                  value={suppliersSearch}
                  onChange={(e) => { setSuppliersSearch(e.target.value); setSuppliersPage(1); }}
                  className="pl-9"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Due Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSuppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell></TableRow>
                  ) : (
                    paginatedSuppliers.map(supplier => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.company_name || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>
                          {(supplier.current_balance || 0) > 0 ? (
                            <span className="text-red-600 font-medium">৳{(supplier.current_balance || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-green-600">No Due</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(supplier.current_balance || 0) > 0 && (
                            <Button variant="outline" size="sm" className="mr-1" onClick={() => handleOpenSupplierPayment(supplier.id)}>
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSupplier(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={filteredSuppliersData.length}
                currentPage={suppliersPage}
                pageSize={suppliersPageSize}
                onPageChange={setSuppliersPage}
                onPageSizeChange={setSuppliersPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Tab */}
        <TabsContent value="purchase">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Track product purchases from suppliers ({filteredPurchasesData.length} total)</CardDescription>
              </div>
              <Button onClick={() => setShowPurchaseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by order # or supplier..." 
                    value={purchasesSearch}
                    onChange={(e) => { setPurchasesSearch(e.target.value); setPurchasesPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={purchasesStatus} onValueChange={(v) => { setPurchasesStatus(v); setPurchasesPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  {paginatedPurchases.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
                  ) : (
                    paginatedPurchases.map(po => {
                      const due = po.total - (po.paid_amount || 0);
                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono">{po.order_number}</TableCell>
                          <TableCell>{(po.supplier as any)?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(po.order_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>৳{po.total.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">৳{(po.paid_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className={due > 0 ? 'text-red-600 font-medium' : ''}>
                            ৳{due.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={po.status === 'received' ? 'default' : po.status === 'paid' ? 'default' : 'secondary'}>
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {due > 0 && (
                              <Button variant="outline" size="sm" onClick={() => {
                                setSupplierPaymentForm({
                                  supplierId: po.supplier_id || '',
                                  purchaseOrderId: po.id,
                                  amount: due.toString(),
                                  method: 'cash',
                                  reference: '',
                                  notes: '',
                                });
                                setShowSupplierPayment(true);
                              }}>
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}
                            {po.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleReceivePurchase(po.id)}>
                                <Check className="h-4 w-4 mr-1" />
                                Receive
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={filteredPurchasesData.length}
                currentPage={purchasesPage}
                pageSize={purchasesPageSize}
                onPageChange={setPurchasesPage}
                onPageSizeChange={setPurchasesPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>View all POS sales and invoices ({filteredSalesData.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by invoice # or customer..." 
                  value={salesSearch}
                  onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
                  className="pl-9"
                />
              </div>

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
                  ) : paginatedSales.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sales found</TableCell></TableRow>
                  ) : (
                    paginatedSales.map(sale => (
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
              <TablePagination
                totalItems={filteredSalesData.length}
                currentPage={salesPage}
                pageSize={salesPageSize}
                onPageChange={setSalesPage}
                onPageSizeChange={setSalesPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>POS Customers</CardTitle>
                <CardDescription>Manage walk-in and regular customers ({filteredCustomersData.length} total)</CardDescription>
              </div>
              <Button onClick={() => setShowNewCustomer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, phone, or code..." 
                  value={customersSearch}
                  onChange={(e) => { setCustomersSearch(e.target.value); setCustomersPage(1); }}
                  className="pl-9"
                />
              </div>

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
                  {paginatedCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                  ) : (
                    paginatedCustomers.map(customer => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-mono">{customer.customer_code}</TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.company_name || '-'}</TableCell>
                        <TableCell>৳{customer.total_purchase.toLocaleString()}</TableCell>
                        <TableCell className={customer.due_amount > 0 ? 'text-orange-600 font-medium' : ''}>
                          ৳{customer.due_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => loadCustomerProfile(customer.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={filteredCustomersData.length}
                currentPage={customersPage}
                pageSize={customersPageSize}
                onPageChange={setCustomersPage}
                onPageSizeChange={setCustomersPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues">
          <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Dues */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Customer Dues</CardTitle>
                    <CardDescription>Outstanding payments from customers</CardDescription>
                  </div>
                  <Button onClick={() => setShowDuePayment(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Collect
                  </Button>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Supplier Dues */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Supplier Dues</CardTitle>
                    <CardDescription>Outstanding payments to suppliers</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenSupplierPayment()}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pay
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {suppliersWithDue.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No pending supplier dues</p>
                    ) : (
                      <div className="space-y-3">
                        {suppliersWithDue.map(supplier => (
                          <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              <p className="text-sm text-muted-foreground">{supplier.company_name || supplier.phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">৳{(supplier.current_balance || 0).toLocaleString()}</p>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0"
                                onClick={() => handleOpenSupplierPayment(supplier.id)}
                              >
                                Pay
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Customer Payments</h4>
                    <ScrollArea className="h-[300px]">
                      {pos.payments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No payments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {pos.payments.slice(0, 20).map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-2 border rounded text-sm">
                              <div>
                                <p className="font-medium">{payment.customer?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payment.payment_date), 'dd MMM yyyy')} - {payment.payment_method}
                                </p>
                              </div>
                              <span className="font-bold text-green-600">৳{payment.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Supplier Payments</h4>
                    <ScrollArea className="h-[300px]">
                      {supplierPayments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No supplier payments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {supplierPayments.slice(0, 20).map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-2 border rounded text-sm">
                              <div>
                                <p className="font-medium">{payment.supplier?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payment.payment_date), 'dd MMM yyyy')} - {payment.payment_method}
                                </p>
                              </div>
                              <span className="font-bold text-blue-600">৳{payment.amount.toLocaleString()}</span>
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
          <div className="space-y-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input 
                      type="date" 
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input 
                      type="date" 
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quick Filter</Label>
                    <Select 
                      value="" 
                      onValueChange={(v) => {
                        const now = new Date();
                        if (v === 'today') {
                          setReportDateFrom(format(now, 'yyyy-MM-dd'));
                          setReportDateTo(format(now, 'yyyy-MM-dd'));
                        } else if (v === 'thisMonth') {
                          setReportDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
                          setReportDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
                        } else if (v === 'lastMonth') {
                          const lastMonth = subMonths(now, 1);
                          setReportDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                          setReportDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="lastMonth">Last Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button onClick={exportReportCSV} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">৳{reportData.totalSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{reportData.salesCount} invoices</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="text-2xl font-bold text-blue-600">৳{reportData.purchaseTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{reportData.purchaseCount} orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Collections</p>
                  <p className="text-2xl font-bold text-emerald-600">৳{reportData.collectionTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{reportData.collectionCount} payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Gross Profit</p>
                  <p className={`text-2xl font-bold ${reportData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ৳{reportData.profit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Sales - Purchases</p>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert ({lowStockItems.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {lowStockItems.slice(0, 10).map(item => (
                      <Badge key={item.id} variant="destructive">
                        {item.name}: {item.quantity} left
                      </Badge>
                    ))}
                    {lowStockItems.length > 10 && (
                      <Badge variant="outline">+{lowStockItems.length - 10} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Tables */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales in Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.sales.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No sales</TableCell></TableRow>
                        ) : (
                          reportData.sales.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                              <TableCell className="text-xs">{format(new Date(s.sale_date), 'dd MMM')}</TableCell>
                              <TableCell className="font-medium">৳{s.total_amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Purchases in Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.purchases.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No purchases</TableCell></TableRow>
                        ) : (
                          reportData.purchases.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.order_number}</TableCell>
                              <TableCell className="text-xs">{(p.supplier as any)?.name || '-'}</TableCell>
                              <TableCell className="font-medium">৳{p.total.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>Configure your invoice appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invoice Header</Label>
                  <Textarea 
                    value={invoiceSettingsForm.invoice_header} 
                    onChange={(e) => setInvoiceSettingsForm(p => ({ ...p, invoice_header: e.target.value }))} 
                    placeholder="Company name, address, contact info..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Footer</Label>
                  <Textarea 
                    value={invoiceSettingsForm.invoice_footer} 
                    onChange={(e) => setInvoiceSettingsForm(p => ({ ...p, invoice_footer: e.target.value }))} 
                    placeholder="Thank you message, return policy..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea 
                    value={invoiceSettingsForm.invoice_terms} 
                    onChange={(e) => setInvoiceSettingsForm(p => ({ ...p, invoice_terms: e.target.value }))} 
                    placeholder="Terms of sale..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Prefix</Label>
                    <Input 
                      value={invoiceSettingsForm.invoice_prefix} 
                      onChange={(e) => setInvoiceSettingsForm(p => ({ ...p, invoice_prefix: e.target.value }))} 
                      placeholder="INV"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <Label>Enable Thermal Print</Label>
                    <Switch 
                      checked={invoiceSettingsForm.thermal_printer_enabled} 
                      onCheckedChange={(c) => setInvoiceSettingsForm(p => ({ ...p, thermal_printer_enabled: c }))} 
                    />
                  </div>
                </div>
                <Button onClick={handleSaveInvoiceSettings} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Invoice Settings
                </Button>
              </CardContent>
            </Card>

            {/* Report Options */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Reports</CardTitle>
                <CardDescription>Generate PDF reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => printReport(generateDuesReport(pos.customers.filter(c => c.due_amount > 0).map(c => ({
                    code: c.customer_code || c.id.slice(0, 8),
                    name: c.name,
                    phone: c.phone || '',
                    due: c.due_amount
                  }))))}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Customer Dues Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => printReport(generateCustomerListReport(pos.customers.map(c => ({
                    code: c.customer_code || c.id.slice(0, 8),
                    name: c.name,
                    phone: c.phone || '',
                    company: c.company_name || '',
                    total: c.total_purchase,
                    due: c.due_amount
                  }))))}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Customer List Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => printReport(generateSalesReport(pos.sales.map(s => ({
                    invoice: s.invoice_number,
                    date: format(new Date(s.sale_date), 'dd/MM/yyyy'),
                    customer: s.customer_name || 'Walk-in',
                    total: s.total_amount,
                    paid: s.paid_amount,
                    due: s.due_amount
                  })), { from: reportDateFrom, to: reportDateTo }))}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Sales Report ({reportDateFrom} to {reportDateTo})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => printReport(generateInventoryReport(items.map(i => ({
                    sku: i.sku || '',
                    name: i.name,
                    category: i.category?.name || '',
                    qty: i.quantity || 0,
                    price: i.sale_price || i.unit_price || 0,
                    value: (i.quantity || 0) * (i.unit_price || 0)
                  }))))}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Inventory Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => printReport(generateSupplierDuesReport(suppliers.filter(s => (s.current_balance || 0) > 0).map(s => ({
                    name: s.name,
                    company: s.company_name || '',
                    phone: s.phone || '',
                    due: s.current_balance || 0
                  }))))}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Supplier Dues Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Profile Sheet */}
      <Sheet open={showCustomerProfile} onOpenChange={setShowCustomerProfile}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Profile
            </SheetTitle>
            <SheetDescription>
              {selectedProfileCustomer?.customer_code}
            </SheetDescription>
          </SheetHeader>
          
          {selectedProfileCustomer && (
            <div className="space-y-6 mt-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{selectedProfileCustomer.name}</h3>
                    <p className="text-muted-foreground">{selectedProfileCustomer.phone || 'No phone'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowEditCustomer(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Purchase</p>
                    <p className="text-xl font-bold">৳{selectedProfileCustomer.total_purchase.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Amount</p>
                    <p className={`text-xl font-bold ${selectedProfileCustomer.due_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ৳{selectedProfileCustomer.due_amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Balance Adjustment */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => { setBalanceAdjustType('add'); setShowBalanceAdjust(true); }}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Due
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => { setBalanceAdjustType('deduct'); setShowBalanceAdjust(true); }}
                  >
                    <MinusCircle className="h-4 w-4 mr-1" />
                    Deduct Due
                  </Button>
                  {selectedProfileCustomer.due_amount > 0 && (
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        setDuePaymentForm({
                          customerId: selectedProfileCustomer.id,
                          amount: selectedProfileCustomer.due_amount.toString(),
                          method: 'cash',
                          reference: '',
                          notes: '',
                        });
                        setShowDuePayment(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Collect
                    </Button>
                  )}
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h4 className="font-semibold mb-3">Purchase History</h4>
                <ScrollArea className="h-[200px]">
                  {customerSales.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No purchases yet</p>
                  ) : (
                    <div className="space-y-2">
                      {customerSales.map(sale => (
                        <div key={sale.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <p className="font-mono text-xs">{sale.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(sale.sale_date), 'dd MMM yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">৳{sale.total_amount}</p>
                            <Badge variant={sale.due_amount > 0 ? 'destructive' : 'default'} className="text-xs">
                              {sale.due_amount > 0 ? `Due: ৳${sale.due_amount}` : 'Paid'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-3">Payment History</h4>
                <ScrollArea className="h-[200px]">
                  {customerPaymentsHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No payments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {customerPaymentsHistory.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <p className="text-xs">{format(new Date(payment.payment_date), 'dd MMM yyyy HH:mm')}</p>
                            <p className="text-xs text-muted-foreground">{payment.payment_method}</p>
                          </div>
                          <span className="font-bold text-green-600">৳{payment.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Additional Info */}
              <div className="space-y-2 text-sm">
                {selectedProfileCustomer.email && (
                  <p><span className="text-muted-foreground">Email:</span> {selectedProfileCustomer.email}</p>
                )}
                {selectedProfileCustomer.address && (
                  <p><span className="text-muted-foreground">Address:</span> {selectedProfileCustomer.address}</p>
                )}
                {selectedProfileCustomer.company_name && (
                  <p><span className="text-muted-foreground">Company:</span> {selectedProfileCustomer.company_name}</p>
                )}
                {selectedProfileCustomer.notes && (
                  <p><span className="text-muted-foreground">Notes:</span> {selectedProfileCustomer.notes}</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={editCustomerForm.name} onChange={(e) => setEditCustomerForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editCustomerForm.phone} onChange={(e) => setEditCustomerForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editCustomerForm.email} onChange={(e) => setEditCustomerForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={editCustomerForm.company_name} onChange={(e) => setEditCustomerForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={editCustomerForm.address} onChange={(e) => setEditCustomerForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editCustomerForm.notes} onChange={(e) => setEditCustomerForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCustomer(false)}>Cancel</Button>
            <Button onClick={handleUpdateCustomer} disabled={saving || !editCustomerForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={showBalanceAdjust} onOpenChange={setShowBalanceAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {balanceAdjustType === 'add' ? 'Add Due Balance' : 'Deduct Due Balance'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Due: ৳{selectedProfileCustomer?.due_amount.toLocaleString()}</Label>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input 
                type="number" 
                value={balanceAdjustAmount} 
                onChange={(e) => setBalanceAdjustAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={balanceAdjustNotes} 
                onChange={(e) => setBalanceAdjustNotes(e.target.value)}
                placeholder="Reason for adjustment..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceAdjust(false)}>Cancel</Button>
            <Button onClick={handleBalanceAdjust} disabled={saving || !balanceAdjustAmount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {balanceAdjustType === 'add' ? 'Add Balance' : 'Deduct Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Payment Dialog */}
      <Dialog open={showSupplierPayment} onOpenChange={setShowSupplierPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select 
                value={supplierPaymentForm.supplierId} 
                onValueChange={(v) => {
                  const supplierPOs = purchases.filter(p => p.supplier_id === v && p.total > (p.paid_amount || 0));
                  setSelectedSupplierPurchases(supplierPOs);
                  setSupplierPaymentForm(prev => ({ ...prev, supplierId: v, purchaseOrderId: '' }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {(s.current_balance || 0) > 0 && `- Due: ৳${s.current_balance}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSupplierPurchases.length > 0 && (
              <div className="space-y-2">
                <Label>Purchase Order (Optional)</Label>
                <Select 
                  value={supplierPaymentForm.purchaseOrderId} 
                  onValueChange={(v) => {
                    const po = purchases.find(p => p.id === v);
                    if (po) {
                      const due = po.total - (po.paid_amount || 0);
                      setSupplierPaymentForm(prev => ({ ...prev, purchaseOrderId: v, amount: due.toString() }));
                    } else {
                      setSupplierPaymentForm(prev => ({ ...prev, purchaseOrderId: '' }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select order to pay" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General Payment</SelectItem>
                    {selectedSupplierPurchases.map(po => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.order_number} - Due: ৳{(po.total - (po.paid_amount || 0)).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input 
                  type="number" 
                  value={supplierPaymentForm.amount} 
                  onChange={(e) => setSupplierPaymentForm(p => ({ ...p, amount: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={supplierPaymentForm.method} onValueChange={(v) => setSupplierPaymentForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference / Transaction ID</Label>
              <Input value={supplierPaymentForm.reference} onChange={(e) => setSupplierPaymentForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={supplierPaymentForm.notes} onChange={(e) => setSupplierPaymentForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierPayment(false)}>Cancel</Button>
            <Button onClick={handleSupplierPayment} disabled={saving || !supplierPaymentForm.supplierId || !supplierPaymentForm.amount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as 'pos' | 'isp')}>
            <TabsList className="w-full">
              <TabsTrigger value="pos" className="flex-1">POS Customers</TabsTrigger>
              <TabsTrigger value="isp" className="flex-1">ISP Customers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pos">
              <ScrollArea className="h-[300px]">
                {pos.customers.filter(c =>
                  c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                  c.phone?.includes(customerSearchQuery)
                ).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No customers found</p>
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
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input value={itemForm.barcode} onChange={(e) => setItemForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Scan or enter barcode" />
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={itemForm.brand_id} onValueChange={(v) => setItemForm(p => ({ ...p, brand_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {inventoryExt.brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={itemForm.unit_id} onValueChange={(v) => setItemForm(p => ({ ...p, unit_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {inventoryExt.units.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={itemForm.color} onChange={(e) => setItemForm(p => ({ ...p, color: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Input value={itemForm.size} onChange={(e) => setItemForm(p => ({ ...p, size: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Input type="number" value={itemForm.weight} onChange={(e) => setItemForm(p => ({ ...p, weight: e.target.value }))} placeholder="kg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dimensions</Label>
                  <Input value={itemForm.dimensions} onChange={(e) => setItemForm(p => ({ ...p, dimensions: e.target.value }))} placeholder="L x W x H" />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Period</Label>
                  <Input value={itemForm.warranty_period} onChange={(e) => setItemForm(p => ({ ...p, warranty_period: e.target.value }))} placeholder="e.g., 1 year" />
                </div>
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
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={saving || !itemForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => { setShowCategoryDialog(open); if (!open) setEditingCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
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
              {editingCategory ? 'Save Changes' : 'Add Category'}
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

      {/* New Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
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
                <Input type="number" value={purchaseForm.paidAmount} onChange={(e) => setPurchaseForm(p => ({ ...p, paidAmount: e.target.value }))} />
              </div>
            </div>
            
            {/* Item selection */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                <Select onValueChange={(itemId) => {
                  const item = items.find(i => i.id === itemId);
                  if (item && !purchaseForm.items.find(i => i.itemId === itemId)) {
                    setPurchaseForm(p => ({
                      ...p,
                      items: [...p.items, { itemId, quantity: 1, price: item.unit_price }]
                    }));
                  }
                }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Add item" /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {purchaseForm.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No items added</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseForm.items.map((item, idx) => {
                      const itemData = items.find(i => i.id === item.itemId);
                      return (
                        <TableRow key={item.itemId}>
                          <TableCell>{itemData?.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...purchaseForm.items];
                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                setPurchaseForm(p => ({ ...p, items: newItems }));
                              }}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...purchaseForm.items];
                                newItems[idx].price = parseFloat(e.target.value) || 0;
                                setPurchaseForm(p => ({ ...p, items: newItems }));
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>৳{(item.quantity * item.price).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setPurchaseForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              
              <div className="flex justify-end mt-4 font-bold">
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
            <DialogTitle className="flex items-center justify-between">
              Invoice
              <div className="flex gap-2">
                <Select value={invoiceType} onValueChange={(v: 'thermal' | 'a4') => setInvoiceType(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4 Print</SelectItem>
                    <SelectItem value="thermal">Thermal</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => {
                  if (selectedSale && saleItems.length > 0) {
                    printInvoice(
                      {
                        invoice_number: selectedSale.invoice_number,
                        sale_date: selectedSale.sale_date,
                        customer_name: selectedSale.customer_name || 'Walk-in',
                        customer_phone: selectedSale.customer_phone,
                        subtotal: selectedSale.subtotal,
                        discount: selectedSale.discount,
                        tax: selectedSale.tax,
                        total_amount: selectedSale.total_amount,
                        paid_amount: selectedSale.paid_amount,
                        due_amount: selectedSale.due_amount,
                        status: selectedSale.status,
                        payment_method: selectedSale.payment_method,
                      },
                      saleItems.map(item => ({
                        id: item.id,
                        item_name: item.item_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                      })),
                      inventoryExt.tenantInfo,
                      invoiceType
                    );
                  }
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div id="invoice-content" className="space-y-4">
            {inventoryExt.tenantInfo?.company_name && (
              <div className="invoice-header text-center">
                <h2 className="text-xl font-bold">{inventoryExt.tenantInfo.company_name}</h2>
                {inventoryExt.tenantInfo.address && <p className="text-xs text-muted-foreground">{inventoryExt.tenantInfo.address}</p>}
                {inventoryExt.tenantInfo.phone && <p className="text-xs text-muted-foreground">Phone: {inventoryExt.tenantInfo.phone}</p>}
              </div>
            )}
            <div className="text-center">
              <p className="font-bold">INVOICE</p>
              <p className="text-sm text-muted-foreground">{selectedSale?.invoice_number}</p>
            </div>
            
            <div className="invoice-details grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Customer:</strong> {selectedSale?.customer_name || 'Walk-in'}</p>
                {selectedSale?.customer_phone && <p><strong>Phone:</strong> {selectedSale.customer_phone}</p>}
              </div>
              <div className="text-right">
                <p><strong>Date:</strong> {selectedSale && format(new Date(selectedSale.sale_date), 'dd MMM yyyy HH:mm')}</p>
                <p><strong>Status:</strong> {selectedSale?.status}</p>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>৳{item.unit_price}</TableCell>
                    <TableCell className="text-right">৳{item.total_price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="totals space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>৳{selectedSale?.subtotal.toLocaleString()}</span>
              </div>
              {selectedSale?.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-৳{selectedSale.discount.toLocaleString()}</span>
                </div>
              )}
              {selectedSale?.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>+৳{selectedSale.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>৳{selectedSale?.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="text-green-600">৳{selectedSale?.paid_amount.toLocaleString()}</span>
              </div>
              {selectedSale?.due_amount > 0 && (
                <div className="flex justify-between font-medium">
                  <span>Due:</span>
                  <span className="text-orange-600">৳{selectedSale.due_amount.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <div className="footer text-center text-xs text-muted-foreground pt-4 border-t">
              <p>{inventoryExt.tenantInfo?.invoice_footer || 'Thank you for your business!'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Brand Dialog */}
      <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brand Name *</Label>
              <Input value={brandForm.name} onChange={(e) => setBrandForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={brandForm.description} onChange={(e) => setBrandForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrandDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBrand} disabled={saving || !brandForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBrand ? 'Save Changes' : 'Add Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Name *</Label>
                <Input value={unitForm.name} onChange={(e) => setUnitForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Kilogram" />
              </div>
              <div className="space-y-2">
                <Label>Short Name *</Label>
                <Input value={unitForm.short_name} onChange={(e) => setUnitForm(p => ({ ...p, short_name: e.target.value }))} placeholder="e.g., kg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit Type</Label>
              <Select value={unitForm.unit_type} onValueChange={(v) => setUnitForm(p => ({ ...p, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnitDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveUnit} disabled={saving || !unitForm.name || !unitForm.short_name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUnit ? 'Save Changes' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner 
        open={showBarcodeScanner} 
        onOpenChange={setShowBarcodeScanner} 
        onScan={handleBarcodeScan} 
      />
    </DashboardLayout>
  );
}