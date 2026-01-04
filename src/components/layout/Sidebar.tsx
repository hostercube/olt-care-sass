import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Cog,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  Network,
  Package,
  Receipt,
  Router,
  Server,
  Settings,
  Terminal,
  Users,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VPSStatusIndicator } from './VPSStatusIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import type { ModuleName } from '@/types/saas';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  requiredModule?: ModuleName;
}

const oltCareItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'OLT Management', href: '/olts', icon: Server },
  { title: 'ONU Devices', href: '/onus', icon: Router },
  { title: 'Alerts', href: '/alerts', icon: Bell },
  { title: 'Monitoring', href: '/monitoring', icon: Activity },
];

const ispModuleItems: NavItem[] = [
  { title: 'ISP Dashboard', href: '/isp', icon: LayoutDashboard },
  { title: 'Customers', href: '/isp/customers', icon: Users, requiredModule: 'isp_customers' },
  { title: 'Billing', href: '/isp/billing', icon: Receipt, requiredModule: 'isp_billing' },
  { title: 'Automation', href: '/isp/automation', icon: Zap, requiredModule: 'isp_billing' },
  { title: 'Packages', href: '/isp/packages', icon: Package },
  { title: 'Areas', href: '/isp/areas', icon: MapPin },
  { title: 'Resellers', href: '/isp/resellers', icon: Users, requiredModule: 'isp_resellers' },
  { title: 'MikroTik', href: '/isp/mikrotik', icon: Wifi, requiredModule: 'isp_mikrotik' },
  { title: 'SMS Center', href: '/isp/sms', icon: MessageSquare, requiredModule: 'sms_alerts' },
  { title: 'bKash Payments', href: '/isp/bkash', icon: Wallet },
  { title: 'Gateways', href: '/isp/gateways', icon: CreditCard },
  { title: 'Inventory', href: '/isp/inventory', icon: Package, requiredModule: 'isp_inventory' },
  { title: 'Staff & Salary', href: '/isp/staff', icon: Users },
  { title: 'Income/Expense', href: '/isp/transactions', icon: CreditCard },
  { title: 'Reports', href: '/isp/reports', icon: FileText },
  { title: 'Custom Domain', href: '/isp/domain', icon: Network, requiredModule: 'custom_domain' },
];

const tenantSystemItems: NavItem[] = [
  { title: 'DB Integrity', href: '/integrity', icon: Database },
  { title: 'Debug Logs', href: '/debug', icon: Terminal },
  { title: 'User Management', href: '/users', icon: Users, adminOnly: true },
  { title: 'Notification Settings', href: '/notifications', icon: Bell },
  { title: 'Notification History', href: '/notifications/history', icon: ClipboardList },
  { title: 'Activity Logs', href: '/activity-logs', icon: ClipboardList },
  { title: 'Invoices', href: '/invoices', icon: FileText },
  { title: 'Settings', href: '/settings', icon: Settings },
];

const superAdminItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { title: 'Packages', href: '/admin/packages', icon: Package },
  { title: 'Payments', href: '/admin/payments', icon: CreditCard },
  { title: 'Payment Gateways', href: '/admin/gateways', icon: Wallet },
  { title: 'Email Gateway', href: '/admin/email-gateway', icon: Mail },
  { title: 'Email Templates', href: '/admin/email-templates', icon: FileText },
  { title: 'SMS Gateway', href: '/admin/sms-gateway', icon: MessageSquare },
  { title: 'SMS Templates', href: '/admin/sms-templates', icon: MessageSquare },
  { title: 'SMS Center', href: '/admin/sms-center', icon: MessageSquare },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

const tenantBillingItems: NavItem[] = [
  { title: 'My Subscription', href: '/billing/subscription', icon: FileText },
  { title: 'Make Payment', href: '/billing/pay', icon: CreditCard },
  { title: 'Billing History', href: '/billing/history', icon: Receipt },
  { title: 'Renew', href: '/billing/renew', icon: Zap },
];

function readImpersonation(): { tenantId: string; tenantName?: string } | null {
  try {
    const raw = sessionStorage.getItem('loginAsTenant');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tenantId) return null;
    return { tenantId: String(parsed.tenantId), tenantName: parsed.tenantName };
  } catch {
    return null;
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [ispExpanded, setIspExpanded] = useState(true);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [impersonation, setImpersonation] = useState<{ tenantId: string; tenantName?: string } | null>(null);

  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId, isImpersonating } = useTenantContext() as any;
  const { hasAccess } = useModuleAccess();

  // Keep state synced with storage for super admins.
  useEffect(() => {
    if (!isSuperAdmin) {
      setImpersonation(null);
      return;
    }
    setImpersonation(readImpersonation());
  }, [isSuperAdmin, location.pathname]);

  const inTenantView = isSuperAdmin && (isImpersonating || !!impersonation);
  const showSuperAdminNav = isSuperAdmin && !inTenantView;

  // Auto-expand ISP section when on ISP routes (tenant view only)
  useEffect(() => {
    if (location.pathname.startsWith('/isp')) setIspExpanded(true);
  }, [location.pathname]);

  const filteredTenantSystemItems = useMemo(
    () => tenantSystemItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  const filteredIspItems = useMemo(
    () =>
      ispModuleItems.filter((item) => {
        // When super admin is impersonating, show only package-enabled modules.
        if (isSuperAdmin && !inTenantView) return true;
        if (!item.requiredModule) return true;
        return hasAccess(item.requiredModule);
      }),
    [hasAccess, inTenantView, isSuperAdmin],
  );

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
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

  const renderSection = (
    title: string,
    items: NavItem[],
    opts?: { collapsible?: boolean; expanded?: boolean; onToggle?: () => void },
  ) => {
    const collapsible = !!opts?.collapsible;
    const expanded = !!opts?.expanded;

    return (
      <div className="mt-3">
        {!collapsed && (
          <div
            className={cn(
              'flex items-center justify-between px-3 mb-1',
              collapsible && 'cursor-pointer hover:bg-muted/50 rounded py-1',
            )}
            onClick={collapsible ? opts?.onToggle : undefined}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {collapsible && (expanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ))}
          </div>
        )}
        {(!collapsible || expanded || collapsed) && <div className="flex flex-col gap-0.5">{items.map(renderNavItem)}</div>}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Network className="h-7 w-7 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-foreground">ISP Point</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {showSuperAdminNav ? 'SaaS Admin' : 'ISP Dashboard'}
              </span>
            </div>
          </div>
        ) : (
          <Network className="h-7 w-7 text-primary mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2 mt-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {showSuperAdminNav ? (
          <>
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Super Admin</p>
            )}
            <div className="flex flex-col gap-0.5">{superAdminItems.map(renderNavItem)}</div>
          </>
        ) : (
          <>
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">OLT Care</p>
            )}
            <div className="flex flex-col gap-0.5">{oltCareItems.map(renderNavItem)}</div>

            {renderSection('ISP Management', filteredIspItems, {
              collapsible: true,
              expanded: ispExpanded,
              onToggle: () => setIspExpanded((v) => !v),
            })}

            {renderSection('System', filteredTenantSystemItems, {
              collapsible: true,
              expanded: systemExpanded,
              onToggle: () => setSystemExpanded((v) => !v),
            })}

            {tenantId && !isSuperAdmin && renderSection('Billing', tenantBillingItems)}
          </>
        )}
      </nav>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 right-2 h-7 w-7 rounded-full border border-border bg-background hover:bg-secondary"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* VPS Connection Status */}
      <div className="absolute bottom-14 left-2 right-2">
        <VPSStatusIndicator collapsed={collapsed} />
      </div>
    </aside>
  );
}
