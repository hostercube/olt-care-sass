import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Gift, Copy, Users, DollarSign, CheckCircle, Clock, Share2, Wallet, ArrowDownCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustomerContext {
  customer: any;
  tenantBranding: any;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  rejected_referrals: number;
  total_bonus_earned: number;
  bonus_balance: number;
}

interface ReferralRecord {
  id: string;
  referred_name: string;
  referred_phone: string;
  status: string;
  bonus_amount: number;
  bonus_paid_at: string | null;
  notes: string | null;
  created_at: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function CustomerReferral() {
  const context = useOutletContext<CustomerContext>();
  const customer = context?.customer;

  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<ReferralRecord[]>([]);
  const [bonusPerReferral, setBonusPerReferral] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawEnabled, setWithdrawEnabled] = useState<boolean>(false);
  const [useWalletForRecharge, setUseWalletForRecharge] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Withdraw dialog
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchReferralData = useCallback(async () => {
    if (!customer?.id || !customer?.tenant_id) return;

    try {
      // Fetch or generate referral code
      let code = customer.referral_code;
      if (!code) {
        const { data: generatedCode } = await supabase
          .rpc('generate_customer_referral_code', { p_customer_id: customer.id });
        code = generatedCode;
      }
      setReferralCode(code || '');

      // Get tenant domain for referral link
      const { data: domainData } = await supabase
        .rpc('get_tenant_referral_domain', { p_tenant_id: customer.tenant_id });
      
      if (domainData && code) {
        const rawDomain = String(domainData);
        const normalized = rawDomain
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, '');

        // If domain includes a path (e.g., isppoint.com/p/tenant), don't add an extra slash before ?
        const url = normalized.includes('/')
          ? `https://${normalized}?ref=${code}`
          : `https://${normalized}/?ref=${code}`;

        setReferralLink(url);
      }

      // Fetch referral stats
      const { data: statsData } = await supabase
        .rpc('get_customer_referral_stats', { p_customer_id: customer.id });
      
      if (statsData && Array.isArray(statsData) && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch wallet balance
      const { data: balanceData } = await supabase
        .rpc('get_customer_wallet_balance', { p_customer_id: customer.id });
      setWalletBalance(Number(balanceData) || 0);

      // Fetch referral config for bonus amount and settings
      const { data: configData } = await supabase
        .from('referral_configs')
        .select('bonus_amount, bonus_type, bonus_percentage, withdraw_enabled, use_wallet_for_recharge')
        .eq('tenant_id', customer.tenant_id)
        .maybeSingle();
      
      if (configData) {
        setBonusPerReferral(configData.bonus_amount || 0);
        // Use explicit boolean check - if false, keep false; only default to false if null/undefined
        setWithdrawEnabled(configData.withdraw_enabled === true);
        setUseWalletForRecharge(configData.use_wallet_for_recharge !== false);
      } else {
        // No config exists - defaults to disabled
        setWithdrawEnabled(false);
        setUseWalletForRecharge(true);
      }

      // Fetch referral history
      const { data: referralData } = await supabase
        .from('customer_referrals')
        .select('id, referred_name, referred_phone, status, bonus_amount, bonus_paid_at, notes, created_at')
        .eq('referrer_customer_id', customer.id)
        .order('created_at', { ascending: false });

      setReferrals(referralData || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Filter and paginate referrals
  useEffect(() => {
    let filtered = referrals;
    if (statusFilter !== 'all') {
      filtered = referrals.filter(r => r.status === statusFilter);
    }
    setFilteredReferrals(filtered);
    setCurrentPage(1);
  }, [referrals, statusFilter]);

  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredReferrals.length / pageSize);

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
    }
  };

  const shareReferralLink = () => {
    const shareText = `Join using my referral link: ${referralLink}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join with my referral',
        text: shareText,
        url: referralLink,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Share text copied to clipboard!');
    }
  };

  const handleWithdraw = async () => {
    if (!customer?.id) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }
    if (!withdrawAccount) {
      toast.error('Please enter account number');
      return;
    }

    setWithdrawing(true);
    try {
      const { error } = await supabase.rpc('create_withdraw_request', {
        p_customer_id: customer.id,
        p_amount: amount,
        p_payment_method: withdrawMethod,
        p_payment_details: { account_number: withdrawAccount }
      });

      if (error) throw error;

      toast.success('Withdraw request submitted successfully!');
      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      fetchReferralData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit withdraw request');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'bonus_paid':
      case 'activated':
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Referral Program
        </h1>
        <p className="text-muted-foreground">
          Invite friends and earn rewards when they subscribe
        </p>
      </div>

      {/* Wallet Balance Card */}
      <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-green-500/10">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold text-green-500">৳{walletBalance.toFixed(2)}</p>
                {useWalletForRecharge && walletBalance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You can use this balance when paying your bills
                  </p>
                )}
              </div>
            </div>
            {withdrawEnabled && (
              <Button 
                onClick={() => setWithdrawDialogOpen(true)} 
                disabled={walletBalance <= 0}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referral Code Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to earn ৳{bonusPerReferral} per successful referral
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input 
              value={referralLink || referralCode} 
              readOnly 
              className="text-sm font-mono bg-background"
            />
            <Button variant="outline" size="icon" onClick={copyReferralLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="default" onClick={shareReferralLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Code:</span>
            <code className="bg-muted px-2 py-1 rounded font-mono">{referralCode}</code>
            <Button variant="ghost" size="sm" onClick={copyReferralCode}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Simplified: Total, Active, Pending, Rejected, Earned */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{referrals.length || stats?.total_referrals || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {referrals.filter(r => r.status === 'active' || r.status === 'bonus_paid').length || stats?.successful_referrals || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {referrals.filter(r => r.status === 'pending').length || stats?.pending_referrals || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {referrals.filter(r => r.status === 'rejected').length || stats?.rejected_referrals || 0}
                </p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Earned</p>
                <p className="text-2xl font-bold text-primary">
                  ৳{referrals.filter(r => r.status === 'active' || r.status === 'bonus_paid').reduce((sum, r) => sum + (r.bonus_amount || 0), 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>People who signed up using your referral code</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedReferrals.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">{referral.referred_name || 'N/A'}</TableCell>
                      <TableCell>{referral.referred_phone || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(referral.status)}
                          {referral.status === 'rejected' && referral.notes && (
                            <p className="text-xs text-red-500">{referral.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {referral.status === 'active' || referral.status === 'bonus_paid' ? (
                          <span className="text-green-600 font-medium">৳{referral.bonus_amount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(referral.created_at), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {filteredReferrals.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your referral link to start earning!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Available balance: ৳{walletBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                max={walletBalance}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                placeholder="Enter account/mobile number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
