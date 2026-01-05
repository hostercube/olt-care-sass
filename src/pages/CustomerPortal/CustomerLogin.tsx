import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo?: string } | null>(null);
  
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

    // Fetch tenant branding if available - skip for now
    setTenantInfo({ name: 'Customer Portal' });
  }, [tenantSlug, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find customer by PPPoE username and password
      const { data: customer, error } = await supabase
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
        .eq('pppoe_username', credentials.username.trim())
        .eq('pppoe_password', credentials.password)
        .single();

      if (error || !customer) {
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

      toast.success('Login successful');
      navigate('/portal/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {tenantInfo?.logo ? (
              <img src={tenantInfo.logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <Wifi className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl">{tenantInfo?.name || 'Customer Portal'}</CardTitle>
            <CardDescription>Sign in with your PPPoE credentials</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">PPPoE Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your PPPoE username"
                  className="pl-10"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">PPPoE Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your PPPoE password"
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Use your PPPoE credentials provided by your ISP</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}