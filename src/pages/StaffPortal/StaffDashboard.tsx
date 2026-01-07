import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStaffAuth, PermissionGuard } from '@/hooks/useStaffPermissions';
import { 
  Users, Receipt, CreditCard, Package, Settings, LogOut, 
  UserPlus, FileText, RefreshCw, Loader2, Building2, Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { staffUser, loading, isAuthenticated, logout, hasPermission } = useStaffAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/staff/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staffUser) {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/staff/login');
  };

  const quickActions = [
    {
      title: 'View Customers',
      description: 'View customer list and profiles',
      icon: Users,
      permission: 'customer_view',
      href: '/staff/customers',
      color: 'text-blue-500',
    },
    {
      title: 'Add Customer',
      description: 'Register a new customer',
      icon: UserPlus,
      permission: 'customer_create',
      href: '/staff/customers/add',
      color: 'text-green-500',
    },
    {
      title: 'Recharge Customer',
      description: 'Process customer recharge',
      icon: RefreshCw,
      permission: 'customer_recharge',
      href: '/staff/recharge',
      color: 'text-purple-500',
    },
    {
      title: 'Collect Payment',
      description: 'Record payment collection',
      icon: CreditCard,
      permission: 'payment_collect',
      href: '/staff/payments',
      color: 'text-orange-500',
    },
    {
      title: 'View Bills',
      description: 'View customer bills',
      icon: Receipt,
      permission: 'billing_view',
      href: '/staff/bills',
      color: 'text-indigo-500',
    },
    {
      title: 'Packages',
      description: 'View available packages',
      icon: Package,
      permission: 'package_view',
      href: '/staff/packages',
      color: 'text-cyan-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Staff Portal</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {staffUser.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:flex">
                <Shield className="h-3 w-3 mr-1" />
                {staffUser.role}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Account information and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{staffUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{staffUser.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="secondary" className="capitalize">{staffUser.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline" className="capitalize">{staffUser.type}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <PermissionGuard key={action.title} permission={action.permission}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  toast.info('This feature will be available in the staff portal');
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
          ))}
        </div>

        {/* Permissions Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Your Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(staffUser.permissions)
                .filter(([_, value]) => value)
                .map(([key]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key.replace(/_/g, ' ')}
                  </Badge>
                ))}
              {Object.values(staffUser.permissions).filter(Boolean).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No specific permissions assigned. Contact your administrator.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
