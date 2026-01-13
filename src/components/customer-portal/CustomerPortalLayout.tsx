import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  LayoutDashboard, CreditCard, Receipt, History, User, Settings,
  LogOut, Menu, X, Wifi, ChevronRight, Phone, HelpCircle, Bell,
  FileText, Clock, Gauge, Home
} from 'lucide-react';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export function CustomerPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customer, setCustomer] = useState<any>(null);
  const [tenantBranding, setTenantBranding] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = localStorage.getItem('customer_session');
        if (!session) {
          navigate('/portal/login');
          return;
        }

        const { id, tenant_id } = JSON.parse(session);

        // Fetch customer data
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*, package:isp_packages(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCustomer(customerData);

        // Fetch tenant branding
        if (customerData?.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('company_name, logo_url, favicon_url, subtitle, theme_color')
            .eq('id', customerData.tenant_id)
            .maybeSingle();

          if (tenantData) {
            setTenantBranding(tenantData);
            
            // Apply favicon
            if (tenantData.favicon_url) {
              const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
              if (link) {
                link.href = tenantData.favicon_url;
              }
            }
            
            // Apply document title
            if (tenantData.company_name) {
              document.title = `${tenantData.company_name} - Customer Portal`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        navigate('/portal/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('customer_session');
    toast.success('Logged out successfully');
    navigate('/portal/login');
  };

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { label: 'Pay Bill', href: '/portal/pay', icon: CreditCard },
    { label: 'Bills', href: '/portal/bills', icon: Receipt },
    { label: 'Recharge History', href: '/portal/recharges', icon: History },
    { label: 'Usage & Speed', href: '/portal/usage', icon: Gauge },
    { label: 'My Profile', href: '/portal/profile', icon: User },
    { label: 'Support', href: '/portal/support', icon: HelpCircle },
  ];

  const isActive = (href: string) => location.pathname === href;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Wifi className="h-12 w-12 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
              {tenantBranding?.logo_url ? (
                <img src={tenantBranding.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
              ) : (
                <Wifi className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">{tenantBranding?.company_name || 'Customer Portal'}</h2>
              <p className="text-xs text-muted-foreground truncate">{tenantBranding?.subtitle || 'My Account'}</p>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                {customer?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{customer?.name || 'Customer'}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant={customer?.status === 'active' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                  {customer?.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-xs text-muted-foreground">{customer?.customer_code || customer?.pppoe_username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>
                    )}
                    {active && <ChevronRight className="h-4 w-4" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Mobile */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b lg:hidden">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {tenantBranding?.logo_url ? (
                <img src={tenantBranding.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
              ) : (
                <Wifi className="h-6 w-6 text-primary" />
              )}
              <span className="font-bold text-sm">{tenantBranding?.company_name || 'Portal'}</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {customer?.name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet context={{ customer, tenantBranding }} />
        </main>
      </div>
    </div>
  );
}

export default CustomerPortalLayout;
