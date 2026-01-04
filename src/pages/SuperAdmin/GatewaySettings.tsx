import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { CreditCard, Save, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const GATEWAY_CONFIGS: Record<string, {
  title: string;
  description: string;
  docsUrl?: string;
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
    description: 'Mobile financial services',
    docsUrl: 'https://developer.bka.sh/docs',
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'App Secret' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Merchant Username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Merchant Password' },
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

  useEffect(() => {
    fetchGateways();
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

  const initializeGateways = async () => {
    setIsInitializing(true);
    try {
      const defaultGateways = [
        { gateway: 'sslcommerz', display_name: 'SSLCommerz', sort_order: 1 },
        { gateway: 'shurjopay', display_name: 'ShurjoPay', sort_order: 2 },
        { gateway: 'bkash', display_name: 'bKash', sort_order: 3 },
        { gateway: 'nagad', display_name: 'Nagad', sort_order: 4 },
        { gateway: 'rocket', display_name: 'Rocket', sort_order: 5 },
        { gateway: 'manual', display_name: 'Manual Payment', sort_order: 6, is_enabled: true, instructions: 'Please transfer to:\nBank Account: XXXXXX\nbKash: 01XXXXXXXXX' },
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
      await updateGateway(config.id, {
        is_enabled: config.is_enabled,
        sandbox_mode: config.sandbox_mode,
        config: config.config,
        instructions: config.instructions,
      });
    }
  };

  const PaymentGatewayCard = ({ gateway }: { gateway: string }) => {
    const config = paymentConfigs[gateway];
    const gatewayDef = GATEWAY_CONFIGS[gateway] || {
      title: config?.display_name || gateway.charAt(0).toUpperCase() + gateway.slice(1),
      description: 'Payment gateway',
      docsUrl: undefined,
      fields: [] as { key: string; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string }[]
    };
    
    if (!config) return null;

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
              onCheckedChange={(v) => setPaymentConfigs({
                ...paymentConfigs,
                [gateway]: { ...config, is_enabled: v }
              })}
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
                <Input
                  type={field.type}
                  value={config.config?.[field.key] || ''}
                  onChange={(e) => setPaymentConfigs({
                    ...paymentConfigs,
                    [gateway]: { ...config, config: { ...config.config, [field.key]: e.target.value } }
                  })}
                  placeholder={field.placeholder}
                />
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
