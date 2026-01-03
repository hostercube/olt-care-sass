import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantPaymentGateways, TenantPaymentGateway } from '@/hooks/useTenantPaymentGateways';
import { useTenantSMSGateway } from '@/hooks/useTenantSMSGateway';
import { useTenantEmailGateway } from '@/hooks/useTenantEmailGateway';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { CreditCard, MessageSquare, Mail, Save, TestTube, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { PAYMENT_GATEWAYS, SMS_GATEWAYS, type PaymentGatewayType, type SMSGatewayType } from '@/types/saas';

export default function ISPGatewaySettings() {
  const { tenantId } = useTenantContext();
  const { hasPaymentGatewayAccess, hasSMSGatewayAccess, hasAccess } = useModuleAccess();
  const { gateways, loading: gatewaysLoading, updateGateway, initializeGateways } = useTenantPaymentGateways();
  const { settings: smsSettings, loading: smsLoading, updateSettings: updateSMSSettings, sendTestSMS } = useTenantSMSGateway();
  const { settings: emailSettings, loading: emailLoading, updateSettings: updateEmailSettings } = useTenantEmailGateway();

  // Check which gateways are accessible based on package
  const canAccessSMS = hasAccess('sms_alerts');
  const canAccessEmail = hasAccess('email_alerts');

  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, TenantPaymentGateway>>({});
  const [smsConfig, setSmsConfig] = useState({
    provider: 'smsnoc',
    api_key: '',
    api_url: 'https://app.smsnoc.com/api/v3/sms/send',
    sender_id: '',
    is_enabled: false,
  });
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    sender_name: '',
    sender_email: '',
    use_tls: true,
    is_enabled: false,
  });
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (gateways.length > 0) {
      const configs: Record<string, TenantPaymentGateway> = {};
      gateways.forEach(gw => {
        configs[gw.gateway] = gw;
      });
      setPaymentConfigs(configs);
    }
  }, [gateways]);

  useEffect(() => {
    if (smsSettings) {
      setSmsConfig({
        provider: smsSettings.provider || 'smsnoc',
        api_key: smsSettings.api_key || '',
        api_url: smsSettings.api_url || 'https://app.smsnoc.com/api/v3/sms/send',
        sender_id: smsSettings.sender_id || '',
        is_enabled: smsSettings.is_enabled || false,
      });
    }
  }, [smsSettings]);

  useEffect(() => {
    if (emailSettings) {
      setEmailConfig({
        smtp_host: emailSettings.smtp_host || '',
        smtp_port: emailSettings.smtp_port || 587,
        smtp_username: emailSettings.smtp_username || '',
        smtp_password: emailSettings.smtp_password || '',
        sender_name: emailSettings.sender_name || '',
        sender_email: emailSettings.sender_email || '',
        use_tls: emailSettings.use_tls ?? true,
        is_enabled: emailSettings.is_enabled || false,
      });
    }
  }, [emailSettings]);

  const handleInitializeGateways = async () => {
    if (!tenantId) return;
    setIsInitializing(true);
    try {
      await initializeGateways(tenantId);
      toast.success('Payment gateways initialized');
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSave = async (gateway: string) => {
    const config = paymentConfigs[gateway];
    if (config) {
      await updateGateway(config.id, {
        is_enabled: config.is_enabled,
        sandbox_mode: config.sandbox_mode,
        config: config.config,
        instructions: config.instructions,
      });
    }
  };

  const handleSMSSave = async () => {
    await updateSMSSettings(smsConfig);
  };

  const handleEmailSave = async () => {
    await updateEmailSettings(emailConfig);
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    setIsSendingTest(true);
    try {
      await sendTestSMS(testPhone, 'This is a test message from ISP Management System');
    } finally {
      setIsSendingTest(false);
    }
  };

  const PaymentGatewayCard = ({ gateway, title, description }: { gateway: string; title: string; description: string }) => {
    const config = paymentConfigs[gateway];
    const hasAccess = hasPaymentGatewayAccess(gateway as PaymentGatewayType);
    
    if (!config) return null;

    // If no access, show locked card
    if (!hasAccess) {
      return (
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {title}
                  <Badge variant="outline" className="text-xs">Locked</Badge>
                </CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This payment gateway is not included in your package. Contact support to upgrade.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {title}
                {config.is_enabled && <Badge variant="success" className="text-xs">Active</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(v) => setPaymentConfigs({
                ...paymentConfigs,
                [gateway]: { ...config, is_enabled: v }
              })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {gateway === 'bkash' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Merchant Number</Label>
                <Input
                  value={config.config?.merchant_number || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                  })}
                  placeholder="01XXXXXXXXX"
                  className="h-8"
                />
              </div>
            </>
          )}

          {gateway === 'nagad' && (
            <div className="space-y-1">
              <Label className="text-xs">Merchant Number</Label>
              <Input
                value={config.config?.merchant_number || ''}
                onChange={(e) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                })}
                placeholder="01XXXXXXXXX"
                className="h-8"
              />
            </div>
          )}

          {gateway === 'rocket' && (
            <div className="space-y-1">
              <Label className="text-xs">Merchant Number</Label>
              <Input
                value={config.config?.merchant_number || ''}
                onChange={(e) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                })}
                placeholder="01XXXXXXXXX"
                className="h-8"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Payment Instructions</Label>
            <Textarea
              value={config.instructions || ''}
              onChange={(e) => setPaymentConfigs({
                ...paymentConfigs,
                [gateway]: { ...config, instructions: e.target.value }
              })}
              placeholder="Payment instructions for customers..."
              rows={2}
              className="text-sm"
            />
          </div>

          <Button size="sm" onClick={() => handlePaymentSave(gateway)}>
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (gatewaysLoading || smsLoading || emailLoading) {
    return (
      <DashboardLayout title="Gateway Settings" subtitle="Configure your payment and notification gateways">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gateway Settings" subtitle="Configure your payment and notification gateways">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gateway Settings</h1>
            <p className="text-muted-foreground text-sm">Configure payment, SMS and email gateways for your ISP</p>
          </div>
        </div>

        <Tabs defaultValue="payment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4">
            {Object.keys(paymentConfigs).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No payment gateways configured yet</p>
                  <Button onClick={handleInitializeGateways} disabled={isInitializing}>
                    {isInitializing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Initialize Payment Gateways
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <PaymentGatewayCard gateway="bkash" title="bKash" description="Mobile payment" />
                <PaymentGatewayCard gateway="nagad" title="Nagad" description="Mobile payment" />
                <PaymentGatewayCard gateway="rocket" title="Rocket" description="Mobile payment" />
                <PaymentGatewayCard gateway="manual" title="Manual" description="Cash/Bank transfer" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            {!canAccessSMS ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  SMS Alerts are not included in your current package. Please upgrade to access SMS gateway configuration.
                </AlertDescription>
              </Alert>
            ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS Gateway
                      {smsConfig.is_enabled && <Badge variant="success">Active</Badge>}
                    </CardTitle>
                    <CardDescription>Configure SMS notifications for billing reminders</CardDescription>
                  </div>
                  <Switch
                    checked={smsConfig.is_enabled}
                    onCheckedChange={(v) => setSmsConfig({ ...smsConfig, is_enabled: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={smsConfig.api_key}
                      onChange={(e) => setSmsConfig({ ...smsConfig, api_key: e.target.value })}
                      placeholder="Enter SMS NOC API Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender ID</Label>
                    <Input
                      value={smsConfig.sender_id}
                      onChange={(e) => setSmsConfig({ ...smsConfig, sender_id: e.target.value })}
                      placeholder="Your sender ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      value={smsConfig.api_url}
                      onChange={(e) => setSmsConfig({ ...smsConfig, api_url: e.target.value })}
                      placeholder="https://app.smsnoc.com/api/v3/sms/send"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSMSSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Test SMS</Label>
                  <div className="flex gap-2">
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="Phone number"
                      className="max-w-xs"
                    />
                    <Button variant="outline" onClick={handleTestSMS} disabled={isSendingTest}>
                      {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                      Send Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            {!canAccessEmail ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Email Alerts are not included in your current package. Please upgrade to access email gateway configuration.
                </AlertDescription>
              </Alert>
            ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Gateway (SMTP)
                      {emailConfig.is_enabled && <Badge variant="success">Active</Badge>}
                    </CardTitle>
                    <CardDescription>Configure email notifications for invoices and alerts</CardDescription>
                  </div>
                  <Switch
                    checked={emailConfig.is_enabled}
                    onCheckedChange={(v) => setEmailConfig({ ...emailConfig, is_enabled: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={emailConfig.smtp_host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={emailConfig.smtp_port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={emailConfig.smtp_username}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={emailConfig.smtp_password}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                      placeholder="App password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Name</Label>
                    <Input
                      value={emailConfig.sender_name}
                      onChange={(e) => setEmailConfig({ ...emailConfig, sender_name: e.target.value })}
                      placeholder="Your ISP Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Email</Label>
                    <Input
                      value={emailConfig.sender_email}
                      onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
                      placeholder="noreply@yourisp.com"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={emailConfig.use_tls}
                    onCheckedChange={(v) => setEmailConfig({ ...emailConfig, use_tls: v })}
                  />
                  <Label>Use TLS</Label>
                </div>

                <Button onClick={handleEmailSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
