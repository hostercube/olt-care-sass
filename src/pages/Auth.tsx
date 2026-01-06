import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, Loader2, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { z } from 'zod';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DIVISIONS, getDistricts, getUpazilas } from '@/data/bangladeshLocations';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { resolvePollingServerUrl } from '@/lib/polling-server';

interface PlatformSettings {
  defaultTrialDays: number;
  enableSignup: boolean;
  requireEmailVerification: boolean;
  enableCaptcha: boolean;
  captchaSiteKey: string;
  pollingServerUrl: string;
}

interface Package {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
}

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = authSchema.extend({
  companyName: z.string().min(2, 'Company name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const { signIn, loading, user } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [packages, setPackages] = useState<Package[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    defaultTrialDays: 14,
    enableSignup: true,
    requireEmailVerification: false,
    enableCaptcha: false,
    captchaSiteKey: '',
    pollingServerUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const captchaEnabled = platformSettings.enableCaptcha === true && !!platformSettings.captchaSiteKey && platformSettings.captchaSiteKey.length > 10;
  console.log('CAPTCHA check:', { enableCaptcha: platformSettings.enableCaptcha, siteKey: platformSettings.captchaSiteKey?.substring(0, 15), captchaEnabled });
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);

  const verifyTurnstile = async (token: string) => {
    const { data, error } = await supabase.functions.invoke('turnstile-verify', {
      body: { token },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'CAPTCHA verification failed');
  };

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup form
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    ownerName: '',
    phone: '',
    division: '',
    district: '',
    upazila: '',
    address: '',
    packageId: searchParams.get('package') || '',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
  });

  useEffect(() => {
    if (user && !superAdminLoading) {
      navigate(isSuperAdmin ? '/admin' : '/dashboard');
    }
  }, [user, navigate, isSuperAdmin, superAdminLoading]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch packages
      const { data: pkgData } = await supabase
        .from('packages')
        .select('id, name, price_monthly, price_yearly, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPackages((pkgData as Package[]) || []);

      // Fetch platform settings for trial days + captcha (works before login)
      try {
        const { data, error } = await supabase.functions.invoke('public-platform-settings');
        console.log('Platform settings response:', { data, error });
        if (error) throw error;

        const s = (data as any)?.settings || {};
        console.log('Parsed settings:', s);
        setPlatformSettings({
          defaultTrialDays: s.defaultTrialDays ?? 14,
          enableSignup: s.enableSignup ?? true,
          requireEmailVerification: s.requireEmailVerification ?? false,
          enableCaptcha: s.enableCaptcha === true,
          captchaSiteKey: (s.captchaSiteKey ?? '').toString().trim(),
          pollingServerUrl: (s.pollingServerUrl ?? '').toString().trim(),
        });
      } catch (err) {
        console.error('Failed to fetch platform settings:', err);
        // Keep defaults
      }
    };
    fetchData();
  }, []);

  const validateLogin = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {};
      err.errors?.forEach((e: any) => {
        if (e.path[0]) fieldErrors[e.path[0]] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const validateSignup = () => {
    try {
      signupSchema.parse({
        email: signupData.email,
        password: signupData.password,
        confirmPassword: signupData.confirmPassword,
        companyName: signupData.companyName,
        ownerName: signupData.ownerName,
        phone: signupData.phone,
      });
      setErrors({});
      return true;
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {};
      err.errors?.forEach((e: any) => {
        if (e.path[0]) fieldErrors[e.path[0]] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    if (captchaEnabled) {
      if (!loginCaptchaToken) {
        toast({
          variant: 'destructive',
          title: 'CAPTCHA Required',
          description: 'Please complete the CAPTCHA before logging in.',
        });
        return;
      }

      try {
        await verifyTurnstile(loginCaptchaToken);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'CAPTCHA Failed',
          description: err?.message || 'Please try again.',
        });
        setLoginCaptchaToken(null);
        return;
      }
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error.message || "Invalid email or password",
      });
    } else {
      toast({ title: "Welcome back!", description: "Login successful" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;

    if (!platformSettings.enableSignup) {
      toast({
        variant: 'destructive',
        title: 'Signup Disabled',
        description: 'New registrations are currently disabled by admin.',
      });
      return;
    }

    if (captchaEnabled) {
      if (!signupCaptchaToken) {
        toast({
          variant: 'destructive',
          title: 'CAPTCHA Required',
          description: 'Please complete the CAPTCHA before creating your account.',
        });
        return;
      }

      try {
        await verifyTurnstile(signupCaptchaToken);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'CAPTCHA Failed',
          description: err?.message || 'Please try again.',
        });
        setSignupCaptchaToken(null);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const VPS_URL = resolvePollingServerUrl(platformSettings.pollingServerUrl);
      if (!VPS_URL) {
        throw new Error('Polling server URL is not configured by Super Admin.');
      }

      const trialDays = platformSettings.defaultTrialDays;

      // Use VPS admin endpoint to create user (bypasses Supabase email rate limits)
      // This uses the service role key on VPS to auto-confirm email
      const createUserRes = await fetch(`${VPS_URL}/api/auth/full-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          full_name: signupData.ownerName,
          company_name: signupData.companyName,
          phone: signupData.phone,
          division: signupData.division || null,
          district: signupData.district || null,
          upazila: signupData.upazila || null,
          address: signupData.address || null,
          package_id: signupData.packageId || null,
          billing_cycle: signupData.billingCycle,
          trial_days: trialDays,
        }),
      });

      const createUserData = await createUserRes.json().catch(() => ({}));
      
      if (!createUserRes.ok || !createUserData?.success) {
        throw new Error(createUserData?.error || 'Failed to create account');
      }

      const requiresPayment = !!createUserData.requires_payment;

      // Auto sign-in since email is auto-confirmed by VPS
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signupData.email,
        password: signupData.password,
      });

      if (!signInError) {
        if (requiresPayment) {
          navigate('/billing/pay');
        }
        toast({ title: 'Account Created!', description: requiresPayment ? 'Please complete payment to activate.' : 'Welcome! Your account is ready.' });
        return;
      }

      toast({
        title: 'Account Created!',
        description: 'Please login to continue.',
      });

      // Switch to login mode
      setMode('login');
      setEmail(signupData.email);
    } catch (err: any) {
      console.error('Signup error:', err);
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: err.message || 'Failed to create account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPackage = packages.find(p => p.id === signupData.packageId);
  const displayPrice = selectedPackage 
    ? (signupData.billingCycle === 'monthly' ? selectedPackage.price_monthly : selectedPackage.price_yearly)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/portal/login" className="text-sm text-primary hover:underline">
            Customer Login
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Wifi className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">ISP Point</CardTitle>
            <CardDescription>
              {mode === 'login' ? 'Login to your dashboard' : 'Create your ISP account'}
            </CardDescription>
          </CardHeader>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'signup'); setErrors({}); }}>
            <TabsList className="grid grid-cols-2 mx-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  {captchaEnabled && (
                    <div className="pt-2">
                      <TurnstileWidget
                        siteKey={platformSettings.captchaSiteKey}
                        onToken={(token) => {
                          setLoginCaptchaToken(token);
                          if (token) setTurnstileLoaded(true);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting || (captchaEnabled && !loginCaptchaToken)}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Login
                  </Button>
                  {captchaEnabled && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Protected by Cloudflare Turnstile
                    </div>
                  )}
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input
                        value={signupData.companyName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Your ISP Name"
                        required
                      />
                      {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Name *</Label>
                      <Input
                        value={signupData.ownerName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, ownerName: e.target.value }))}
                        placeholder="Your Name"
                        required
                      />
                      {errors.ownerName && <p className="text-sm text-destructive">{errors.ownerName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="you@example.com"
                        required
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={signupData.phone}
                        onChange={(e) => setSignupData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        required
                      />
                      {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={signupData.password}
                          onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Min 6 characters"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Division</Label>
                      <Select 
                        value={signupData.division} 
                        onValueChange={(v) => setSignupData(prev => ({ 
                          ...prev, 
                          division: v, 
                          district: '', 
                          upazila: '' 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {DIVISIONS.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Select 
                        value={signupData.district} 
                        onValueChange={(v) => setSignupData(prev => ({ ...prev, district: v, upazila: '' }))}
                        disabled={!signupData.division}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={signupData.division ? "Select" : "Select Division first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
                          {getDistricts(signupData.division).map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Upazila/Thana</Label>
                      <Select 
                        value={signupData.upazila} 
                        onValueChange={(v) => setSignupData(prev => ({ ...prev, upazila: v }))}
                        disabled={!signupData.district}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={signupData.district ? "Select" : "Select District first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
                          {getUpazilas(signupData.district).map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={signupData.address}
                      onChange={(e) => setSignupData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Package</Label>
                      <Select value={signupData.packageId} onValueChange={(v) => setSignupData(prev => ({ ...prev, packageId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a package" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map(pkg => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Cycle</Label>
                      <Select value={signupData.billingCycle} onValueChange={(v: 'monthly' | 'yearly') => setSignupData(prev => ({ ...prev, billingCycle: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly (Save 20%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {selectedPackage && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{selectedPackage.name} - {signupData.billingCycle}</span>
                        <span className="font-bold text-primary">৳{displayPrice}/{signupData.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {platformSettings.defaultTrialDays > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">{platformSettings.defaultTrialDays}-day free trial included</p>
                      ) : (
                        <p className="text-xs text-warning mt-1">Payment required to activate account</p>
                      )}
                    </div>
                  )}

                  {captchaEnabled && (
                    <div className="pt-2">
                      <TurnstileWidget
                        siteKey={platformSettings.captchaSiteKey}
                        onToken={(token) => {
                          setSignupCaptchaToken(token);
                          if (token) setTurnstileLoaded(true);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting || (captchaEnabled && !signupCaptchaToken)}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                  {captchaEnabled && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Protected by Cloudflare Turnstile
                    </div>
                  )}
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
