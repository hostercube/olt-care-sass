import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { FileText, Download, Loader2, BarChart3, Users, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

export default function Reports() {
  const { tenantId, tenant } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportData, setReportData] = useState<any>(null);

  const fetchReportData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, status, created_at, monthly_bill')
        .eq('tenant_id', tenantId);

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId);

      // Fetch bills
      const { data: bills } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('billing_month', selectedMonth);

      const activeCustomers = customers?.filter(c => c.status === 'active').length || 0;
      const totalCustomers = customers?.length || 0;
      const newCustomers = customers?.filter(c => c.created_at?.startsWith(selectedMonth)).length || 0;
      
      const monthlyRevenue = bills?.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.paid_amount, 0) || 0;
      const pendingDue = bills?.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0) || 0;
      
      const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

      setReportData({
        totalCustomers,
        activeCustomers,
        newCustomers,
        monthlyRevenue,
        pendingDue,
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        bills: bills || [],
      });
    } catch (err) {
      console.error('Error fetching report:', err);
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

  const downloadReport = (type: string) => {
    toast.success(`${type} report download started`);
    // In production, generate actual PDF/Excel
  };

  return (
    <DashboardLayout
      title="Reports & Analytics"
      subtitle="Business reports and BTRC compliance"
    >
      <div className="flex items-center justify-between mb-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {generateMonths().map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport('Monthly')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{reportData?.totalCustomers}</p>
                    <p className="text-xs text-green-600">+{reportData?.newCustomers} new</p>
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
                    <p className="text-2xl font-bold text-green-600">{reportData?.activeCustomers}</p>
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
                    <p className="text-2xl font-bold text-green-600">৳{reportData?.monthlyRevenue?.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold text-red-600">৳{reportData?.pendingDue?.toLocaleString()}</p>
                  </div>
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="btrc">
            <TabsList>
              <TabsTrigger value="btrc">BTRC Report</TabsTrigger>
              <TabsTrigger value="financial">Financial Summary</TabsTrigger>
              <TabsTrigger value="collection">Collection Report</TabsTrigger>
            </TabsList>

            <TabsContent value="btrc" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    BTRC Monthly Report
                  </CardTitle>
                  <CardDescription>Bangladesh Telecommunication Regulatory Commission compliance report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">ISP License</p>
                        <p className="font-medium">{tenant?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Report Period</p>
                        <p className="font-medium">{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Subscribers</p>
                        <p className="font-medium">{reportData?.totalCustomers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active Subscribers</p>
                        <p className="font-medium">{reportData?.activeCustomers}</p>
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
                          <TableCell className="text-right font-medium">{reportData?.newCustomers}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Disconnected This Month</TableCell>
                          <TableCell className="text-right font-medium">0</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Total Monthly Revenue</TableCell>
                          <TableCell className="text-right font-medium">৳{reportData?.monthlyRevenue?.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <div className="flex justify-end">
                      <Button onClick={() => downloadReport('BTRC')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download BTRC Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Income</TableCell>
                        <TableCell className="text-right font-medium text-green-600">৳{reportData?.totalIncome?.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right font-medium text-red-600">৳{reportData?.totalExpense?.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="border-t-2">
                        <TableCell className="font-bold">Net Profit/Loss</TableCell>
                        <TableCell className={`text-right font-bold ${reportData?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ৳{reportData?.netProfit?.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="collection" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bill Collection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bill Number</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData?.bills?.slice(0, 20).map((bill: any) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-mono">{bill.bill_number}</TableCell>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}
