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
    const passwordInput = credentials.password.trim();

    if (!usernameInput || !passwordInput) {
      toast.error('Please enter both username and password');
      return;
    }

    if (captchaEnabled && !captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      // Use global auth - find customer from any tenant by PPPoE credentials
      const { data, error } = await supabase
        .rpc('authenticate_customer_global' as any, {
          p_username: usernameInput,
          p_password: passwordInput
        });

      const customers = data as CustomerAuth[] | null;

      if (error) {
        console.error('Login query error:', error);
        toast.error('Login failed. Please try again.');
        resetCaptcha();
        return;
      }

      if (!customers || customers.length === 0) {
        toast.error('Invalid PPPoE username or password');
        resetCaptcha();
        return;
      }

      const customer = customers[0];

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
