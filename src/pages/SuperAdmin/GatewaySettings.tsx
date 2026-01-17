import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { CreditCard, Save, Loader2, ExternalLink, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const GATEWAY_CONFIGS: Record<string, {
  title: string;
  description: string;
  docsUrl?: string;
  hasModeSelector?: boolean;
  fields: { key: string; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string }[];
}> = {
  sslcommerz: {
    title: 'SSLCommerz',
    description: 'Bangladesh\'s largest payment gateway',
    docsUrl: 'https://developer.sslcommerz.com/doc/v4/',
    fields: [
      { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'Your Store ID' },
      { key: 'store_password', label: 'Store Password', type: 'password', placeholder: 'Store Password' },
    ]
  },
  shurjopay: {
    title: 'ShurjoPay',
    description: 'Digital payment solution for Bangladesh',
    docsUrl: 'https://shurjopay.com.bd/developers/',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Merchant ID' },
      { key: 'merchant_key', label: 'Merchant Key', type: 'password', placeholder: 'Merchant Key' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'API Username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'API Password' },
    ]
  },
  bkash: {
    title: 'bKash',
    description: 'Mobile banking (Tokenized or PGW Checkout)',
    docsUrl: 'https://developer.bka.sh/docs',
    hasModeSelector: true, // special flag for bKash mode
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'App Secret' },
      { key: 'username', label: 'Username (PGW)', type: 'text', placeholder: 'Merchant Username' },
      { key: 'password', label: 'Password (PGW)', type: 'password', placeholder: 'Merchant Password' },
    ]
  },
  nagad: {
    title: 'Nagad',
    description: 'Digital financial service by Bangladesh Post',
    docsUrl: 'https://nagad.com.bd/developer-api/',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Merchant ID' },
      { key: 'merchant_number', label: 'Merchant Number', type: 'text', placeholder: 'Merchant Number' },
      { key: 'public_key', label: 'Public Key', type: 'textarea', placeholder: 'PGP Public Key' },
      { key: 'private_key', label: 'Private Key', type: 'textarea', placeholder: 'PGP Private Key' },
    ]
  },
  rocket: {
    title: 'Rocket',
    description: 'Dutch-Bangla Bank Mobile Banking',
    fields: [
      { key: 'merchant_number', label: 'Merchant Number', type: 'text', placeholder: 'Merchant Number' },
    ]
  },
  portwallet: {
    title: 'PortWallet',
    description: 'Digital payment gateway',
    docsUrl: 'https://portwallet.com/developers',
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key' },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Secret Key' },
    ]
  },
  piprapay: {
    title: 'PipraPay',
    description: 'Payment aggregator',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'API Key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'API Secret' },
    ]
  },
  uddoktapay: {
    title: 'UddoktaPay',
    description: 'Digital payment solution',
    docsUrl: 'https://uddoktapay.com/documentation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'API Key' },
    ]
  },
  aamarpay: {
    title: 'aamarPay',
    description: 'Payment gateway for Bangladesh',
    docsUrl: 'https://aamarpay.com/developers',
    fields: [
      { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'Store ID' },
      { key: 'signature_key', label: 'Signature Key', type: 'password', placeholder: 'Signature Key' },
    ]
  },
  manual: {
    title: 'Manual Payment',
    description: 'Bank transfer, cash, or other manual methods',
    fields: []
  }
};

