import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useReferralSystem } from '@/hooks/useReferralSystem';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { 
  Gift, Users, DollarSign, TrendingUp, Settings, List, Loader2, Save, 
  Search, Filter, ChevronLeft, ChevronRight, Wallet, X, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ReferralManagement() {
  const { config, referrals, loading, saveConfig, updateReferralStatus, refetch } = useReferralSystem();
  const { formatCurrency } = useLanguageCurrency();
  const { tenantId } = useTenantContext();
  
  // Form state
  const [formData, setFormData] = useState({
    is_enabled: false,
    bonus_type: 'fixed',
    bonus_amount: 0,
    bonus_percentage: 0,
    min_referrals_for_bonus: 1,
    bonus_validity_days: 30,
    terms_and_conditions: '',
    withdraw_enabled: true,
    use_wallet_for_recharge: true,
  });
  const [saving, setSaving] = useState(false);

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Customer wallet tracking
  const [customerWallets, setCustomerWallets] = useState<Array<{
    customer_id: string;
    customer_name: string;
    customer_code: string;
    wallet_balance: number;
    total_referrals: number;
    total_bonus_earned: number;
  }>>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [walletSearch, setWalletSearch] = useState('');
  const [walletPage, setWalletPage] = useState(1);
  const [walletPageSize, setWalletPageSize] = useState(ITEMS_PER_PAGE);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        is_enabled: config.is_enabled,
        bonus_type: config.bonus_type,
        bonus_amount: config.bonus_amount,
        bonus_percentage: config.bonus_percentage,
        min_referrals_for_bonus: config.min_referrals_for_bonus,
        bonus_validity_days: config.bonus_validity_days,
        terms_and_conditions: config.terms_and_conditions || '',
        withdraw_enabled: (config as any).withdraw_enabled ?? true,
        use_wallet_for_recharge: (config as any).use_wallet_for_recharge ?? true,
      });
    }
  }, [config]);

  // Fetch customer wallets
  useEffect(() => {
    const fetchCustomerWallets = async () => {
      if (!tenantId) return;
      setLoadingWallets(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, customer_code, wallet_balance')
          .eq('tenant_id', tenantId)
          .gt('wallet_balance', 0)
          .order('wallet_balance', { ascending: false });

        if (error) throw error;

        // Get referral counts for each customer
        const walletsWithStats = await Promise.all(
          (data || []).map(async (customer) => {
            const { count } = await supabase
              .from('customer_referrals')
              .select('*', { count: 'exact', head: true })
              .eq('referrer_customer_id', customer.id);
            
            const { data: bonusData } = await supabase
              .from('customer_referrals')
              .select('bonus_amount')
              .eq('referrer_customer_id', customer.id)
              .eq('status', 'bonus_paid');

            const totalBonus = bonusData?.reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0;

            return {
              customer_id: customer.id,
              customer_name: customer.name,
              customer_code: customer.customer_code,
              wallet_balance: customer.wallet_balance || 0,
              total_referrals: count || 0,
              total_bonus_earned: totalBonus
            };
          })
        );

        setCustomerWallets(walletsWithStats);
      } catch (error) {
        console.error('Error fetching wallets:', error);
      } finally {
        setLoadingWallets(false);
      }
    };

    fetchCustomerWallets();
  }, [tenantId]);

  const handleSaveConfig = async () => {
    setSaving(true);
    await saveConfig(formData);
    setSaving(false);
  };

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchesSearch = searchQuery === '' || 
        r.referrer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referrer?.customer_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referred?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referred_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtered wallets
  const filteredWallets = useMemo(() => {
    return customerWallets.filter(w =>
      w.customer_name.toLowerCase().includes(walletSearch.toLowerCase()) ||
      w.customer_code.toLowerCase().includes(walletSearch.toLowerCase())
    );
  }, [customerWallets, walletSearch]);

  const totalWalletPages = Math.ceil(filteredWallets.length / walletPageSize);
  const paginatedWallets = filteredWallets.slice(
    (walletPage - 1) * walletPageSize,
    walletPage * walletPageSize
  );


  // Stats - Simplified
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active' || r.status === 'bonus_paid').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const rejectedReferrals = referrals.filter(r => r.status === 'rejected').length;
  const totalBonusPaid = referrals.filter(r => r.status === 'bonus_paid' || r.status === 'active').reduce((sum, r) => sum + r.bonus_amount, 0);
  const totalWalletBalance = customerWallets.reduce((sum, w) => sum + w.wallet_balance, 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      active: 'default',
      bonus_paid: 'default',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      bonus_paid: 'Active',
      rejected: 'Rejected',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  // Handle referral approval - auto credits bonus
  const handleApproveReferral = async (referral: any) => {
    try {
      // Get config for bonus calculation
      const bonus = config?.bonus_type === 'fixed' 
        ? config?.bonus_amount || 0 
        : 0;

      const { error } = await supabase
        .from('customer_referrals')
        .update({ 
          status: 'active', 
          bonus_amount: bonus,
          bonus_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', referral.id);
      
      if (error) throw error;

      // Add bonus to referrer's wallet
      if (bonus > 0 && referral.referrer_customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('wallet_balance, referral_bonus_balance')
          .eq('id', referral.referrer_customer_id)
          .single();
        
        const currentBalance = customerData?.wallet_balance || 0;
        const currentBonus = customerData?.referral_bonus_balance || 0;
        
        await supabase
          .from('customers')
          .update({ 
            wallet_balance: currentBalance + bonus,
            referral_bonus_balance: currentBonus + bonus
          })
          .eq('id', referral.referrer_customer_id);
      }
      
      toast.success('Referral approved and bonus credited to wallet');
      refetch();
    } catch (error: any) {
      toast.error('Failed to approve referral');
      console.error(error);
    }
  };

  const handleRejectReferral = async (referralId: string) => {
    try {
      const { error } = await supabase
        .from('customer_referrals')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', referralId);
      
      if (error) throw error;
      toast.success('Referral rejected');
      refetch();
    } catch (error: any) {
      toast.error('Failed to reject referral');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Referral Management" subtitle="Manage customer referral program">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Referral Management" subtitle="Manage customer referral program">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalReferrals}</p>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Gift className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bonus Paid</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalBonusPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Wallet className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Wallet</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalWalletBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <List className="h-4 w-4" /> Referrals ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Customer Wallets ({customerWallets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Referral Program Settings</CardTitle>
              <CardDescription>Configure your customer referral program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Enable Referral Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to refer friends and earn bonuses
                  </p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                />
              </div>

              {/* Bonus Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonus Type</Label>
                  <Select
                    value={formData.bonus_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, bonus_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage of Bill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.bonus_type === 'fixed' ? (
                  <div className="space-y-2">
                    <Label>Bonus Amount</Label>
                    <Input
                      type="number"
                      value={formData.bonus_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, bonus_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g., 100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Bonus Percentage (%)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, bonus_percentage: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g., 10"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Minimum Referrals for Bonus</Label>
                  <Input
                    type="number"
                    value={formData.min_referrals_for_bonus}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_referrals_for_bonus: parseInt(e.target.value) || 1 }))}
                    placeholder="e.g., 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bonus Validity (Days)</Label>
                  <Input
                    type="number"
                    value={formData.bonus_validity_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonus_validity_days: parseInt(e.target.value) || 30 }))}
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                  placeholder="Enter terms and conditions for the referral program..."
                  rows={4}
                />
              </div>

              {/* Additional Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Additional Options</h4>
                
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Enable Withdraw Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to request wallet balance withdrawals
                    </p>
                  </div>
                  <Switch
                    checked={formData.withdraw_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, withdraw_enabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Use Wallet for Recharge</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to use wallet balance when paying bills
                    </p>
                  </div>
                  <Switch
                    checked={formData.use_wallet_for_recharge}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_wallet_for_recharge: checked }))}
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Referrals</CardTitle>
                  <CardDescription>Track and manage customer referrals</CardDescription>
                </div>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search referrals..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="pl-9 w-full sm:w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery || statusFilter !== 'all' ? 'No matching referrals found' : 'No referrals yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReferrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.referrer?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{referral.referrer?.customer_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.referred?.name || referral.referred_name || '-'}</p>
                              <p className="text-xs text-muted-foreground">
                                {referral.referred?.customer_code || referral.referred_phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{referral.referral_code}</code>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(referral.status)}
                              {referral.status === 'rejected' && (referral as any).notes && (
                                <p className="text-xs text-red-500 max-w-32 truncate" title={(referral as any).notes}>
                                  {(referral as any).notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(referral.bonus_amount)}</TableCell>
                          <TableCell>{format(new Date(referral.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            {referral.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleApproveReferral(referral)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleRejectReferral(referral.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {referral.status === 'rejected' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleApproveReferral(referral)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {(referral.status === 'active' || referral.status === 'bonus_paid') && (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredReferrals.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>of {filteredReferrals.length} entries</span>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-3 text-sm">Page {currentPage} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Customer Wallets</CardTitle>
                  <CardDescription>View customer wallet balances and referral bonuses</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={walletSearch}
                    onChange={(e) => { setWalletSearch(e.target.value); setWalletPage(1); }}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingWallets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Customer Code</TableHead>
                          <TableHead>Wallet Balance</TableHead>
                          <TableHead>Total Referrals</TableHead>
                          <TableHead>Total Bonus Earned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedWallets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No customers with wallet balance
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedWallets.map((wallet) => (
                            <TableRow key={wallet.customer_id}>
                              <TableCell className="font-medium">{wallet.customer_name}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{wallet.customer_code}</code>
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                {formatCurrency(wallet.wallet_balance)}
                              </TableCell>
                              <TableCell>{wallet.total_referrals}</TableCell>
                              <TableCell>{formatCurrency(wallet.total_bonus_earned)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {filteredWallets.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Show</span>
                        <Select value={String(walletPageSize)} onValueChange={(v) => { setWalletPageSize(Number(v)); setWalletPage(1); }}>
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map(size => (
                              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>of {filteredWallets.length} entries</span>
                      </div>
                      {totalWalletPages > 1 && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setWalletPage(p => Math.max(1, p - 1))} disabled={walletPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="flex items-center px-3 text-sm">Page {walletPage} of {totalWalletPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setWalletPage(p => Math.min(totalWalletPages, p + 1))} disabled={walletPage === totalWalletPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
