import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { 
  FileText, Download, Loader2, BarChart3, Users, DollarSign, TrendingUp,
  AlertCircle, UserPlus, UserMinus, Wallet, Building2, Clock, Phone,
  CheckCircle, XCircle, Calendar, Printer, FileSpreadsheet, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Report types
const reportTypes = [
  { id: 'btrc', name: 'BTRC Report', icon: Building2 },
  { id: 'financial', name: 'Income Expense Profit Loss', icon: BarChart3 },
  { id: 'collection', name: 'Collection Report', icon: Wallet },
  { id: 'collector', name: 'Connection Man Wise Bill Report', icon: Users },
  { id: 'salary', name: 'Employee Salary Report', icon: DollarSign },
  { id: 'new-connections', name: 'Monthly New Line', icon: UserPlus },
  { id: 'disabled', name: 'Permanent Disabled Report', icon: UserMinus },
  { id: 'due-bills', name: 'Monthly Due Bill', icon: AlertCircle },
  { id: 'non-generated', name: 'Non Generated Bill', icon: XCircle },
  { id: 'today-new', name: 'Todays New Line', icon: Clock },
  { id: 'connection-request', name: 'Connection Request Report', icon: Phone },
  { id: 'complain', name: 'Complain Report', icon: AlertCircle },
];

const ITEMS_PER_PAGE = 20;

// Pagination component
const TablePagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
  totalItems: number;
}) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <p className="text-sm text-muted-foreground">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default function Reports() {
  const { tenantId, tenant } = useTenantContext();
  const { t } = useLanguageCurrency();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState('btrc');
  const [reportData, setReportData] = useState<any>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination states
  const [collectionPage, setCollectionPage] = useState(1);
  const [newConnectionsPage, setNewConnectionsPage] = useState(1);
  const [disabledPage, setDisabledPage] = useState(1);
  const [dueBillsPage, setDueBillsPage] = useState(1);
  const [nonGeneratedPage, setNonGeneratedPage] = useState(1);
  const [todayNewPage, setTodayNewPage] = useState(1);

  // Reset pagination when tab changes
  useEffect(() => {
    setCollectionPage(1);
    setNewConnectionsPage(1);
    setDisabledPage(1);
    setDueBillsPage(1);
    setNonGeneratedPage(1);
    setTodayNewPage(1);
    setSearchQuery('');
    setStatusFilter('all');
  }, [activeTab]);

  const fetchReportData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const startDate = startOfMonth(parseISO(selectedMonth + '-01'));
      const endDate = endOfMonth(startDate);

      const [
        customersRes,
        billsRes,
        paymentsRes,
        staffRes,
        salaryPaymentsRes,
        transactionsRes,
        categoriesRes
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, status, created_at, monthly_bill, customer_code, phone, pppoe_username, expiry_date, connection_date, package:isp_packages(name, price), area:areas(name)')
          .eq('tenant_id', tenantId),
        supabase
          .from('customer_bills')
          .select('*, customer:customers(name, customer_code, phone)')
          .eq('tenant_id', tenantId)
          .eq('billing_month', selectedMonth),
        supabase
          .from('customer_payments')
          .select('*, customer:customers(name, customer_code), collected_by')
          .eq('tenant_id', tenantId)
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString()),
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', tenantId),
        supabase
          .from('salary_payments')
          .select('*, staff:staff(name, designation)')
          .eq('tenant_id', tenantId)
          .eq('month', selectedMonth),
        supabase
          .from('transactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('tenant_id', tenantId)
      ]);

      const customers = customersRes.data || [];
      const bills = billsRes.data || [];
      const payments = paymentsRes.data || [];
      const staff = staffRes.data || [];
      const salaryPayments = salaryPaymentsRes.data || [];
      const transactions = transactionsRes.data || [];
      const categories = categoriesRes.data || [];

      const activeCustomers = customers.filter(c => c.status === 'active').length;
      const totalCustomers = customers.length;
      const newCustomers = customers.filter(c => 
        c.created_at && c.created_at.startsWith(selectedMonth)
      );
      const disabledCustomers = customers.filter(c => c.status === 'suspended' || c.status === 'cancelled');
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayNewCustomers = customers.filter(c => 
        c.created_at && c.created_at.startsWith(todayStr)
      );

      const paidBills = bills.filter(b => b.status === 'paid');
      const unpaidBills = bills.filter(b => b.status !== 'paid');
      const partialBills = bills.filter(b => b.status === 'partial');
      
      const monthlyCollection = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const monthlyDue = unpaidBills.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0);
      
      const incomeTransactions = transactions.filter((t: any) => t.type === 'income');
      const expenseTransactions = transactions.filter((t: any) => t.type === 'expense');
      const totalTransactionIncome = incomeTransactions.reduce((sum, t: any) => sum + Number(t.amount), 0);
      const totalTransactionExpense = expenseTransactions.reduce((sum, t: any) => sum + Number(t.amount), 0);

      const incomeByCategory: Record<string, { name: string; amount: number }> = {};
      const expenseByCategory: Record<string, { name: string; amount: number }> = {};
      
      incomeTransactions.forEach((t: any) => {
        const catId = t.category_id || 'uncategorized';
        const cat = categories.find((c: any) => c.id === catId);
        if (!incomeByCategory[catId]) {
          incomeByCategory[catId] = { name: cat?.name || 'Uncategorized', amount: 0 };
        }
        incomeByCategory[catId].amount += Number(t.amount);
      });

      expenseTransactions.forEach((t: any) => {
        const catId = t.category_id || 'uncategorized';
        const cat = categories.find((c: any) => c.id === catId);
        if (!expenseByCategory[catId]) {
          expenseByCategory[catId] = { name: cat?.name || 'Uncategorized', amount: 0 };
        }
        expenseByCategory[catId].amount += Number(t.amount);
      });

      const collectorPayments: Record<string, { name: string; amount: number; count: number }> = {};
      payments.forEach(p => {
        const collectorId = p.collected_by || 'unknown';
        if (!collectorPayments[collectorId]) {
          collectorPayments[collectorId] = { name: collectorId === 'unknown' ? 'Online/Self' : 'Collector', amount: 0, count: 0 };
        }
        collectorPayments[collectorId].amount += Number(p.amount);
        collectorPayments[collectorId].count += 1;
      });

      const customersWithBills = new Set(bills.map(b => b.customer_id));
      const nonGeneratedBillCustomers = customers.filter(c => 
        c.status === 'active' && !customersWithBills.has(c.id)
      );

      const totalSalary = salaryPayments.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

      setReportData({
        totalCustomers,
        activeCustomers,
        newCustomers,
        disabledCustomers,
        todayNewCustomers,
        monthlyCollection,
        monthlyDue,
        bills,
        paidBills,
        unpaidBills,
        partialBills,
        payments,
        collectorPayments: Object.values(collectorPayments),
        staff,
        salaryPayments,
        totalSalary,
        nonGeneratedBillCustomers,
        customers,
        transactions,
        categories,
        totalTransactionIncome,
        totalTransactionExpense,
        incomeByCategory: Object.values(incomeByCategory),
        expenseByCategory: Object.values(expenseByCategory),
        totalIncome: monthlyCollection + totalTransactionIncome,
        totalExpense: totalSalary + totalTransactionExpense,
      });
    } catch (err) {
      console.error('Error fetching report:', err);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedMonth]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const generateMonths = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return months;
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        const value = row[key] ?? '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${selectedMonth}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };

  const downloadReport = (type: string) => {
    switch (type) {
      case 'BTRC':
        exportToCSV(
          [{ 
            isp_name: tenant?.name,
            report_period: format(parseISO(selectedMonth + '-01'), 'MMMM yyyy'),
            total_subscribers: reportData?.totalCustomers,
            active_subscribers: reportData?.activeCustomers,
            new_connections: reportData?.newCustomers?.length,
            disconnected: reportData?.disabledCustomers?.length,
            monthly_collection: reportData?.monthlyCollection
          }],
          'btrc_report',
          ['ISP Name', 'Report Period', 'Total Subscribers', 'Active Subscribers', 'New Connections', 'Disconnected', 'Monthly Collection']
        );
        break;
      case 'Collection':
        exportToCSV(
          reportData?.bills?.map((b: any) => ({
            bill_no: b.bill_number,
            customer: b.customer?.name,
            amount: b.total_amount,
            paid: b.paid_amount || 0,
            status: b.status,
          })) || [],
          'collection_report',
          ['Bill No', 'Customer', 'Amount', 'Paid', 'Status']
        );
        break;
      case 'Due Bills':
        exportToCSV(
          reportData?.unpaidBills?.map((b: any) => ({
            bill_no: b.bill_number,
            customer: b.customer?.name,
            phone: b.customer?.phone,
            amount: b.total_amount,
            paid: b.paid_amount || 0,
            due: b.total_amount - (b.paid_amount || 0),
          })) || [],
          'due_bills_report',
          ['Bill No', 'Customer', 'Phone', 'Amount', 'Paid', 'Due']
        );
        break;
      default:
        toast.success(`${type} report download started`);
    }
  };

  // Filter and paginate helper
  const filterAndPaginate = useCallback((items: any[], page: number, filterFn?: (item: any) => boolean) => {
    let filtered = items || [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => 
        item.name?.toLowerCase().includes(query) ||
        item.customer_code?.toLowerCase().includes(query) ||
        item.phone?.includes(query) ||
        item.customer?.name?.toLowerCase().includes(query) ||
        item.bill_number?.toLowerCase().includes(query)
      );
    }
    
    if (filterFn) {
      filtered = filtered.filter(filterFn);
    }
    
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    
    return { items: paginatedItems, totalPages, totalItems: filtered.length };
  }, [searchQuery]);

  // Filtered data for collection tab
  const filteredBills = useMemo(() => {
    let bills = reportData?.bills || [];
    if (statusFilter !== 'all') {
      bills = bills.filter((b: any) => b.status === statusFilter);
    }
    return filterAndPaginate(bills, collectionPage);
  }, [reportData?.bills, statusFilter, collectionPage, filterAndPaginate]);

  // Render filter bar
  const renderFilterBar = (showStatusFilter = false, statusOptions?: { value: string; label: string }[]) => (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('search') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {showStatusFilter && statusOptions && (
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('filter_by_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (activeTab) {
      case 'btrc':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  BTRC Monthly Report
                </CardTitle>
                <CardDescription>Bangladesh Telecommunication Regulatory Commission compliance report</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadReport('BTRC')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">ISP Name</p>
                    <p className="font-medium">{tenant?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Report Period</p>
                    <p className="font-medium">{format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Subscribers</p>
                    <p className="font-medium">{reportData?.totalCustomers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Subscribers</p>
                    <p className="font-medium text-green-600">{reportData?.activeCustomers}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Registered Subscribers</TableCell>
                      <TableCell className="text-right font-medium">{reportData?.totalCustomers}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Active Subscribers</TableCell>
                      <TableCell className="text-right font-medium">{reportData?.activeCustomers}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>New Connections This Month</TableCell>
                      <TableCell className="text-right font-medium">{reportData?.newCustomers?.length || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Disconnected/Disabled</TableCell>
                      <TableCell className="text-right font-medium">{reportData?.disabledCustomers?.length || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Monthly Collection</TableCell>
                      <TableCell className="text-right font-medium">৳{reportData?.monthlyCollection?.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case 'financial':
        const printFinancialReport = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            toast.error('Please allow pop-ups to print');
            return;
          }

          const monthName = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
          const totalIncome = reportData?.totalIncome || 0;
          const totalExpense = reportData?.totalExpense || 0;
          const netProfit = totalIncome - totalExpense;

          const incomeRows = [
            `<tr class="income-row"><td>Bill Collection</td><td class="amount income">+৳${(reportData?.monthlyCollection || 0).toLocaleString()}</td></tr>`,
            ...(reportData?.incomeByCategory?.map((cat: any) => 
              `<tr class="income-row indent"><td>${cat.name}</td><td class="amount income">+৳${cat.amount.toLocaleString()}</td></tr>`
            ) || [])
          ].join('');

          const expenseRows = [
            `<tr class="expense-row"><td>Staff Salary</td><td class="amount expense">-৳${(reportData?.totalSalary || 0).toLocaleString()}</td></tr>`,
            ...(reportData?.expenseByCategory?.map((cat: any) => 
              `<tr class="expense-row indent"><td>${cat.name}</td><td class="amount expense">-৳${cat.amount.toLocaleString()}</td></tr>`
            ) || [])
          ].join('');

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Income & Expense Report - ${monthName}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; padding: 30px; background: #fff; color: #333; }
                .header { text-align: center; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 3px solid #3b82f6; }
                .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
                .header p { color: #64748b; font-size: 14px; }
                .company { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 5px; }
                .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 40px; }
                .summary-card { padding: 25px; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
                .summary-card.income { background: linear-gradient(145deg, #d1fae5, #a7f3d0); border: 2px solid #10b981; }
                .summary-card.expense { background: linear-gradient(145deg, #fee2e2, #fecaca); border: 2px solid #ef4444; }
                .summary-card.profit { background: linear-gradient(145deg, #dbeafe, #bfdbfe); border: 2px solid #3b82f6; }
                .summary-card .label { font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
                .summary-card .value { font-size: 32px; font-weight: bold; margin-top: 8px; }
                .summary-card.income .value { color: #059669; }
                .summary-card.expense .value { color: #dc2626; }
                .summary-card.profit .value { color: #2563eb; }
                .summary-card .sub { font-size: 11px; color: #64748b; margin-top: 5px; }
                .section { margin-bottom: 35px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                .section-title { font-size: 16px; font-weight: 700; padding: 15px 20px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                th { background: #f1f5f9; padding: 14px 20px; text-align: left; font-weight: 600; color: #475569; }
                td { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
                tr:hover { background: #f8fafc; }
                .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; font-size: 15px; }
                .amount.income { color: #059669; }
                .amount.expense { color: #dc2626; }
                .indent td:first-child { padding-left: 45px; color: #64748b; }
                .total-row { background: #f8fafc; font-weight: bold; }
                .total-row td { border-top: 2px solid #e2e8f0; font-size: 15px; }
                .grand-total { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
                .grand-total td { border-top: 3px solid #3b82f6; font-size: 16px; }
                .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
                @media print { 
                  body { padding: 15px; } 
                  .summary-card, .section { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <p class="company">${tenant?.name || 'ISP Management'}</p>
                <h1>📊 Income, Expense & Profit/Loss Report</h1>
                <p>Report Period: ${monthName}</p>
              </div>

              <div class="summary-grid">
                <div class="summary-card income">
                  <div class="label">Total Income</div>
                  <div class="value">৳${totalIncome.toLocaleString()}</div>
                  <div class="sub">Collection + Other Income</div>
                </div>
                <div class="summary-card expense">
                  <div class="label">Total Expense</div>
                  <div class="value">৳${totalExpense.toLocaleString()}</div>
                  <div class="sub">Salary + Other Expenses</div>
                </div>
                <div class="summary-card profit">
                  <div class="label">Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</div>
                  <div class="value" style="color: ${netProfit >= 0 ? '#059669' : '#dc2626'};">${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</div>
                  <div class="sub">${netProfit >= 0 ? 'Positive Balance' : 'Negative Balance'}</div>
                </div>
              </div>

              <div class="section">
                <h3 class="section-title">📈 Detailed Breakdown</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Category / Item</th>
                      <th style="text-align: right; width: 200px;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="background: #ecfdf5;"><td><strong>💰 Income Sources</strong></td><td></td></tr>
                    ${incomeRows}
                    <tr class="total-row" style="background: #d1fae5;"><td>Subtotal Income</td><td class="amount income">৳${totalIncome.toLocaleString()}</td></tr>
                    
                    <tr style="background: #fef2f2;"><td><strong>💸 Expense Items</strong></td><td></td></tr>
                    ${expenseRows}
                    <tr class="total-row" style="background: #fee2e2;"><td>Subtotal Expense</td><td class="amount expense">৳${totalExpense.toLocaleString()}</td></tr>
                    
                    <tr class="grand-total"><td><strong>📊 Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</strong></td><td class="amount" style="color: ${netProfit >= 0 ? '#059669' : '#dc2626'}; font-size: 18px;"><strong>${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</strong></td></tr>
                  </tbody>
                </table>
              </div>

              <div class="footer">
                <p>Report generated on ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
                <p style="margin-top: 5px;">This is a computer-generated report.</p>
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 250);
        };

        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Income, Expense & Profit/Loss Report
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadReport('Financial')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button size="sm" onClick={printFinancialReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">৳{(reportData?.totalIncome || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Collections: ৳{(reportData?.monthlyCollection || 0).toLocaleString()} + Other: ৳{(reportData?.totalTransactionIncome || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Expense</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">৳{(reportData?.totalExpense || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Salary: ৳{(reportData?.totalSalary || 0).toLocaleString()} + Other: ৳{(reportData?.totalTransactionExpense || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                    <p className={`text-xl sm:text-2xl font-bold ${((reportData?.totalIncome || 0) - (reportData?.totalExpense || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{((reportData?.totalIncome || 0) - (reportData?.totalExpense || 0)).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-green-50/50 dark:bg-green-950/10">
                      <TableCell className="font-medium">Bill Collection</TableCell>
                      <TableCell className="text-right text-green-600">+৳{(reportData?.monthlyCollection || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    {reportData?.incomeByCategory?.map((cat: any, idx: number) => (
                      <TableRow key={`inc-${idx}`} className="bg-green-50/30 dark:bg-green-950/5">
                        <TableCell className="pl-8">{cat.name}</TableCell>
                        <TableCell className="text-right text-green-600">+৳{cat.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-red-50/50 dark:bg-red-950/10">
                      <TableCell className="font-medium">Staff Salary</TableCell>
                      <TableCell className="text-right text-red-600">-৳{(reportData?.totalSalary || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    {reportData?.expenseByCategory?.map((cat: any, idx: number) => (
                      <TableRow key={`exp-${idx}`} className="bg-red-50/30 dark:bg-red-950/5">
                        <TableCell className="pl-8">{cat.name}</TableCell>
                        <TableCell className="text-right text-red-600">-৳{cat.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>Net Profit/Loss</TableCell>
                      <TableCell className={`text-right ${((reportData?.totalIncome || 0) - (reportData?.totalExpense || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ৳{((reportData?.totalIncome || 0) - (reportData?.totalExpense || 0)).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case 'collection':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Bill Collection Status</CardTitle>
                <CardDescription>Monthly bill collection summary</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadReport('Collection')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total Bills</p>
                    <p className="text-2xl font-bold">{reportData?.bills?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-green-600">{reportData?.paidBills?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-950/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Partial</p>
                    <p className="text-2xl font-bold text-yellow-600">{reportData?.partialBills?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Unpaid</p>
                    <p className="text-2xl font-bold text-red-600">{reportData?.unpaidBills?.length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {renderFilterBar(true, [
                { value: 'paid', label: t('paid') },
                { value: 'partial', label: 'Partial' },
                { value: 'pending', label: t('pending') },
                { value: 'overdue', label: t('overdue') },
              ])}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t('no_data')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBills.items.map((bill: any) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                          <TableCell>{bill.customer?.name || 'N/A'}</TableCell>
                          <TableCell>৳{bill.total_amount}</TableCell>
                          <TableCell>৳{bill.paid_amount || 0}</TableCell>
                          <TableCell>
                            <Badge variant={bill.status === 'paid' ? 'default' : bill.status === 'partial' ? 'secondary' : 'destructive'}>
                              {bill.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={collectionPage}
                totalPages={filteredBills.totalPages}
                totalItems={filteredBills.totalItems}
                onPageChange={setCollectionPage}
              />
            </CardContent>
          </Card>
        );

      case 'collector':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Connection Man Wise Bill Report
              </CardTitle>
              <CardDescription>Collection summary by collector</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead>Total Collections</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.collectorPayments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No collections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData?.collectorPayments?.map((cp: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cp.name}</TableCell>
                        <TableCell>{cp.count}</TableCell>
                        <TableCell className="text-right font-bold">৳{cp.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'salary':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Employee Salary Report
              </CardTitle>
              <CardDescription>Monthly salary disbursement summary</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData?.salaryPayments?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4" />
                  <p>No salary payments found for this month</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.salaryPayments?.map((sp: any) => (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">{sp.staff?.name || 'N/A'}</TableCell>
                        <TableCell>{sp.staff?.designation || '-'}</TableCell>
                        <TableCell className="text-right">৳{Number(sp.net_salary || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={sp.status === 'paid' ? 'default' : 'secondary'}>{sp.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell colSpan={2}>Total Salary</TableCell>
                      <TableCell className="text-right">৳{reportData?.totalSalary?.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'new-connections': {
        const newConnectionsData = filterAndPaginate(reportData?.newCustomers || [], newConnectionsPage);
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Monthly New Connections
                </CardTitle>
                <CardDescription>New customer connections this month</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {reportData?.newCustomers?.length || 0} New
              </Badge>
            </CardHeader>
            <CardContent>
              {renderFilterBar()}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Connection Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newConnectionsData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No new connections this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      newConnectionsData.items.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.package?.name || '-'}</TableCell>
                          <TableCell>{c.connection_date ? format(new Date(c.connection_date), 'dd MMM yyyy') : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={newConnectionsPage}
                totalPages={newConnectionsData.totalPages}
                totalItems={newConnectionsData.totalItems}
                onPageChange={setNewConnectionsPage}
              />
            </CardContent>
          </Card>
        );
      }

      case 'disabled': {
        const disabledData = filterAndPaginate(reportData?.disabledCustomers || [], disabledPage);
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5" />
                  Disabled/Suspended Customers
                </CardTitle>
                <CardDescription>Customers with disabled or suspended status</CardDescription>
              </div>
              <Badge variant="destructive" className="text-lg">
                {reportData?.disabledCustomers?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {renderFilterBar()}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disabledData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No disabled customers
                        </TableCell>
                      </TableRow>
                    ) : (
                      disabledData.items.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{c.status}</Badge>
                          </TableCell>
                          <TableCell>{c.expiry_date ? format(new Date(c.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={disabledPage}
                totalPages={disabledData.totalPages}
                totalItems={disabledData.totalItems}
                onPageChange={setDisabledPage}
              />
            </CardContent>
          </Card>
        );
      }

      case 'due-bills': {
        const dueBillsData = filterAndPaginate(reportData?.unpaidBills || [], dueBillsPage);
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Monthly Due Bills
                </CardTitle>
                <CardDescription>Unpaid and partially paid bills</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="destructive" className="text-lg">
                  ৳{reportData?.monthlyDue?.toLocaleString() || 0}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => downloadReport('Due Bills')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderFilterBar()}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueBillsData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No due bills found
                        </TableCell>
                      </TableRow>
                    ) : (
                      dueBillsData.items.map((bill: any) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                          <TableCell className="font-medium">{bill.customer?.name || 'N/A'}</TableCell>
                          <TableCell>{bill.customer?.phone || '-'}</TableCell>
                          <TableCell className="text-right">৳{bill.total_amount}</TableCell>
                          <TableCell className="text-right">৳{bill.paid_amount || 0}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            ৳{(bill.total_amount - (bill.paid_amount || 0)).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={dueBillsPage}
                totalPages={dueBillsData.totalPages}
                totalItems={dueBillsData.totalItems}
                onPageChange={setDueBillsPage}
              />
            </CardContent>
          </Card>
        );
      }

      case 'non-generated': {
        const nonGeneratedData = filterAndPaginate(reportData?.nonGeneratedBillCustomers || [], nonGeneratedPage);
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Non-Generated Bills
                </CardTitle>
                <CardDescription>Active customers without bills for this month</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {reportData?.nonGeneratedBillCustomers?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {renderFilterBar()}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-right">Monthly Bill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonGeneratedData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          All active customers have bills generated
                        </TableCell>
                      </TableRow>
                    ) : (
                      nonGeneratedData.items.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.package?.name || '-'}</TableCell>
                          <TableCell className="text-right">৳{c.monthly_bill || c.package?.price || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={nonGeneratedPage}
                totalPages={nonGeneratedData.totalPages}
                totalItems={nonGeneratedData.totalItems}
                onPageChange={setNonGeneratedPage}
              />
            </CardContent>
          </Card>
        );
      }

      case 'today-new': {
        const todayNewData = filterAndPaginate(reportData?.todayNewCustomers || [], todayNewPage);
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's New Connections
                </CardTitle>
                <CardDescription>New customer connections today ({format(new Date(), 'dd MMM yyyy')})</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {reportData?.todayNewCustomers?.length || 0} Today
              </Badge>
            </CardHeader>
            <CardContent>
              {renderFilterBar()}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Area</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayNewData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No new connections today
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayNewData.items.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.package?.name || '-'}</TableCell>
                          <TableCell>{c.area?.name || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={todayNewPage}
                totalPages={todayNewData.totalPages}
                totalItems={todayNewData.totalItems}
                onPageChange={setTodayNewPage}
              />
            </CardContent>
          </Card>
        );
      }

      case 'connection-request':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Connection Request Report
              </CardTitle>
              <CardDescription>Pending and processed connection requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4" />
                <p>Connection request data will be available here</p>
                <p className="text-sm">Navigate to Connection Requests to view details</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'complain':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Complain Report
              </CardTitle>
              <CardDescription>Customer complaints and support tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>This feature requires the Support Tickets module.</p>
                <p className="text-sm">Enable it in your package to use this report.</p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const currentReport = reportTypes.find(r => r.id === activeTab);

  return (
    <DashboardLayout
      title={t('reports')}
      subtitle="Comprehensive business reports and BTRC compliance"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('total_customers')}</p>
                <p className="text-lg sm:text-2xl font-bold">{reportData?.totalCustomers || 0}</p>
                <p className="text-xs text-green-600">+{reportData?.newCustomers?.length || 0} new</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('active_customers')}</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{reportData?.activeCustomers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {((reportData?.activeCustomers / reportData?.totalCustomers) * 100 || 0).toFixed(1)}% of total
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('monthly_collection')}</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">৳{reportData?.monthlyCollection?.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('pending_due')}</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">৳{reportData?.monthlyDue?.toLocaleString() || 0}</p>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls - Month + Report Type Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {generateMonths().map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Report Type Selector - Using Select dropdown instead of buttons */}
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:w-[300px]">
            {currentReport && <currentReport.icon className="h-4 w-4 mr-2" />}
            <SelectValue placeholder="Select Report" />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map(report => (
              <SelectItem key={report.id} value={report.id}>
                <div className="flex items-center gap-2">
                  <report.icon className="h-4 w-4" />
                  <span>{report.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => downloadReport('All Reports')}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </DashboardLayout>
  );
}
