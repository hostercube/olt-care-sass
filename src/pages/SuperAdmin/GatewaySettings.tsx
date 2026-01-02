import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useSMSGateway } from '@/hooks/useSMSGateway';
import { CreditCard, MessageSquare, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GatewaySettings() {
  const { gateways, loading: gatewaysLoading, updateGateway } = usePaymentGateways();
  const { settings: smsSettings, loading: smsLoading, updateSettings: updateSMSSettings, testSMS } = useSMSGateway();
  const { toast } = useToast();

  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, any>>({});
  const [smsConfig, setSmsConfig] = useState({
    provider: 'smsnoc',
    api_key: '',
    api_url: '',
    sender_id: '',
    is_enabled: false,
  });

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
        api_url: smsSettings.api_url || '',
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
    const phone = prompt('Enter phone number to test:');
    if (phone) {
      await testSMS(phone, 'This is a test message from OLT Care SaaS');
      toast({
        title: 'Test SMS Sent',
        description: `Test message sent to ${phone}`,
      });
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
              <CardTitle>{title}</CardTitle>
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

          {(gateway === 'bkash' || gateway === 'nagad' || gateway === 'rocket') && (
            <>
              <div className="space-y-2">
                <Label>Merchant Number</Label>
                <Input
                  value={config.config?.merchant_number || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, merchant_number: e.target.value } }
                  })}
                  placeholder="Enter merchant number"
                />
              </div>
              <div className="space-y-2">
                <Label>Instructions for Customers</Label>
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

          {gateway === 'manual' && (
            <div className="space-y-2">
              <Label>Bank Account Details / Instructions</Label>
              <Textarea
                value={config.instructions || ''}
                onChange={(e) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, instructions: e.target.value }
                })}
                placeholder="Enter bank account details or payment instructions..."
                rows={5}
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
    <DashboardLayout>
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
              <p>Loading payment gateways...</p>
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

          <TabsContent value="sms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS NOC Gateway
                    </CardTitle>
                    <CardDescription>Configure SMS notifications for alerts and billing</CardDescription>
                  </div>
                  <Switch
                    checked={smsConfig.is_enabled}
                    onCheckedChange={(v) => setSmsConfig({ ...smsConfig, is_enabled: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {smsLoading ? (
                  <p>Loading SMS settings...</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>API URL</Label>
                        <Input
                          value={smsConfig.api_url}
                          onChange={(e) => setSmsConfig({ ...smsConfig, api_url: e.target.value })}
                          placeholder="https://api.smsnoc.com/send"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={smsConfig.api_key}
                          onChange={(e) => setSmsConfig({ ...smsConfig, api_key: e.target.value })}
                          placeholder="Enter API key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sender ID</Label>
                        <Input
                          value={smsConfig.sender_id}
                          onChange={(e) => setSmsConfig({ ...smsConfig, sender_id: e.target.value })}
                          placeholder="OLTCare"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSMSSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                      <Button variant="outline" onClick={handleTestSMS} disabled={!smsConfig.is_enabled}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Send Test SMS
                      </Button>
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
