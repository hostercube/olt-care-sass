import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileDown, Printer, Users, FileText, DollarSign, Package, 
  Calendar, TrendingUp, AlertTriangle, Building2, Filter
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    customer_code: string | null;
    company_name: string | null;
    due_amount: number;
    total_purchase: number;
  }>;
  sales: Array<{
    id: string;
    invoice_number: string;
    sale_date: string;
    customer_name: string | null;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    status: string;
  }>;
  suppliers: Array<{
    id: string;
    name: string;
    company_name: string | null;
    phone: string | null;
    current_balance: number;
  }>;
  purchases: Array<{
    id: string;
    order_number: string;
    order_date: string;
    supplier_name: string | null;
    total: number;
    paid_amount: number;
    status: string;
  }>;
  payments: Array<{
    id: string;
    customer_name: string | null;
    amount: number;
    payment_date: string;
    payment_method: string;
  }>;
  inventory: Array<{
    id: string;
    name: string;
    sku: string | null;
    category_name: string | null;
    quantity: number;
    unit_price: number;
    sale_price: number;
  }>;
  tenantInfo?: {
    company_name?: string | null;
    phone?: string | null;
    address?: string | null;
  };
}

type ReportType = 'due-customers' | 'due-invoices' | 'paid-invoices' | 'today-sales' | 'yesterday-sales' | 
                  'collections' | 'purchases' | 'supplier-dues' | 'inventory' | 'low-stock' | 'customer-summary';

