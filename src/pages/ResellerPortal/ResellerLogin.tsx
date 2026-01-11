import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ResellerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Check for impersonation token on mount
  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate');
    if (impersonateToken) {
      verifyImpersonationToken(impersonateToken);
    } else {
      setCheckingToken(false);
    }
  }, [searchParams]);

  const verifyImpersonationToken = async (token: string) => {
    try {
      // Verify token in database
      const { data: tokenData, error } = await supabase
        .from('reseller_login_tokens' as any)
        .select('*, reseller:resellers(*)')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (error || !tokenData) {
        toast.error('Invalid or expired login link');
        setCheckingToken(false);
        return;
      }

      // Check if token is expired
      const expiresAt = new Date((tokenData as any).expires_at);
      if (expiresAt < new Date()) {
        toast.error('Login link has expired');
        setCheckingToken(false);
        return;
      }

      // Mark token as used
      await supabase
        .from('reseller_login_tokens' as any)
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', (tokenData as any).id);

      const reseller = (tokenData as any).reseller;
      
      // Store reseller session in localStorage
      localStorage.setItem('reseller_session', JSON.stringify({
        id: reseller.id,
        name: reseller.name,
        username: reseller.username,
        tenant_id: reseller.tenant_id,
        level: reseller.level,
        role: reseller.role,
        balance: reseller.balance,
        is_impersonation: true,
        logged_in_at: new Date().toISOString(),
      }));

      toast.success(`Welcome, ${reseller.name}!`);
      navigate('/reseller/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error verifying token:', err);
      toast.error('Failed to verify login link');
      setCheckingToken(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find reseller by username
      const { data: reseller, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !reseller) {
        toast.error('Invalid username or password');
        setLoading(false);
        return;
      }

      // Check password (plain text comparison - matching existing create behavior)
      if ((reseller as any).password !== password) {
        toast.error('Invalid username or password');
        setLoading(false);
        return;
      }

      // Store reseller session
      localStorage.setItem('reseller_session', JSON.stringify({
        id: reseller.id,
        name: reseller.name,
        username: reseller.username,
        tenant_id: reseller.tenant_id,
        level: reseller.level,
        role: reseller.role,
        balance: reseller.balance,
        is_impersonation: false,
        logged_in_at: new Date().toISOString(),
      }));

      toast.success(`Welcome, ${reseller.name}!`);
      navigate('/reseller/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reseller Portal</CardTitle>
          <CardDescription>
            Sign in to manage your customers and balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
