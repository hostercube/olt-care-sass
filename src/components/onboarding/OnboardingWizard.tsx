import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { Building2, Server, Settings, CheckCircle, ArrowRight, ArrowLeft, X } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'First OLT', icon: Server },
  { id: 3, title: 'Preferences', icon: Settings },
  { id: 4, title: 'Complete', icon: CheckCircle },
];

const ONBOARDING_SKIPPED_KEY = 'onboarding_skipped';

interface OnboardingWizardProps {
  onSkip?: () => void;
}

export function OnboardingWizard({ onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { tenantId, refetch } = useTenantContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSkip = () => {
    sessionStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    if (onSkip) {
      onSkip();
    }
    navigate('/');
    toast({
      title: 'Onboarding Skipped',
      description: 'You can complete setup later from OLT Management',
    });
  };

  const [companyData, setCompanyData] = useState({
    company_name: '',
    phone: '',
    address: '',
  });

  const [oltData, setOltData] = useState({
    name: '',
    ip_address: '',
    port: '22',
    username: '',
    password: '',
    brand: 'ZTE' as const,
    olt_mode: 'GPON' as const,
  });

  const [prefData, setPrefData] = useState({
    email_notifications: true,
    sms_notifications: false,
    notification_email: '',
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    if (currentStep === 1) {
      // Save company info
      if (!companyData.company_name) {
        toast({ title: 'Error', description: 'Company name is required', variant: 'destructive' });
        return;
      }
      
      if (tenantId) {
        setLoading(true);
        const { error } = await supabase
          .from('tenants')
          .update({
            company_name: companyData.company_name,
            phone: companyData.phone,
            address: companyData.address,
          })
          .eq('id', tenantId);
        
        setLoading(false);
        if (error) {
          toast({ title: 'Error', description: 'Failed to save company info', variant: 'destructive' });
          return;
        }
      }
    }

    if (currentStep === 2) {
      // Save first OLT
      if (!oltData.name || !oltData.ip_address || !oltData.username || !oltData.password) {
        toast({ title: 'Error', description: 'All OLT fields are required', variant: 'destructive' });
        return;
      }

      if (tenantId) {
        setLoading(true);
        const { error } = await supabase
          .from('olts')
          .insert({
            tenant_id: tenantId,
            name: oltData.name,
            ip_address: oltData.ip_address,
            port: parseInt(oltData.port),
            username: oltData.username,
            password_encrypted: oltData.password, // In production, encrypt this
            brand: oltData.brand,
            olt_mode: oltData.olt_mode,
          });

        setLoading(false);
        if (error) {
          toast({ title: 'Error', description: 'Failed to add OLT', variant: 'destructive' });
          return;
        }
      }
    }

    if (currentStep === 3) {
      // Save notification preferences
      if (tenantId) {
        setLoading(true);
        const { error } = await supabase
          .from('notification_preferences')
          .upsert({
            tenant_id: tenantId,
            email_enabled: prefData.email_notifications,
            sms_enabled: prefData.sms_notifications,
            email_address: prefData.notification_email,
          });

        setLoading(false);
        if (error) {
          toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
          return;
        }
      }
    }

    if (currentStep === 4) {
      // Complete onboarding
      refetch();
      navigate('/dashboard');
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl relative">
        {/* Skip Button */}
        {currentStep < 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            <X className="h-4 w-4 mr-1" />
            Skip
          </Button>
        )}
        
        <CardHeader className="pt-12">
          <CardTitle className="text-2xl text-center">Welcome to OLT Monitor</CardTitle>
          <CardDescription className="text-center">
            Let's get your ISP set up in just a few steps
          </CardDescription>
          <Progress value={progress} className="mt-4" />
          
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <step.icon className="h-6 w-6 mb-1" />
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tell us about your company</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    placeholder="Your ISP Company"
                    value={companyData.company_name}
                    onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+880 1XXXXXXXXX"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Your business address"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add your first OLT</h3>
              <p className="text-sm text-muted-foreground">
                You can add more OLTs later from the OLT Management page
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="olt_name">OLT Name *</Label>
                  <Input
                    id="olt_name"
                    placeholder="Main OLT"
                    value={oltData.name}
                    onChange={(e) => setOltData({ ...oltData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="olt_ip">IP Address *</Label>
                  <Input
                    id="olt_ip"
                    placeholder="192.168.1.1"
                    value={oltData.ip_address}
                    onChange={(e) => setOltData({ ...oltData, ip_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="olt_brand">Brand</Label>
                  <Select
                    value={oltData.brand}
                    onValueChange={(value: any) => setOltData({ ...oltData, brand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZTE">ZTE</SelectItem>
                      <SelectItem value="Huawei">Huawei</SelectItem>
                      <SelectItem value="BDCOM">BDCOM</SelectItem>
                      <SelectItem value="VSOL">VSOL</SelectItem>
                      <SelectItem value="CDATA">CDATA</SelectItem>
                      <SelectItem value="ECOM">ECOM</SelectItem>
                      <SelectItem value="DBC">DBC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="olt_mode">Mode</Label>
                  <Select
                    value={oltData.olt_mode}
                    onValueChange={(value: any) => setOltData({ ...oltData, olt_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPON">GPON</SelectItem>
                      <SelectItem value="EPON">EPON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="olt_username">Username *</Label>
                  <Input
                    id="olt_username"
                    placeholder="admin"
                    value={oltData.username}
                    onChange={(e) => setOltData({ ...oltData, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="olt_password">Password *</Label>
                  <Input
                    id="olt_password"
                    type="password"
                    placeholder="••••••••"
                    value={oltData.password}
                    onChange={(e) => setOltData({ ...oltData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground">
                How would you like to receive alerts?
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email_notif">Email Notifications</Label>
                  <input
                    type="checkbox"
                    id="email_notif"
                    checked={prefData.email_notifications}
                    onChange={(e) => setPrefData({ ...prefData, email_notifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                {prefData.email_notifications && (
                  <div>
                    <Label htmlFor="notif_email">Notification Email</Label>
                    <Input
                      id="notif_email"
                      type="email"
                      placeholder="alerts@company.com"
                      value={prefData.notification_email}
                      onChange={(e) => setPrefData({ ...prefData, notification_email: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms_notif">SMS Notifications</Label>
                  <input
                    type="checkbox"
                    id="sms_notif"
                    checked={prefData.sms_notifications}
                    onChange={(e) => setPrefData({ ...prefData, sms_notifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-medium">You're all set!</h3>
              <p className="text-muted-foreground">
                Your ISP account has been configured. You can now start monitoring your OLT devices.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading ? 'Saving...' : currentStep === 4 ? 'Go to Dashboard' : 'Continue'}
              {currentStep < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
