import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, Settings, Send, CheckCircle, XCircle, Clock, 
  Loader2, ExternalLink, Info, Wallet, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SMSGatewaySettings {
  id: string;
  provider: string;
  api_key: string | null;
  api_url: string | null;
  sender_id: string | null;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
}

// SMS Provider configurations based on official documentation
const SMS_PROVIDERS = [
  { 
    value: 'smsnoc', 
    label: 'SMS NOC', 
    apiUrl: 'https://app.smsnoc.com/api/v3/sms/send',
    balanceUrl: 'https://app.smsnoc.com/api/v3/balance',
    docUrl: 'https://smsnoc.com/sms-api-plugins.html',
    authType: 'bearer',
    description: 'Official SMS NOC API - Uses Bearer token authentication',
    fields: {
      api_key: { label: 'API Token', placeholder: 'Your API Token from SMS NOC dashboard', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID (max 11 chars)', required: true },
    },
    testPayload: {
      recipient: '{{phone}}',
      sender_id: '{{sender_id}}',
      type: 'plain',
      message: '{{message}}'
    }
  },
  { 
    value: 'ssl_wireless', 
    label: 'SSL Wireless', 
    apiUrl: 'https://smsplus.sslwireless.com/api/v3/send-sms',
    docUrl: 'https://www.sslwireless.com/sms-api-documentation',
    authType: 'token',
    description: 'SSL Wireless SMS API with token authentication',
    fields: {
      api_key: { label: 'API Token', placeholder: 'Your SSL Wireless API token', required: true },
      sender_id: { label: 'SID (Sender ID)', placeholder: 'Your approved SID', required: true },
    }
  },
  { 
    value: 'mimsms', 
    label: 'MIM SMS', 
    apiUrl: 'https://esms.mimsms.com/smsapi',
    docUrl: 'https://mimsms.com/developer-api',
    authType: 'apikey',
    description: 'MIM SMS API with API key authentication',
    fields: {
      api_key: { label: 'API Key', placeholder: 'Your MIM SMS API key', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID', required: true },
    }
  },
  { 
    value: 'revesms', 
    label: 'Reve SMS', 
    apiUrl: 'https://api.revesms.com/api/v1/sms/send',
    docUrl: 'https://www.revesms.com/api-documentation',
    authType: 'apikey_secret',
    description: 'Reve SMS API with API key and secret',
    fields: {
      api_key: { label: 'API Key', placeholder: 'Your Reve SMS API key', required: true },
      api_secret: { label: 'API Secret', placeholder: 'Your Reve SMS API secret', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID', required: true },
    }
  },
  { 
    value: 'bulksmsbd', 
    label: 'BulkSMS BD', 
    apiUrl: 'https://bulksmsbd.net/api/smsapi',
    docUrl: 'https://bulksmsbd.net/api-docs',
    authType: 'apikey',
    description: 'BulkSMS BD API',
    fields: {
      api_key: { label: 'API Key', placeholder: 'Your BulkSMS BD API key', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID', required: true },
    }
  },
  { 
    value: 'greenweb', 
    label: 'Green Web', 
    apiUrl: 'https://api.greenweb.com.bd/api.php',
    docUrl: 'https://greenweb.com.bd/sms-api-documentation',
    authType: 'token',
    description: 'Green Web SMS API',
    fields: {
      api_key: { label: 'Token', placeholder: 'Your Green Web API token', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID', required: true },
    }
  },
  { 
    value: 'smsnetbd', 
    label: 'SMS.net.bd', 
    apiUrl: 'https://api.sms.net.bd/sendsms',
    docUrl: 'https://www.sms.net.bd/api-documentation',
    authType: 'apikey',
    description: 'SMS.net.bd API',
    fields: {
      api_key: { label: 'API Key', placeholder: 'Your SMS.net.bd API key', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your approved Sender ID', required: true },
    }
  },
  { 
    value: 'custom', 
    label: 'Custom Provider', 
    apiUrl: '',
    docUrl: '',
    authType: 'custom',
    description: 'Configure a custom SMS gateway',
    fields: {
      api_key: { label: 'API Key/Token', placeholder: 'Your API key or token', required: true },
      sender_id: { label: 'Sender ID', placeholder: 'Your Sender ID', required: false },
    }
  },
];

export default function SMSGatewaySettings() {
  const [settings, setSettings] = useState<SMSGatewaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test SMS from OLT Care Platform');
  const [sendingTest, setSendingTest] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const { toast } = useToast();

  // Form state
  const [provider, setProvider] = useState('smsnoc');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiUrl, setApiUrl] = useState('https://app.smsnoc.com/api/v3/sms/send');
  const [senderId, setSenderId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  const selectedProvider = SMS_PROVIDERS.find(p => p.value === provider);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_gateway_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as SMSGatewaySettings);
        setProvider(data.provider || 'smsnoc');
        setApiKey(data.api_key || '');
        setApiUrl(data.api_url || 'https://app.smsnoc.com/api/v3/sms/send');
        setSenderId(data.sender_id || '');
        setIsEnabled(data.is_enabled || false);
        if (data.config && typeof data.config === 'object') {
          setApiSecret((data.config as any).api_secret || '');
        }
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const selectedProvider = SMS_PROVIDERS.find(p => p.value === value);
    if (selectedProvider && selectedProvider.apiUrl) {
      setApiUrl(selectedProvider.apiUrl);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = apiSecret ? { api_secret: apiSecret } : {};

      const updateData = {
        provider,
        api_key: apiKey || null,
        api_url: apiUrl || null,
        sender_id: senderId || null,
        is_enabled: isEnabled,
        config: config as any,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .update(updateData as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .insert(updateData as any);
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'SMS gateway configuration has been updated',
      });
      
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckBalance = async () => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'Please enter and save your API key first',
        variant: 'destructive',
      });
      return;
    }

    setCheckingBalance(true);
    setBalance(null);
    
    try {
      // Balance check based on provider
      const providerConfig = SMS_PROVIDERS.find(p => p.value === provider);
      
      if (provider === 'smsnoc' && providerConfig?.balanceUrl) {
        // For SMS NOC, we can try to fetch balance
        const response = await fetch(providerConfig.balanceUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data) {
            setBalance(`৳${data.data.remaining_balance || 0}`);
            toast({
              title: 'Balance Retrieved',
              description: `Current balance: ৳${data.data.remaining_balance || 0}`,
            });
          } else {
            throw new Error(data.message || 'Failed to get balance');
          }
        } else {
          throw new Error('Failed to check balance - API request failed');
        }
      } else if (provider === 'mimsms') {
        // MIM SMS balance check
        const response = await fetch(`https://esms.mimsms.com/smsapi?api_key=${apiKey}&action=balance`);
        if (response.ok) {
          const text = await response.text();
          setBalance(text);
          toast({
            title: 'Balance Retrieved',
            description: `Current balance: ${text}`,
          });
        } else {
          throw new Error('Failed to check balance');
        }
      } else {
        toast({
          title: 'Balance Check',
          description: 'Balance check is not available for this provider. Please check your provider dashboard.',
        });
      }
    } catch (error: any) {
      console.error('Balance check error:', error);
      toast({
        title: 'Balance Check Failed',
        description: error.message || 'Unable to retrieve balance. Please check your provider dashboard.',
        variant: 'destructive',
      });
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleSendTest = async () => {
    if (!testNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      // Queue the test SMS
      const { error } = await supabase
        .from('sms_logs')
        .insert({
          phone_number: testNumber,
          message: testMessage,
          status: 'pending',
          tenant_id: null,
        });

      if (error) throw error;

      toast({
        title: 'Test SMS Queued',
        description: 'Test SMS has been queued. The polling server will process it using the configured gateway.',
      });

      setTestNumber('');
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue test SMS',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="SMS Gateway Settings" subtitle="Configure SMS provider for platform notifications">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SMS Gateway Settings" subtitle="Configure SMS provider for platform notifications">
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Super Admin SMS Gateway</AlertTitle>
          <AlertDescription>
            Configure the SMS gateway for sending notifications to ISP owners/tenants. This is separate from tenant-level SMS gateways. 
            View SMS logs in the <strong>SMS Center</strong> page.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Test SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      SMS Provider Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your SMS gateway to send notifications to ISP tenants
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                      <div>
                        <Label htmlFor="enabled" className="text-base font-medium">Enable SMS Gateway</Label>
                        <p className="text-sm text-muted-foreground">
                          Turn on SMS notifications for subscription alerts and reminders
                        </p>
                      </div>
                      <Switch
                        id="enabled"
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="provider">SMS Provider</Label>
                        <Select value={provider} onValueChange={handleProviderChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {SMS_PROVIDERS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProvider && (
                          <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey">
                          {selectedProvider?.fields?.api_key?.label || 'API Key/Token'}
                        </Label>
                        <Input
                          id="apiKey"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={selectedProvider?.fields?.api_key?.placeholder || 'Enter your API key'}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="senderId">
                          {selectedProvider?.fields?.sender_id?.label || 'Sender ID'}
                        </Label>
                        <Input
                          id="senderId"
                          value={senderId}
                          onChange={(e) => setSenderId(e.target.value)}
                          placeholder={selectedProvider?.fields?.sender_id?.placeholder || 'Your Sender ID'}
                          maxLength={13}
                        />
                        <p className="text-xs text-muted-foreground">Max 11 characters for text, 13 for phone numbers</p>
                      </div>

                      {selectedProvider?.authType === 'apikey_secret' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="apiSecret">API Secret</Label>
                          <Input
                            id="apiSecret"
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            placeholder="Enter your API secret"
                          />
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="apiUrl">API Endpoint URL</Label>
                        <Input
                          id="apiUrl"
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                          placeholder="https://api.smsprovider.com/send"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      {apiKey && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={handleCheckBalance} disabled={checkingBalance}>
                            {checkingBalance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                            Check Balance
                          </Button>
                          {balance && (
                            <Badge variant="secondary" className="text-sm">
                              Balance: {balance}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="ml-auto">
                        <Button onClick={handleSave} disabled={saving}>
                          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Provider Info Card */}
              <div className="space-y-4">
                {selectedProvider && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedProvider.label} Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedProvider.docUrl && (
                        <Button variant="outline" className="w-full" asChild>
                          <a href={selectedProvider.docUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            API Documentation
                          </a>
                        </Button>
                      )}
                      
                      {provider === 'smsnoc' && (
                        <div className="space-y-3 text-sm">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-medium mb-2">API Endpoint:</p>
                            <code className="text-xs break-all bg-background p-2 rounded block">
                              POST https://app.smsnoc.com/api/v3/sms/send
                            </code>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-medium mb-2">Authentication:</p>
                            <code className="text-xs bg-background p-2 rounded block">
                              Authorization: Bearer {'{'}&lt;api_token&gt;{'}'}
                            </code>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-medium mb-2">Request Body:</p>
                            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "recipient": "8801xxxxxxx",
  "sender_id": "YourID",
  "type": "plain",
  "message": "Your message"
}`}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Important Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Ensure your Sender ID is approved by the provider</p>
                    <p>• Phone numbers should include country code (88)</p>
                    <p>• SMS will be processed by the polling server</p>
                    <p>• Check provider dashboard for delivery reports</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send Test SMS
                </CardTitle>
                <CardDescription>
                  Test your SMS gateway configuration by sending a test message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEnabled && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Gateway Disabled</AlertTitle>
                    <AlertDescription>
                      SMS gateway is currently disabled. Enable it in settings to send messages.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="testNumber">Phone Number</Label>
                    <Input
                      id="testNumber"
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="e.g., 8801712345678"
                    />
                    <p className="text-xs text-muted-foreground">Include country code (88 for Bangladesh)</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="testMessage">Message</Label>
                    <Textarea
                      id="testMessage"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">{testMessage.length} characters</p>
                  </div>
                </div>

                <Button onClick={handleSendTest} disabled={sendingTest || !isEnabled}>
                  {sendingTest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" />
                  Send Test SMS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
