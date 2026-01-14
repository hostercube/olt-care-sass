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
  Gift,
  Globe,
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
  Smartphone,
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

// OLT Care - Network infrastructure monitoring (collapsible section)
const oltCareItems: NavItem[] = [
  { title: 'olt_management', href: '/olts', icon: Server },
  { title: 'onu_devices', href: '/onus', icon: Router },
  { title: 'alerts', href: '/alerts', icon: Bell },
  { title: 'monitoring', href: '/monitoring', icon: Activity },
];

// Customer Management - Core customer operations
const customerMgmtItems: NavItem[] = [
  { title: 'customers', href: '/isp/customers', icon: Users, requiredModule: 'isp_customers' },
  { title: 'customer_types', href: '/isp/customer-types', icon: UserCheck },
  { title: 'packages', href: '/isp/packages', icon: Package },
  { title: 'areas', href: '/isp/areas', icon: MapPin },
  { title: 'customer_location', href: '/isp/customer-location', icon: MapPin, requiredModule: 'customer_location' },
];

// Billing & Finance - Financial operations
const billingFinanceItems: NavItem[] = [
  { title: 'recharge_history', href: '/isp/recharge-history', icon: ClipboardList, requiredModule: 'isp_billing' },
  { title: 'automation', href: '/isp/automation', icon: Zap, requiredModule: 'isp_billing' },
  { title: 'bkash_payments', href: '/isp/bkash', icon: Wallet },
  { title: 'income_expense', href: '/isp/transactions', icon: DollarSign },
];

// Reseller Management - Multi-level reseller system
const resellerItems: NavItem[] = [
  { title: 'resellers_list', href: '/isp/resellers', icon: UserCheck, requiredModule: 'isp_resellers' },
  { title: 'reseller_roles', href: '/isp/reseller-roles', icon: Shield, requiredModule: 'isp_resellers' },
  { title: 'reseller_billing', href: '/isp/reseller-billing', icon: Wallet, requiredModule: 'isp_resellers' },
];

// Network & Infrastructure - MikroTik, OLT related
const networkInfraItems: NavItem[] = [
  { title: 'mikrotik', href: '/isp/mikrotik', icon: Wifi, requiredModule: 'isp_mikrotik' },
  { title: 'bandwidth_mgmt', href: '/isp/bandwidth', icon: Gauge, requiredModule: 'isp_bandwidth_management' },
];

// Communication & Marketing
const communicationItems: NavItem[] = [
  { title: 'sms_templates', href: '/isp/sms-templates', icon: MessageSquare },
  { title: 'email_templates', href: '/isp/email-templates', icon: Mail },
  { title: 'campaigns', href: '/isp/campaigns', icon: Megaphone },
  { title: 'all_gateways', href: '/isp/gateways', icon: CreditCard },
];

// Referral & Wallet
const referralWalletItems: NavItem[] = [
  { title: 'referral_system', href: '/isp/referrals', icon: Gift, requiredModule: 'isp_referral' },
  { title: 'withdraw_requests', href: '/isp/withdraw-requests', icon: Wallet, requiredModule: 'isp_withdraw_requests' },
];

// Customer Apps
const customerAppsItems: NavItem[] = [
  { title: 'customer_apps', href: '/isp/customer-apps', icon: Smartphone, requiredModule: 'isp_customer_apps' },
];

// Operations & HR
const operationsHRItems: NavItem[] = [
  { title: 'payroll_hr', href: '/isp/staff', icon: Users, requiredModule: 'isp_hr_payroll' },
  { title: 'inventory', href: '/isp/pos', icon: Box, requiredModule: 'isp_inventory' },
  { title: 'support_tickets', href: '/isp/tickets', icon: MessageSquare, requiredModule: 'isp_tickets' },
  { title: 'reports', href: '/isp/reports', icon: FileText },
];

// Website & Landing Page - Separate section (includes Custom Domain)
const websiteItems: NavItem[] = [
  { title: 'landing_page', href: '/isp/landing-page', icon: Globe, requiredModule: 'landing_page' },
  { title: 'custom_domain', href: '/isp/domain', icon: Network, requiredModule: 'custom_domain' },
  { title: 'connection_requests', href: '/isp/connection-requests', icon: ClipboardList },
];

