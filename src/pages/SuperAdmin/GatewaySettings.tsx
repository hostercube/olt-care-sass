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
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useSMSGateway } from '@/hooks/useSMSGateway';
import { CreditCard, MessageSquare, Save, TestTube, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GatewaySettings() {
  const { gateways, loading: gatewaysLoading, updateGateway, fetchGateways } = usePaymentGateways();
  const { settings: smsSettings, loading: smsLoading, updateSettings: updateSMSSettings, sendTestSMS, fetchSettings: fetchSMSSettings } = useSMSGateway();
  const { toast } = useToast();

  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, any>>({});
  const [smsConfig, setSmsConfig] = useState({
    provider: 'smsnoc',
    api_key: '',
    api_url: 'https://app.smsnoc.com/api/v3/sms/send',
    sender_id: '',
    is_enabled: false,
  });
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test message from OLT Care SaaS');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchGateways();
    fetchSMSSettings();
  }, []);

  useEffect(() => {
    if (gateways.length > 0) {
      const configs: Record<string, any> = {};
      gateways.forEach(gw => {
        configs[gw.gateway] = {
          ...gw,
          config: gw.config || {},
        };
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

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSendingTest(true);
    try {
      await sendTestSMS(testPhone, testMessage);
      toast({
        title: 'Test SMS Queued',
        description: `Test message queued for ${testPhone}`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const PaymentGatewayCard = ({ gateway, title, description }: { gateway: string; title: string; description: string }) => {
    const config = paymentConfigs[gateway];
    if (!config) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                {config.is_enabled && <Badge variant="success">Active</Badge>}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
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
        <CardContent className="space-y-4">
          {gateway === 'sslcommerz' && (
            <>
              <div className="space-y-2">
                <Label>Store ID</Label>
                <Input
                  value={config.config?.store_id || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, store_id: e.target.value } }
                  })}
                  placeholder="Enter Store ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Store Password</Label>
                <Input
                  type="password"
                  value={config.config?.store_password || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, store_password: e.target.value } }
                  })}
                  placeholder="Enter Store Password"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.sandbox_mode}
                  onCheckedChange={(v) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, sandbox_mode: v }
                  })}
                />
                <Label>Sandbox Mode</Label>
              </div>
            </>
          )}

          {gateway === 'bkash' && (
            <>
              <div className="space-y-2">
                <Label>App Key</Label>
                <Input
                  value={config.config?.app_key || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, app_key: e.target.value } }
                  })}
                  placeholder="Enter App Key"
                />
              </div>
              <div className="space-y-2">
                <Label>App Secret</Label>
                <Input
                  type="password"
                  value={config.config?.app_secret || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, app_secret: e.target.value } }
                  })}
                  placeholder="Enter App Secret"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={config.config?.username || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, username: e.target.value } }
                  })}
                  placeholder="Enter Username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={config.config?.password || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, password: e.target.value } }
                  })}
                  placeholder="Enter Password"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.sandbox_mode}
                  onCheckedChange={(v) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, sandbox_mode: v }
                  })}
                />
                <Label>Sandbox Mode</Label>
              </div>
              <div className="space-y-2">
                <Label>Payment Instructions for Customers</Label>
                <Textarea
                  value={config.instructions || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, instructions: e.target.value }
                  })}
                  placeholder="Enter payment instructions..."
                />
              </div>
            </>
          )}

          {gateway === 'nagad' && (
            <>
              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  value={config.config?.merchant_id || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, merchant_id: e.target.value } }
                  })}
                  placeholder="Enter Merchant ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Merchant Number</Label>
                <Input
                  value={config.config?.merchant_number || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                  })}
                  placeholder="Enter Merchant Number"
                />
              </div>
              <div className="space-y-2">
                <Label>Public Key</Label>
                <Textarea
                  value={config.config?.public_key || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, public_key: e.target.value } }
                  })}
                  placeholder="Enter Public Key"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Private Key</Label>
                <Textarea
                  value={config.config?.private_key || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, private_key: e.target.value } }
                  })}
                  placeholder="Enter Private Key"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.sandbox_mode}
                  onCheckedChange={(v) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, sandbox_mode: v }
                  })}
                />
                <Label>Sandbox Mode</Label>
              </div>
              <div className="space-y-2">
                <Label>Payment Instructions for Customers</Label>
                <Textarea
                  value={config.instructions || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, instructions: e.target.value }
                  })}
                  placeholder="Enter payment instructions..."
                />
              </div>
            </>
          )}

          {gateway === 'rocket' && (
            <>
              <div className="space-y-2">
                <Label>Merchant Number</Label>
                <Input
                  value={config.config?.merchant_number || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                  })}
                  placeholder="Enter Merchant Number"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Instructions for Customers</Label>
                <Textarea
                  value={config.instructions || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, instructions: e.target.value }
                  })}
                  placeholder="e.g., Send money to 01XXXXXXXXX and provide transaction ID"
                  rows={3}
                />
              </div>
            </>
          )}

          {gateway === 'manual' && (
            <div className="space-y-2">
              <Label>Bank Account Details / Payment Instructions</Label>
              <Textarea
                value={config.instructions || ''}
                onChange={(e) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, instructions: e.target.value }
                })}
                placeholder="Enter bank account details or payment instructions...&#10;&#10;Example:&#10;Bank: ABC Bank&#10;Account Name: ISP Company Ltd&#10;Account No: 1234567890&#10;Branch: Dhaka&#10;&#10;bKash: 01XXXXXXXXX&#10;Nagad: 01XXXXXXXXX"
                rows={8}
              />
            </div>
          )}

          <Button onClick={() => handlePaymentSave(gateway)}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout title="Gateway Settings" subtitle="Configure payment and SMS gateways">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gateway Settings</h1>
          <p className="text-muted-foreground">Configure payment and SMS gateways</p>
        </div>

        <Tabs defaultValue="payment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Gateways
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Gateway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4">
            {gatewaysLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading payment gateways...</p>
              </div>
            ) : Object.keys(paymentConfigs).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payment gateways configured</p>
                  <p className="text-sm text-muted-foreground mt-2">Payment gateways will appear here once initialized in the database.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <PaymentGatewayCard
                  gateway="sslcommerz"
                  title="SSLCommerz"
                  description="Accept payments via SSLCommerz payment gateway"
                />
                <PaymentGatewayCard
                  gateway="bkash"
                  title="bKash"
                  description="Accept bKash mobile payments"
                />
                <PaymentGatewayCard
                  gateway="nagad"
                  title="Nagad"
                  description="Accept Nagad mobile payments"
                />
                <PaymentGatewayCard
                  gateway="rocket"
                  title="Rocket"
                  description="Accept Rocket mobile payments"
                />
                <PaymentGatewayCard
                  gateway="manual"
                  title="Manual Payment"
                  description="Bank transfer or cash payment"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>SMS NOC Integration</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Configure SMS NOC gateway for sending subscription reminders and alert notifications.</p>
                <a 
                  href="https://smsnoc.com/sms-api-plugins.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View API Documentation <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS NOC Gateway
                      {smsConfig.is_enabled && <Badge variant="success">Active</Badge>}
                    </CardTitle>
                    <CardDescription>Configure SMS notifications for alerts and billing reminders</CardDescription>
                  </div>
                  <Switch
                    checked={smsConfig.is_enabled}
                    onCheckedChange={(v) => setSmsConfig({ ...smsConfig, is_enabled: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {smsLoading ? (
                  <p>Loading SMS settings...</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>API URL</Label>
                        <Input
                          value={smsConfig.api_url}
                          onChange={(e) => setSmsConfig({ ...smsConfig, api_url: e.target.value })}
                          placeholder="https://app.smsnoc.com/api/v3/sms/send"
                        />
                        <p className="text-xs text-muted-foreground">Default: https://app.smsnoc.com/api/v3/sms/send</p>
                      </div>
                      <div className="space-y-2">
                        <Label>API Token (Bearer Token)</Label>
                        <Input
                          type="password"
                          value={smsConfig.api_key}
                          onChange={(e) => setSmsConfig({ ...smsConfig, api_key: e.target.value })}
                          placeholder="Enter your SMS NOC API token"
                        />
                        <p className="text-xs text-muted-foreground">Get your token from SMS NOC dashboard → Developer section</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Sender ID</Label>
                        <Input
                          value={smsConfig.sender_id}
                          onChange={(e) => setSmsConfig({ ...smsConfig, sender_id: e.target.value })}
                          placeholder="OLTCare"
                        />
                        <p className="text-xs text-muted-foreground">Your approved sender ID (max 11 characters)</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSMSSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>

                    {/* Test SMS Section */}
                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-medium">Send Test SMS</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="8801XXXXXXXXX"
                          />
                          <p className="text-xs text-muted-foreground">Include country code without + (e.g., 8801712345678)</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Input
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Test message"
                          />
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleTestSMS} 
                        disabled={!smsConfig.is_enabled || isSendingTest}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {isSendingTest ? 'Sending...' : 'Send Test SMS'}
                      </Button>
                      {!smsConfig.is_enabled && (
                        <p className="text-xs text-muted-foreground">Enable the gateway to send test SMS</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
