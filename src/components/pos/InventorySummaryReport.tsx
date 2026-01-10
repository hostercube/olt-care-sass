import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Calendar, Download, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';

interface TenantInfo {
  name: string;
  company_name?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  invoice_header?: string | null;
  invoice_footer?: string | null;
}

interface SaleData {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer_name: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string | null;
}

interface PurchaseData {
  id: string;
  order_number: string;
  order_date: string;
  supplier?: { name: string } | null;
  total: number;
  paid_amount: number;
}

interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  customer?: { name: string } | null;
}

interface SupplierPaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  supplier?: { name: string } | null;
}

interface InventorySummaryReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: SaleData[];
  purchases: PurchaseData[];
  customerPayments: PaymentData[];
  supplierPayments: SupplierPaymentData[];
  tenantInfo: TenantInfo | null;
}

export function InventorySummaryReport({
  open,
  onOpenChange,
  sales,
  purchases,
  customerPayments,
  supplierPayments,
  tenantInfo,
}: InventorySummaryReportProps) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'summary' | 'sales' | 'purchases' | 'collections' | 'all'>('summary');

  // Filter data by date range
  const filteredData = useMemo(() => {
    const fromDate = startOfDay(new Date(dateFrom));
    const toDate = endOfDay(new Date(dateTo));

    const filteredSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= fromDate && saleDate <= toDate;
    });

    const filteredPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.order_date);
      return purchaseDate >= fromDate && purchaseDate <= toDate;
    });

    const filteredCustomerPayments = customerPayments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate >= fromDate && paymentDate <= toDate;
    });

    const filteredSupplierPayments = supplierPayments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate >= fromDate && paymentDate <= toDate;
    });

    // Calculate totals
    const totalSales = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalPaid = filteredSales.reduce((sum, s) => sum + s.paid_amount, 0);
    const totalDue = filteredSales.reduce((sum, s) => sum + s.due_amount, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalPurchasePaid = filteredPurchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const totalPurchaseDue = totalPurchases - totalPurchasePaid;
    const totalCollections = filteredCustomerPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalSupplierPaid = filteredSupplierPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      sales: filteredSales,
      purchases: filteredPurchases,
      customerPayments: filteredCustomerPayments,
      supplierPayments: filteredSupplierPayments,
      totals: {
        totalSales,
        totalPaid,
        totalDue,
        totalPurchases,
        totalPurchasePaid,
        totalPurchaseDue,
        totalCollections,
        totalSupplierPaid,
        grossProfit: totalSales - totalPurchases,
        netCashFlow: totalCollections - totalSupplierPaid,
      },
    };
  }, [sales, purchases, customerPayments, supplierPayments, dateFrom, dateTo]);

  const handleQuickFilter = (filter: string) => {
    const now = new Date();
    if (filter === 'today') {
      setDateFrom(format(now, 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else if (filter === 'thisMonth') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (filter === 'lastMonth') {
      const lastMonth = subMonths(now, 1);
      setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
    }
  };

  const handlePrint = () => {
    const { sales: fSales, purchases: fPurchases, customerPayments: fPayments, supplierPayments: fSupPayments, totals } = filteredData;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Summary Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #333; }
          
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .company-name { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
          .company-info { font-size: 11px; color: #666; line-height: 1.5; }
          .report-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin-top: 10px; 
            text-transform: uppercase;
            background: #f0f0f0;
            padding: 8px;
            border-radius: 4px;
          }
          .date-range { font-size: 12px; color: #666; margin-top: 5px; }
          .print-date { font-size: 10px; color: #999; margin-top: 5px; }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 20px 0;
          }
          .summary-card {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
          }
          .summary-card.positive { background: #d4edda; }
          .summary-card.negative { background: #f8d7da; }
          .summary-card.info { background: #d1ecf1; }
          .summary-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
          .summary-card.positive .summary-value { color: #155724; }
          .summary-card.negative .summary-value { color: #721c24; }
          .summary-card.info .summary-value { color: #0c5460; }
          
          .section { margin: 25px 0; }
          .section-title { 
            font-size: 14px; 
            font-weight: bold; 
            margin-bottom: 10px;
            padding: 5px 10px;
            background: #e9ecef;
            border-left: 4px solid #333;
          }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { 
            background: #343a40; 
            color: white; 
            padding: 8px; 
            text-align: left; 
            font-size: 10px;
            text-transform: uppercase;
          }
          td { padding: 6px 8px; border-bottom: 1px solid #dee2e6; font-size: 10px; }
          tr:nth-child(even) { background: #f8f9fa; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          
          .grand-total {
            background: #343a40 !important;
            color: white !important;
            font-weight: bold;
            font-size: 11px;
          }
          .grand-total td {
            padding: 10px 8px;
            border: none;
          }
          
          .footer { 
            margin-top: 30px; 
            padding-top: 15px; 
            border-top: 1px solid #ddd; 
            text-align: center; 
            font-size: 10px; 
            color: #666;
          }
          
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${tenantInfo?.company_name || tenantInfo?.name || 'Company Name'}</div>
          <div class="company-info">
            ${tenantInfo?.address ? tenantInfo.address + '<br/>' : ''}
            ${tenantInfo?.phone ? 'Tel: ' + tenantInfo.phone : ''} ${tenantInfo?.email ? ' | Email: ' + tenantInfo.email : ''}
          </div>
          ${tenantInfo?.invoice_header ? `<div class="company-info">${tenantInfo.invoice_header}</div>` : ''}
          <div class="report-title">Inventory Summary Report</div>
          <div class="date-range">${format(new Date(dateFrom), 'dd MMM yyyy')} to ${format(new Date(dateTo), 'dd MMM yyyy')}</div>
          <div class="print-date">Print Date: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card positive">
            <div class="summary-label">Total Sales</div>
            <div class="summary-value">৳${totals.totalSales.toLocaleString()}</div>
          </div>
          <div class="summary-card info">
            <div class="summary-label">Total Paid</div>
            <div class="summary-value">৳${totals.totalPaid.toLocaleString()}</div>
          </div>
          <div class="summary-card negative">
            <div class="summary-label">Total Due</div>
            <div class="summary-value">৳${totals.totalDue.toLocaleString()}</div>
          </div>
          <div class="summary-card positive">
            <div class="summary-label">Collections</div>
            <div class="summary-value">৳${totals.totalCollections.toLocaleString()}</div>
          </div>
          <div class="summary-card info">
            <div class="summary-label">Total Purchases</div>
            <div class="summary-value">৳${totals.totalPurchases.toLocaleString()}</div>
          </div>
          <div class="summary-card info">
            <div class="summary-label">Purchase Paid</div>
            <div class="summary-value">৳${totals.totalPurchasePaid.toLocaleString()}</div>
          </div>
          <div class="summary-card negative">
            <div class="summary-label">Purchase Due</div>
            <div class="summary-value">৳${totals.totalPurchaseDue.toLocaleString()}</div>
          </div>
          <div class="summary-card ${totals.grossProfit >= 0 ? 'positive' : 'negative'}">
            <div class="summary-label">Gross Profit</div>
            <div class="summary-value">৳${totals.grossProfit.toLocaleString()}</div>
          </div>
        </div>

        ${reportType === 'summary' ? '' : `
        <!-- Sales Details -->
        ${(reportType === 'all' || reportType === 'sales') ? `
        <div class="section">
          <div class="section-title">Sales Details (${fSales.length} invoices)</div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              ${fSales.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${s.invoice_number}</td>
                  <td>${format(new Date(s.sale_date), 'dd/MM/yy')}</td>
                  <td>${s.customer_name || 'Walk-in'}</td>
                  <td>${s.payment_method || 'Cash'}</td>
                  <td class="text-right">৳${s.total_amount.toLocaleString()}</td>
                  <td class="text-right">৳${s.paid_amount.toLocaleString()}</td>
                  <td class="text-right">৳${s.due_amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="grand-total">
                <td colspan="5" class="text-right">Grand Total:</td>
                <td class="text-right">৳${totals.totalSales.toLocaleString()}</td>
                <td class="text-right">৳${totals.totalPaid.toLocaleString()}</td>
                <td class="text-right">৳${totals.totalDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Purchases Details -->
        ${(reportType === 'all' || reportType === 'purchases') ? `
        <div class="section">
          <div class="section-title">Purchase Details (${fPurchases.length} orders)</div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Order #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              ${fPurchases.map((p, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${p.order_number}</td>
                  <td>${format(new Date(p.order_date), 'dd/MM/yy')}</td>
                  <td>${p.supplier?.name || '-'}</td>
                  <td class="text-right">৳${p.total.toLocaleString()}</td>
                  <td class="text-right">৳${(p.paid_amount || 0).toLocaleString()}</td>
                  <td class="text-right">৳${(p.total - (p.paid_amount || 0)).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="grand-total">
                <td colspan="4" class="text-right">Grand Total:</td>
                <td class="text-right">৳${totals.totalPurchases.toLocaleString()}</td>
                <td class="text-right">৳${totals.totalPurchasePaid.toLocaleString()}</td>
                <td class="text-right">৳${totals.totalPurchaseDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Collections Details -->
        ${(reportType === 'all' || reportType === 'collections') ? `
        <div class="section">
          <div class="section-title">Customer Collections (${fPayments.length} payments)</div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${fPayments.map((p, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${format(new Date(p.payment_date), 'dd/MM/yy HH:mm')}</td>
                  <td>${p.customer?.name || 'Unknown'}</td>
                  <td>${p.payment_method}</td>
                  <td class="text-right">৳${p.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="grand-total">
                <td colspan="4" class="text-right">Grand Total:</td>
                <td class="text-right">৳${totals.totalCollections.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Supplier Payments (${fSupPayments.length} payments)</div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Method</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${fSupPayments.map((p, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${format(new Date(p.payment_date), 'dd/MM/yy HH:mm')}</td>
                  <td>${p.supplier?.name || 'Unknown'}</td>
                  <td>${p.payment_method}</td>
                  <td class="text-right">৳${p.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="grand-total">
                <td colspan="4" class="text-right">Grand Total:</td>
                <td class="text-right">৳${totals.totalSupplierPaid.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        `}

        <div class="footer">
          ${tenantInfo?.invoice_footer || 'Report generated by ISP Manager System'}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const { totals } = filteredData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inventory Summary Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quick Filter</Label>
              <Select onValueChange={handleQuickFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Only</SelectItem>
                  <SelectItem value="sales">Sales Details</SelectItem>
                  <SelectItem value="purchases">Purchase Details</SelectItem>
                  <SelectItem value="collections">Collection Details</SelectItem>
                  <SelectItem value="all">All Details</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-lg font-bold text-green-600">৳{totals.totalSales.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{filteredData.sales.length} invoices</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-blue-600">৳{totals.totalPaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Due</p>
                <p className="text-lg font-bold text-orange-600">৳{totals.totalDue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 dark:bg-emerald-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Collections</p>
                <p className="text-lg font-bold text-emerald-600">৳{totals.totalCollections.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{filteredData.customerPayments.length} payments</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-lg font-bold text-purple-600">৳{totals.totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{filteredData.purchases.length} orders</p>
              </CardContent>
            </Card>
            <Card className="bg-cyan-50 dark:bg-cyan-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Purchase Paid</p>
                <p className="text-lg font-bold text-cyan-600">৳{totals.totalPurchasePaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Purchase Due</p>
                <p className="text-lg font-bold text-red-600">৳{totals.totalPurchaseDue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={totals.grossProfit >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p className={`text-lg font-bold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{totals.grossProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Print Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
