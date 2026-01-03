import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, User, Lock, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo?: string } | null>(null);
  
  const [credentials, setCredentials] = useState({
    username: '', // PPPoE username or phone
    password: '', // Customer code or password
  });

  const tenantSlug = searchParams.get('tenant');

  useEffect(() => {
    // Fetch tenant branding if available
    const fetchTenantInfo = async () => {
      if (tenantSlug) {
        // In production, fetch tenant by slug/domain
        // For now, show default
        setTenantInfo({ name: 'ISP Portal' });
      }
    };
    fetchTenantInfo();
  }, [tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find customer by PPPoE username or phone
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*, tenant:tenants(name, settings)')
        .or(`pppoe_username.eq.${credentials.username},phone.eq.${credentials.username}`)
        .eq('customer_code', credentials.password)
        .single();

      if (error || !customer) {
        toast.error('Invalid credentials');
        return;
      }

      // Store customer session (in production, use proper auth)
      localStorage.setItem('customer_session', JSON.stringify({
        id: customer.id,
        name: customer.name,
        tenant_id: customer.tenant_id,
      }));

      toast.success('Login successful');
      navigate('/portal/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Wifi className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">{tenantInfo?.name || 'Customer Portal'}</CardTitle>
            <CardDescription>Sign in to manage your internet service</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">PPPoE Username / Phone</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username or phone"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Customer Code</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your customer code"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Contact your ISP for login credentials</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
