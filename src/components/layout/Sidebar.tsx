import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Router,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Activity,
  Users,
  Terminal,
  Database,
  Building2,
  Package,
  CreditCard,
  Cog,
  FileText,
  DollarSign,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VPSStatusIndicator } from './VPSStatusIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  tenantOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  superAdminOnly?: boolean;
  tenantOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'OLT Management', href: '/olts', icon: Server },
  { title: 'ONU Devices', href: '/onus', icon: Router },
  { title: 'Alerts', href: '/alerts', icon: Bell, badge: 2 },
  { title: 'Monitoring', href: '/monitoring', icon: Activity },
  { title: 'DB Integrity', href: '/integrity', icon: Database },
  { title: 'Debug Logs', href: '/debug', icon: Terminal },
  { title: 'User Management', href: '/users', icon: Users, adminOnly: true },
  { title: 'Notification Settings', href: '/notifications', icon: Bell },
  { title: 'Notification History', href: '/notifications/history', icon: History },
  { title: 'Settings', href: '/settings', icon: Settings },
];

const superAdminItems: NavItem[] = [
  { title: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { title: 'Packages', href: '/admin/packages', icon: Package },
  { title: 'Payments', href: '/admin/payments', icon: CreditCard },
  { title: 'Gateways', href: '/admin/gateways', icon: Cog },
];

const tenantBillingItems: NavItem[] = [
  { title: 'My Subscription', href: '/billing/subscription', icon: FileText },
  { title: 'Make Payment', href: '/billing/pay', icon: DollarSign },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  // Filter main nav items based on user role
  const filteredMainItems = mainNavItems.filter(item => !item.adminOnly || isAdmin);

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <Badge variant="danger" className="h-5 min-w-[20px] justify-center">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="mt-4">
      {!collapsed && (
        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {items.map(renderNavItem)}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Network className="h-8 w-8 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">OLT Manager</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Network Operations</span>
            </div>
          </div>
        )}
        {collapsed && (
          <Network className="h-8 w-8 text-primary mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {/* Main Navigation */}
        <div className="flex flex-col gap-1">
          {filteredMainItems.map(renderNavItem)}
        </div>

        {/* Super Admin Section */}
        {isSuperAdmin && renderSection('Super Admin', superAdminItems)}

        {/* Tenant Billing Section */}
        {tenantId && !isSuperAdmin && renderSection('Billing', tenantBillingItems)}
      </nav>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 right-3 h-8 w-8 rounded-full border border-border bg-background hover:bg-secondary"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* VPS Connection Status */}
      <div className="absolute bottom-16 left-3 right-3">
        <VPSStatusIndicator collapsed={collapsed} />
      </div>
    </aside>
  );
}