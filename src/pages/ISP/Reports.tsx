import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { 
  FileText, Download, Loader2, BarChart3, Users, DollarSign, TrendingUp,
  AlertCircle, UserPlus, UserMinus, Wallet, Building2, Clock, Phone,
  CheckCircle, XCircle, Calendar, Printer, FileSpreadsheet
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

export default function Reports() {
  const { tenantId, tenant } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState('btrc');
  const [reportData, setReportData] = useState<any>(null);

  const fetchReportData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const startDate = startOfMonth(parseISO(selectedMonth + '-01'));
      const endDate = endOfMonth(startDate);

      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, status, created_at, monthly_bill, customer_code, phone, pppoe_username, expiry_date, connection_date, package:isp_packages(name, price), area:areas(name)')
        .eq('tenant_id', tenantId);

      const { data: bills } = await supabase
        .from('customer_bills')
        .select('*, customer:customers(name, customer_code, phone)')
        .eq('tenant_id', tenantId)
        .eq('billing_month', selectedMonth);

      const { data: payments } = await supabase
        .from('customer_payments')
        .select('*, customer:customers(name, customer_code), collected_by')
        .eq('tenant_id', tenantId)
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString());

      const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', tenantId);

      const { data: salaryPayments } = await supabase
        .from('salary_payments')
        .select('*, staff:staff(name, designation)')
        .eq('tenant_id', tenantId)
        .eq('month', selectedMonth);

      const activeCustomers = customers?.filter(c => c.status === 'active').length || 0;
      const totalCustomers = customers?.length || 0;
      const newCustomers = customers?.filter(c => 
        c.created_at && c.created_at.startsWith(selectedMonth)
      ) || [];
      const disabledCustomers = customers?.filter(c => c.status === 'suspended' || c.status === 'cancelled') || [];
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayNewCustomers = customers?.filter(c => 
        c.created_at && c.created_at.startsWith(todayStr)
      ) || [];

      const paidBills = bills?.filter(b => b.status === 'paid') || [];
      const unpaidBills = bills?.filter(b => b.status !== 'paid') || [];
      const partialBills = bills?.filter(b => b.status === 'partial') || [];
      
      const monthlyCollection = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const monthlyDue = unpaidBills.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0);
      
      const collectorPayments: Record<string, { name: string; amount: number; count: number }> = {};
      payments?.forEach(p => {
        const collectorId = p.collected_by || 'unknown';
        if (!collectorPayments[collectorId]) {
          collectorPayments[collectorId] = { name: collectorId === 'unknown' ? 'Online/Self' : 'Collector', amount: 0, count: 0 };
        }
        collectorPayments[collectorId].amount += Number(p.amount);
        collectorPayments[collectorId].count += 1;
      });

      const customersWithBills = new Set(bills?.map(b => b.customer_id) || []);
      const nonGeneratedBillCustomers = customers?.filter(c => 
        c.status === 'active' && !customersWithBills.has(c.id)
      ) || [];

      const totalSalary = salaryPayments?.reduce((sum, s) => sum + Number(s.net_salary || 0), 0) || 0;

      setReportData({
        totalCustomers,
        activeCustomers,
        newCustomers,
        disabledCustomers,
        todayNewCustomers,
        monthlyCollection,
        monthlyDue,
        bills: bills || [],
        paidBills,
        unpaidBills,
        partialBills,
        payments: payments || [],
        collectorPayments: Object.values(collectorPayments),
        staff: staff || [],
        salaryPayments: salaryPayments || [],
        totalSalary,
        nonGeneratedBillCustomers,
        customers: customers || [],
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

  // Export to CSV function
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

  // Render content based on active tab
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
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">৳{reportData?.monthlyCollection?.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Expense (Salary)</p>
                    <p className="text-2xl font-bold text-red-600">৳{reportData?.totalSalary?.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                    <p className={`text-2xl font-bold ${(reportData?.monthlyCollection - reportData?.totalSalary) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{((reportData?.monthlyCollection || 0) - (reportData?.totalSalary || 0)).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Bill Collection</TableCell>
                    <TableCell className="text-right text-green-600">৳{reportData?.monthlyCollection?.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Staff Salary</TableCell>
                    <TableCell className="text-right text-red-600">৳{reportData?.totalSalary?.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Net Profit/Loss</TableCell>
                    <TableCell className={`text-right ${(reportData?.monthlyCollection - reportData?.totalSalary) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{((reportData?.monthlyCollection || 0) - (reportData?.totalSalary || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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

              <ScrollArea className="h-[400px]">
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
                    {reportData?.bills?.slice(0, 50).map((bill: any) => (
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
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
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

      case 'new-connections':
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
              <ScrollArea className="h-[400px]">
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
                    {reportData?.newCustomers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No new connections this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData?.newCustomers?.map((c: any) => (
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
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'disabled':
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
              <ScrollArea className="h-[400px]">
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
                    {reportData?.disabledCustomers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No disabled customers
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData?.disabledCustomers?.map((c: any) => (
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
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'due-bills':
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
                  ৳{reportData?.monthlyDue?.toLocaleString() || 0} Due
                </Badge>
                <Button variant="outline" size="sm" onClick={() => downloadReport('Due Bills')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.unpaidBills?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          All bills paid! No dues.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData?.unpaidBills?.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono">{b.bill_number}</TableCell>
                          <TableCell className="font-medium">{b.customer?.name || 'N/A'}</TableCell>
                          <TableCell>{b.customer?.phone || '-'}</TableCell>
                          <TableCell>৳{b.total_amount}</TableCell>
                          <TableCell>৳{b.paid_amount || 0}</TableCell>
                          <TableCell className="text-destructive font-bold">
                            ৳{(b.total_amount - (b.paid_amount || 0)).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'non-generated':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Non Generated Bills
                </CardTitle>
                <CardDescription>Active customers without bills this month</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {reportData?.nonGeneratedBillCustomers?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Monthly Bill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.nonGeneratedBillCustomers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          All active customers have bills generated
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData?.nonGeneratedBillCustomers?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.package?.name || '-'}</TableCell>
                          <TableCell>৳{c.monthly_bill || c.package?.price || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'today-new':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's New Connections
                </CardTitle>
                <CardDescription>New connections added today</CardDescription>
              </div>
              <Badge variant="default" className="text-lg">
                {reportData?.todayNewCustomers?.length || 0} Today
              </Badge>
            </CardHeader>
            <CardContent>
              {reportData?.todayNewCustomers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>No new connections today</p>
                </div>
              ) : (
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
                    {reportData?.todayNewCustomers?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">{c.customer_code}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone || '-'}</TableCell>
                        <TableCell>{c.package?.name || '-'}</TableCell>
                        <TableCell>{c.area?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );

      case 'connection-request':
      case 'complain':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeTab === 'complain' ? <AlertCircle className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                {activeTab === 'complain' ? 'Complain Report' : 'Connection Request Report'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'complain' 
                  ? 'Customer complaints and support tickets' 
                  : 'New connection requests and inquiries'}
              </CardDescription>
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

  return (
    <DashboardLayout
      title="Reports & Analytics"
      subtitle="Comprehensive business reports and BTRC compliance"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{reportData?.totalCustomers || 0}</p>
                <p className="text-xs text-green-600">+{reportData?.newCustomers?.length || 0} new</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold text-green-600">{reportData?.activeCustomers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {((reportData?.activeCustomers / reportData?.totalCustomers) * 100 || 0).toFixed(1)}% of total
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Collection</p>
                <p className="text-2xl font-bold text-green-600">৳{reportData?.monthlyCollection?.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Due</p>
                <p className="text-2xl font-bold text-red-600">৳{reportData?.monthlyDue?.toLocaleString() || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {generateMonths().map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => downloadReport('All Reports')}>
          <Download className="h-4 w-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Report Type Selection - Horizontal scrollable buttons */}
      <div className="mb-6">
        <ScrollArea className="w-full pb-4">
          <div className="flex gap-2 pb-2">
            {reportTypes.map(report => (
              <Button
                key={report.id}
                variant={activeTab === report.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(report.id)}
                className="whitespace-nowrap"
              >
                <report.icon className="h-4 w-4 mr-2" />
                {report.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </DashboardLayout>
  );
}
