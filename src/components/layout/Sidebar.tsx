import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Activity,
  Bell,
  Box,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Gauge,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Network,
  Package,
  Receipt,
  Router,
  Server,
  Settings,
  Shield,
  Terminal,
  UserCheck,
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
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import type { ModuleName } from '@/types/saas';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  requiredModule?: ModuleName;
}

// OLT Care - Network infrastructure monitoring
const oltCareItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'OLT Management', href: '/olts', icon: Server },
  { title: 'ONU Devices', href: '/onus', icon: Router },
  { title: 'Alerts', href: '/alerts', icon: Bell },
  { title: 'Monitoring', href: '/monitoring', icon: Activity },
];

// Customer Management - Core customer operations
const customerMgmtItems: NavItem[] = [
  { title: 'Customers', href: '/isp/customers', icon: Users, requiredModule: 'isp_customers' },
  { title: 'Customer Types', href: '/isp/customer-types', icon: UserCheck },
  { title: 'Packages', href: '/isp/packages', icon: Package },
  { title: 'Areas', href: '/isp/areas', icon: MapPin },
];

// Billing & Finance - Financial operations
const billingFinanceItems: NavItem[] = [
  { title: 'Recharge History', href: '/isp/recharge-history', icon: ClipboardList, requiredModule: 'isp_billing' },
  { title: 'Automation', href: '/isp/automation', icon: Zap, requiredModule: 'isp_billing' },
  { title: 'bKash Payments', href: '/isp/bkash', icon: Wallet },
  { title: 'Income/Expense', href: '/isp/transactions', icon: DollarSign },
];

// Reseller Management - Multi-level reseller system
const resellerItems: NavItem[] = [
  { title: 'Resellers List', href: '/isp/resellers', icon: UserCheck, requiredModule: 'isp_resellers' },
  { title: 'Reseller Roles', href: '/isp/reseller-roles', icon: Shield, requiredModule: 'isp_resellers' },
  { title: 'Reseller Billing', href: '/isp/reseller-billing', icon: Wallet, requiredModule: 'isp_resellers' },
];

// Network & Infrastructure - MikroTik, OLT related
const networkInfraItems: NavItem[] = [
  { title: 'MikroTik', href: '/isp/mikrotik', icon: Wifi, requiredModule: 'isp_mikrotik' },
  { title: 'Bandwidth Mgmt', href: '/isp/bandwidth', icon: Gauge, requiredModule: 'isp_bandwidth_management' },
  { title: 'Custom Domain', href: '/isp/domain', icon: Network, requiredModule: 'custom_domain' },
];

// Communication & Marketing
const communicationItems: NavItem[] = [
  { title: 'SMS Center', href: '/isp/sms', icon: MessageSquare, requiredModule: 'sms_alerts' },
  { title: 'Campaigns', href: '/isp/campaigns', icon: Megaphone },
  { title: 'All Gateways', href: '/isp/gateways', icon: CreditCard },
];

// Operations & HR
const operationsHRItems: NavItem[] = [
  { title: 'Payroll & HR', href: '/isp/staff', icon: Users, requiredModule: 'isp_hr_payroll' },
  { title: 'Inventory', href: '/isp/pos', icon: Box, requiredModule: 'isp_inventory' },
  { title: 'Reports', href: '/isp/reports', icon: FileText },
];

// System Settings - Admin controls
const tenantSystemItems: NavItem[] = [
  { title: 'User Management', href: '/users', icon: Shield, adminOnly: true },
  { title: 'Roles & Permissions', href: '/isp/roles', icon: Shield },
  { title: 'Activity Logs', href: '/activity-logs', icon: ClipboardList },
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'DB Integrity', href: '/integrity', icon: Database },
  { title: 'Settings', href: '/settings', icon: Settings },
];

// Super Admin - Core items
const superAdminCoreItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { title: 'Packages', href: '/admin/packages', icon: Package },
];

// Super Admin - Payment Settings
const superAdminPaymentItems: NavItem[] = [
  { title: 'Payment Gateway', href: '/admin/gateways', icon: Wallet },
  { title: 'Payments', href: '/admin/payments', icon: CreditCard },
];

// Super Admin - Email Settings
const superAdminEmailItems: NavItem[] = [
  { title: 'Email Gateway', href: '/admin/email-gateway', icon: Mail },
  { title: 'Email Templates', href: '/admin/email-templates', icon: FileText },
];

// Super Admin - SMS Settings
const superAdminSMSItems: NavItem[] = [
  { title: 'SMS Gateway', href: '/admin/sms-gateway', icon: MessageSquare },
  { title: 'SMS Templates', href: '/admin/sms-templates', icon: FileText },
  { title: 'SMS Log', href: '/admin/sms-center', icon: Terminal },
];

