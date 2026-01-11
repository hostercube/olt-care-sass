import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ModuleAccessGuard } from '@/components/layout/ModuleAccessGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  ShoppingBag, 
  Users, 
  Building2, 
  Package,
  FolderOpen,
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Search
} from 'lucide-react';
import { useBandwidthManagement, BandwidthCategory, BandwidthItem, BandwidthProvider, BandwidthClient, PurchaseBillItem, SalesInvoiceItem } from '@/hooks/useBandwidthManagement';
import { format } from 'date-fns';

export default function BandwidthManagement() {
  return (
    <ModuleAccessGuard module="isp_bandwidth_management" moduleName="Bandwidth Management">
      <DashboardLayout title="Bandwidth Management">
        <BandwidthManagementContent />
      </DashboardLayout>
    </ModuleAccessGuard>
  );
}

function BandwidthManagementContent() {
  const {
    loading,
    categories,
    items,
    providers,
    clients,
    purchaseBills,
    salesInvoices,
    billCollections,
    providerPayments,
    stats,
    createCategory,
    updateCategory,
    deleteCategory,
    createItem,
    updateItem,
    deleteItem,
    createProvider,
    updateProvider,
    deleteProvider,
    createClient,
    updateClient,
    deleteClient,
    createPurchaseBill,
    deletePurchaseBill,
    createSalesInvoice,
    deleteSalesInvoice,
    createBillCollection,
    deleteBillCollection,
    createProviderPayment,
    deleteProviderPayment,
  } = useBandwidthManagement();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  
  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [providerDialog, setProviderDialog] = useState(false);
  const [clientDialog, setClientDialog] = useState(false);
  const [purchaseBillDialog, setPurchaseBillDialog] = useState(false);
  const [salesInvoiceDialog, setSalesInvoiceDialog] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [providerPaymentDialog, setProviderPaymentDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: '', id: '', name: '' });
  
  // Form states
  const [editingCategory, setEditingCategory] = useState<BandwidthCategory | null>(null);
  const [editingItem, setEditingItem] = useState<BandwidthItem | null>(null);
  const [editingProvider, setEditingProvider] = useState<BandwidthProvider | null>(null);
  const [editingClient, setEditingClient] = useState<BandwidthClient | null>(null);
  
  // Form data
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [itemForm, setItemForm] = useState({ name: '', description: '', category_id: '', unit: 'Mbps', unit_price: 0, is_active: true });
  const [providerForm, setProviderForm] = useState({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' });
  const [clientForm, setClientForm] = useState({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' });
  
  // Purchase Bill form
  const [purchaseBillForm, setPurchaseBillForm] = useState({
    provider_id: '',
    billing_date: format(new Date(), 'yyyy-MM-dd'),
    payment_status: 'due',
    payment_method: '',
    paid_by: '',
    received_by: '',
    remarks: '',
    discount: 0,
    paid_amount: 0,
  });
  const [purchaseBillItems, setPurchaseBillItems] = useState<PurchaseBillItem[]>([{
    item_id: null,
    item_name: '',
    description: '',
    unit: 'Mbps',
    quantity: 1,
    rate: 0,
    vat_percent: 0,
    vat_amount: 0,
    from_date: format(new Date(), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd'),
    total: 0,
  }]);

  // Sales Invoice form
  const [salesInvoiceForm, setSalesInvoiceForm] = useState({
    client_id: '',
    billing_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    remarks: '',
    discount: 0,
  });
  const [salesInvoiceItems, setSalesInvoiceItems] = useState<SalesInvoiceItem[]>([{
    item_id: null,
    item_name: '',
    description: '',
    unit: 'Mbps',
    quantity: 1,
    rate: 0,
    vat_percent: 0,
    vat_amount: 0,
    from_date: format(new Date(), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd'),
    total: 0,
  }]);

  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    client_id: '',
    invoice_id: '',
    collection_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    received_by: '',
    remarks: '',
  });

  // Provider payment form
  const [providerPaymentForm, setProviderPaymentForm] = useState({
    provider_id: '',
    bill_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'bank_transfer',
    paid_by: '',
    remarks: '',
  });

  // Handlers
  const handleSaveCategory = async () => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, categoryForm);
    } else {
      await createCategory(categoryForm);
    }
    setCategoryDialog(false);
    setCategoryForm({ name: '', description: '', is_active: true });
    setEditingCategory(null);
  };

  const handleSaveItem = async () => {
    if (editingItem) {
      await updateItem(editingItem.id, itemForm);
    } else {
      await createItem(itemForm);
    }
    setItemDialog(false);
    setItemForm({ name: '', description: '', category_id: '', unit: 'Mbps', unit_price: 0, is_active: true });
    setEditingItem(null);
  };

  const handleSaveProvider = async () => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, providerForm);
    } else {
      await createProvider(providerForm);
    }
    setProviderDialog(false);
    setProviderForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' });
    setEditingProvider(null);
  };

  const handleSaveClient = async () => {
    if (editingClient) {
      await updateClient(editingClient.id, clientForm);
    } else {
      await createClient(clientForm);
    }
    setClientDialog(false);
    setClientForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' });
    setEditingClient(null);
  };

  const handleSavePurchaseBill = async () => {
    const subtotal = purchaseBillItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = purchaseBillItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalAmount = subtotal + vatAmount - purchaseBillForm.discount;
    const dueAmount = totalAmount - purchaseBillForm.paid_amount;
    
    await createPurchaseBill({
      provider_id: purchaseBillForm.provider_id || null,
      billing_date: purchaseBillForm.billing_date,
      subtotal,
      vat_amount: vatAmount,
      discount: purchaseBillForm.discount,
      total_amount: totalAmount,
      paid_amount: purchaseBillForm.paid_amount,
      due_amount: dueAmount,
      payment_status: dueAmount <= 0 ? 'paid' : purchaseBillForm.paid_amount > 0 ? 'partial' : 'due',
      payment_method: purchaseBillForm.payment_method || null,
      paid_by: purchaseBillForm.paid_by || null,
      received_by: purchaseBillForm.received_by || null,
      remarks: purchaseBillForm.remarks || null,
    }, purchaseBillItems);
    
    setPurchaseBillDialog(false);
    resetPurchaseBillForm();
  };

  const handleSaveSalesInvoice = async () => {
    const subtotal = salesInvoiceItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = salesInvoiceItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalAmount = subtotal + vatAmount - salesInvoiceForm.discount;
    
    await createSalesInvoice({
      client_id: salesInvoiceForm.client_id || null,
      billing_date: salesInvoiceForm.billing_date,
      due_date: salesInvoiceForm.due_date || null,
      subtotal,
      vat_amount: vatAmount,
      discount: salesInvoiceForm.discount,
      total_amount: totalAmount,
      paid_amount: 0,
      due_amount: totalAmount,
      payment_status: 'due',
      remarks: salesInvoiceForm.remarks || null,
    }, salesInvoiceItems);
    
    setSalesInvoiceDialog(false);
    resetSalesInvoiceForm();
  };

  const handleSaveCollection = async () => {
    await createBillCollection({
      client_id: collectionForm.client_id || null,
      invoice_id: collectionForm.invoice_id || null,
      collection_date: collectionForm.collection_date,
      amount: collectionForm.amount,
      payment_method: collectionForm.payment_method,
      received_by: collectionForm.received_by || null,
      remarks: collectionForm.remarks || null,
    });
    setCollectionDialog(false);
    setCollectionForm({
      client_id: '',
      invoice_id: '',
      collection_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      payment_method: 'cash',
      received_by: '',
      remarks: '',
    });
  };

  const handleSaveProviderPayment = async () => {
    await createProviderPayment({
      provider_id: providerPaymentForm.provider_id || null,
      bill_id: providerPaymentForm.bill_id || null,
      payment_date: providerPaymentForm.payment_date,
      amount: providerPaymentForm.amount,
      payment_method: providerPaymentForm.payment_method,
      paid_by: providerPaymentForm.paid_by || null,
      remarks: providerPaymentForm.remarks || null,
    });
    setProviderPaymentDialog(false);
    setProviderPaymentForm({
      provider_id: '',
      bill_id: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      payment_method: 'bank_transfer',
      paid_by: '',
      remarks: '',
    });
  };

  const handleDelete = async () => {
    switch (deleteDialog.type) {
      case 'category': await deleteCategory(deleteDialog.id); break;
      case 'item': await deleteItem(deleteDialog.id); break;
      case 'provider': await deleteProvider(deleteDialog.id); break;
      case 'client': await deleteClient(deleteDialog.id); break;
      case 'purchaseBill': await deletePurchaseBill(deleteDialog.id); break;
      case 'salesInvoice': await deleteSalesInvoice(deleteDialog.id); break;
      case 'collection': await deleteBillCollection(deleteDialog.id); break;
      case 'providerPayment': await deleteProviderPayment(deleteDialog.id); break;
    }
    setDeleteDialog({ open: false, type: '', id: '', name: '' });
  };

  const resetPurchaseBillForm = () => {
    setPurchaseBillForm({
      provider_id: '',
      billing_date: format(new Date(), 'yyyy-MM-dd'),
      payment_status: 'due',
      payment_method: '',
      paid_by: '',
      received_by: '',
      remarks: '',
      discount: 0,
      paid_amount: 0,
    });
    setPurchaseBillItems([{
      item_id: null,
      item_name: '',
      description: '',
      unit: 'Mbps',
      quantity: 1,
      rate: 0,
      vat_percent: 0,
      vat_amount: 0,
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date: format(new Date(), 'yyyy-MM-dd'),
      total: 0,
    }]);
  };

  const resetSalesInvoiceForm = () => {
    setSalesInvoiceForm({
      client_id: '',
      billing_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      remarks: '',
      discount: 0,
    });
    setSalesInvoiceItems([{
      item_id: null,
      item_name: '',
      description: '',
      unit: 'Mbps',
      quantity: 1,
      rate: 0,
      vat_percent: 0,
      vat_amount: 0,
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date: format(new Date(), 'yyyy-MM-dd'),
      total: 0,
    }]);
  };

  const addPurchaseBillItem = () => {
    setPurchaseBillItems([...purchaseBillItems, {
      item_id: null,
      item_name: '',
      description: '',
      unit: 'Mbps',
      quantity: 1,
      rate: 0,
      vat_percent: 0,
      vat_amount: 0,
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date: format(new Date(), 'yyyy-MM-dd'),
      total: 0,
    }]);
  };

  const addSalesInvoiceItem = () => {
    setSalesInvoiceItems([...salesInvoiceItems, {
      item_id: null,
      item_name: '',
      description: '',
      unit: 'Mbps',
      quantity: 1,
      rate: 0,
      vat_percent: 0,
      vat_amount: 0,
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date: format(new Date(), 'yyyy-MM-dd'),
      total: 0,
    }]);
  };

  const updatePurchaseBillItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseBillItems];
    (newItems[index] as any)[field] = value;
    
    // Recalculate totals
    const item = newItems[index];
    const baseTotal = item.quantity * item.rate;
    item.vat_amount = baseTotal * (item.vat_percent / 100);
    item.total = baseTotal + item.vat_amount;
    
    setPurchaseBillItems(newItems);
  };

  const updateSalesInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...salesInvoiceItems];
    (newItems[index] as any)[field] = value;
    
    // Recalculate totals
    const item = newItems[index];
    const baseTotal = item.quantity * item.rate;
    item.vat_amount = baseTotal * (item.vat_percent / 100);
    item.total = baseTotal + item.vat_amount;
    
    setSalesInvoiceItems(newItems);
  };

  const removePurchaseBillItem = (index: number) => {
    if (purchaseBillItems.length > 1) {
      setPurchaseBillItems(purchaseBillItems.filter((_, i) => i !== index));
    }
  };

  const removeSalesInvoiceItem = (index: number) => {
    if (salesInvoiceItems.length > 1) {
      setSalesInvoiceItems(salesInvoiceItems.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bandwidth Management</h1>
          <p className="text-muted-foreground">Buy and sell bandwidth, manage providers and clients</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="purchase-bills">Purchase Bills</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="sales-invoices">Sales Invoices</TabsTrigger>
          <TabsTrigger value="collections">Bill Collections</TabsTrigger>
          <TabsTrigger value="payments">Provider Payments</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProviders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalPurchases.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalSales.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
                <Wallet className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">৳{stats.totalPayable.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Amount due to providers</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Receivable</CardTitle>
                <Receipt className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">৳{stats.totalReceivable.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Amount due from clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalCollected.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bandwidth Items</CardTitle>
                <CardDescription>Products/services for buying and selling</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); setItemForm({ name: '', description: '', category_id: '', unit: 'Mbps', unit_price: 0, is_active: true }); setItemDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category?.name || '-'}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>৳{item.unit_price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setItemForm({ name: item.name, description: item.description || '', category_id: item.category_id || '', unit: item.unit, unit_price: item.unit_price, is_active: item.is_active }); setItemDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'item', id: item.id, name: item.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Item Categories</CardTitle>
                <CardDescription>Organize your bandwidth items</CardDescription>
              </div>
              <Button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true }); setCategoryDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Category
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
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active }); setCategoryDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'category', id: cat.id, name: cat.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No categories found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bandwidth Providers</CardTitle>
                <CardDescription>Suppliers you purchase bandwidth from</CardDescription>
              </div>
              <Button onClick={() => { setEditingProvider(null); setProviderForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' }); setProviderDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Provider
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
                    <TableHead>Total Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.company_name || '-'}</TableCell>
                      <TableCell>{provider.phone || '-'}</TableCell>
                      <TableCell>{provider.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={provider.total_due > 0 ? 'destructive' : 'secondary'}>
                          ৳{(provider.total_due || 0).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingProvider(provider); setProviderForm({ name: provider.name, company_name: provider.company_name || '', email: provider.email || '', phone: provider.phone || '', address: provider.address || '', contact_person: provider.contact_person || '', account_number: provider.account_number || '', bank_details: provider.bank_details || '', notes: provider.notes || '' }); setProviderDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'provider', id: provider.id, name: provider.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {providers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No providers found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Bills Tab */}
        <TabsContent value="purchase-bills" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Bills</CardTitle>
                <CardDescription>Bills from bandwidth providers</CardDescription>
              </div>
              <Button onClick={() => { resetPurchaseBillForm(); setPurchaseBillDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Create Bill
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.invoice_number}</TableCell>
                      <TableCell>{bill.provider?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(bill.billing_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>৳{bill.total_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{bill.paid_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{bill.due_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={bill.payment_status === 'paid' ? 'default' : bill.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                          {bill.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'purchaseBill', id: bill.id, name: bill.invoice_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchaseBills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No purchase bills found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bandwidth Clients</CardTitle>
                <CardDescription>Customers you sell bandwidth to</CardDescription>
              </div>
              <Button onClick={() => { setEditingClient(null); setClientForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' }); setClientDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Client
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
                    <TableHead>Receivable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.company_name || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.total_receivable > 0 ? 'default' : 'secondary'}>
                          ৳{(client.total_receivable || 0).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingClient(client); setClientForm({ name: client.name, company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', contact_person: client.contact_person || '', account_number: client.account_number || '', bank_details: client.bank_details || '', notes: client.notes || '' }); setClientDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'client', id: client.id, name: client.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No clients found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Invoices Tab */}
        <TabsContent value="sales-invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Invoices</CardTitle>
                <CardDescription>Invoices sent to clients</CardDescription>
              </div>
              <Button onClick={() => { resetSalesInvoiceForm(); setSalesInvoiceDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.client?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(invoice.billing_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>৳{invoice.total_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{invoice.paid_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{invoice.due_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : invoice.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'salesInvoice', id: invoice.id, name: invoice.invoice_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sales invoices found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bill Collections</CardTitle>
                <CardDescription>Payments received from clients</CardDescription>
              </div>
              <Button onClick={() => { setCollectionForm({ client_id: '', invoice_id: '', collection_date: format(new Date(), 'yyyy-MM-dd'), amount: 0, payment_method: 'cash', received_by: '', remarks: '' }); setCollectionDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Record Collection
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billCollections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">{collection.receipt_number}</TableCell>
                      <TableCell>{collection.client?.name || '-'}</TableCell>
                      <TableCell>{collection.invoice?.invoice_number || '-'}</TableCell>
                      <TableCell>{format(new Date(collection.collection_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>৳{collection.amount.toLocaleString()}</TableCell>
                      <TableCell>{collection.payment_method}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'collection', id: collection.id, name: collection.receipt_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {billCollections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No collections found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provider Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Provider Payments</CardTitle>
                <CardDescription>Payments made to providers</CardDescription>
              </div>
              <Button onClick={() => { setProviderPaymentForm({ provider_id: '', bill_id: '', payment_date: format(new Date(), 'yyyy-MM-dd'), amount: 0, payment_method: 'bank_transfer', paid_by: '', remarks: '' }); setProviderPaymentDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Bill</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>{payment.provider?.name || '-'}</TableCell>
                      <TableCell>{payment.bill?.invoice_number || '-'}</TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>৳{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'providerPayment', id: payment.id, name: payment.payment_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {providerPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payments found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Manage bandwidth item categories</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Category name" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>Manage bandwidth items/products</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Item name" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="Mbps" />
              </div>
              <div className="grid gap-2">
                <Label>Unit Price</Label>
                <Input type="number" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Dialog */}
      <Dialog open={providerDialog} onOpenChange={setProviderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
            <DialogDescription>Manage bandwidth providers</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input value={providerForm.company_name} onChange={(e) => setProviderForm({ ...providerForm, company_name: e.target.value })} placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={providerForm.phone} onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={providerForm.email} onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })} placeholder="Email" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Textarea value={providerForm.address} onChange={(e) => setProviderForm({ ...providerForm, address: e.target.value })} placeholder="Address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input value={providerForm.contact_person} onChange={(e) => setProviderForm({ ...providerForm, contact_person: e.target.value })} placeholder="Contact person" />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input value={providerForm.account_number} onChange={(e) => setProviderForm({ ...providerForm, account_number: e.target.value })} placeholder="Account number" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bank Details</Label>
              <Textarea value={providerForm.bank_details} onChange={(e) => setProviderForm({ ...providerForm, bank_details: e.target.value })} placeholder="Bank details" />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={providerForm.notes} onChange={(e) => setProviderForm({ ...providerForm, notes: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveProvider}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
            <DialogDescription>Manage bandwidth clients</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input value={clientForm.company_name} onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })} placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} placeholder="Email" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Textarea value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} placeholder="Address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input value={clientForm.contact_person} onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })} placeholder="Contact person" />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input value={clientForm.account_number} onChange={(e) => setClientForm({ ...clientForm, account_number: e.target.value })} placeholder="Account number" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bank Details</Label>
              <Textarea value={clientForm.bank_details} onChange={(e) => setClientForm({ ...clientForm, bank_details: e.target.value })} placeholder="Bank details" />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveClient}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Bill Dialog */}
      <Dialog open={purchaseBillDialog} onOpenChange={setPurchaseBillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Bill</DialogTitle>
            <DialogDescription>Record a new purchase bill from provider</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Provider</Label>
                <Select value={purchaseBillForm.provider_id} onValueChange={(v) => setPurchaseBillForm({ ...purchaseBillForm, provider_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Billing Date</Label>
                <Input type="date" value={purchaseBillForm.billing_date} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, billing_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Payment Status</Label>
                <Select value={purchaseBillForm.payment_status} onValueChange={(v) => setPurchaseBillForm({ ...purchaseBillForm, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addPurchaseBillItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {purchaseBillItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Item</Label>
                      <Select value={item.item_id || ''} onValueChange={(v) => {
                        const selectedItem = items.find(i => i.id === v);
                        updatePurchaseBillItem(index, 'item_id', v);
                        if (selectedItem) {
                          updatePurchaseBillItem(index, 'item_name', selectedItem.name);
                          updatePurchaseBillItem(index, 'unit', selectedItem.unit);
                          updatePurchaseBillItem(index, 'rate', selectedItem.unit_price);
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={item.unit} onChange={(e) => updatePurchaseBillItem(index, 'unit', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updatePurchaseBillItem(index, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Rate</Label>
                      <Input type="number" value={item.rate} onChange={(e) => updatePurchaseBillItem(index, 'rate', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">VAT %</Label>
                      <Input type="number" value={item.vat_percent} onChange={(e) => updatePurchaseBillItem(index, 'vat_percent', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">From</Label>
                      <Input type="date" value={item.from_date} onChange={(e) => updatePurchaseBillItem(index, 'from_date', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" value={item.to_date} onChange={(e) => updatePurchaseBillItem(index, 'to_date', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <Input value={`৳${item.total.toLocaleString()}`} readOnly />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePurchaseBillItem(index)} disabled={purchaseBillItems.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Discount</Label>
                <Input type="number" value={purchaseBillForm.discount} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, discount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Paid Amount</Label>
                <Input type="number" value={purchaseBillForm.paid_amount} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, paid_amount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={purchaseBillForm.payment_method} onValueChange={(v) => setPurchaseBillForm({ ...purchaseBillForm, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Grand Total</Label>
                <Input value={`৳${(purchaseBillItems.reduce((sum, i) => sum + i.total, 0) - purchaseBillForm.discount).toLocaleString()}`} readOnly className="font-bold" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={purchaseBillForm.remarks} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, remarks: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseBillDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePurchaseBill}>Save Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Invoice Dialog */}
      <Dialog open={salesInvoiceDialog} onOpenChange={setSalesInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sales Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for client</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Client</Label>
                <Select value={salesInvoiceForm.client_id} onValueChange={(v) => setSalesInvoiceForm({ ...salesInvoiceForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Billing Date</Label>
                <Input type="date" value={salesInvoiceForm.billing_date} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, billing_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={salesInvoiceForm.due_date} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, due_date: e.target.value })} />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addSalesInvoiceItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {salesInvoiceItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Item</Label>
                      <Select value={item.item_id || ''} onValueChange={(v) => {
                        const selectedItem = items.find(i => i.id === v);
                        updateSalesInvoiceItem(index, 'item_id', v);
                        if (selectedItem) {
                          updateSalesInvoiceItem(index, 'item_name', selectedItem.name);
                          updateSalesInvoiceItem(index, 'unit', selectedItem.unit);
                          updateSalesInvoiceItem(index, 'rate', selectedItem.unit_price);
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={item.unit} onChange={(e) => updateSalesInvoiceItem(index, 'unit', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateSalesInvoiceItem(index, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Rate</Label>
                      <Input type="number" value={item.rate} onChange={(e) => updateSalesInvoiceItem(index, 'rate', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">VAT %</Label>
                      <Input type="number" value={item.vat_percent} onChange={(e) => updateSalesInvoiceItem(index, 'vat_percent', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">From</Label>
                      <Input type="date" value={item.from_date} onChange={(e) => updateSalesInvoiceItem(index, 'from_date', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" value={item.to_date} onChange={(e) => updateSalesInvoiceItem(index, 'to_date', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <Input value={`৳${item.total.toLocaleString()}`} readOnly />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSalesInvoiceItem(index)} disabled={salesInvoiceItems.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Discount</Label>
                <Input type="number" value={salesInvoiceForm.discount} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, discount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Grand Total</Label>
                <Input value={`৳${(salesInvoiceItems.reduce((sum, i) => sum + i.total, 0) - salesInvoiceForm.discount).toLocaleString()}`} readOnly className="font-bold" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={salesInvoiceForm.remarks} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, remarks: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSalesInvoice}>Save Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection Dialog */}
      <Dialog open={collectionDialog} onOpenChange={setCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Bill Collection</DialogTitle>
            <DialogDescription>Record payment received from client</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Client</Label>
              <Select value={collectionForm.client_id} onValueChange={(v) => setCollectionForm({ ...collectionForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Invoice (Optional)</Label>
              <Select value={collectionForm.invoice_id} onValueChange={(v) => setCollectionForm({ ...collectionForm, invoice_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {salesInvoices.filter(i => i.client_id === collectionForm.client_id && i.due_amount > 0).map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number} - Due: ৳{i.due_amount.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Collection Date</Label>
                <Input type="date" value={collectionForm.collection_date} onChange={(e) => setCollectionForm({ ...collectionForm, collection_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" value={collectionForm.amount} onChange={(e) => setCollectionForm({ ...collectionForm, amount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={collectionForm.payment_method} onValueChange={(v) => setCollectionForm({ ...collectionForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Received By</Label>
                <Input value={collectionForm.received_by} onChange={(e) => setCollectionForm({ ...collectionForm, received_by: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={collectionForm.remarks} onChange={(e) => setCollectionForm({ ...collectionForm, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCollection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Payment Dialog */}
      <Dialog open={providerPaymentDialog} onOpenChange={setProviderPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Provider Payment</DialogTitle>
            <DialogDescription>Record payment made to provider</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={providerPaymentForm.provider_id} onValueChange={(v) => setProviderPaymentForm({ ...providerPaymentForm, provider_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Bill (Optional)</Label>
              <Select value={providerPaymentForm.bill_id} onValueChange={(v) => setProviderPaymentForm({ ...providerPaymentForm, bill_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select bill" /></SelectTrigger>
                <SelectContent>
                  {purchaseBills.filter(b => b.provider_id === providerPaymentForm.provider_id && b.due_amount > 0).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.invoice_number} - Due: ৳{b.due_amount.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Date</Label>
                <Input type="date" value={providerPaymentForm.payment_date} onChange={(e) => setProviderPaymentForm({ ...providerPaymentForm, payment_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" value={providerPaymentForm.amount} onChange={(e) => setProviderPaymentForm({ ...providerPaymentForm, amount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={providerPaymentForm.payment_method} onValueChange={(v) => setProviderPaymentForm({ ...providerPaymentForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Paid By</Label>
                <Input value={providerPaymentForm.paid_by} onChange={(e) => setProviderPaymentForm({ ...providerPaymentForm, paid_by: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={providerPaymentForm.remarks} onChange={(e) => setProviderPaymentForm({ ...providerPaymentForm, remarks: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveProviderPayment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDialog.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}