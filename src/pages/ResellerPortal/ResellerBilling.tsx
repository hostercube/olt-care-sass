import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, Users, TrendingUp, TrendingDown, ReceiptText, DollarSign, CreditCard, AlertTriangle } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';

export default function ResellerBilling() {
  const navigate = useNavigate();
  const {
    session,
    reseller,
    loading,
    billingSummary,
    customers,
    transactions,
    logout,
    hasPermission,
  } = useResellerPortal();

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

  // Calculate monthly breakdown
  const monthlyData = transactions.reduce((acc, tx) => {
    const month = new Date(tx.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { income: 0, expense: 0 };
    }
    if (tx.amount > 0) {
      acc[month].income += tx.amount;
    } else {
      acc[month].expense += Math.abs(tx.amount);
    }
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  const recentMonths = Object.entries(monthlyData).slice(0, 6);

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing Summary</h1>
          <p className="text-muted-foreground">Overview of your earnings and collections</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Current Balance</p>
                  <p className="text-lg font-bold truncate">৳{(reseller?.balance || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Total Collections</p>
                  <p className="text-lg font-bold truncate">৳{(billingSummary?.totalCollections || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">This Month</p>
                  <p className="text-lg font-bold truncate">৳{(billingSummary?.rechargesThisMonth || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Commissions</p>
                  <p className="text-lg font-bold truncate">৳{(billingSummary?.commissionsEarned || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Total Customers</span>
                  <span className="font-bold">{billingSummary?.totalCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                  <span className="text-sm text-green-700">Active Customers</span>
                  <span className="font-bold text-green-700">{billingSummary?.activeCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                  <span className="text-sm text-red-700">Expired Customers</span>
                  <span className="font-bold text-red-700">{billingSummary?.expiredCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                  <span className="text-sm text-amber-700">Total Due Amount</span>
                  <span className="font-bold text-amber-700">৳{(billingSummary?.totalDue || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                  <span className="text-sm text-blue-700">Expected Monthly</span>
                  <span className="font-bold text-blue-700">৳{(billingSummary?.totalMonthlyRevenue || 0).toLocaleString()}</span>
                </div>
                {recentMonths.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Recent Months</p>
                    {recentMonths.map(([month, data]) => (
                      <div key={month} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm">{month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            ৳{data.income.toLocaleString()}
                          </span>
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            ৳{data.expense.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No transaction history yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Info */}
        {reseller && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Commission Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Commission Type</p>
                  <p className="font-bold capitalize">{reseller.commission_type}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Commission Rate</p>
                  <p className="font-bold">
                    {reseller.commission_value}{reseller.commission_type === 'percentage' ? '%' : '৳'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Per Customer Rate</p>
                  <p className="font-bold">৳{reseller.customer_rate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ResellerPortalLayout>
  );
}
