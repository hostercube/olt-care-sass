import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useResellerSystem } from '@/hooks/useResellerSystem';
import { 
  Loader2, Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw,
  Download, Filter, Calendar, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { TRANSACTION_TYPE_LABELS } from '@/types/reseller';

interface Transaction {
  id: string;
  reseller_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  from_reseller_id: string | null;
  to_reseller_id: string | null;
  customer_id: string | null;
  created_at: string;
  reseller?: { id: string; name: string; level: number };
  from_reseller?: { id: string; name: string } | null;
  to_reseller?: { id: string; name: string } | null;
  customer?: { id: string; name: string; customer_code: string } | null;
}

export default function ResellerBillingHistory() {
  const { tenantId, loading: contextLoading } = useTenantContext();
  const { resellers } = useResellerSystem();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReseller, setSelectedReseller] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    if (!tenantId || contextLoading) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('reseller_transactions')
        .select(`
          *,
          reseller:resellers!reseller_transactions_reseller_id_fkey(id, name, level),
          from_reseller:resellers!reseller_transactions_from_reseller_id_fkey(id, name),
          to_reseller:resellers!reseller_transactions_to_reseller_id_fkey(id, name),
          customer:customers(id, name, customer_code)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      // Apply reseller filter
      if (selectedReseller !== 'all') {
        query = query.eq('reseller_id', selectedReseller);
      }

      // Apply type filter
      if (selectedType !== 'all') {
        query = query.eq('type', selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && !contextLoading) {
      fetchTransactions();
    }
  }, [tenantId, contextLoading, dateFrom, dateTo, selectedReseller, selectedType]);

  // Filter by level and search
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by level
    if (selectedLevel !== 'all') {
      const level = parseInt(selectedLevel);
      filtered = filtered.filter(t => t.reseller?.level === level);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.reseller?.name?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.customer?.name?.toLowerCase().includes(query) ||
        t.customer?.customer_code?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, selectedLevel, searchQuery]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalRecharge = filteredTransactions
      .filter(t => t.type === 'recharge')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalTransferOut = filteredTransactions
      .filter(t => t.type === 'transfer_out')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalCustomerPayments = filteredTransactions
      .filter(t => t.type === 'customer_payment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalCommission = filteredTransactions
      .filter(t => t.type === 'commission')
      .reduce((sum, t) => sum + t.amount, 0);

    return { totalRecharge, totalTransferOut, totalCustomerPayments, totalCommission };
  }, [filteredTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'transfer_in':
      case 'commission':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'deduction':
      case 'transfer_out':
      case 'customer_payment':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'transfer_in':
      case 'commission':
      case 'refund':
        return 'text-green-600';
      case 'deduction':
      case 'transfer_out':
      case 'customer_payment':
        return 'text-red-600';
      default:
        return '';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return 'Reseller';
      case 2: return 'Sub-Reseller';
      case 3: return 'Sub-Sub-Reseller';
      default: return `Level ${level}`;
    }
  };

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-500';
      case 2: return 'bg-purple-500';
      case 3: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Reseller', 'Level', 'Type', 'Amount', 'Balance After', 'Description'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      t.reseller?.name || '-',
      t.reseller ? getLevelLabel(t.reseller.level) : '-',
      TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS] || t.type,
      t.amount.toString(),
      t.balance_after.toString(),
      t.description || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reseller-billing-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <DashboardLayout
      title="Reseller Billing History"
      subtitle="View and filter all reseller transactions"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Recharged</p>
                <p className="text-xl font-bold text-green-600">৳{summaryStats.totalRecharge.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Transfers Out</p>
                <p className="text-xl font-bold text-blue-600">৳{summaryStats.totalTransferOut.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Customer Payments</p>
                <p className="text-xl font-bold text-purple-600">৳{summaryStats.totalCustomerPayments.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
                <p className="text-xl font-bold text-emerald-600">৳{summaryStats.totalCommission.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reseller</Label>
              <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                <SelectTrigger>
                  <SelectValue placeholder="All Resellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resellers</SelectItem>
                  {resellers.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({getLevelLabel(r.level)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="1">Resellers</SelectItem>
                  <SelectItem value="2">Sub-Resellers</SelectItem>
                  <SelectItem value="3">Sub-Sub-Resellers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recharge">Recharge</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="customer_payment">Customer Payment</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Transactions ({filteredTransactions.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reseller</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        <div>
                          <p>{format(new Date(tx.created_at), 'dd MMM yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'hh:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.reseller?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {tx.reseller && (
                          <Badge className={getLevelBadgeColor(tx.reseller.level)}>
                            {getLevelLabel(tx.reseller.level)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          <span className="text-sm">
                            {TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] || tx.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getAmountColor(tx.type)}`}>
                          {tx.amount >= 0 ? '+' : ''}৳{tx.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">৳{tx.balance_after.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate" title={tx.description || ''}>
                          {tx.description || '-'}
                        </p>
                        {tx.customer && (
                          <p className="text-xs text-muted-foreground">
                            Customer: {tx.customer.name} ({tx.customer.customer_code})
                          </p>
                        )}
                        {tx.from_reseller && (
                          <p className="text-xs text-muted-foreground">
                            From: {tx.from_reseller.name}
                          </p>
                        )}
                        {tx.to_reseller && (
                          <p className="text-xs text-muted-foreground">
                            To: {tx.to_reseller.name}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