export function AdvancedReportsDialog({
  open,
  onOpenChange,
  customers,
  sales,
  suppliers,
  purchases,
  payments,
  inventory,
  tenantInfo,
}: ReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>('due-customers');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  // Computed report data
  const reportData = useMemo(() => {
    const startDate = new Date(dateFrom);
    const endDate = endOfDay(new Date(dateTo));

    switch (reportType) {
      case 'due-customers':
        return {
          title: 'Due Customers Report',
          subtitle: `${customers.filter(c => c.due_amount > 0).length} customers with outstanding balance`,
          columns: ['#', 'Code', 'Name', 'Phone', 'Company', 'Due Amount'],
          rows: customers.filter(c => c.due_amount > 0).map((c, idx) => [
            idx + 1,
            c.customer_code || '-',
            c.name,
            c.phone || '-',
            c.company_name || '-',
            `৳${c.due_amount.toLocaleString()}`
          ]),
          summary: {
            total: customers.filter(c => c.due_amount > 0).reduce((sum, c) => sum + c.due_amount, 0),
            count: customers.filter(c => c.due_amount > 0).length
          }
        };

      case 'due-invoices':
        const dueInvoices = sales.filter(s => s.due_amount > 0);
        return {
          title: 'Due Invoices Report',
          subtitle: `${dueInvoices.length} invoices with pending payment`,
          columns: ['#', 'Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Due'],
          rows: dueInvoices.map((s, idx) => [
            idx + 1,
            s.invoice_number,
            format(new Date(s.sale_date), 'dd/MM/yyyy'),
            s.customer_name || 'Walk-in',
            `৳${s.total_amount.toLocaleString()}`,
            `৳${s.paid_amount.toLocaleString()}`,
            `৳${s.due_amount.toLocaleString()}`
          ]),
          summary: {
            total: dueInvoices.reduce((sum, s) => sum + s.due_amount, 0),
            count: dueInvoices.length
          }
        };

      case 'paid-invoices':
        const paidInvoices = sales.filter(s => s.status === 'completed' && 
          isWithinInterval(new Date(s.sale_date), { start: startDate, end: endDate }));
        return {
          title: 'Paid Invoices Report',
          subtitle: `${dateFrom} to ${dateTo}`,
          columns: ['#', 'Invoice', 'Date', 'Customer', 'Amount', 'Method'],
          rows: paidInvoices.map((s, idx) => [
            idx + 1,
            s.invoice_number,
            format(new Date(s.sale_date), 'dd/MM/yyyy'),
            s.customer_name || 'Walk-in',
            `৳${s.total_amount.toLocaleString()}`,
            s.status
          ]),
          summary: {
            total: paidInvoices.reduce((sum, s) => sum + s.total_amount, 0),
            count: paidInvoices.length
          }
        };

      case 'today-sales':
        const todaySales = sales.filter(s => 
          startOfDay(new Date(s.sale_date)).getTime() === today.getTime());
        return {
          title: "Today's Sales Report",
          subtitle: format(new Date(), 'dd MMMM yyyy'),
          columns: ['#', 'Invoice', 'Time', 'Customer', 'Total', 'Paid', 'Due'],
          rows: todaySales.map((s, idx) => [
            idx + 1,
            s.invoice_number,
            format(new Date(s.sale_date), 'HH:mm'),
            s.customer_name || 'Walk-in',
            `৳${s.total_amount.toLocaleString()}`,
            `৳${s.paid_amount.toLocaleString()}`,
            `৳${s.due_amount.toLocaleString()}`
          ]),
          summary: {
            total: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
            paid: todaySales.reduce((sum, s) => sum + s.paid_amount, 0),
            due: todaySales.reduce((sum, s) => sum + s.due_amount, 0),
            count: todaySales.length
          }
        };

      case 'yesterday-sales':
        const yesterdaySales = sales.filter(s => 
          startOfDay(new Date(s.sale_date)).getTime() === yesterday.getTime());
        return {
          title: "Yesterday's Sales Report",
          subtitle: format(yesterday, 'dd MMMM yyyy'),
          columns: ['#', 'Invoice', 'Time', 'Customer', 'Total', 'Paid', 'Due'],
          rows: yesterdaySales.map((s, idx) => [
            idx + 1,
            s.invoice_number,
            format(new Date(s.sale_date), 'HH:mm'),
            s.customer_name || 'Walk-in',
            `৳${s.total_amount.toLocaleString()}`,
            `৳${s.paid_amount.toLocaleString()}`,
            `৳${s.due_amount.toLocaleString()}`
          ]),
          summary: {
            total: yesterdaySales.reduce((sum, s) => sum + s.total_amount, 0),
            paid: yesterdaySales.reduce((sum, s) => sum + s.paid_amount, 0),
            count: yesterdaySales.length
          }
        };

      case 'collections':
        const filteredPayments = payments.filter(p =>
          isWithinInterval(new Date(p.payment_date), { start: startDate, end: endDate }));
        return {
          title: 'Collections Report',
          subtitle: `${dateFrom} to ${dateTo}`,
          columns: ['#', 'Date', 'Customer', 'Amount', 'Method'],
          rows: filteredPayments.map((p, idx) => [
            idx + 1,
            format(new Date(p.payment_date), 'dd/MM/yyyy HH:mm'),
            p.customer_name || '-',
            `৳${p.amount.toLocaleString()}`,
            p.payment_method
          ]),
          summary: {
            total: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
            count: filteredPayments.length
          }
        };

      case 'purchases':
        const filteredPurchases = purchases.filter(p =>
          isWithinInterval(new Date(p.order_date), { start: startDate, end: endDate }));
        return {
          title: 'Purchases Report',
          subtitle: `${dateFrom} to ${dateTo}`,
          columns: ['#', 'Order #', 'Date', 'Supplier', 'Total', 'Paid', 'Due', 'Status'],
          rows: filteredPurchases.map((p, idx) => [
            idx + 1,
            p.order_number,
            format(new Date(p.order_date), 'dd/MM/yyyy'),
            p.supplier_name || '-',
            `৳${p.total.toLocaleString()}`,
            `৳${(p.paid_amount || 0).toLocaleString()}`,
            `৳${(p.total - (p.paid_amount || 0)).toLocaleString()}`,
            p.status
          ]),
          summary: {
            total: filteredPurchases.reduce((sum, p) => sum + p.total, 0),
            paid: filteredPurchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
            count: filteredPurchases.length
          }
        };

      case 'supplier-dues':
        const suppliersWithDue = suppliers.filter(s => (s.current_balance || 0) > 0);
        return {
          title: 'Supplier Dues Report',
          subtitle: `${suppliersWithDue.length} suppliers with outstanding payment`,
          columns: ['#', 'Name', 'Company', 'Phone', 'Due Amount'],
          rows: suppliersWithDue.map((s, idx) => [
            idx + 1,
            s.name,
            s.company_name || '-',
            s.phone || '-',
            `৳${(s.current_balance || 0).toLocaleString()}`
          ]),
          summary: {
            total: suppliersWithDue.reduce((sum, s) => sum + (s.current_balance || 0), 0),
            count: suppliersWithDue.length
          }
        };

      case 'inventory':
        return {
          title: 'Inventory Report',
          subtitle: `${inventory.length} products in stock`,
          columns: ['#', 'SKU', 'Name', 'Category', 'Qty', 'Cost', 'Sale Price', 'Value'],
          rows: inventory.map((i, idx) => [
            idx + 1,
            i.sku || '-',
            i.name,
            i.category_name || '-',
            i.quantity,
            `৳${i.unit_price.toLocaleString()}`,
            `৳${i.sale_price.toLocaleString()}`,
            `৳${(i.quantity * i.unit_price).toLocaleString()}`
          ]),
          summary: {
            total: inventory.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0),
            count: inventory.length
          }
        };

      case 'low-stock':
        const lowStock = inventory.filter(i => i.quantity <= 5);
        return {
          title: 'Low Stock Report',
          subtitle: `${lowStock.length} items need restocking`,
          columns: ['#', 'SKU', 'Name', 'Current Stock', 'Sale Price'],
          rows: lowStock.map((i, idx) => [
            idx + 1,
            i.sku || '-',
            i.name,
            i.quantity,
            `৳${i.sale_price.toLocaleString()}`
          ]),
          summary: {
            count: lowStock.length
          }
        };

      case 'customer-summary':
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
          return {
            title: 'Customer Summary',
            subtitle: 'Please select a customer',
            columns: [],
            rows: [],
            summary: {}
          };
        }
        const customerSales = sales.filter(s => s.customer_name === customer.name);
        const customerPayments = payments.filter(p => p.customer_name === customer.name);
        return {
          title: `Customer Summary: ${customer.name}`,
          subtitle: `Code: ${customer.customer_code || '-'} | Phone: ${customer.phone || '-'}`,
          columns: ['Type', 'Date', 'Reference', 'Debit', 'Credit', 'Balance'],
          rows: [
            ...customerSales.map(s => [
              'Sale',
              format(new Date(s.sale_date), 'dd/MM/yyyy'),
              s.invoice_number,
              `৳${s.total_amount.toLocaleString()}`,
              `৳${s.paid_amount.toLocaleString()}`,
              '-'
            ]),
            ...customerPayments.map(p => [
              'Payment',
              format(new Date(p.payment_date), 'dd/MM/yyyy'),
              p.payment_method,
              '-',
              `৳${p.amount.toLocaleString()}`,
              '-'
            ])
          ].sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime()),
          summary: {
            totalPurchase: customer.total_purchase,
            due: customer.due_amount
          },
          customer
        };

      default:
        return { title: '', subtitle: '', columns: [], rows: [], summary: {} };
    }
  }, [reportType, customers, sales, suppliers, purchases, payments, inventory, dateFrom, dateTo, selectedCustomerId]);

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHeaders = reportData.columns.map(col => `<th>${col}</th>`).join('');
    const tableRows = reportData.rows.map(row => 
      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .company { font-size: 16px; font-weight: bold; }
          .title { font-size: 14px; margin-top: 10px; text-transform: uppercase; }
          .subtitle { font-size: 10px; color: #666; margin-top: 5px; }
          .summary { display: flex; gap: 20px; margin: 15px 0; padding: 10px; background: #f5f5f5; }
          .summary-item { }
          .summary-label { font-size: 9px; color: #666; }
          .summary-value { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 10px; }
          td { padding: 6px 8px; border: 1px solid #eee; font-size: 10px; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${tenantInfo?.company_name || 'Company'}</div>
          ${tenantInfo?.address ? `<div style="font-size:10px;color:#666">${tenantInfo.address}</div>` : ''}
          ${tenantInfo?.phone ? `<div style="font-size:10px;color:#666">Tel: ${tenantInfo.phone}</div>` : ''}
          <div class="title">${reportData.title}</div>
          <div class="subtitle">${reportData.subtitle}</div>
          <div class="subtitle">Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        </div>
        
        ${reportData.summary && Object.keys(reportData.summary).length > 0 ? `
          <div class="summary">
            ${(reportData.summary as any).total !== undefined ? `
              <div class="summary-item">
                <div class="summary-label">Total Amount</div>
                <div class="summary-value">৳${((reportData.summary as any).total || 0).toLocaleString()}</div>
              </div>
            ` : ''}
            ${(reportData.summary as any).count !== undefined ? `
              <div class="summary-item">
                <div class="summary-label">Total Records</div>
                <div class="summary-value">${(reportData.summary as any).count}</div>
              </div>
            ` : ''}
            ${(reportData.summary as any).paid !== undefined ? `
              <div class="summary-item">
                <div class="summary-label">Paid Amount</div>
                <div class="summary-value">৳${((reportData.summary as any).paid || 0).toLocaleString()}</div>
              </div>
            ` : ''}
            ${(reportData.summary as any).due !== undefined ? `
              <div class="summary-item">
                <div class="summary-label">Due Amount</div>
                <div class="summary-value" style="color:#dc2626">৳${((reportData.summary as any).due || 0).toLocaleString()}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        
        <div class="footer">Report generated by ISP Manager</div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const REPORT_TYPES: { value: ReportType; label: string; icon: typeof Users }[] = [
    { value: 'due-customers', label: 'Due Customers', icon: Users },
    { value: 'due-invoices', label: 'Due Invoices', icon: FileText },
    { value: 'paid-invoices', label: 'Paid Invoices', icon: FileText },
    { value: 'today-sales', label: "Today's Sales", icon: TrendingUp },
    { value: 'yesterday-sales', label: "Yesterday's Sales", icon: Calendar },
    { value: 'collections', label: 'Collections', icon: DollarSign },
    { value: 'purchases', label: 'Purchases', icon: Package },
    { value: 'supplier-dues', label: 'Supplier Dues', icon: Building2 },
    { value: 'inventory', label: 'Inventory', icon: Package },
    { value: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
    { value: 'customer-summary', label: 'Customer Summary', icon: Users },
  ];

  const needsDateFilter = ['paid-invoices', 'collections', 'purchases'].includes(reportType);
  const needsCustomerSelect = reportType === 'customer-summary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Advanced Reports</DialogTitle>
          <DialogDescription>Generate and print detailed reports with filters</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <ScrollArea className="h-[400px] border rounded-lg">
              {REPORT_TYPES.map(rt => (
                <div
                  key={rt.value}
                  onClick={() => setReportType(rt.value)}
                  className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-muted ${
                    reportType === rt.value ? 'bg-primary/10 border-l-2 border-primary' : ''
                  }`}
                >
                  <rt.icon className="h-4 w-4" />
                  <span className="text-sm">{rt.label}</span>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Report Content */}
          <div className="col-span-3 space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-end">
              {needsDateFilter && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </>
              )}
              {needsCustomerSelect && (
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Select Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.customer_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={printReport} className="h-8" disabled={reportData.rows.length === 0}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>

            {/* Summary Cards */}
            {reportData.summary && Object.keys(reportData.summary).length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {(reportData.summary as any).total !== undefined && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">৳{((reportData.summary as any).total || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                )}
                {(reportData.summary as any).count !== undefined && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Records</p>
                      <p className="text-lg font-bold">{(reportData.summary as any).count}</p>
                    </CardContent>
                  </Card>
                )}
                {(reportData.summary as any).paid !== undefined && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="text-lg font-bold text-green-600">৳{((reportData.summary as any).paid || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                )}
                {(reportData.summary as any).due !== undefined && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Due</p>
                      <p className="text-lg font-bold text-orange-600">৳{((reportData.summary as any).due || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Report Table */}
            <div className="border rounded-lg">
              <div className="bg-muted px-3 py-2 border-b">
                <h3 className="font-semibold text-sm">{reportData.title}</h3>
                <p className="text-xs text-muted-foreground">{reportData.subtitle}</p>
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportData.columns.map((col, idx) => (
                        <TableHead key={idx} className="text-xs">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={reportData.columns.length || 1} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="text-xs">{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