// Super Admin - Other
const superAdminOtherItems: NavItem[] = [
  { title: 'Custom Domains', href: '/admin/custom-domains', icon: Network },
  { title: 'Notifications', href: '/admin/notifications', icon: Bell },
  { title: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

// Subscription & Billing for tenants
const tenantBillingItems: NavItem[] = [
  { title: 'My Subscription', href: '/billing/subscription', icon: FileText },
  { title: 'Invoices', href: '/billing/history', icon: Receipt },
  { title: 'Make Payment', href: '/billing/pay', icon: CreditCard },
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
  const [customerExpanded, setCustomerExpanded] = useState(true);
  const [billingExpanded, setBillingExpanded] = useState(false);
  const [networkExpanded, setNetworkExpanded] = useState(false);
  const [communicationExpanded, setCommunicationExpanded] = useState(false);
  const [operationsExpanded, setOperationsExpanded] = useState(false);
  const [resellerExpanded, setResellerExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [subscriptionExpanded, setSubscriptionExpanded] = useState(false);
  const [impersonation, setImpersonation] = useState<{ tenantId: string; tenantName?: string } | null>(null);
  
  // Super Admin section expansions
  const [paymentSettingsExpanded, setPaymentSettingsExpanded] = useState(false);
  const [emailSettingsExpanded, setEmailSettingsExpanded] = useState(false);
  const [smsSettingsExpanded, setSmsSettingsExpanded] = useState(false);

  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId, isImpersonating } = useTenantContext() as any;
  const { hasAccess } = useModuleAccess();
  const { t } = useLanguageCurrency();

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

  // Auto-expand sections when on relevant routes
  useEffect(() => {
    if (location.pathname.startsWith('/isp')) {
      if (location.pathname.includes('/recharge') || location.pathname.includes('/bkash') || location.pathname.includes('/transactions') || location.pathname.includes('/automation')) {
        setBillingExpanded(true);
      } else if (location.pathname.includes('/mikrotik') || location.pathname.includes('/bandwidth') || location.pathname.includes('/domain')) {
        setNetworkExpanded(true);
      } else if (location.pathname.includes('/sms') || location.pathname.includes('/campaigns') || location.pathname.includes('/gateways')) {
        setCommunicationExpanded(true);
      } else if (location.pathname.includes('/staff') || location.pathname.includes('/pos') || location.pathname.includes('/reports')) {
        setOperationsExpanded(true);
      } else if (location.pathname.includes('/reseller')) {
        setResellerExpanded(true);
      } else {
        setCustomerExpanded(true);
      }
    }
    if (location.pathname.startsWith('/billing')) {
      setSubscriptionExpanded(true);
    }
  }, [location.pathname]);

  const filteredTenantSystemItems = useMemo(
    () => tenantSystemItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  const filterByModule = (items: NavItem[]) => {
    return items.filter((item) => {
      if (isSuperAdmin && !inTenantView) return true;
      if (!item.requiredModule) return true;
      return hasAccess(item.requiredModule);
    });
  };

  const filteredCustomerMgmtItems = useMemo(() => filterByModule(customerMgmtItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredBillingItems = useMemo(() => filterByModule(billingFinanceItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredNetworkItems = useMemo(() => filterByModule(networkInfraItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredCommunicationItems = useMemo(() => filterByModule(communicationItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredOperationsItems = useMemo(() => filterByModule(operationsHRItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredResellerItems = useMemo(() => filterByModule(resellerItems), [hasAccess, inTenantView, isSuperAdmin]);

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
            <div className="flex flex-col gap-0.5">{superAdminCoreItems.map(renderNavItem)}</div>
            
            {renderSection('Payment Settings', superAdminPaymentItems, {
              collapsible: true,
              expanded: paymentSettingsExpanded,
              onToggle: () => setPaymentSettingsExpanded((v) => !v),
            })}
            
            {renderSection('Email Settings', superAdminEmailItems, {
              collapsible: true,
              expanded: emailSettingsExpanded,
              onToggle: () => setEmailSettingsExpanded((v) => !v),
            })}
            
            {renderSection('SMS Settings', superAdminSMSItems, {
              collapsible: true,
              expanded: smsSettingsExpanded,
              onToggle: () => setSmsSettingsExpanded((v) => !v),
            })}
            
            {renderSection('Other', superAdminOtherItems)}
          </>
        ) : (
          <>
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('olt_care')}</p>
            )}
            <div className="flex flex-col gap-0.5">{oltCareItems.map(renderNavItem)}</div>

            {/* ISP Dashboard */}
            {renderNavItem({ title: t('isp_dashboard'), href: '/isp', icon: LayoutDashboard })}

            {filteredCustomerMgmtItems.length > 0 && renderSection(t('customer_management'), filteredCustomerMgmtItems, {
              collapsible: true,
              expanded: customerExpanded,
              onToggle: () => setCustomerExpanded((v) => !v),
            })}

            {filteredBillingItems.length > 0 && renderSection(t('billing_finance'), filteredBillingItems, {
              collapsible: true,
              expanded: billingExpanded,
              onToggle: () => setBillingExpanded((v) => !v),
            })}

            {filteredResellerItems.length > 0 && renderSection(t('reseller_management'), filteredResellerItems, {
              collapsible: true,
              expanded: resellerExpanded,
              onToggle: () => setResellerExpanded((v) => !v),
            })}

            {filteredNetworkItems.length > 0 && renderSection(t('network_infrastructure'), filteredNetworkItems, {
              collapsible: true,
              expanded: networkExpanded,
              onToggle: () => setNetworkExpanded((v) => !v),
            })}

            {filteredCommunicationItems.length > 0 && renderSection(t('communication_gateways'), filteredCommunicationItems, {
              collapsible: true,
              expanded: communicationExpanded,
              onToggle: () => setCommunicationExpanded((v) => !v),
            })}

            {filteredOperationsItems.length > 0 && renderSection(t('operations_hr'), filteredOperationsItems, {
              collapsible: true,
              expanded: operationsExpanded,
              onToggle: () => setOperationsExpanded((v) => !v),
            })}

            {renderSection(t('system'), filteredTenantSystemItems, {
              collapsible: true,
              expanded: systemExpanded,
              onToggle: () => setSystemExpanded((v) => !v),
            })}

            {tenantId && renderSection(t('my_subscription'), tenantBillingItems, {
              collapsible: true,
              expanded: subscriptionExpanded,
              onToggle: () => setSubscriptionExpanded((v) => !v),
            })}
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

      {/* VPS Connection Status - Only visible for Super Admin */}
      {showSuperAdminNav && (
        <div className="absolute bottom-14 left-2 right-2">
          <VPSStatusIndicator collapsed={collapsed} />
        </div>
      )}
    </aside>
  );
}
