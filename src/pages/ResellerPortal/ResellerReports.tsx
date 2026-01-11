import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileBarChart, Download, Calendar, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';

export default function ResellerReports() {
  const navigate = useNavigate();
  const {
    session,
    reseller,
    loading,
    customers,
    transactions,
    subResellers,
    logout,
    hasPermission,
  } = useResellerPortal();

  const [reportType, setReportType] = useState<string>('collections');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!loading && !session) {
      navigate('/reseller/login');
    }
  }, [loading, session, navigate]);

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(lastDay.toISOString().split('T')[0]);
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      
      if (fromDate && txDate < fromDate) return false;
      if (toDate && txDate > toDate) return false;
      
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  // Calculate report data
  const reportData = useMemo(() => {
    const recharges = filteredTransactions.filter(tx => tx.type === 'customer_payment');
    const credits = filteredTransactions.filter(tx => tx.type === 'recharge');
    const commissions = filteredTransactions.filter(tx => tx.type === 'commission');

    const totalRecharges = recharges.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalCredits = credits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalCommissions = commissions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Customer status breakdown
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const expiredCustomers = customers.filter(c => c.status === 'expired').length;
    const inactiveCustomers = customers.filter(c => c.status === 'inactive').length;

    // Monthly breakdown
    const monthlyData: Record<string, { income: number; expense: number; count: number }> = {};
    filteredTransactions.forEach(tx => {
      const month = new Date(tx.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0, count: 0 };
      }
      monthlyData[month].count++;
      if (tx.amount > 0) {
        monthlyData[month].income += tx.amount;
      } else {
        monthlyData[month].expense += Math.abs(tx.amount);
      }
    });

    return {
      totalRecharges,
      totalCredits,
      totalCommissions,
      activeCustomers,
      expiredCustomers,
      inactiveCustomers,
      monthlyData: Object.entries(monthlyData),
      rechargeCount: recharges.length,
    };
  }, [filteredTransactions, customers]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check permission
  const canViewReports = (reseller as any)?.can_view_reports !== false;

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">View your business reports and analytics</p>
          </div>
        </div>

        {!canViewReports ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You do not have permission to view reports</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Date Filter */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collections">Collections Report</SelectItem>
                        <SelectItem value="customers">Customer Report</SelectItem>
                        <SelectItem value="transactions">Transaction Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Credits Received</p>
                      <p className="text-lg font-bold truncate">৳{reportData.totalCredits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Customer Recharges</p>
                      <p className="text-lg font-bold truncate">৳{reportData.totalRecharges.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Commissions</p>
                      <p className="text-lg font-bold truncate">৳{reportData.totalCommissions.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">Transactions</p>
                      <p className="text-lg font-bold truncate">{filteredTransactions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Content */}
            {reportType === 'collections' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Collections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.monthlyData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No data for selected period
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData.monthlyData.map(([month, data]) => (
                            <TableRow key={month}>
                              <TableCell className="font-medium">{month}</TableCell>
                              <TableCell className="text-right">{data.count}</TableCell>
                              <TableCell className="text-right text-green-600">
                                +৳{data.income.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                -৳{data.expense.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ৳{(data.income - data.expense).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportType === 'customers' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-3xl font-bold text-green-700">{reportData.activeCustomers}</p>
                      <p className="text-sm text-green-600">Active Customers</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 text-center">
                      <p className="text-3xl font-bold text-red-700">{reportData.expiredCustomers}</p>
                      <p className="text-sm text-red-600">Expired Customers</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-500/10 text-center">
                      <p className="text-3xl font-bold text-gray-700">{reportData.inactiveCustomers}</p>
                      <p className="text-sm text-gray-600">Inactive Customers</p>
                    </div>
                  </div>

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Package</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Monthly Bill</TableHead>
                          <TableHead>Expiry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.slice(0, 20).map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.package?.name || '-'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                customer.status === 'active' ? 'bg-green-100 text-green-700' :
                                customer.status === 'expired' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {customer.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              ৳{(customer.monthly_bill || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {customer.expiry_date 
                                ? new Date(customer.expiry_date).toLocaleDateString()
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportType === 'transactions' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileBarChart className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance After</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs capitalize ${
                                  tx.type === 'recharge' ? 'bg-green-100 text-green-700' :
                                  tx.type === 'customer_payment' ? 'bg-blue-100 text-blue-700' :
                                  tx.type === 'commission' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {tx.type.replace('_', ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {tx.description || '-'}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${
                                tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {tx.amount > 0 ? '+' : ''}৳{tx.amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ৳{tx.balance_after.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ResellerPortalLayout>
  );
}
