import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, Shield, Users, BarChart3, CreditCard, MessageSquare, 
  Server, Globe, Zap, Check, ArrowRight, Menu, X,
  Router, Database, Bell, FileText, Settings, Clock
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface Package {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_olts: number;
  max_users: number;
  max_customers: number | null;
  features: any;
}

export default function Landing() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPackages((data as any[]) || []);
      setLoading(false);
    };
    fetchPackages();
  }, []);

  const features = [
    { icon: Router, title: 'OLT Management', description: 'Monitor and manage GPON/EPON OLTs from multiple vendors including Huawei, ZTE, BDCOM, VSOL, and more.' },
    { icon: Users, title: 'Customer CRM', description: 'Complete customer management with billing, payments, and subscription tracking.' },
    { icon: Server, title: 'MikroTik Automation', description: 'Auto-sync PPPoE users, enable/disable customers automatically based on payment status.' },
    { icon: CreditCard, title: 'Payment Gateways', description: 'Integrated with SSLCommerz, bKash, Nagad, Rocket, and more for automated billing.' },
    { icon: MessageSquare, title: 'SMS & Notifications', description: 'Send automated SMS reminders and notifications to customers.' },
    { icon: BarChart3, title: 'Reports & Analytics', description: 'BTRC reports, income/expense tracking, and business analytics.' },
    { icon: Database, title: 'Inventory Management', description: 'Track ONU devices, cables, and other equipment inventory.' },
    { icon: Shield, title: 'Multi-Tenant Security', description: 'Each ISP gets isolated data with role-based access control.' },
    { icon: Globe, title: 'Custom Domain', description: 'Use your own domain with SSL for white-label branding.' },
    { icon: Bell, title: 'Real-time Alerts', description: 'Get notified instantly when devices go offline or issues occur.' },
    { icon: FileText, title: 'Invoice Generation', description: 'Automated invoice creation with PDF download and email delivery.' },
    { icon: Clock, title: 'Uptime Monitoring', description: 'Track device uptime and performance history.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">ISP Point</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
              <Button onClick={() => navigate('/auth?mode=signup')}>Get Started</Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground">Contact</a>
              <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
              <Button onClick={() => navigate('/auth?mode=signup')}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">🚀 All-in-One ISP Management Platform</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Manage Your ISP Business<br />Like Never Before
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Complete OLT monitoring, customer management, billing automation, and MikroTik integration. 
            Everything you need to run a successful ISP business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="text-lg px-8">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8">
              Login to Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Run an ISP</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From OLT management to automated billing, we've got all the tools you need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your ISP size. All plans include core features.
            </p>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
              <Button 
                variant={billingCycle === 'monthly' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </Button>
              <Button 
                variant={billingCycle === 'yearly' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly <Badge variant="secondary" className="ml-2">Save 20%</Badge>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading packages...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {packages.map((pkg, index) => (
                <Card key={pkg.id} className={`relative ${index === 1 ? 'border-primary shadow-lg scale-105' : ''}`}>
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        ৳{billingCycle === 'monthly' ? pkg.price_monthly : Math.round(pkg.price_yearly / 12)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-muted-foreground">Billed ৳{pkg.price_yearly}/year</p>
                      )}
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Up to {pkg.max_olts} OLTs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{pkg.max_users} Users</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{pkg.max_customers ? `${pkg.max_customers} Customers` : 'Unlimited Customers'}</span>
                      </li>
                      {pkg.features?.olt_care && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>OLT Monitoring</span>
                        </li>
                      )}
                      {pkg.features?.isp_billing && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Billing System</span>
                        </li>
                      )}
                      {pkg.features?.isp_mikrotik && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>MikroTik Integration</span>
                        </li>
                      )}
                      {pkg.features?.sms_alerts && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>SMS Alerts</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={index === 1 ? 'default' : 'outline'}
                      onClick={() => navigate(`/auth?mode=signup&package=${pkg.id}`)}
                    >
                      Get Started
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Streamline Your ISP Operations?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join hundreds of ISPs who are already using our platform to manage their business efficiently.
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/auth?mode=signup')} className="text-lg px-8">
            Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">ISP Point</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete ISP management solution for modern internet service providers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><Link to="/auth" className="hover:text-foreground">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: support@isppoint.com</li>
                <li>Phone: +880 1XXX-XXXXXX</li>
                <li>Dhaka, Bangladesh</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ISP Point. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
