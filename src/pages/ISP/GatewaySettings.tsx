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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantPaymentGateways, TenantPaymentGateway } from '@/hooks/useTenantPaymentGateways';
import { useTenantSMSGateway } from '@/hooks/useTenantSMSGateway';
import { useTenantEmailGateway } from '@/hooks/useTenantEmailGateway';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { CreditCard, MessageSquare, Mail, Save, TestTube, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { PAYMENT_GATEWAYS, SMS_GATEWAYS, type PaymentGatewayType, type SMSGatewayType } from '@/types/saas';

export default function ISPGatewaySettings() {
  const { tenantId } = useTenantContext();
  const { hasPaymentGatewayAccess, hasSMSGatewayAccess, hasAccess, isSuperAdmin } = useModuleAccess();
  const { gateways, loading: gatewaysLoading, updateGateway, initializeGateways } = useTenantPaymentGateways();
  const { settings: smsSettings, loading: smsLoading, updateSettings: updateSMSSettings, sendTestSMS } = useTenantSMSGateway();
  const { settings: emailSettings, loading: emailLoading, updateSettings: updateEmailSettings } = useTenantEmailGateway();

  // Check which gateways are accessible based on package
  const canAccessSMS = hasAccess('sms_alerts') || isSuperAdmin;
  const canAccessEmail = hasAccess('email_alerts') || isSuperAdmin;

  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, TenantPaymentGateway>>({});
  const [selectedSMSProvider, setSelectedSMSProvider] = useState('smsnoc');
  const [smsConfig, setSmsConfig] = useState<Record<string, string>>({
    api_key: '',
    api_secret: '',
    api_url: '',
    sender_id: '',
    username: '',
    password: '',
  });
  const [smsEnabled, setSmsEnabled] = useState(false);
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (gateways.length > 0) {
      const configs: Record<string, TenantPaymentGateway> = {};
      gateways.forEach(gw => {
        // Include bkash_mode in config for UI display
        const gwConfig = { ...(gw.config || {}) };
        if (gw.gateway === 'bkash' && gw.bkash_mode) {
          gwConfig.bkash_mode = gw.bkash_mode;
        }
        configs[gw.gateway] = {
          ...gw,
          config: gwConfig,
          transaction_fee_percent: gw.transaction_fee_percent || 0,
        };
      });
      setPaymentConfigs(configs);
    }
  }, [gateways]);

  useEffect(() => {
    if (smsSettings) {
      setSelectedSMSProvider(smsSettings.provider || 'smsnoc');
      setSmsConfig({
        api_key: smsSettings.api_key || '',
        api_secret: (smsSettings as any).api_secret || '',
        api_url: smsSettings.api_url || '',
        sender_id: smsSettings.sender_id || '',
        username: (smsSettings as any).username || '',
        password: (smsSettings as any).password || '',
      });
      setSmsEnabled(smsSettings.is_enabled || false);
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
        transaction_fee_percent: config.transaction_fee_percent || 0,
        bkash_mode: gateway === 'bkash' ? ((config.config as any)?.bkash_mode || 'tokenized') : undefined,
      });
    }
  };

  const handleSMSSave = async () => {
    const selectedGateway = SMS_GATEWAYS.find(g => g.id === selectedSMSProvider);
    await updateSMSSettings({
      provider: selectedSMSProvider,
      api_key: smsConfig.api_key,
      api_url: smsConfig.api_url || selectedGateway?.api_url || '',
      sender_id: smsConfig.sender_id,
      is_enabled: smsEnabled,
    });
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

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PaymentGatewayCard = ({ gatewayInfo }: { gatewayInfo: typeof PAYMENT_GATEWAYS[number] }) => {
    const config = paymentConfigs[gatewayInfo.id];
    const hasAccess = hasPaymentGatewayAccess(gatewayInfo.id as PaymentGatewayType) || isSuperAdmin;

    if (!config) return null;

    // If no access, show locked card
    if (!hasAccess) {
      return (
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {gatewayInfo.name}
                  <Badge variant="outline" className="text-xs">Locked</Badge>
                </CardTitle>
                <CardDescription className="text-xs">{gatewayInfo.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {gatewayInfo.name}
                {config.is_enabled && <Badge variant="default" className="text-xs bg-green-500">Active</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">{gatewayInfo.description}</CardDescription>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(v) => setPaymentConfigs({
                ...paymentConfigs,
                [gatewayInfo.id]: { ...config, is_enabled: v }
              })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* bKash-specific: Mode selector */}
          {gatewayInfo.id === 'bkash' && (
            <div className="space-y-1">
              <Label className="text-xs">bKash API Mode</Label>
              <Select
                value={(config.config as any)?.bkash_mode || 'tokenized'}
                onValueChange={(v) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gatewayInfo.id]: {
                    ...config,
                    config: { ...config.config, bkash_mode: v }
                  }
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokenized">Tokenized API (Redirect)</SelectItem>
                  <SelectItem value="checkout_js">PGW Checkout.js (Redirect)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Both modes redirect to bKash for payment. Tokenized uses newer API.
              </p>
            </div>
          )}

          {/* Dynamic API fields based on gateway */}
          {gatewayInfo.fields && gatewayInfo.fields.length > 0 && (
            <div className="grid gap-3">
              {gatewayInfo.fields.filter(f => f !== 'bkash_mode').map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs">{gatewayInfo.fieldLabels[field] || field}</Label>
                  <div className="relative">
                    <Input
                      type={field.includes('password') || field.includes('secret') || field.includes('key') ? 
                        (showPasswords[`${gatewayInfo.id}-${field}`] ? 'text' : 'password') : 'text'}
                      value={(config.config as any)?.[field] || ''}
                      onChange={(e) => setPaymentConfigs({
                        ...paymentConfigs,
                        [gatewayInfo.id]: { 
                          ...config, 
                          config: { ...config.config, [field]: e.target.value } 
                        }
                      })}
                      placeholder={`Enter ${gatewayInfo.fieldLabels[field] || field}`}
                      className="h-8 pr-10"
                    />
                    {(field.includes('password') || field.includes('secret') || field.includes('key')) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-8 w-8 px-2"
                        onClick={() => togglePasswordVisibility(`${gatewayInfo.id}-${field}`)}
                      >
                        {showPasswords[`${gatewayInfo.id}-${field}`] ? 
                          <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={config.sandbox_mode}
              onCheckedChange={(v) => setPaymentConfigs({
                ...paymentConfigs,
                [gatewayInfo.id]: { ...config, sandbox_mode: v }
              })}
            />
            <Label className="text-xs text-muted-foreground">Sandbox/Test Mode</Label>
          </div>

          {/* Transaction Fee Percent */}
          <div className="space-y-1">
            <Label className="text-xs">Transaction Fee (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={config.transaction_fee_percent || 0}
              onChange={(e) => setPaymentConfigs({
                ...paymentConfigs,
                [gatewayInfo.id]: { ...config, transaction_fee_percent: parseFloat(e.target.value) || 0 }
              })}
              placeholder="e.g., 2.5 for 2.5%"
              className="h-8"
            />
            <p className="text-xs text-muted-foreground">
              Fee added to payment (e.g., 2% on ৳1000 = ৳1020 total)
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Payment Instructions</Label>
            <Textarea
              value={config.instructions || ''}
              onChange={(e) => setPaymentConfigs({
                ...paymentConfigs,
                [gatewayInfo.id]: { ...config, instructions: e.target.value }
              })}
              placeholder="Payment instructions for customers..."
              rows={2}
              className="text-sm"
            />
          </div>

          <Button size="sm" onClick={() => handlePaymentSave(gatewayInfo.id)}>
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

  const selectedSMSGateway = SMS_GATEWAYS.find(g => g.id === selectedSMSProvider);

  return (
    <DashboardLayout title="Gateway Settings" subtitle="Configure your payment and notification gateways">
      <div className="space-y-6">
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
                {PAYMENT_GATEWAYS.map((gw) => (
                  <PaymentGatewayCard key={gw.id} gatewayInfo={gw} />
                ))}
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
                        {smsEnabled && <Badge variant="default" className="bg-green-500">Active</Badge>}
                      </CardTitle>
                      <CardDescription>Configure SMS notifications for billing reminders</CardDescription>
                    </div>
                    <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>SMS Provider</Label>
                    <Select value={selectedSMSProvider} onValueChange={(v) => {
                      setSelectedSMSProvider(v);
                      const gateway = SMS_GATEWAYS.find(g => g.id === v);
                      if (gateway) {
                        setSmsConfig(prev => ({ ...prev, api_url: gateway.api_url }));
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SMS_GATEWAYS.map((gw) => (
                          <SelectItem key={gw.id} value={gw.id}>
                            {gw.name} - {gw.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSMSGateway && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedSMSGateway.fields.map((field) => (
                        <div key={field} className="space-y-2">
                          <Label>{selectedSMSGateway.fieldLabels[field]}</Label>
                          <div className="relative">
                            <Input
                              type={field.includes('password') || field.includes('secret') || field.includes('key') ?
                                (showPasswords[`sms-${field}`] ? 'text' : 'password') : 'text'}
                              value={smsConfig[field] || ''}
                              onChange={(e) => setSmsConfig({ ...smsConfig, [field]: e.target.value })}
                              placeholder={`Enter ${selectedSMSGateway.fieldLabels[field]}`}
                            />
                            {(field.includes('password') || field.includes('secret') || field.includes('key')) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => togglePasswordVisibility(`sms-${field}`)}
                              >
                                {showPasswords[`sms-${field}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
                        placeholder="Phone number (e.g., 01XXXXXXXXX)"
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
                        {emailConfig.is_enabled && <Badge variant="default" className="bg-green-500">Active</Badge>}
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
                      <div className="relative">
                        <Input
                          type={showPasswords['smtp_password'] ? 'text' : 'password'}
                          value={emailConfig.smtp_password}
                          onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                          placeholder="App password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => togglePasswordVisibility('smtp_password')}
                        >
                          {showPasswords['smtp_password'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
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
