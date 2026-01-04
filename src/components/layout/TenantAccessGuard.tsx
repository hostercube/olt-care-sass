import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Loader2, AlertTriangle, Clock, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TenantAccessGuardProps {
  children: React.ReactNode;
}

export function TenantAccessGuard({ children }: TenantAccessGuardProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { tenant, loading: tenantLoading } = useTenantContext();
  const { subscriptions, loading: subLoading } = useSubscriptions();

  const isLoading = authLoading || superAdminLoading || tenantLoading || subLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super admins bypass all restrictions
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check tenant status
  if (tenant) {
    if (tenant.status === 'pending') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <CardTitle>Payment Required</CardTitle>
              <CardDescription>
                Your account is pending activation. Please complete payment to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => navigate('/billing/pay')} className="w-full">
                Go to Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (tenant.status === 'suspended') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Ban className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Account Suspended</CardTitle>
              <CardDescription>
                Your account has been suspended. 
                {tenant.suspended_reason && (
                  <span className="block mt-2">Reason: {tenant.suspended_reason}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Please contact support to resolve this issue and restore your access.
              </p>
              <Button onClick={() => navigate('/billing/pay')} className="w-full">
                Make a Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (tenant.status === 'cancelled') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>Subscription Cancelled</CardTitle>
              <CardDescription>
                Your subscription has been cancelled. Please renew to continue using the service.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate('/billing/subscription')}>
                View Subscription Options
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Check trial expiration
    if (tenant.status === 'trial' && tenant.trial_ends_at) {
      const trialEnd = new Date(tenant.trial_ends_at);
      if (trialEnd < new Date()) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-warning" />
                </div>
                <CardTitle>Trial Expired</CardTitle>
                <CardDescription>
                  Your free trial has ended. Subscribe to a plan to continue using the service.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button onClick={() => navigate('/billing/subscription')}>
                  Choose a Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }
    }
  }

  // Check active subscription
  const activeSubscription = subscriptions?.find(
    (sub) => sub.status === 'active' && new Date(sub.ends_at) > new Date()
  );

  // If tenant is not on trial and has no active subscription
  if (tenant && tenant.status === 'active' && !activeSubscription && subscriptions && subscriptions.length > 0) {
    const expiredSub = subscriptions.find(sub => sub.status === 'expired');
    if (expiredSub) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <CardTitle>Subscription Expired</CardTitle>
              <CardDescription>
                Your subscription has expired. Please renew to continue accessing the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => navigate('/billing/pay')} className="w-full">
                Renew Subscription
              </Button>
              <Button onClick={() => navigate('/billing/subscription')} variant="outline" className="w-full">
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