export default function GatewaySettings() {
  const { gateways, loading: gatewaysLoading, updateGateway, fetchGateways, createGateway } = usePaymentGateways();
  const { toast } = useToast();
  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, any>>({});
  const [isInitializing, setIsInitializing] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  useEffect(() => {
    if (gateways.length > 0) {
      const configs: Record<string, any> = {};
      gateways.forEach(gw => {
        // Include bkash_mode in config for UI
        const gwConfig = { ...(gw.config || {}) };
        if (gw.gateway === 'bkash' && (gw as any).bkash_mode) {
          gwConfig.bkash_mode = (gw as any).bkash_mode;
        }
        configs[gw.gateway] = {
          ...gw,
          config: gwConfig,
        };
      });
      setPaymentConfigs(configs);
    }
  }, [gateways]);

  const initializeGateways = async () => {
    setIsInitializing(true);
    try {
      const defaultGateways = [
        { gateway: 'sslcommerz', display_name: 'SSLCommerz', sort_order: 1 },
        { gateway: 'shurjopay', display_name: 'ShurjoPay', sort_order: 2 },
        { gateway: 'bkash', display_name: 'bKash', sort_order: 3 },
        { gateway: 'nagad', display_name: 'Nagad', sort_order: 4 },
        { gateway: 'rocket', display_name: 'Rocket', sort_order: 5 },
        { gateway: 'portwallet', display_name: 'PortWallet', sort_order: 6 },
        { gateway: 'piprapay', display_name: 'PipraPay', sort_order: 7 },
        { gateway: 'uddoktapay', display_name: 'UddoktaPay', sort_order: 8 },
        { gateway: 'aamarpay', display_name: 'aamarPay', sort_order: 9 },
        { gateway: 'manual', display_name: 'Manual Payment', sort_order: 10, is_enabled: true, instructions: 'Please transfer to:\nBank Account: XXXXXX\nbKash: 01XXXXXXXXX' },
      ];

      for (const gw of defaultGateways) {
        const exists = gateways.find(g => g.gateway === gw.gateway);
        if (!exists) {
          await createGateway({
            gateway: gw.gateway as any,
            display_name: gw.display_name,
            is_enabled: gw.is_enabled || false,
            sandbox_mode: true,
            config: {},
            sort_order: gw.sort_order,
            instructions: gw.instructions || null,
          });
        }
      }
      
      await fetchGateways();
      toast({ title: 'Success', description: 'Payment gateways initialized' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSave = async (gateway: string) => {
    const config = paymentConfigs[gateway];
    if (config) {
      // Build config object from fields - ensure all values are saved
      const gatewayDef = GATEWAY_CONFIGS[gateway];
      const configData: Record<string, any> = {};
      
      // Copy all existing config values
      if (config.config) {
        Object.keys(config.config).forEach(key => {
          if (config.config[key] !== undefined && config.config[key] !== '') {
            configData[key] = config.config[key];
          }
        });
      }
      
      // For bKash, ensure bkash_mode is in config 
      if (gateway === 'bkash') {
        configData.bkash_mode = config.config?.bkash_mode || 'tokenized';
      }
      
      const updateData: any = {
        is_enabled: config.is_enabled,
        sandbox_mode: config.sandbox_mode,
        config: configData,
        instructions: config.instructions,
        transaction_fee_percent: config.transaction_fee_percent || 0,
      };
      
      // Save bkash_mode to column directly for bKash gateway
      if (gateway === 'bkash') {
        updateData.bkash_mode = configData.bkash_mode;
      }
      
      console.log('Saving gateway config:', { gateway, updateData });
      await updateGateway(config.id, updateData);
    }
  };

  const PaymentGatewayCard = ({ gateway }: { gateway: string }) => {
    const config = paymentConfigs[gateway];
    const gatewayDef = GATEWAY_CONFIGS[gateway] || {
      title: config?.display_name || gateway.charAt(0).toUpperCase() + gateway.slice(1),
      description: 'Payment gateway',
      docsUrl: undefined,
      hasModeSelector: false,
      fields: [] as { key: string; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string }[]
    };
    
    if (!config) return null;

    const isBkash = gateway === 'bkash';

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {gatewayDef.title}
                {config.is_enabled && <Badge variant="success">Active</Badge>}
                {config.sandbox_mode && <Badge variant="outline">Sandbox</Badge>}
              </CardTitle>
              <CardDescription>{gatewayDef.description}</CardDescription>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={async (v) => {
                // Immediately update local state
                setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, is_enabled: v }
                });
                // Also save to database immediately
                await updateGateway(config.id, { is_enabled: v });
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {gatewayDef.docsUrl && (
            <a 
              href={gatewayDef.docsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              API Documentation <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* bKash Mode Selector */}
          {isBkash && (
            <div className="space-y-2">
              <Label>bKash API Mode</Label>
              <Select
                value={config.config?.bkash_mode || 'tokenized'}
                onValueChange={(v) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { 
                    ...config, 
                    config: { ...config.config, bkash_mode: v } 
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokenized">Tokenized API (Redirect)</SelectItem>
                  <SelectItem value="checkout_js">PGW Checkout.js (Redirect)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Both modes redirect to bKash for payment. Tokenized uses newer API endpoints.
              </p>
            </div>
          )}

          {gatewayDef.fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={config.config?.[field.key] || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, [field.key]: e.target.value } }
                  })}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <div className="relative">
                  <Input
                    type={field.type === 'password' && !showPasswords[`${gateway}-${field.key}`] ? 'password' : 'text'}
                    value={config.config?.[field.key] || ''}
                    onChange={(e) => setPaymentConfigs({
                      ...paymentConfigs,
                      [gateway]: { ...config, config: { ...config.config, [field.key]: e.target.value } }
                    })}
                    placeholder={field.placeholder}
                    className="pr-10"
                  />
                  {field.type === 'password' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility(`${gateway}-${field.key}`)}
                    >
                      {showPasswords[`${gateway}-${field.key}`] ? 
                        <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {gateway !== 'manual' && (
            <div className="flex items-center gap-2">
              <Switch
                checked={config.sandbox_mode}
                onCheckedChange={(v) => setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, sandbox_mode: v }
                })}
              />
              <Label>Sandbox/Test Mode</Label>
            </div>
          )}

          {/* Transaction Fee Percent */}
          <div className="space-y-2">
            <Label>Transaction Fee (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={config.transaction_fee_percent || 0}
              onChange={(e) => setPaymentConfigs({
                ...paymentConfigs,
                [gateway]: { ...config, transaction_fee_percent: parseFloat(e.target.value) || 0 }
              })}
              placeholder="e.g., 2.5 for 2.5%"
            />
            <p className="text-xs text-muted-foreground">
              Fee charged to users on each transaction. Example: 2% fee on ৳1000 = ৳1020 total charge
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Instructions (shown to customers)</Label>
            <Textarea
              value={config.instructions || ''}
              onChange={(e) => setPaymentConfigs({
                ...paymentConfigs,
                [gateway]: { ...config, instructions: e.target.value }
              })}
              placeholder="Instructions for customers..."
              rows={3}
            />
          </div>

          <Button onClick={() => handlePaymentSave(gateway)}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout title="Payment Gateways" subtitle="Configure global payment gateway settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment Gateways</h1>
            <p className="text-muted-foreground">Configure payment gateway API credentials and settings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchGateways}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={initializeGateways} disabled={isInitializing}>
              {isInitializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sync Default Gateways
            </Button>
          </div>
        </div>

        {gatewaysLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : Object.keys(paymentConfigs).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payment gateways configured</p>
              <Button onClick={initializeGateways} disabled={isInitializing}>
                {isInitializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Initialize Default Gateways
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {gateways.map(gw => (
              <PaymentGatewayCard key={gw.id} gateway={gw.gateway} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
