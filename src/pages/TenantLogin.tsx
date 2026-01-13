import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, User, Lock, Loader2, Eye, EyeOff, Shield, Zap, Clock, Users, Store, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TenantBranding {
  company_name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
}

const THEME_COLOR_MAP: Record<string, string> = {
  cyan: 'from-cyan-500 to-cyan-600',
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  pink: 'from-pink-500 to-pink-600',
  indigo: 'from-indigo-500 to-indigo-600',
  teal: 'from-teal-500 to-teal-600',
  amber: 'from-amber-500 to-amber-600',
};

export default function TenantLogin() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('customer');
  
  const [branding, setBranding] = useState<TenantBranding>({
    company_name: 'ISP Portal',
    subtitle: 'Internet Service Provider',
    logo_url: '',
    favicon_url: '',
    theme_color: 'cyan',
  });

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantSlug) {
        setTenantError('Invalid portal URL');
        setTenantLoading(false);
        return;
      }

      try {
        // Try to find tenant by slug/subdomain
        const { data, error } = await supabase
          .from('tenants')
          .select('id, company_name, subtitle, logo_url, favicon_url, theme_color, subdomain')
          .or(`subdomain.eq.${tenantSlug},slug.eq.${tenantSlug}`)
          .single();

        if (error || !data) {
          // Try custom domain lookup
          const { data: domainData } = await supabase
            .from('tenant_custom_domains')
            .select('tenant_id')
            .eq('domain', tenantSlug)
            .eq('is_verified', true)
            .single();

          if (domainData) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('id, company_name, subtitle, logo_url, favicon_url, theme_color')
              .eq('id', domainData.tenant_id)
              .single();

            if (tenantData) {
              setTenantId(tenantData.id);
              setBranding({
                company_name: tenantData.company_name || 'ISP Portal',
                subtitle: tenantData.subtitle || 'Internet Service Provider',
                logo_url: tenantData.logo_url || '',
                favicon_url: tenantData.favicon_url || '',
                theme_color: tenantData.theme_color || 'cyan',
              });
            } else {
              setTenantError('Portal not found');
            }
          } else {
            setTenantError('Portal not found');
          }
        } else {
          setTenantId(data.id);
          setBranding({
            company_name: data.company_name || 'ISP Portal',
            subtitle: data.subtitle || 'Internet Service Provider',
            logo_url: data.logo_url || '',
            favicon_url: data.favicon_url || '',
            theme_color: data.theme_color || 'cyan',
          });
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setTenantError('Failed to load portal');
      } finally {
        setTenantLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug]);

  // Apply favicon and title
  useEffect(() => {
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = branding.favicon_url;
      }
    }
    document.title = `${branding.company_name} - Login`;
  }, [branding]);

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setLoading(true);

    try {
      const usernameInput = credentials.username.trim();
      const passwordInput = credentials.password.trim();

      if (!usernameInput || !passwordInput) {
        toast.error('Please enter both username and password');
        setLoading(false);
        return;
      }

      const { data: customers, error } = await supabase
        .from('customers')
        .select(`id, name, phone, email, address, status, expiry_date, due_amount, monthly_bill, pppoe_username, pppoe_password, tenant_id, package_id, area_id, customer_code`)
        .eq('tenant_id', tenantId)
        .ilike('pppoe_username', usernameInput);

      if (error) throw error;

      const customer = customers?.find(c => 
        c.pppoe_password === passwordInput || c.pppoe_password?.trim() === passwordInput
      );

      if (!customer) {
        toast.error('Invalid PPPoE username or password');
        return;
      }

      localStorage.setItem('customer_session', JSON.stringify({
        id: customer.id,
        name: customer.name,
        tenant_id: customer.tenant_id,
        pppoe_username: customer.pppoe_username,
      }));

      toast.success('Login successful!');
      navigate('/portal/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResellerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setLoading(true);

    try {
      const usernameInput = credentials.username.trim();
      const passwordInput = credentials.password.trim();

      if (!usernameInput || !passwordInput) {
        toast.error('Please enter both username and password');
        setLoading(false);
        return;
      }

      const { data: resellers, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`username.ilike.${usernameInput},email.ilike.${usernameInput}`);

      if (error) throw error;

      const reseller = resellers?.find(r => r.password === passwordInput);

      if (!reseller) {
        toast.error('Invalid username or password');
        return;
      }

      if (reseller.is_active === false) {
        toast.error('Your account is not active. Please contact support.');
        return;
      }

      localStorage.setItem('reseller_session', JSON.stringify({
        id: reseller.id,
        name: reseller.name,
        tenant_id: reseller.tenant_id,
        username: reseller.username,
        role_id: reseller.role_id,
      }));

      toast.success('Login successful!');
      navigate('/reseller/dashboard');
    } catch (err) {
      console.error('Reseller login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.username.trim(),
        password: credentials.password.trim(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Staff login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const themeGradient = THEME_COLOR_MAP[branding.theme_color] || THEME_COLOR_MAP.cyan;

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground mb-6">{tenantError}</p>
            <Button onClick={() => navigate('/')}>Go to Main Page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Theme colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${themeGradient}`} />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and branding */}
          <div className="text-center space-y-4">
            <div className={`mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br ${themeGradient} shadow-lg flex items-center justify-center overflow-hidden`}>
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-14 w-14 object-contain" />
              ) : (
                <Wifi className="h-10 w-10 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{branding.company_name}</h1>
              <p className="text-muted-foreground mt-1">{branding.subtitle}</p>
            </div>
          </div>

          {/* Login Card with Tabs */}
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="pb-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer" className="text-xs sm:text-sm">
                    <User className="h-3.5 w-3.5 mr-1" />
                    Customer
                  </TabsTrigger>
                  <TabsTrigger value="reseller" className="text-xs sm:text-sm">
                    <Store className="h-3.5 w-3.5 mr-1" />
                    Reseller
                  </TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs sm:text-sm">
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Staff
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Customer Login */}
                <TabsContent value="customer" className="mt-0">
                  <form onSubmit={handleCustomerLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-username">PPPoE Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="customer-username"
                          value={credentials.username}
                          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter your PPPoE username"
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer-password">PPPoE Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="customer-password"
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className={`w-full h-11 bg-gradient-to-r ${themeGradient} hover:opacity-90`} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                      {loading ? 'Signing In...' : 'Sign In as Customer'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Reseller Login */}
                <TabsContent value="reseller" className="mt-0">
                  <form onSubmit={handleResellerLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reseller-username">Username / Email</Label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reseller-username"
                          value={credentials.username}
                          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter your username or email"
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reseller-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reseller-password"
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className={`w-full h-11 bg-gradient-to-r ${themeGradient} hover:opacity-90`} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
                      {loading ? 'Signing In...' : 'Sign In as Reseller'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Staff Login */}
                <TabsContent value="staff" className="mt-0">
                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-email">Email</Label>
                      <div className="relative">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="staff-email"
                          type="email"
                          value={credentials.username}
                          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter your email"
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="staff-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="staff-password"
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className={`w-full h-11 bg-gradient-to-r ${themeGradient} hover:opacity-90`} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                      {loading ? 'Signing In...' : 'Sign In as Staff'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="border-t bg-muted/30 flex justify-center py-4">
              <p className="text-sm text-muted-foreground text-center">
                {activeTab === 'customer' && 'Use your PPPoE credentials provided by your ISP'}
                {activeTab === 'reseller' && 'Login with your reseller account credentials'}
                {activeTab === 'staff' && 'Staff members login with their email'}
              </p>
            </CardFooter>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeGradient} bg-opacity-10 flex items-center justify-center mx-auto mb-2`}>
                <Zap className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-medium">Fast Service</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium">24/7 Support</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs font-medium">Secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-sm text-muted-foreground border-t bg-card/50">
        <p>© {new Date().getFullYear()} {branding.company_name}. All rights reserved.</p>
      </div>
    </div>
  );
}
