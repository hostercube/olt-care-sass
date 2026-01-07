import { Navigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/useStaffPermissions';
import { Loader2 } from 'lucide-react';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
  requireAll?: boolean;
}

export function StaffProtectedRoute({ 
  children, 
  requiredPermission,
  requireAll = false 
}: StaffProtectedRouteProps) {
  const { isAuthenticated, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useStaffAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/staff/login" replace />;
  }

  // Check permissions if required
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions) 
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
