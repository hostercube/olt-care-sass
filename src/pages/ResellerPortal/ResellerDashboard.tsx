import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Wallet, TrendingUp, ArrowRightLeft, UserPlus, AlertCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    session,
    reseller,
    loading,
    customers,
    subResellers,
    transactions,
    billingSummary,
    logout,
    refetch,
  } = useResellerPortal();

  // Handle impersonation token on mount
  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate');
    if (impersonateToken) {
      verifyImpersonationToken(impersonateToken);
    }
  }, [searchParams]);

  const verifyImpersonationToken = async (token: string) => {
    try {
      const { data: tokenData, error } = await supabase
        .from('reseller_login_tokens' as any)
        .select('*, reseller:resellers(*)')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (error || !tokenData) {
        toast.error('Invalid or expired login link');
        navigate('/reseller/login');
        return;
      }

      const expiresAt = new Date((tokenData as any).expires_at);
      if (expiresAt < new Date()) {
        toast.error('Login link has expired');
        navigate('/reseller/login');
        return;
      }

      // Mark token as used
      await supabase
        .from('reseller_login_tokens' as any)
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', (tokenData as any).id);

      const resellerData = (tokenData as any).reseller;

      localStorage.setItem('reseller_session', JSON.stringify({
        id: resellerData.id,
        name: resellerData.name,
        username: resellerData.username,
        tenant_id: resellerData.tenant_id,
        level: resellerData.level,
        role: resellerData.role,
        balance: resellerData.balance,
        is_impersonation: true,
        logged_in_at: new Date().toISOString(),
      }));

      toast.success(`Welcome, ${resellerData.name}!`);
      window.location.href = '/reseller/dashboard';
    } catch (err) {
      console.error('Error verifying token:', err);
      toast.error('Failed to verify login link');
      navigate('/reseller/login');
    }
  };

  // Redirect to login if no session
  useEffect(() => {
    if (!loading && !session) {
      navigate('/reseller/login');
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const expiredCustomers = customers.filter(c => c.status === 'expired').length;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {reseller?.name}!</h1>
            <p className="text-muted-foreground">
              {RESELLER_ROLE_LABELS[reseller?.role as keyof typeof RESELLER_ROLE_LABELS]} Dashboard
              {session.is_impersonation && (
                <Badge variant="outline" className="ml-2">Admin View</Badge>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Balance</p>
                  <p className="text-lg font-bold truncate">৳{(reseller?.balance || 0).toLocaleString()}</p>
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
                  <p className="text-xs text-muted-foreground truncate">Customers</p>
                  <p className="text-lg font-bold">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Active</p>
                  <p className="text-lg font-bold">{activeCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Expired</p>
                  <p className="text-lg font-bold">{expiredCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-resellers & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sub-resellers Card */}
          {reseller?.can_create_sub_reseller && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Sub-Resellers
                  </span>
                  <Badge variant="secondary">{subResellers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subResellers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sub-resellers yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subResellers.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.phone}</p>
                        </div>
                        <Badge variant="outline">৳{sub.balance.toLocaleString()}</Badge>
                      </div>
                    ))}
                    {subResellers.length > 5 && (
                      <Button variant="link" className="w-full" onClick={() => navigate('/reseller/sub-resellers')}>
                        View all {subResellers.length} sub-resellers
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}৳{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <Button variant="link" className="w-full" onClick={() => navigate('/reseller/transactions')}>
                    View all transactions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reseller/customers')}>
                <Users className="h-5 w-5" />
                <span className="text-xs">View Customers</span>
              </Button>
              {reseller?.can_add_customers && (
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reseller/customers?action=add')}>
                  <UserPlus className="h-5 w-5" />
                  <span className="text-xs">Add Customer</span>
                </Button>
              )}
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reseller/billing')}>
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Billing Summary</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reseller/transactions')}>
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-xs">Transactions</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResellerPortalLayout>
  );
}
