import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, Shield, Users, CreditCard, Check, ArrowRight, Menu, X,
  Phone, Mail, MapPin, Facebook, Youtube, Loader2, AlertTriangle,
  Zap, Clock, Globe, Star, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface TenantData {
  id: string;
  company_name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
  landing_page_enabled: boolean;
  landing_page_template: string;
  landing_page_show_packages: boolean;
  landing_page_show_contact: boolean;
  landing_page_contact_phone: string;
  landing_page_contact_email: string;
  landing_page_contact_address: string;
  landing_page_social_facebook: string;
  landing_page_social_youtube: string;
  landing_page_hero_title: string;
  landing_page_hero_subtitle: string;
  landing_page_about_text: string;
  slug: string;
}

interface ISPPackage {
  id: string;
  name: string;
  description: string | null;
  download_speed: number;
  upload_speed: number;
  speed_unit: string;
  price: number;
  is_active: boolean;
}

const THEME_COLOR_MAP: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
  cyan: { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500' },
  blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
  purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
  green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
  orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
  red: { gradient: 'from-red-500 to-red-600', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
  pink: { gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500' },
  teal: { gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500' },
  amber: { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
};

// Landing page templates
const TEMPLATES = {
  'modern-blue': {
    headerBg: 'bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900',
    heroBg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900',
    cardStyle: 'bg-white/5 backdrop-blur-sm border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-blue-100',
  },
  'clean-white': {
    headerBg: 'bg-white border-b',
    heroBg: 'bg-gradient-to-br from-gray-50 to-white',
    cardStyle: 'bg-white shadow-lg border-gray-200',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
  },
  'dark-gradient': {
    headerBg: 'bg-gradient-to-r from-gray-900 to-black',
    heroBg: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    cardStyle: 'bg-white/5 backdrop-blur-sm border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-purple-200',
  },
  'nature-green': {
    headerBg: 'bg-gradient-to-r from-emerald-800 to-green-900',
    heroBg: 'bg-gradient-to-br from-emerald-900 via-green-950 to-emerald-900',
    cardStyle: 'bg-white/5 backdrop-blur-sm border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-emerald-100',
  },
  'sunset-orange': {
    headerBg: 'bg-gradient-to-r from-orange-600 to-red-600',
    heroBg: 'bg-gradient-to-br from-orange-900 via-red-950 to-orange-900',
    cardStyle: 'bg-white/5 backdrop-blur-sm border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-orange-100',
  },
  'ocean-teal': {
    headerBg: 'bg-gradient-to-r from-teal-700 to-cyan-800',
    heroBg: 'bg-gradient-to-br from-teal-900 via-cyan-950 to-teal-900',
    cardStyle: 'bg-white/5 backdrop-blur-sm border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-teal-100',
  },
};

export default function TenantLanding() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [packages, setPackages] = useState<ISPPackage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantSlug) {
        setError('Invalid URL');
        setLoading(false);
        return;
      }

      try {
        // Find tenant by slug or subdomain
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .or(`slug.eq.${tenantSlug},subdomain.eq.${tenantSlug}`)
          .single();

        if (fetchError || !data) {
          setError('Company not found');
          setLoading(false);
          return;
        }

        // Check if landing page is enabled
        if (!data.landing_page_enabled) {
          // Redirect to login page if landing not enabled
          navigate(`/t/${tenantSlug}`);
          return;
        }

        setTenant(data as TenantData);

        // Fetch packages if enabled
        if (data.landing_page_show_packages) {
          const { data: pkgData } = await supabase
            .from('isp_packages')
            .select('id, name, description, download_speed, upload_speed, speed_unit, price, is_active')
            .eq('tenant_id', data.id)
            .eq('is_active', true)
            .order('price', { ascending: true });
          
          setPackages((pkgData || []) as ISPPackage[]);
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug, navigate]);

  // Apply favicon and title
  useEffect(() => {
    if (tenant) {
      if (tenant.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) link.href = tenant.favicon_url;
      }
      document.title = tenant.company_name || 'Internet Service Provider';
    }
  }, [tenant]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSubmitting(true);
    try {
      // Create connection request
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          tenant_id: tenant.id,
          customer_name: contactForm.name,
          phone: contactForm.phone,
          notes: contactForm.message,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('আপনার অনুরোধ সফলভাবে জমা হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।');
      setContactForm({ name: '', phone: '', message: '' });
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('অনুরোধ জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The requested page could not be found.'}</p>
            <Button onClick={() => navigate('/')}>Go to Main Page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const template = TEMPLATES[tenant.landing_page_template as keyof typeof TEMPLATES] || TEMPLATES['modern-blue'];
  const themeColors = THEME_COLOR_MAP[tenant.theme_color] || THEME_COLOR_MAP.cyan;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`${template.headerBg} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
              ) : (
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                  <Wifi className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className={`font-bold text-lg ${template.textPrimary}`}>{tenant.company_name}</h1>
                {tenant.subtitle && (
                  <p className={`text-xs ${template.textSecondary} hidden sm:block`}>{tenant.subtitle}</p>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {tenant.landing_page_show_packages && packages.length > 0 && (
                <a href="#packages" className={`${template.textSecondary} hover:${template.textPrimary} transition-colors`}>
                  প্যাকেজ
                </a>
              )}
              {tenant.landing_page_show_contact && (
                <a href="#contact" className={`${template.textSecondary} hover:${template.textPrimary} transition-colors`}>
                  যোগাযোগ
                </a>
              )}
              <Button 
                onClick={() => navigate(`/t/${tenantSlug}`)}
                className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90`}
              >
                লগইন করুন
              </Button>
            </nav>

            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${template.textPrimary}`} />
              ) : (
                <Menu className={`h-6 w-6 ${template.textPrimary}`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-4 space-y-3">
            {tenant.landing_page_show_packages && packages.length > 0 && (
              <a href="#packages" className={`block ${template.textSecondary}`} onClick={() => setMobileMenuOpen(false)}>
                প্যাকেজ
              </a>
            )}
            {tenant.landing_page_show_contact && (
              <a href="#contact" className={`block ${template.textSecondary}`} onClick={() => setMobileMenuOpen(false)}>
                যোগাযোগ
              </a>
            )}
            <Button 
              onClick={() => navigate(`/t/${tenantSlug}`)}
              className={`w-full bg-gradient-to-r ${themeColors.gradient}`}
            >
              লগইন করুন
            </Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={`${template.heroBg} py-20 lg:py-32`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${template.textPrimary} mb-6`}>
            {tenant.landing_page_hero_title || `${tenant.company_name}-এ স্বাগতম`}
          </h1>
          <p className={`text-xl md:text-2xl ${template.textSecondary} max-w-3xl mx-auto mb-10`}>
            {tenant.landing_page_hero_subtitle || 'দ্রুত, নির্ভরযোগ্য এবং সাশ্রয়ী ইন্টারনেট সেবা'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {tenant.landing_page_show_packages && packages.length > 0 && (
              <Button 
                size="lg" 
                className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-lg px-8`}
                onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}
              >
                প্যাকেজ দেখুন
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            <Button 
              size="lg" 
              variant="outline" 
              className={`${template.textPrimary} border-white/30 hover:bg-white/10 text-lg px-8`}
              onClick={() => navigate(`/t/${tenantSlug}`)}
            >
              গ্রাহক লগইন
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { icon: Zap, text: 'উচ্চ গতির ইন্টারনেট' },
              { icon: Clock, text: '২৪/৭ সাপোর্ট' },
              { icon: Shield, text: 'নিরাপদ সংযোগ' },
              { icon: Globe, text: 'ফাইবার অপটিক' },
            ].map((feature, index) => (
              <div key={index} className={`${template.cardStyle} rounded-xl p-4 border`}>
                <feature.icon className={`h-8 w-8 ${themeColors.text} mx-auto mb-2`} />
                <p className={`${template.textSecondary} text-sm`}>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      {tenant.landing_page_about_text && (
        <section className="py-16 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">আমাদের সম্পর্কে</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {tenant.landing_page_about_text}
            </p>
          </div>
        </section>
      )}

      {/* Packages Section */}
      {tenant.landing_page_show_packages && packages.length > 0 && (
        <section id="packages" className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">আমাদের প্যাকেজসমূহ</h2>
              <p className="text-muted-foreground text-lg">আপনার প্রয়োজন অনুযায়ী প্যাকেজ বেছে নিন</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className="relative overflow-hidden"
                >
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <div className={`text-3xl font-bold ${themeColors.text}`}>
                      ৳{pkg.price}
                      <span className="text-base font-normal text-muted-foreground">/মাস</span>
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      <Zap className="h-3 w-3 mr-1" />
                      {pkg.download_speed} {pkg.speed_unit}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${themeColors.text}`} />
                        <span>ডাউনলোড: {pkg.download_speed} {pkg.speed_unit}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${themeColors.text}`} />
                        <span>আপলোড: {pkg.upload_speed} {pkg.speed_unit}</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90`}
                      onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      সংযোগ নিন
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {tenant.landing_page_show_contact && (
        <section id="contact" className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">যোগাযোগ করুন</h2>
              <p className="text-muted-foreground text-lg">আমাদের সাথে যোগাযোগ করুন, আমরা সাহায্য করতে প্রস্তুত</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>সংযোগের জন্য আবেদন</CardTitle>
                  <CardDescription>ফর্মটি পূরণ করুন, আমরা শীঘ্রই যোগাযোগ করব</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">আপনার নাম *</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="আপনার সম্পূর্ণ নাম"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">মোবাইল নম্বর *</Label>
                      <Input
                        id="phone"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">বার্তা (ঐচ্ছিক)</Label>
                      <Textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="আপনার ঠিকানা বা অন্যান্য তথ্য..."
                        rows={4}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90`}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          জমা হচ্ছে...
                        </>
                      ) : (
                        'জমা দিন'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <div className="space-y-6">
                {tenant.landing_page_contact_phone && (
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${themeColors.bg}/10`}>
                      <Phone className={`h-6 w-6 ${themeColors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">ফোন</h3>
                      <a href={`tel:${tenant.landing_page_contact_phone}`} className="text-muted-foreground hover:text-foreground">
                        {tenant.landing_page_contact_phone}
                      </a>
                    </div>
                  </div>
                )}

                {tenant.landing_page_contact_email && (
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${themeColors.bg}/10`}>
                      <Mail className={`h-6 w-6 ${themeColors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">ইমেইল</h3>
                      <a href={`mailto:${tenant.landing_page_contact_email}`} className="text-muted-foreground hover:text-foreground">
                        {tenant.landing_page_contact_email}
                      </a>
                    </div>
                  </div>
                )}

                {tenant.landing_page_contact_address && (
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${themeColors.bg}/10`}>
                      <MapPin className={`h-6 w-6 ${themeColors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">ঠিকানা</h3>
                      <p className="text-muted-foreground">{tenant.landing_page_contact_address}</p>
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {(tenant.landing_page_social_facebook || tenant.landing_page_social_youtube) && (
                  <div className="pt-6 border-t">
                    <h3 className="font-semibold mb-4">সোশ্যাল মিডিয়া</h3>
                    <div className="flex gap-4">
                      {tenant.landing_page_social_facebook && (
                        <a 
                          href={tenant.landing_page_social_facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors`}
                        >
                          <Facebook className="h-6 w-6 text-blue-500" />
                        </a>
                      )}
                      {tenant.landing_page_social_youtube && (
                        <a 
                          href={tenant.landing_page_social_youtube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors`}
                        >
                          <Youtube className="h-6 w-6 text-red-500" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`${template.heroBg} py-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
              ) : (
                <Wifi className={`h-8 w-8 ${themeColors.text}`} />
              )}
              <span className={`font-semibold ${template.textPrimary}`}>{tenant.company_name}</span>
            </div>
            <p className={`${template.textSecondary} text-sm`}>
              © {new Date().getFullYear()} {tenant.company_name}. সর্বস্বত্ব সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
