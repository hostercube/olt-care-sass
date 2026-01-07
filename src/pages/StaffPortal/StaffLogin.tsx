import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffPermissions';
import { Loader2, LogIn, Building2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Tenant {
  id: string;
  company_name: string;
  subdomain: string;
}

export default function StaffLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useStaffAuth();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    tenantId: searchParams.get('tenant') || '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/staff/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, company_name, subdomain')
          .eq('status', 'active')
          .order('company_name');

        if (error) throw error;
        setTenants(data || []);
        
        // Auto-select if only one tenant or from URL
        if (data?.length === 1) {
          setFormData(prev => ({ ...prev, tenantId: data[0].id }));
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setTenantsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantId || !formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(formData.username, formData.password, formData.tenantId);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful');
      navigate('/staff/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Staff Portal</h1>
          <p className="text-muted-foreground mt-1">Login with your staff credentials</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your username and password to access the staff portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Company/ISP *</Label>
                <Select 
                  value={formData.tenantId} 
                  onValueChange={(v) => setFormData(p => ({ ...p, tenantId: v }))}
                  disabled={tenantsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tenantsLoading ? "Loading..." : "Select your company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Login
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Don't have credentials? Contact your ISP administrator.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Button variant="link" onClick={() => navigate('/')}>
            ← Back to main site
          </Button>
        </div>
      </div>
    </div>
  );
}
