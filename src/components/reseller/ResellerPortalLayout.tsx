import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, UserPlus, Wallet, ArrowRightLeft, 
  Settings, LogOut, Menu, ChevronRight, ReceiptText, UserCog
} from 'lucide-react';
import type { Reseller, ResellerPermissionKey } from '@/types/reseller';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';

interface ResellerPortalLayoutProps {
  children: React.ReactNode;
  reseller: Reseller | null;
  onLogout: () => void;
  hasPermission?: (permission: ResellerPermissionKey) => boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof Reseller | boolean;
}

export function ResellerPortalLayout({ children, reseller, onLogout }: ResellerPortalLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/reseller/dashboard', icon: LayoutDashboard },
    { label: 'Billing Summary', href: '/reseller/billing', icon: ReceiptText },
    { label: 'My Customers', href: '/reseller/customers', icon: Users },
    { 
      label: 'Sub-Resellers', 
      href: '/reseller/sub-resellers', 
      icon: UserPlus,
      permission: reseller?.can_create_sub_reseller || reseller?.can_view_sub_customers
    },
    { label: 'Transactions', href: '/reseller/transactions', icon: ArrowRightLeft },
    { 
      label: 'Reports', 
      href: '/reseller/reports', 
      icon: Wallet,
      permission: reseller?.can_view_reports
    },
    { label: 'My Profile', href: '/reseller/profile', icon: Settings },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.permission === undefined) return true;
    return !!item.permission;
  });

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{reseller?.name || 'Reseller'}</h2>
            <Badge variant="secondary" className="text-xs">
              {RESELLER_ROLE_LABELS[reseller?.role as keyof typeof RESELLER_ROLE_LABELS] || 'Reseller'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="p-4 border-b">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Balance</p>
          <p className="text-2xl font-bold">৳{(reseller?.balance || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col">
        <NavContent />
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[150px]">
              {reseller?.name}
            </span>
            <Badge variant="outline" className="text-xs">
              ৳{(reseller?.balance || 0).toLocaleString()}
            </Badge>
          </div>

          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
