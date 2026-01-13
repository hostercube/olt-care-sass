import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, User, Lock, Loader2, Eye, EyeOff, Shield, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTenantBrandingById } from '@/hooks/useTenantBranding';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  const { branding, loading: brandingLoading } = useTenantBrandingById(tenantId);

  const [credentials, setCredentials] = useState({
    username: '', // PPPoE username
    password: '', // PPPoE password
  });

  const tenantSlug = searchParams.get('tenant');

  useEffect(() => {
    // Check if already logged in
    const session = localStorage.getItem('customer_session');
    if (session) {
      navigate('/portal/dashboard');
      return;
    }

    // Fetch tenant ID from slug if provided
    const fetchTenantId = async () => {
      if (tenantSlug) {
        const { data } = await supabase
          .from('tenants')
          .select('id')
          .or(`subdomain.eq.${tenantSlug},custom_domain.eq.${tenantSlug}`)
          .single();
        if (data) {
          setTenantId(data.id);
        }
      }
    };

    fetchTenantId();
  }, [tenantSlug, navigate]);

  // Apply favicon if available
  useEffect(() => {
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = branding.favicon_url;
      }
    }
    if (branding.company_name) {
      document.title = `${branding.company_name} - Customer Portal`;
    }
  }, [branding]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usernameInput = credentials.username.trim();
      const passwordInput = credentials.password.trim();

      if (!usernameInput || !passwordInput) {
        toast.error('Please enter both username and password');
        setLoading(false);
        return;
      }

      // Find customer by PPPoE username (case-insensitive)
      let query = supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          email,
          address,
          status,
          expiry_date,
          due_amount,
          monthly_bill,
          pppoe_username,
          pppoe_password,
          tenant_id,
          package_id,
          area_id,
          mikrotik_id,
          onu_id,
          customer_code
        `)
        .ilike('pppoe_username', usernameInput);

      // Filter by tenant if specified
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: customers, error } = await query;

      if (error) {
        console.error('Login query error:', error);
        toast.error('Login failed. Please try again.');
        return;
      }

      // Find customer with matching password
      const customer = customers?.find(c => 
        c.pppoe_password === passwordInput ||
        c.pppoe_password?.trim() === passwordInput
      );

      if (!customer) {
        toast.error('Invalid PPPoE username or password');
        return;
      }

      // Store customer session
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/10 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and branding */}
          <div className="text-center space-y-4">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 flex items-center justify-center overflow-hidden">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name || 'Logo'} className="h-full w-full object-contain p-1" />
              ) : (
                <Wifi className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {branding.company_name || 'Customer Portal'}
              </h1>
              <p className="text-muted-foreground mt-1">{branding.subtitle || 'Internet Service Provider'}</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>Enter your PPPoE credentials to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">PPPoE Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter your username"
                      className="pl-10 h-11"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">PPPoE Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-11"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="border-t bg-muted/30 flex justify-center py-4">
              <p className="text-sm text-muted-foreground text-center">
                Use your PPPoE credentials provided by your ISP
              </p>
            </CardFooter>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-medium">Check Speed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs font-medium">View Bills</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border border-border/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs font-medium">Pay Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-sm text-muted-foreground border-t bg-card/50">
        <p>© {new Date().getFullYear()} {branding.company_name || 'ISP Portal'}. All rights reserved.</p>
      </div>
    </div>
  );
}