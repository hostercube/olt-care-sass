import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useAreas } from '@/hooks/useAreas';
import { useResellers } from '@/hooks/useResellers';
import { useCurrentUserName } from '@/hooks/useCurrentUserName';
import { 
  Receipt, Search, RefreshCw, Download, User, Store, CreditCard,
  Calendar, Filter, Users, TrendingUp, Wallet, ChevronLeft, ChevronRight,
  Edit, Check, Clock, CheckCircle2, Loader2, X
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CustomerRecharge {
  id: string;
  customer_id: string;
  amount: number;
  months: number;
  payment_method: string | null;
  recharge_date: string;
  old_expiry: string | null;
  new_expiry: string | null;
  discount: number | null;
  status: string | null;
  notes: string | null;
  collected_by: string | null;
  collected_by_type: string | null;
  collected_by_name: string | null;
  reseller_id: string | null;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
  original_payment_method: string | null;
  rejection_reason?: string | null;
  transaction_id?: string | null;
  customer?: { 
    id: string; 
    name: string; 
    customer_code: string;
    phone: string | null;
    area_id: string | null;
  };
  reseller?: {
    id: string;
    name: string;
    level: number;
  };
}

const getCollectorTypeBadge = (type: string | null, name: string | null) => {
  switch (type) {
    case 'tenant_admin':
      return <Badge variant="default" className="gap-1"><User className="h-3 w-3" />{name || 'Admin'}</Badge>;
    case 'staff':
      return <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{name || 'Staff'}</Badge>;
    case 'reseller':
    case 'sub_reseller':
    case 'sub_sub_reseller':
      return <Badge variant="outline" className="gap-1 border-purple-500 text-purple-500"><Store className="h-3 w-3" />{name || 'Reseller'}</Badge>;
    case 'online_payment':
    case 'auto':
      return <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600"><CreditCard className="h-3 w-3" />{name || 'Online'}</Badge>;
    default:
      return <Badge variant="outline">{name || 'Manual'}</Badge>;
  }
};

const getLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'Master';
    case 2: return 'Sub';
    case 3: return 'Sub-Sub';
    default: return `L${level}`;
  }
};

