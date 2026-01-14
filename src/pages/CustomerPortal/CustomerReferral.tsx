import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Copy, Users, DollarSign, CheckCircle, Clock, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustomerContext {
  customer: any;
  tenantBranding: any;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals?: number;
  total_bonus_earned?: number;
  bonus_earned?: number;
  bonus_balance?: number;
}

interface ReferralRecord {
  id: string;
  referred_name: string;
  referred_phone: string;
  status: string;
  bonus_amount: number;
  bonus_paid_at: string | null;
  created_at: string;
}

export default function CustomerReferral() {
  const context = useOutletContext<CustomerContext>();
  const customer = context?.customer;

  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [bonusPerReferral, setBonusPerReferral] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

      // Fetch referral stats
      const { data: statsData } = await supabase
        .rpc('get_customer_referral_stats', { p_customer_id: customer.id });
      
      if (statsData && Array.isArray(statsData) && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch referral config for bonus amount
      const { data: configData } = await supabase
        .rpc('get_referral_config', { p_tenant_id: customer.tenant_id });
      
      if (configData) {
        const config = typeof configData === 'string' ? JSON.parse(configData) : configData;
        setBonusPerReferral(config?.referrer_bonus_amount || 0);
      }

      // Fetch referral history
      const { data: referralData } = await supabase
        .from('customer_referrals')
        .select('id, referred_name, referred_phone, status, bonus_amount, bonus_paid_at, created_at')
        .eq('referrer_customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

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

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  };

  const shareReferralLink = () => {
    const shareText = `Join using my referral code: ${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join with my referral',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Share text copied to clipboard!');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'activated':
        return <Badge className="bg-blue-500">Activated</Badge>;
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

      {/* Referral Code Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code with friends to earn ৳{bonusPerReferral} per successful referral
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input 
              value={referralCode} 
              readOnly 
              className="text-lg font-mono font-bold text-center bg-background"
            />
            <Button variant="outline" size="icon" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="default" onClick={shareReferralLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats?.successful_referrals || 0}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending_referrals || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-primary">৳{stats?.total_bonus_earned || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>People who signed up using your referral code</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
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
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.referred_name || 'N/A'}</TableCell>
                    <TableCell>{referral.referred_phone || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell>
                      {referral.bonus_paid_at ? (
                        <span className="text-green-600 font-medium">৳{referral.bonus_amount}</span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(referral.created_at), 'dd MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your referral code to start earning!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
