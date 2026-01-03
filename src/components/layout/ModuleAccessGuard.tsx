import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { ModuleName } from '@/types/saas';

interface ModuleAccessGuardProps {
  module: ModuleName;
  children: React.ReactNode;
  moduleName?: string;
}

export function ModuleAccessGuard({ module, children, moduleName }: ModuleAccessGuardProps) {
  const { hasAccess, loading } = useModuleAccess();
  const { isSuperAdmin, loading: saLoading } = useSuperAdmin();

  if (loading || saLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admins have access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check module access
  if (!hasAccess(module)) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Module Not Available</CardTitle>
            <CardDescription>
              {moduleName || 'This module'} is not included in your current subscription package.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please upgrade your subscription to access this feature, or contact support for assistance.
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/billing/subscription">
                <Button>View Subscription</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