export default function RechargeHistory() {
  const navigate = useNavigate();
  const { tenantId, loading: contextLoading } = useTenantContext();
  const { areas } = useAreas();
  const { resellers } = useResellers();
  const currentUser = useCurrentUserName();
  
  const [recharges, setRecharges] = useState<CustomerRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [resellerFilter, setResellerFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  
  // Edit Due Dialog State
  const [showEditDueDialog, setShowEditDueDialog] = useState(false);
  const [selectedRecharge, setSelectedRecharge] = useState<CustomerRecharge | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editLoading, setEditLoading] = useState(false);
  
  // Verify/Reject Manual Payment Dialog State
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchRecharges = useCallback(async () => {
    if (!tenantId || contextLoading) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('customer_recharges')
        .select(`
          *,
          customer:customers(id, name, customer_code, phone, area_id),
          reseller:resellers(id, name, level)
        `)
        .eq('tenant_id', tenantId)
        .order('recharge_date', { ascending: false })
        .limit(1000);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('recharge_date', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('recharge_date', `${dateTo}T23:59:59`);
      }

      // Apply reseller filter
      if (resellerFilter) {
        query = query.eq('reseller_id', resellerFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecharges((data as CustomerRecharge[]) || []);
    } catch (err) {
      console.error('Error fetching recharges:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, contextLoading, dateFrom, dateTo, resellerFilter]);

  useEffect(() => {
    if (tenantId && !contextLoading) {
      fetchRecharges();
    }
  }, [fetchRecharges, tenantId, contextLoading]);

  // Filter recharges
  const filteredRecharges = useMemo(() => {
    let result = [...recharges];

    // Today only filter
    if (todayOnly) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(r => r.recharge_date.startsWith(today));
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.customer?.name?.toLowerCase().includes(term) ||
        r.customer?.customer_code?.toLowerCase().includes(term) ||
        r.customer?.phone?.includes(term) ||
        r.collected_by_name?.toLowerCase().includes(term) ||
        r.paid_by_name?.toLowerCase().includes(term)
      );
    }

    // Source/collected_by_type filter
    if (sourceFilter !== 'all') {
      result = result.filter(r => r.collected_by_type === sourceFilter);
    }

    // Area filter
    if (areaFilter) {
      result = result.filter(r => r.customer?.area_id === areaFilter);
    }

    // Payment method filter - special handling for 'paid_from_due'
    if (paymentMethodFilter === 'paid_from_due') {
      result = result.filter(r => r.original_payment_method === 'due' && r.status === 'completed');
    } else if (paymentMethodFilter !== 'all') {
      result = result.filter(r => r.payment_method === paymentMethodFilter);
    }

    // Status filter (due vs completed vs pending_manual)
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_manual') {
        result = result.filter(r => r.status === 'pending_manual');
      } else {
        result = result.filter(r => r.status === statusFilter);
      }
    }

    return result;
  }, [recharges, searchTerm, sourceFilter, areaFilter, paymentMethodFilter, statusFilter, todayOnly]);

  // Pagination
  const paginatedRecharges = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecharges.slice(startIndex, startIndex + pageSize);
  }, [filteredRecharges, currentPage, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = filteredRecharges.reduce((sum, r) => sum + r.amount, 0);
    const totalDiscount = filteredRecharges.reduce((sum, r) => sum + (r.discount || 0), 0);
    const byAdmin = filteredRecharges.filter(r => r.collected_by_type === 'tenant_admin').length;
    const byStaff = filteredRecharges.filter(r => r.collected_by_type === 'staff').length;
    const byReseller = filteredRecharges.filter(r => ['reseller', 'sub_reseller', 'sub_sub_reseller'].includes(r.collected_by_type || '')).length;
    const byOnline = filteredRecharges.filter(r => ['online_payment', 'auto'].includes(r.collected_by_type || '')).length;
    const dueRecharges = filteredRecharges.filter(r => r.status === 'due').length;
    const paidFromDue = filteredRecharges.filter(r => r.original_payment_method === 'due' && r.status === 'completed').length;
    const pendingManual = recharges.filter(r => r.status === 'pending_manual').length;
    const todayTotal = recharges.filter(r => r.recharge_date.startsWith(new Date().toISOString().split('T')[0])).length;
    return { totalAmount, totalDiscount, byAdmin, byStaff, byReseller, byOnline, dueRecharges, paidFromDue, pendingManual, todayTotal, total: filteredRecharges.length };
  }, [filteredRecharges, recharges]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sourceFilter, areaFilter, resellerFilter, dateFrom, dateTo, paymentMethodFilter, statusFilter, todayOnly]);

  // Handle mark due as paid
  const handleMarkAsPaid = async () => {
    if (!selectedRecharge || !tenantId) return;
    
    setEditLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update recharge record with current user's name
      const { error } = await supabase
        .from('customer_recharges')
        .update({
          status: 'completed',
          payment_method: editPaymentMethod,
          original_payment_method: 'due', // Track that this was originally due
          paid_at: new Date().toISOString(),
          paid_by: user?.id || null,
          paid_by_name: currentUser.name || 'Admin',
        })
        .eq('id', selectedRecharge.id);
      
      if (error) throw error;
      
      // Update customer due_amount
      if (selectedRecharge.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('due_amount')
          .eq('id', selectedRecharge.customer_id)
          .single();
        
        if (customer) {
          const newDue = Math.max(0, (customer.due_amount || 0) - selectedRecharge.amount);
          await supabase
            .from('customers')
            .update({ due_amount: newDue })
            .eq('id', selectedRecharge.customer_id);
        }
      }
      
      toast.success('Due recharge marked as paid!');
      setShowEditDueDialog(false);
      setSelectedRecharge(null);
      fetchRecharges();
    } catch (err) {
      console.error('Error updating recharge:', err);
      toast.error('Failed to update recharge');
    } finally {
      setEditLoading(false);
    }
  };

  // Open edit dialog for due recharge
  const openEditDueDialog = (recharge: CustomerRecharge, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecharge(recharge);
    setEditPaymentMethod('cash');
    setShowEditDueDialog(true);
  };

  // Open verify dialog for pending manual payment
  const openVerifyDialog = (recharge: CustomerRecharge, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecharge(recharge);
    setShowVerifyDialog(true);
  };

  // Open reject dialog for pending manual payment
  const openRejectDialog = (recharge: CustomerRecharge, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecharge(recharge);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  // Verify pending manual payment
  const handleVerifyManualPayment = async () => {
    if (!selectedRecharge || !tenantId) return;
    
    setEditLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if payment included wallet balance (notes contains "Wallet: ৳X")
      const walletMatch = selectedRecharge.notes?.match(/\(Wallet: ৳(\d+(?:\.\d+)?)\)/);
      const walletDeduction = walletMatch ? parseFloat(walletMatch[1]) : 0;
      
      // If wallet was used, process the deduction now
      if (walletDeduction > 0 && selectedRecharge.customer_id) {
        const { data: walletResult, error: walletError } = await supabase.rpc('use_wallet_for_recharge', {
          p_customer_id: selectedRecharge.customer_id,
          p_amount: walletDeduction,
          p_notes: `Wallet used for verified manual payment`,
          p_reference_id: null,
        });
        
        if (walletError) {
          console.error('Wallet deduction error:', walletError);
          toast.error('Failed to deduct wallet balance - customer may not have sufficient balance');
          setEditLoading(false);
          return;
        }
        
        // Check the function response for success status
        const walletResponse = walletResult as { success?: boolean; error?: string } | null;
        if (walletResponse && walletResponse.success === false) {
          console.error('Wallet deduction failed:', walletResponse.error);
          toast.error(walletResponse.error || 'Failed to deduct wallet balance');
          setEditLoading(false);
          return;
        }
      }
      
      // Update recharge status to completed
      const { error } = await supabase
        .from('customer_recharges')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          paid_by: user?.id || null,
          paid_by_name: currentUser.name || 'Admin',
        })
        .eq('id', selectedRecharge.id);
      
      if (error) throw error;
      
      // Update customer expiry date and status
      if (selectedRecharge.customer_id && selectedRecharge.new_expiry) {
        // Check if this was a package change by parsing notes
        const isPackageChange = selectedRecharge.notes?.toLowerCase().includes('package change');
        
        const customerUpdate: Record<string, any> = {
          expiry_date: selectedRecharge.new_expiry,
          last_payment_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'active',
          due_amount: 0,
        };

        await supabase
          .from('customers')
          .update(customerUpdate)
          .eq('id', selectedRecharge.customer_id);
        
        // Create payment record
        await supabase.from('customer_payments').insert({
          tenant_id: tenantId,
          customer_id: selectedRecharge.customer_id,
          amount: selectedRecharge.amount,
          payment_method: selectedRecharge.payment_method,
          notes: `Manual payment verified${isPackageChange ? ' (Package Change)' : ''}${walletDeduction > 0 ? ` (Wallet: ৳${walletDeduction})` : ''}: ${selectedRecharge.notes || ''}`,
        });
      }
      
      toast.success('Payment verified successfully!');
      setShowVerifyDialog(false);
      setSelectedRecharge(null);
      fetchRecharges();
    } catch (err) {
      console.error('Error verifying payment:', err);
      toast.error('Failed to verify payment');
    } finally {
      setEditLoading(false);
    }
  };

  // Reject pending manual payment
  const handleRejectManualPayment = async () => {
    if (!selectedRecharge || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    
    setEditLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update recharge status to rejected with dedicated rejection_reason field
      const { error } = await supabase
        .from('customer_recharges')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          notes: selectedRecharge.notes ? `${selectedRecharge.notes} | Rejected: ${rejectReason}` : `Rejected: ${rejectReason}`,
          paid_by: user?.id || null,
          paid_by_name: currentUser.name || 'Admin',
        })
        .eq('id', selectedRecharge.id);
      
      if (error) throw error;
      
      toast.success('Payment rejected');
      setShowRejectDialog(false);
      setSelectedRecharge(null);
      setRejectReason('');
      fetchRecharges();
    } catch (err) {
      console.error('Error rejecting payment:', err);
      toast.error('Failed to reject payment');
    } finally {
      setEditLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Customer', 'Code', 'Amount', 'Months', 'Old Expiry', 'New Expiry', 'Discount', 'Source', 'Collector', 'Reseller'];
    const rows = filteredRecharges.map(r => [
      format(new Date(r.recharge_date), 'yyyy-MM-dd HH:mm'),
      r.customer?.name || '',
      r.customer?.customer_code || '',
      r.amount.toString(),
      r.months?.toString() || '1',
      r.old_expiry || '',
      r.new_expiry || '',
      (r.discount || 0).toString(),
      r.collected_by_type || 'manual',
      r.collected_by_name || '',
      r.reseller?.name || 'Direct',
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recharge-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Reseller options for searchable select
  const resellerOptions = resellers.map(r => ({
    value: r.id,
    label: `${r.name} (${getLevelLabel(r.level || 1)})`,
    searchTerms: [r.name, r.phone || '']
  }));

  // Area options for searchable select
  const areaOptions = areas.map(a => ({
    value: a.id,
    label: a.name,
    searchTerms: [a.name]
  }));

  return (
    <DashboardLayout
      title="Recharge History"
      subtitle="View all customer recharges with detailed tracking"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setTodayOnly(true); setStatusFilter('all'); setPaymentMethodFilter('all'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Calendar className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl font-bold">{stats.todayTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setTodayOnly(false); setStatusFilter('all'); setPaymentMethodFilter('all'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-xl font-bold text-green-600">৳{stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setSourceFilter('tenant_admin'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin</p>
                <p className="text-xl font-bold">{stats.byAdmin}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setSourceFilter('staff'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Staff</p>
                <p className="text-xl font-bold">{stats.byStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setStatusFilter('due'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Wallet className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due (বাকি)</p>
                <p className="text-xl font-bold text-yellow-600">{stats.dueRecharges}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setPaymentMethodFilter('paid_from_due'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid from Due</p>
                <p className="text-xl font-bold text-emerald-600">{stats.paidFromDue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setSourceFilter('reseller'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Store className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reseller</p>
                <p className="text-xl font-bold">{stats.byReseller}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-orange-500/30" onClick={() => { setStatusFilter('pending_manual'); setTodayOnly(false); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-orange-600">{stats.pendingManual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>All Customer Recharges</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchRecharges()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, code, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="tenant_admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="reseller">Reseller</SelectItem>
                <SelectItem value="sub_reseller">Sub-Reseller</SelectItem>
                <SelectItem value="online_payment">Online Payment</SelectItem>
                <SelectItem value="auto">Auto Payment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="due">Due (বাকি)</SelectItem>
                <SelectItem value="paid_from_due">Paid from Due</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="pending_manual">Pending Verification</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
            />
          </div>

          {/* Additional filters row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <SearchableSelect
              options={areaOptions}
              value={areaFilter}
              onValueChange={setAreaFilter}
              placeholder="All Areas"
              allowClear
            />
            <SearchableSelect
              options={resellerOptions}
              value={resellerFilter}
              onValueChange={setResellerFilter}
              placeholder="All Resellers"
              allowClear
            />
            <Button
              variant={todayOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTodayOnly(!todayOnly)}
              className="h-10"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {todayOnly ? 'Today Only ✓' : 'Today Only'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSourceFilter('all');
                setPaymentMethodFilter('all');
                setStatusFilter('all');
                setAreaFilter('');
                setResellerFilter('');
                setDateFrom('');
                setDateTo('');
                setTodayOnly(false);
              }}
              className="h-10"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>TxID</TableHead>
                      <TableHead>Months</TableHead>
                      <TableHead>Old Expiry</TableHead>
                      <TableHead>New Expiry</TableHead>
                      <TableHead>Collected By</TableHead>
                      <TableHead>Reseller</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecharges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                          No recharges found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRecharges.map((recharge) => (
                        <TableRow 
                          key={recharge.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/isp/customers/${recharge.customer_id}`)}
                        >
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="font-medium">{format(new Date(recharge.recharge_date), 'dd MMM yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(recharge.recharge_date), 'hh:mm a')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{recharge.customer?.name || '-'}</p>
                              <p className="text-sm text-muted-foreground">{recharge.customer?.customer_code || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ৳{recharge.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={recharge.payment_method === 'due' ? 'secondary' : 'outline'}
                              className={recharge.payment_method === 'due' ? 'bg-yellow-500/10 text-yellow-600' : ''}
                            >
                              {recharge.payment_method === 'due' ? 'Due' : 
                               recharge.payment_method === 'bkash' ? 'bKash' :
                               recharge.payment_method === 'nagad' ? 'Nagad' :
                               recharge.payment_method === 'bank' ? 'Bank' :
                               recharge.payment_method === 'online' ? 'Online' :
                               recharge.payment_method || 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {recharge.transaction_id ? (
                              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded max-w-[100px] truncate block" title={recharge.transaction_id}>
                                {recharge.transaction_id}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>{recharge.months || 1}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {recharge.old_expiry ? format(new Date(recharge.old_expiry), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-green-600">
                            {recharge.new_expiry ? format(new Date(recharge.new_expiry), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {getCollectorTypeBadge(recharge.collected_by_type, recharge.collected_by_name)}
                          </TableCell>
                          <TableCell>
                            {recharge.reseller ? (
                              <Badge variant="outline" className="gap-1">
                                <Store className="h-3 w-3" />
                                {recharge.reseller.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Direct</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  recharge.status === 'due' ? 'secondary' : 
                                  recharge.status === 'pending_manual' ? 'outline' :
                                  recharge.status === 'rejected' ? 'destructive' :
                                  'default'
                                }
                                className={
                                  recharge.status === 'due' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500' : 
                                  recharge.status === 'pending_manual' ? 'bg-orange-500/10 text-orange-600 border-orange-500' :
                                  recharge.status === 'rejected' ? '' :
                                  'bg-green-500/10 text-green-600'
                                }
                              >
                                {recharge.status === 'due' ? 'Due' : 
                                 recharge.status === 'pending_manual' ? 'Pending' : 
                                 recharge.status === 'rejected' ? 'Rejected' : 
                                 'Paid'}
                              </Badge>
                              {recharge.original_payment_method === 'due' && recharge.status === 'completed' && (
                                <span className="text-xs text-muted-foreground">(was Due)</span>
                              )}
                            </div>
                            {recharge.status === 'pending_manual' && recharge.notes && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={recharge.notes}>
                                {recharge.notes}
                              </p>
                            )}
                            {recharge.paid_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Paid: {format(new Date(recharge.paid_at), 'dd MMM, hh:mm a')}
                              </p>
                            )}
                            {recharge.paid_by_name && (
                              <p className="text-xs text-muted-foreground">
                                By: {recharge.paid_by_name}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {recharge.status === 'due' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => openEditDueDialog(recharge, e)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                            ) : recharge.status === 'pending_manual' ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-500/10 hover:bg-green-500/20 text-green-600"
                                  onClick={(e) => openVerifyDialog(recharge, e)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-600"
                                  onClick={(e) => openRejectDialog(recharge, e)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredRecharges.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mark Due as Paid Dialog */}
      <Dialog open={showEditDueDialog} onOpenChange={setShowEditDueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Due as Paid</DialogTitle>
            <DialogDescription>
              Update payment details for this due recharge
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="font-medium">{selectedRecharge.customer?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Amount: ৳{selectedRecharge.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Recharge Date: {format(new Date(selectedRecharge.recharge_date), 'dd MMM yyyy')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Actual Payment Method</Label>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Collected By</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{currentUser.name}</span>
                  <Badge variant="outline" className="ml-auto">{currentUser.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Logged in user will be recorded automatically
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDueDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Manual Payment Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Manual Payment</DialogTitle>
            <DialogDescription>
              Confirm this payment is valid and activate the customer
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md space-y-2">
                <p className="font-medium">{selectedRecharge.customer?.name}</p>
                <p className="text-sm text-muted-foreground">Code: {selectedRecharge.customer?.customer_code}</p>
                <p className="text-sm text-muted-foreground">Amount: ৳{selectedRecharge.amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Method: {selectedRecharge.payment_method}</p>
                {selectedRecharge.transaction_id && (
                  <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <span className="text-muted-foreground">Transaction ID:</span>{' '}
                    <span className="font-mono font-semibold text-blue-600">{selectedRecharge.transaction_id}</span>
                  </div>
                )}
                {selectedRecharge.notes && (
                  <p className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">{selectedRecharge.notes}</p>
                )}
                {selectedRecharge.new_expiry && (
                  <p className="text-sm text-green-600">New Expiry: {format(new Date(selectedRecharge.new_expiry), 'dd MMM yyyy')}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>Cancel</Button>
            <Button onClick={handleVerifyManualPayment} disabled={editLoading} className="bg-green-600 hover:bg-green-700">
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Verify Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Manual Payment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Enter a reason for rejecting this payment
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="font-medium">{selectedRecharge.customer?.name}</p>
                <p className="text-sm text-muted-foreground">Amount: ৳{selectedRecharge.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Input 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)} 
                  placeholder="e.g. Invalid TxID, Payment not found"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button onClick={handleRejectManualPayment} disabled={editLoading || !rejectReason.trim()} variant="destructive">
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
