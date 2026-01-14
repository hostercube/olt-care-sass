import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, User, Lock, Loader2, Eye, EyeOff, Shield, Zap, Clock, ArrowLeft, Home } from 'lucide-react';
import { toast } from 'sonner';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

type CustomerAuth = {
  id: string;
  name: string;
  tenant_id: string;
  pppoe_username: string;
};

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const { settings: platformSettings } = usePlatformSettings();

  const debug = searchParams.get('debug') === '1';
  const backendHost = (() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return 'missing';
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const captchaSiteKey = platformSettings.captchaSiteKey?.trim() || '';
  const captchaEnabled = platformSettings.enableCaptcha === true && captchaSiteKey.length > 10;

  useEffect(() => {
    const session = localStorage.getItem('customer_session');
    if (session) {
      navigate('/portal/dashboard');
      return;
    }
    document.title = 'Customer Login - ISP Portal';
  }, [navigate]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaReset(v => v + 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const usernameInput = credentials.username.trim();
    const passwordRaw = credentials.password; // do NOT trim; PPPoE passwords can be space-sensitive

    if (!usernameInput || !passwordRaw) {
      toast.error('Please enter both username and password');
      return;
    }

    if (captchaEnabled && !captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    const normalizeCustomers = (data: unknown) => {
      if (Array.isArray(data)) return data as CustomerAuth[];
      if (data && typeof data === 'object') return [data as CustomerAuth];
      return [] as CustomerAuth[];
    };

    const attempt = async (passwordCandidate: string) => {
      return supabase.rpc('authenticate_customer_global' as any, {
        p_username: usernameInput,
        p_password: passwordCandidate,
      });
    };

    try {
      // Try exact password first
      let { data, error } = await attempt(passwordRaw);

      // If user accidentally typed leading/trailing spaces, try trimmed variant as fallback
      if (!error) {
        const customersFirst = normalizeCustomers(data);
        const trimmed = passwordRaw.trim();
        if (customersFirst.length === 0 && trimmed !== passwordRaw) {
          ({ data, error } = await attempt(trimmed));
        }
      }

      if (error) {
        console.error('Customer login RPC error:', error);
        toast.error(error.message || 'Login failed. Please try again.');
        resetCaptcha();
        return;
      }

      const customers = normalizeCustomers(data);

      if (customers.length === 0) {
        toast.error('Invalid PPPoE username or password');
        resetCaptcha();
        return;
      }

      const customer = customers[0];

      localStorage.setItem(
        'customer_session',
        JSON.stringify({
          id: customer.id,
          name: customer.name,
          tenant_id: customer.tenant_id,
          pppoe_username: customer.pppoe_username,
        })
      );

      toast.success('Login successful!');
      // Navigate to parent route so nested index redirect always works reliably
      navigate('/portal', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err?.message || 'Login failed. Please try again.');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/10 flex flex-col">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
      
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Home</span>
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 flex items-center justify-center overflow-hidden">
              <Wifi className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Customer Portal
              </h1>
              <p className="text-muted-foreground mt-1">Sign in with your PPPoE credentials</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>Enter your PPPoE username and password</CardDescription>
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
                      placeholder="Enter your PPPoE username"
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
                      placeholder="Enter your PPPoE password"
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

                {captchaEnabled && (
                  <div className="pt-2">
                    <TurnstileWidget
                      siteKey={captchaSiteKey}
                      onToken={(token) => setCaptchaToken(token)}
                      resetKey={captchaReset}
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" 
                  disabled={loading || (captchaEnabled && !captchaToken)}
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
            <CardFooter className="border-t bg-muted/30 flex flex-col gap-2 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Use your PPPoE credentials provided by your ISP
              </p>
              {captchaEnabled && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Protected by Cloudflare Turnstile
                </div>
              )}
            </CardFooter>
          </Card>

          {debug && (
            <Card className="border-border/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">Debug</CardTitle>
                <CardDescription className="text-xs">
                  Confirm which backend this build is connected to.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Backend host:</span> {backendHost}
                </div>
                <div>
                  <span className="text-muted-foreground">Project ID:</span>{' '}
                  {import.meta.env.VITE_SUPABASE_PROJECT_ID || 'missing'}
                </div>
                <div>
                  <span className="text-muted-foreground">Mode:</span> {import.meta.env.MODE}
                </div>
              </CardContent>
            </Card>
          )}

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

      <div className="text-center py-4 text-sm text-muted-foreground border-t bg-card/50">
        <p>© {new Date().getFullYear()} ISP Portal. All rights reserved.</p>
      </div>
    </div>
  );
}