// System Settings - Admin controls
const tenantSystemItems: NavItem[] = [
  { title: 'user_management', href: '/users', icon: Shield, adminOnly: true },
  { title: 'roles_permissions', href: '/isp/roles', icon: Shield },
  { title: 'activity_logs', href: '/activity-logs', icon: ClipboardList },
  { title: 'notifications', href: '/notifications', icon: Bell },
  { title: 'db_integrity', href: '/integrity', icon: Database },
  { title: 'settings', href: '/settings', icon: Settings },
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
  { title: 'my_subscription', href: '/billing/subscription', icon: FileText },
  { title: 'invoices', href: '/billing/history', icon: Receipt },
  { title: 'make_payment', href: '/billing/pay', icon: CreditCard },
  { title: 'renew', href: '/billing/renew', icon: Zap },
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
  const [oltExpanded, setOltExpanded] = useState(false);
  const [customerExpanded, setCustomerExpanded] = useState(true);
  const [billingExpanded, setBillingExpanded] = useState(false);
  const [networkExpanded, setNetworkExpanded] = useState(false);
  const [communicationExpanded, setCommunicationExpanded] = useState(false);
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [customerAppsExpanded, setCustomerAppsExpanded] = useState(false);
  const [operationsExpanded, setOperationsExpanded] = useState(false);
  const [resellerExpanded, setResellerExpanded] = useState(false);
  const [websiteExpanded, setWebsiteExpanded] = useState(false);
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
    if (location.pathname.startsWith('/olts') || location.pathname.startsWith('/onus') || location.pathname.startsWith('/alerts') || location.pathname.startsWith('/monitoring')) {
      setOltExpanded(true);
    } else if (location.pathname.startsWith('/isp')) {
      if (location.pathname.includes('/recharge') || location.pathname.includes('/bkash') || location.pathname.includes('/transactions') || location.pathname.includes('/automation')) {
        setBillingExpanded(true);
      } else if (location.pathname.includes('/mikrotik') || location.pathname.includes('/bandwidth')) {
        setNetworkExpanded(true);
      } else if (location.pathname.includes('/landing') || location.pathname.includes('/domain') || location.pathname.includes('/connection-requests')) {
        setWebsiteExpanded(true);
      } else if (location.pathname.includes('/customer-apps')) {
        setCustomerAppsExpanded(true);
      } else if (location.pathname.includes('/referrals') || location.pathname.includes('/withdraw-requests')) {
        setReferralExpanded(true);
      } else if (location.pathname.includes('/sms') || location.pathname.includes('/email') || location.pathname.includes('/campaigns') || location.pathname.includes('/gateways')) {
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
  const filteredReferralWalletItems = useMemo(() => filterByModule(referralWalletItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredCustomerAppsItems = useMemo(() => filterByModule(customerAppsItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredOperationsItems = useMemo(() => filterByModule(operationsHRItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredResellerItems = useMemo(() => filterByModule(resellerItems), [hasAccess, inTenantView, isSuperAdmin]);
  const filteredWebsiteItems = useMemo(() => filterByModule(websiteItems), [hasAccess, inTenantView, isSuperAdmin]);

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
    // Translate the title using t() function
    const translatedTitle = t(item.title) || item.title;
    
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-sidebar-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{translatedTitle}</span>
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
              collapsible && 'cursor-pointer hover:bg-sidebar-accent/50 rounded py-1',
            )}
            onClick={collapsible ? opts?.onToggle : undefined}
          >
            <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">{title}</p>
            {collapsible && (expanded ? (
              <ChevronUp className="h-3 w-3 text-sidebar-foreground/60" />
            ) : (
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/60" />
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
            {/* ISP Dashboard at the very top */}
            {renderNavItem({ title: t('dashboard'), href: '/isp', icon: LayoutDashboard })}

            {/* OLT Care Module - Collapsible */}
            {renderSection(t('olt_care'), oltCareItems, {
              collapsible: true,
              expanded: oltExpanded,
              onToggle: () => setOltExpanded((v) => !v),
            })}

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

            {filteredReferralWalletItems.length > 0 && renderSection(t('referral_wallet'), filteredReferralWalletItems, {
              collapsible: true,
              expanded: referralExpanded,
              onToggle: () => setReferralExpanded((v) => !v),
            })}

            {filteredCustomerAppsItems.length > 0 && renderSection(t('customer_apps'), filteredCustomerAppsItems, {
              collapsible: true,
              expanded: customerAppsExpanded,
              onToggle: () => setCustomerAppsExpanded((v) => !v),
            })}

            {filteredOperationsItems.length > 0 && renderSection(t('operations_hr'), filteredOperationsItems, {
              collapsible: true,
              expanded: operationsExpanded,
              onToggle: () => setOperationsExpanded((v) => !v),
            })}

            {filteredWebsiteItems.length > 0 && renderSection(t('website'), filteredWebsiteItems, {
              collapsible: true,
              expanded: websiteExpanded,
              onToggle: () => setWebsiteExpanded((v) => !v),
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
