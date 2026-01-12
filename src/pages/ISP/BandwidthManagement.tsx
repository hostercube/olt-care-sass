import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Building2, 
  Package,
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  Eye,
  Printer,
  Download,
  FileText,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { useBandwidthManagement, BandwidthCategory, BandwidthItem, BandwidthProvider, BandwidthClient, PurchaseBillItem, SalesInvoiceItem, BandwidthPurchaseBill, BandwidthSalesInvoice } from '@/hooks/useBandwidthManagement';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, getDaysInMonth } from 'date-fns';
import { generatePurchaseBillPDF, generateSalesInvoicePDF, generatePrintHTML, calculateProRataAmount, getDaysCount } from '@/lib/bandwidth-pdf';

interface TenantInfo {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  invoice_header: string | null;
  invoice_footer: string | null;
}

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
    fetchCategories,
    fetchItems,
    fetchProviders,
    fetchClients,
    fetchPurchaseBills,
    fetchSalesInvoices,
    fetchBillCollections,
    fetchProviderPayments,
  } = useBandwidthManagement();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') });
  
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
  
  // View details sheets
  const [viewPurchaseBill, setViewPurchaseBill] = useState<BandwidthPurchaseBill | null>(null);
  const [viewSalesInvoice, setViewSalesInvoice] = useState<BandwidthSalesInvoice | null>(null);
  const [viewProviderLedger, setViewProviderLedger] = useState<BandwidthProvider | null>(null);
  const [viewClientLedger, setViewClientLedger] = useState<BandwidthClient | null>(null);
  
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

  // Filtered data with search
  const filteredProviders = useMemo(() => 
    providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.company_name && p.company_name.toLowerCase().includes(search.toLowerCase()))),
    [providers, search]
  );

  const filteredClients = useMemo(() => 
    clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase()))),
    [clients, search]
  );

  const filteredPurchaseBills = useMemo(() => 
    purchaseBills.filter(b => {
      const matchSearch = b.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (b.provider?.name && b.provider.name.toLowerCase().includes(search.toLowerCase()));
      const billDate = new Date(b.billing_date);
      const matchDate = billDate >= new Date(dateFilter.from) && billDate <= new Date(dateFilter.to);
      return matchSearch && matchDate;
    }),
    [purchaseBills, search, dateFilter]
  );

  const filteredSalesInvoices = useMemo(() => 
    salesInvoices.filter(i => {
      const matchSearch = i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (i.client?.name && i.client.name.toLowerCase().includes(search.toLowerCase()));
      const invoiceDate = new Date(i.billing_date);
      const matchDate = invoiceDate >= new Date(dateFilter.from) && invoiceDate <= new Date(dateFilter.to);
      return matchSearch && matchDate;
    }),
    [salesInvoices, search, dateFilter]
  );

  // Calculate profit/loss stats
  const profitLossStats = useMemo(() => {
    const totalPurchases = purchaseBills.reduce((sum, b) => sum + b.total_amount, 0);
    const totalSales = salesInvoices.reduce((sum, i) => sum + i.total_amount, 0);
    const profit = totalSales - totalPurchases;
    const profitPercentage = totalPurchases > 0 ? ((profit / totalPurchases) * 100).toFixed(1) : '0';
    return { totalPurchases, totalSales, profit, profitPercentage };
  }, [purchaseBills, salesInvoices]);

  // Provider ledger data
  const getProviderLedger = (providerId: string) => {
    const bills = purchaseBills.filter(b => b.provider_id === providerId);
    const payments = providerPayments.filter(p => p.provider_id === providerId);
    return { bills, payments };
  };

  // Client ledger data
  const getClientLedger = (clientId: string) => {
    const invoices = salesInvoices.filter(i => i.client_id === clientId);
    const collections = billCollections.filter(c => c.client_id === clientId);
    return { invoices, collections };
  };

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
    const subtotal = purchaseBillItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
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
    const subtotal = salesInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
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

  const handleRefresh = () => {
    fetchCategories();
    fetchItems();
    fetchProviders();
    fetchClients();
    fetchPurchaseBills();
    fetchSalesInvoices();
    fetchBillCollections();
    fetchProviderPayments();
  };

  // Fetch tenant info for PDF/Print
  const { tenantId } = useTenantContext();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  
  const fetchTenantInfo = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, company_name, logo_url, phone, email, address, invoice_header, invoice_footer')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      setTenantInfo(data as TenantInfo);
    } catch (err) {
      console.error('Error fetching tenant info:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantInfo();
  }, [fetchTenantInfo]);

  const getPDFOptions = () => ({
    companyName: tenantInfo?.company_name || tenantInfo?.name || 'Bandwidth Management',
    companyAddress: tenantInfo?.address || undefined,
    companyPhone: tenantInfo?.phone || undefined,
    companyEmail: tenantInfo?.email || undefined,
    companyLogo: tenantInfo?.logo_url || undefined,
  });

  const handlePrint = (type: 'purchase' | 'sales', data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = generatePrintHTML(type, data, getPDFOptions());
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadPDF = (type: 'purchase' | 'sales', data: any) => {
    const options = getPDFOptions();
    if (type === 'purchase') {
      generatePurchaseBillPDF(data, options);
    } else {
      generateSalesInvoicePDF(data, options);
    }
  };

  // Pro-rata calculation when dates change
  const calculateItemTotal = (item: PurchaseBillItem | SalesInvoiceItem) => {
    const baseRate = item.rate;
    let calculatedAmount = baseRate * item.quantity;
    
    // If dates are set, calculate pro-rata
    if (item.from_date && item.to_date) {
      const days = getDaysCount(item.from_date, item.to_date);
      const daysInMonth = getDaysInMonth(new Date(item.from_date));
      calculatedAmount = (baseRate / daysInMonth) * days * item.quantity;
    }
    
    const vatAmount = calculatedAmount * (item.vat_percent / 100);
    return { amount: calculatedAmount, vatAmount, total: calculatedAmount + vatAmount };
  };

  const generatePurchaseBillPrintHTML = (bill: BandwidthPurchaseBill) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Purchase Bill - ${bill.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .totals { text-align: right; }
        .totals p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Purchase Bill</h1>
        <p>Invoice #: ${bill.invoice_number}</p>
      </div>
      <div class="info">
        <div>
          <p><strong>Provider:</strong> ${bill.provider?.name || 'N/A'}</p>
          <p><strong>Company:</strong> ${bill.provider?.company_name || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Date:</strong> ${format(new Date(bill.billing_date), 'dd/MM/yyyy')}</p>
          <p><strong>Status:</strong> ${bill.payment_status.toUpperCase()}</p>
        </div>
      </div>
      <div class="totals">
        <p><strong>Subtotal:</strong> ৳${(bill.subtotal || 0).toLocaleString()}</p>
        <p><strong>VAT:</strong> ৳${(bill.vat_amount || 0).toLocaleString()}</p>
        <p><strong>Discount:</strong> ৳${(bill.discount || 0).toLocaleString()}</p>
        <p><strong>Total:</strong> ৳${bill.total_amount.toLocaleString()}</p>
        <p><strong>Paid:</strong> ৳${bill.paid_amount.toLocaleString()}</p>
        <p><strong>Due:</strong> ৳${bill.due_amount.toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  const generateSalesInvoicePrintHTML = (invoice: BandwidthSalesInvoice) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales Invoice - ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .totals { text-align: right; }
        .totals p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sales Invoice</h1>
        <p>Invoice #: ${invoice.invoice_number}</p>
      </div>
      <div class="info">
        <div>
          <p><strong>Client:</strong> ${invoice.client?.name || 'N/A'}</p>
          <p><strong>Company:</strong> ${invoice.client?.company_name || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Date:</strong> ${format(new Date(invoice.billing_date), 'dd/MM/yyyy')}</p>
          <p><strong>Due Date:</strong> ${invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}</p>
          <p><strong>Status:</strong> ${invoice.payment_status.toUpperCase()}</p>
        </div>
      </div>
      <div class="totals">
        <p><strong>Subtotal:</strong> ৳${(invoice.subtotal || 0).toLocaleString()}</p>
        <p><strong>VAT:</strong> ৳${(invoice.vat_amount || 0).toLocaleString()}</p>
        <p><strong>Discount:</strong> ৳${(invoice.discount || 0).toLocaleString()}</p>
        <p><strong>Total:</strong> ৳${invoice.total_amount.toLocaleString()}</p>
        <p><strong>Paid:</strong> ৳${invoice.paid_amount.toLocaleString()}</p>
        <p><strong>Due:</strong> ৳${invoice.due_amount.toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  const exportCSV = (type: 'providers' | 'clients' | 'purchases' | 'sales') => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'providers':
        csvContent = 'Name,Company,Phone,Email,Total Due\n' + 
          providers.map(p => `"${p.name}","${p.company_name || ''}","${p.phone || ''}","${p.email || ''}","${p.total_due}"`).join('\n');
        filename = 'providers.csv';
        break;
      case 'clients':
        csvContent = 'Name,Company,Phone,Email,Total Receivable\n' +
          clients.map(c => `"${c.name}","${c.company_name || ''}","${c.phone || ''}","${c.email || ''}","${c.total_receivable}"`).join('\n');
        filename = 'clients.csv';
        break;
      case 'purchases':
        csvContent = 'Invoice,Provider,Date,Total,Paid,Due,Status\n' +
          purchaseBills.map(b => `"${b.invoice_number}","${b.provider?.name || ''}","${b.billing_date}","${b.total_amount}","${b.paid_amount}","${b.due_amount}","${b.payment_status}"`).join('\n');
        filename = 'purchase_bills.csv';
        break;
      case 'sales':
        csvContent = 'Invoice,Client,Date,Total,Paid,Due,Status\n' +
          salesInvoices.map(i => `"${i.invoice_number}","${i.client?.name || ''}","${i.billing_date}","${i.total_amount}","${i.paid_amount}","${i.due_amount}","${i.payment_status}"`).join('\n');
        filename = 'sales_invoices.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
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
    
    // Recalculate totals with pro-rata calculation
    const item = newItems[index];
    let calculatedAmount = item.quantity * item.rate;
    
    // If both dates are set and valid, calculate pro-rata
    if (item.from_date && item.to_date && item.rate > 0) {
      const fromDate = new Date(item.from_date);
      const toDate = new Date(item.to_date);
      if (toDate >= fromDate) {
        const days = getDaysCount(item.from_date, item.to_date);
        const daysInMonth = getDaysInMonth(fromDate);
        calculatedAmount = (item.rate / daysInMonth) * days * item.quantity;
      }
    }
    
    item.vat_amount = calculatedAmount * (item.vat_percent / 100);
    item.total = calculatedAmount + item.vat_amount;
    
    setPurchaseBillItems(newItems);
  };

  const updateSalesInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...salesInvoiceItems];
    (newItems[index] as any)[field] = value;
    
    // Recalculate totals with pro-rata calculation
    const item = newItems[index];
    let calculatedAmount = item.quantity * item.rate;
    
    // If both dates are set and valid, calculate pro-rata
    if (item.from_date && item.to_date && item.rate > 0) {
      const fromDate = new Date(item.from_date);
      const toDate = new Date(item.to_date);
      if (toDate >= fromDate) {
        const days = getDaysCount(item.from_date, item.to_date);
        const daysInMonth = getDaysInMonth(fromDate);
        calculatedAmount = (item.rate / daysInMonth) * days * item.quantity;
      }
    }
    
    item.vat_amount = calculatedAmount * (item.vat_percent / 100);
    item.total = calculatedAmount + item.vat_amount;
    
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

  // Calculate bill totals with pro-rata
  const purchaseBillSubtotal = purchaseBillItems.reduce((sum, item) => {
    if (item.from_date && item.to_date && item.rate > 0) {
      const fromDate = new Date(item.from_date);
      const toDate = new Date(item.to_date);
      if (toDate >= fromDate) {
        const days = getDaysCount(item.from_date, item.to_date);
        const daysInMonth = getDaysInMonth(fromDate);
        return sum + (item.rate / daysInMonth) * days * item.quantity;
      }
    }
    return sum + (item.quantity * item.rate);
  }, 0);
  const purchaseBillVat = purchaseBillItems.reduce((sum, i) => sum + i.vat_amount, 0);
  const purchaseBillTotal = purchaseBillSubtotal + purchaseBillVat - purchaseBillForm.discount;

  const salesInvoiceSubtotal = salesInvoiceItems.reduce((sum, item) => {
    if (item.from_date && item.to_date && item.rate > 0) {
      const fromDate = new Date(item.from_date);
      const toDate = new Date(item.to_date);
      if (toDate >= fromDate) {
        const days = getDaysCount(item.from_date, item.to_date);
        const daysInMonth = getDaysInMonth(fromDate);
        return sum + (item.rate / daysInMonth) * days * item.quantity;
      }
    }
    return sum + (item.quantity * item.rate);
  }, 0);
  const salesInvoiceVat = salesInvoiceItems.reduce((sum, i) => sum + i.vat_amount, 0);
  const salesInvoiceTotal = salesInvoiceSubtotal + salesInvoiceVat - salesInvoiceForm.discount;

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bandwidth Management</h1>
          <p className="text-muted-foreground">Buy and sell bandwidth, manage providers and clients</p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="purchase-bills">Purchases</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="sales-invoices">Sales</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
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
                <p className="text-xs text-muted-foreground">Bandwidth suppliers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">Bandwidth buyers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalPurchases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From providers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalSales.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">To clients</p>
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
                <p className="text-xs text-muted-foreground">From clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">To providers</p>
              </CardContent>
            </Card>
          </div>

          {/* Profit/Loss Summary */}
          <Card className={profitLossStats.profit >= 0 ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10' : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Profit/Loss Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Purchase</p>
                  <p className="text-xl font-bold text-red-600">৳{profitLossStats.totalPurchases.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold text-green-600">৳{profitLossStats.totalSales.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{profitLossStats.profit >= 0 ? 'Profit' : 'Loss'}</p>
                  <p className={`text-xl font-bold flex items-center justify-center gap-1 ${profitLossStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLossStats.profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    ৳{Math.abs(profitLossStats.profit).toLocaleString()}
                    <span className="text-sm font-normal">({profitLossStats.profitPercentage}%)</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search providers..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-8 w-64"
                  />
                </div>
                <Button variant="outline" onClick={() => exportCSV('providers')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={() => { setEditingProvider(null); setProviderForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' }); setProviderDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Provider
                </Button>
              </div>
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
                  {filteredProviders.map((provider) => (
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
                        <Button variant="ghost" size="icon" onClick={() => setViewProviderLedger(provider)} title="View Ledger">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingProvider(provider); setProviderForm({ name: provider.name, company_name: provider.company_name || '', email: provider.email || '', phone: provider.phone || '', address: provider.address || '', contact_person: provider.contact_person || '', account_number: provider.account_number || '', bank_details: provider.bank_details || '', notes: provider.notes || '' }); setProviderDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'provider', id: provider.id, name: provider.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProviders.length === 0 && (
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
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={dateFilter.from} onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })} className="w-36" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" value={dateFilter.to} onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })} className="w-36" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Button variant="outline" onClick={() => exportCSV('purchases')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={() => { resetPurchaseBillForm(); setPurchaseBillDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Create Bill
                </Button>
              </div>
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
                  {filteredPurchaseBills.map((bill) => (
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
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewPurchaseBill(bill)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF('purchase', bill)} title="Download PDF">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint('purchase', bill)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'purchaseBill', id: bill.id, name: bill.invoice_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPurchaseBills.length === 0 && (
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
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
                </div>
                <Button variant="outline" onClick={() => exportCSV('clients')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={() => { setEditingClient(null); setClientForm({ name: '', company_name: '', email: '', phone: '', address: '', contact_person: '', account_number: '', bank_details: '', notes: '' }); setClientDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Client
                </Button>
              </div>
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
                  {filteredClients.map((client) => (
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
                        <Button variant="ghost" size="icon" onClick={() => setViewClientLedger(client)} title="View Ledger">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingClient(client); setClientForm({ name: client.name, company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', contact_person: client.contact_person || '', account_number: client.account_number || '', bank_details: client.bank_details || '', notes: client.notes || '' }); setClientDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'client', id: client.id, name: client.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredClients.length === 0 && (
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
                <CardDescription>Invoices to bandwidth clients</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={dateFilter.from} onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })} className="w-36" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" value={dateFilter.to} onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })} className="w-36" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Button variant="outline" onClick={() => exportCSV('sales')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={() => { resetSalesInvoiceForm(); setSalesInvoiceDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Create Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalesInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.client?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(invoice.billing_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>৳{invoice.total_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{invoice.paid_amount.toLocaleString()}</TableCell>
                      <TableCell>৳{invoice.due_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : invoice.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                          {invoice.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewSalesInvoice(invoice)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF('sales', invoice)} title="Download PDF">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint('sales', invoice)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: 'salesInvoice', id: invoice.id, name: invoice.invoice_number })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSalesInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No sales invoices found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bill Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bill Collections</CardTitle>
                <CardDescription>Payments received from clients</CardDescription>
              </div>
              <Button onClick={() => setCollectionDialog(true)}>
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
                      <TableCell className="capitalize">{collection.payment_method?.replace('_', ' ') || '-'}</TableCell>
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
              <Button onClick={() => setProviderPaymentDialog(true)}>
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
                      <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</TableCell>
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

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Monthly Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    type="month" 
                    value={format(new Date(dateFilter.from), 'yyyy-MM')}
                    onChange={(e) => {
                      const date = new Date(e.target.value + '-01');
                      setDateFilter({
                        from: format(startOfMonth(date), 'yyyy-MM-dd'),
                        to: format(endOfMonth(date), 'yyyy-MM-dd')
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Purchases</span>
                    <span className="font-medium">৳{filteredPurchaseBills.reduce((sum, b) => sum + b.total_amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-medium">৳{filteredSalesInvoices.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Profit/Loss</span>
                    <span className={`font-medium ${(filteredSalesInvoices.reduce((sum, i) => sum + i.total_amount, 0) - filteredPurchaseBills.reduce((sum, b) => sum + b.total_amount, 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{(filteredSalesInvoices.reduce((sum, i) => sum + i.total_amount, 0) - filteredPurchaseBills.reduce((sum, b) => sum + b.total_amount, 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Purchase Bills Count</span>
                    <span className="font-medium">{filteredPurchaseBills.length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Sales Invoices Count</span>
                    <span className="font-medium">{filteredSalesInvoices.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Outstanding Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Payable to Providers</span>
                    <span className="font-medium text-red-600">৳{stats.totalPayable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Receivable from Clients</span>
                    <span className="font-medium text-green-600">৳{stats.totalReceivable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Net Position</span>
                    <span className={`font-medium ${stats.totalReceivable - stats.totalPayable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{(stats.totalReceivable - stats.totalPayable).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Providers with Due</span>
                    <span className="font-medium">{providers.filter(p => p.total_due > 0).length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Clients with Receivable</span>
                    <span className="font-medium">{clients.filter(c => c.total_receivable > 0).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Providers by Purchase</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Total Bills</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Total Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map(provider => {
                      const providerBills = purchaseBills.filter(b => b.provider_id === provider.id);
                      const totalAmount = providerBills.reduce((sum, b) => sum + b.total_amount, 0);
                      const totalPaid = providerBills.reduce((sum, b) => sum + b.paid_amount, 0);
                      return (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.name}</TableCell>
                          <TableCell>{providerBills.length}</TableCell>
                          <TableCell>৳{totalAmount.toLocaleString()}</TableCell>
                          <TableCell>৳{totalPaid.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={provider.total_due > 0 ? 'destructive' : 'secondary'}>
                              ৳{(provider.total_due || 0).toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Clients by Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Total Invoices</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Total Collected</TableHead>
                      <TableHead>Total Receivable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => {
                      const clientInvoices = salesInvoices.filter(i => i.client_id === client.id);
                      const totalAmount = clientInvoices.reduce((sum, i) => sum + i.total_amount, 0);
                      const totalCollected = clientInvoices.reduce((sum, i) => sum + i.paid_amount, 0);
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{clientInvoices.length}</TableCell>
                          <TableCell>৳{totalAmount.toLocaleString()}</TableCell>
                          <TableCell>৳{totalCollected.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={client.total_receivable > 0 ? 'default' : 'secondary'}>
                              ৳{(client.total_receivable || 0).toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
              <Label>Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Category name" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>Save</Button>
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
              <Label>Name *</Label>
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
            <Button onClick={handleSaveItem} disabled={!itemForm.name}>Save</Button>
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
            <Button onClick={handleSaveProvider} disabled={!providerForm.name}>Save</Button>
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
            <Button onClick={handleSaveClient} disabled={!clientForm.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Bill Dialog - Responsive */}
      <Dialog open={purchaseBillDialog} onOpenChange={setPurchaseBillDialog}>
        <DialogContent className="w-full max-w-[98vw] lg:max-w-6xl max-h-[90vh] p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
          <DialogHeader>
            <DialogTitle>Create Purchase Bill</DialogTitle>
            <DialogDescription>Record a new purchase bill from provider</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Provider *</Label>
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
                <Input type="date" value={purchaseBillForm.billing_date} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, billing_date: e.target.value })} className="text-sm" />
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
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addPurchaseBillItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {/* Header Row - Desktop Only */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-t-lg text-xs font-medium text-muted-foreground mb-2">
                <div className="col-span-2">Item</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-1">Rate</div>
                <div className="col-span-1">VAT%</div>
                <div className="col-span-2">From - To Date</div>
                <div className="col-span-1">Days</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {purchaseBillItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/30">
                    {/* Desktop: Single Row */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Select value={item.item_id || ''} onValueChange={(v) => {
                          const selectedItem = items.find(i => i.id === v);
                          updatePurchaseBillItem(index, 'item_id', v);
                          if (selectedItem) {
                            updatePurchaseBillItem(index, 'item_name', selectedItem.name);
                            updatePurchaseBillItem(index, 'unit', selectedItem.unit);
                            updatePurchaseBillItem(index, 'rate', selectedItem.unit_price);
                          }
                        }}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Item" /></SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Input value={item.unit} onChange={(e) => updatePurchaseBillItem(index, 'unit', e.target.value)} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updatePurchaseBillItem(index, 'quantity', Number(e.target.value))} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" value={item.rate} onChange={(e) => updatePurchaseBillItem(index, 'rate', Number(e.target.value))} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" value={item.vat_percent} onChange={(e) => updatePurchaseBillItem(index, 'vat_percent', Number(e.target.value))} className="h-9 text-xs w-14" />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input type="date" value={item.from_date} onChange={(e) => updatePurchaseBillItem(index, 'from_date', e.target.value)} className="h-9 text-xs" />
                        <Input type="date" value={item.to_date} onChange={(e) => updatePurchaseBillItem(index, 'to_date', e.target.value)} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input value={item.from_date && item.to_date ? getDaysCount(item.from_date, item.to_date) : 0} readOnly className="h-9 text-xs bg-muted w-12" />
                      </div>
                      <div className="col-span-2">
                        <Input value={`৳${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} readOnly className="h-9 text-xs bg-primary/10 font-semibold" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePurchaseBillItem(index)} disabled={purchaseBillItems.length === 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Mobile: Two Rows */}
                    <div className="lg:hidden space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
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
                            <SelectTrigger className="h-9"><SelectValue placeholder="Item" /></SelectTrigger>
                            <SelectContent>
                              {items.map((i) => (
                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Input value={item.unit} onChange={(e) => updatePurchaseBillItem(index, 'unit', e.target.value)} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" min="1" value={item.quantity} onChange={(e) => updatePurchaseBillItem(index, 'quantity', Number(e.target.value))} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Rate</Label>
                          <Input type="number" min="0" value={item.rate} onChange={(e) => updatePurchaseBillItem(index, 'rate', Number(e.target.value))} className="h-9" />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 items-end">
                        <div>
                          <Label className="text-xs">From</Label>
                          <Input type="date" value={item.from_date} onChange={(e) => updatePurchaseBillItem(index, 'from_date', e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">To</Label>
                          <Input type="date" value={item.to_date} onChange={(e) => updatePurchaseBillItem(index, 'to_date', e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Days</Label>
                          <Input value={item.from_date && item.to_date ? getDaysCount(item.from_date, item.to_date) : 0} readOnly className="h-9 bg-muted" />
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <Input value={`৳${item.total.toLocaleString('en-IN')}`} readOnly className="h-9 bg-primary/10 font-semibold" />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePurchaseBillItem(index)} disabled={purchaseBillItems.length === 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Subtotal</Label>
                <Input value={`৳${purchaseBillSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">VAT</Label>
                <Input value={`৳${purchaseBillVat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Discount</Label>
                <Input type="number" min="0" value={purchaseBillForm.discount} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, discount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Paid Amount</Label>
                <Input type="number" min="0" value={purchaseBillForm.paid_amount} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, paid_amount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Grand Total</Label>
                <Input value={`৳${purchaseBillTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="font-bold bg-primary/10" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={purchaseBillForm.remarks} onChange={(e) => setPurchaseBillForm({ ...purchaseBillForm, remarks: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseBillDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePurchaseBill} disabled={!purchaseBillForm.provider_id || purchaseBillItems.every(i => !i.rate)}>Save Bill</Button>
          </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sales Invoice Dialog - Responsive */}
      <Dialog open={salesInvoiceDialog} onOpenChange={setSalesInvoiceDialog}>
        <DialogContent className="w-full max-w-[98vw] lg:max-w-6xl max-h-[90vh] p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
          <DialogHeader>
            <DialogTitle>Create Sales Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for client</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Client *</Label>
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
                <Input type="date" value={salesInvoiceForm.billing_date} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, billing_date: e.target.value })} className="text-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={salesInvoiceForm.due_date} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, due_date: e.target.value })} className="text-sm" />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addSalesInvoiceItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {/* Header Row - Desktop Only */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-t-lg text-xs font-medium text-muted-foreground mb-2">
                <div className="col-span-2">Item</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-1">Rate</div>
                <div className="col-span-1">VAT%</div>
                <div className="col-span-2">From - To Date</div>
                <div className="col-span-1">Days</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {salesInvoiceItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/30">
                    {/* Desktop: Single Row */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Select value={item.item_id || ''} onValueChange={(v) => {
                          const selectedItem = items.find(i => i.id === v);
                          updateSalesInvoiceItem(index, 'item_id', v);
                          if (selectedItem) {
                            updateSalesInvoiceItem(index, 'item_name', selectedItem.name);
                            updateSalesInvoiceItem(index, 'unit', selectedItem.unit);
                            updateSalesInvoiceItem(index, 'rate', selectedItem.unit_price);
                          }
                        }}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Item" /></SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Input value={item.unit} onChange={(e) => updateSalesInvoiceItem(index, 'unit', e.target.value)} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateSalesInvoiceItem(index, 'quantity', Number(e.target.value))} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" value={item.rate} onChange={(e) => updateSalesInvoiceItem(index, 'rate', Number(e.target.value))} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" min="0" value={item.vat_percent} onChange={(e) => updateSalesInvoiceItem(index, 'vat_percent', Number(e.target.value))} className="h-9 text-xs w-14" />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input type="date" value={item.from_date} onChange={(e) => updateSalesInvoiceItem(index, 'from_date', e.target.value)} className="h-9 text-xs" />
                        <Input type="date" value={item.to_date} onChange={(e) => updateSalesInvoiceItem(index, 'to_date', e.target.value)} className="h-9 text-xs" />
                      </div>
                      <div className="col-span-1">
                        <Input value={item.from_date && item.to_date ? getDaysCount(item.from_date, item.to_date) : 0} readOnly className="h-9 text-xs bg-muted w-12" />
                      </div>
                      <div className="col-span-2">
                        <Input value={`৳${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} readOnly className="h-9 text-xs bg-primary/10 font-semibold" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSalesInvoiceItem(index)} disabled={salesInvoiceItems.length === 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Mobile: Two Rows */}
                    <div className="lg:hidden space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
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
                            <SelectTrigger className="h-9"><SelectValue placeholder="Item" /></SelectTrigger>
                            <SelectContent>
                              {items.map((i) => (
                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Input value={item.unit} onChange={(e) => updateSalesInvoiceItem(index, 'unit', e.target.value)} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" min="1" value={item.quantity} onChange={(e) => updateSalesInvoiceItem(index, 'quantity', Number(e.target.value))} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Rate</Label>
                          <Input type="number" min="0" value={item.rate} onChange={(e) => updateSalesInvoiceItem(index, 'rate', Number(e.target.value))} className="h-9" />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 items-end">
                        <div>
                          <Label className="text-xs">From</Label>
                          <Input type="date" value={item.from_date} onChange={(e) => updateSalesInvoiceItem(index, 'from_date', e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">To</Label>
                          <Input type="date" value={item.to_date} onChange={(e) => updateSalesInvoiceItem(index, 'to_date', e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Days</Label>
                          <Input value={item.from_date && item.to_date ? getDaysCount(item.from_date, item.to_date) : 0} readOnly className="h-9 bg-muted" />
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <Input value={`৳${item.total.toLocaleString('en-IN')}`} readOnly className="h-9 bg-primary/10 font-semibold" />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSalesInvoiceItem(index)} disabled={salesInvoiceItems.length === 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Subtotal</Label>
                <Input value={`৳${salesInvoiceSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">VAT</Label>
                <Input value={`৳${salesInvoiceVat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Discount</Label>
                <Input type="number" min="0" value={salesInvoiceForm.discount} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, discount: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Grand Total</Label>
                <Input value={`৳${salesInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="font-bold bg-primary/10" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={salesInvoiceForm.remarks} onChange={(e) => setSalesInvoiceForm({ ...salesInvoiceForm, remarks: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSalesInvoice} disabled={!salesInvoiceForm.client_id || salesInvoiceItems.every(i => !i.rate)}>Save Invoice</Button>
          </DialogFooter>
            </div>
          </ScrollArea>
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
              <Label>Client *</Label>
              <Select value={collectionForm.client_id} onValueChange={(v) => setCollectionForm({ ...collectionForm, client_id: v, invoice_id: '' })}>
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
                <Label>Amount *</Label>
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
            <Button onClick={handleSaveCollection} disabled={!collectionForm.client_id || !collectionForm.amount}>Save</Button>
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
              <Label>Provider *</Label>
              <Select value={providerPaymentForm.provider_id} onValueChange={(v) => setProviderPaymentForm({ ...providerPaymentForm, provider_id: v, bill_id: '' })}>
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
                <Label>Amount *</Label>
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
            <Button onClick={handleSaveProviderPayment} disabled={!providerPaymentForm.provider_id || !providerPaymentForm.amount}>Save</Button>
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

      {/* Purchase Bill Details Sheet */}
      <Sheet open={!!viewPurchaseBill} onOpenChange={() => setViewPurchaseBill(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Purchase Bill Details</SheetTitle>
            <SheetDescription>Invoice: {viewPurchaseBill?.invoice_number}</SheetDescription>
          </SheetHeader>
          {viewPurchaseBill && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{viewPurchaseBill.provider?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing Date</p>
                  <p className="font-medium">{format(new Date(viewPurchaseBill.billing_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewPurchaseBill.payment_status === 'paid' ? 'default' : 'destructive'}>{viewPurchaseBill.payment_status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{viewPurchaseBill.payment_method?.replace('_', ' ') || 'N/A'}</p>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>৳{(viewPurchaseBill.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span>৳{(viewPurchaseBill.vat_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-৳{(viewPurchaseBill.discount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span>৳{viewPurchaseBill.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600">৳{viewPurchaseBill.paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span className="text-red-600">৳{viewPurchaseBill.due_amount.toLocaleString()}</span>
                </div>
              </div>
              {viewPurchaseBill.remarks && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p>{viewPurchaseBill.remarks}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => handleDownloadPDF('purchase', viewPurchaseBill)} className="flex-1">
                  <FileText className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={() => handlePrint('purchase', viewPurchaseBill)} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sales Invoice Details Sheet */}
      <Sheet open={!!viewSalesInvoice} onOpenChange={() => setViewSalesInvoice(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Sales Invoice Details</SheetTitle>
            <SheetDescription>Invoice: {viewSalesInvoice?.invoice_number}</SheetDescription>
          </SheetHeader>
          {viewSalesInvoice && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{viewSalesInvoice.client?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing Date</p>
                  <p className="font-medium">{format(new Date(viewSalesInvoice.billing_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{viewSalesInvoice.due_date ? format(new Date(viewSalesInvoice.due_date), 'dd/MM/yyyy') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewSalesInvoice.payment_status === 'paid' ? 'default' : 'destructive'}>{viewSalesInvoice.payment_status}</Badge>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>৳{(viewSalesInvoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span>৳{(viewSalesInvoice.vat_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-৳{(viewSalesInvoice.discount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span>৳{viewSalesInvoice.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600">৳{viewSalesInvoice.paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span className="text-red-600">৳{viewSalesInvoice.due_amount.toLocaleString()}</span>
                </div>
              </div>
              {viewSalesInvoice.remarks && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p>{viewSalesInvoice.remarks}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => handleDownloadPDF('sales', viewSalesInvoice)} className="flex-1">
                  <FileText className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={() => handlePrint('sales', viewSalesInvoice)} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Provider Ledger Sheet */}
      <Sheet open={!!viewProviderLedger} onOpenChange={() => setViewProviderLedger(null)}>
        <SheetContent className="w-[700px] sm:max-w-[700px]">
          <SheetHeader>
            <SheetTitle>Provider Ledger</SheetTitle>
            <SheetDescription>{viewProviderLedger?.name} - {viewProviderLedger?.company_name}</SheetDescription>
          </SheetHeader>
          {viewProviderLedger && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Bills</p>
                    <p className="text-xl font-bold">৳{getProviderLedger(viewProviderLedger.id).bills.reduce((sum, b) => sum + b.total_amount, 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">৳{getProviderLedger(viewProviderLedger.id).payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Balance Due</p>
                    <p className="text-xl font-bold text-red-600">৳{(viewProviderLedger.total_due || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recent Transactions</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...getProviderLedger(viewProviderLedger.id).bills.map(b => ({ date: b.billing_date, type: 'Bill', ref: b.invoice_number, amount: b.total_amount, isDebit: true })),
                      ...getProviderLedger(viewProviderLedger.id).payments.map(p => ({ date: p.payment_date, type: 'Payment', ref: p.payment_number, amount: p.amount, isDebit: false })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell>{format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>{tx.ref}</TableCell>
                        <TableCell className={`text-right ${tx.isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.isDebit ? '+' : '-'}৳{tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Client Ledger Sheet */}
      <Sheet open={!!viewClientLedger} onOpenChange={() => setViewClientLedger(null)}>
        <SheetContent className="w-[700px] sm:max-w-[700px]">
          <SheetHeader>
            <SheetTitle>Client Ledger</SheetTitle>
            <SheetDescription>{viewClientLedger?.name} - {viewClientLedger?.company_name}</SheetDescription>
          </SheetHeader>
          {viewClientLedger && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Invoiced</p>
                    <p className="text-xl font-bold">৳{getClientLedger(viewClientLedger.id).invoices.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                    <p className="text-xl font-bold text-green-600">৳{getClientLedger(viewClientLedger.id).collections.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Balance Receivable</p>
                    <p className="text-xl font-bold text-orange-600">৳{(viewClientLedger.total_receivable || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recent Transactions</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...getClientLedger(viewClientLedger.id).invoices.map(i => ({ date: i.billing_date, type: 'Invoice', ref: i.invoice_number, amount: i.total_amount, isDebit: true })),
                      ...getClientLedger(viewClientLedger.id).collections.map(c => ({ date: c.collection_date, type: 'Collection', ref: c.receipt_number, amount: c.amount, isDebit: false })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell>{format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>{tx.ref}</TableCell>
                        <TableCell className={`text-right ${tx.isDebit ? 'text-orange-600' : 'text-green-600'}`}>
                          {tx.isDebit ? '+' : '-'}৳{tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
