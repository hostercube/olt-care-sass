import { useState, useEffect, useCallback, memo } from 'react';
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
import { CreditCard, Save, Loader2, ExternalLink, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

// Gateway configurations with required fields for validation
const GATEWAY_CONFIGS: Record<string, {
  title: string;
  description: string;
  docsUrl?: string;
  hasModeSelector?: boolean;
  fields: { key: string; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string; required?: boolean }[];
}> = {
  sslcommerz: {
    title: 'SSLCommerz',
    description: 'Bangladesh\'s largest payment gateway',
    docsUrl: 'https://developer.sslcommerz.com/doc/v4/',
    fields: [
      { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'Your Store ID', required: true },
      { key: 'store_password', label: 'Store Password', type: 'password', placeholder: 'Store Password', required: true },
    ]
  },
  shurjopay: {
    title: 'ShurjoPay',
    description: 'Digital payment solution for Bangladesh',
    docsUrl: 'https://shurjopay.com.bd/developers/',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Merchant ID' },
      { key: 'merchant_key', label: 'Merchant Key', type: 'password', placeholder: 'Merchant Key' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'API Username', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'API Password', required: true },
    ]
  },
  bkash: {
    title: 'bKash',
    description: 'Mobile banking (Tokenized or PGW Checkout)',
    docsUrl: 'https://developer.bka.sh/docs',
    hasModeSelector: true,
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'App Secret', required: true },
      { key: 'username', label: 'Username (PGW)', type: 'text', placeholder: 'Merchant Username', required: true },
      { key: 'password', label: 'Password (PGW)', type: 'password', placeholder: 'Merchant Password', required: true },
    ]
  },
  nagad: {
    title: 'Nagad',
    description: 'Digital financial service by Bangladesh Post',
    docsUrl: 'https://nagad.com.bd/developer-api/',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Merchant ID', required: true },
      { key: 'merchant_number', label: 'Merchant Number', type: 'text', placeholder: 'Merchant Number', required: true },
      { key: 'public_key', label: 'Public Key', type: 'textarea', placeholder: 'PGP Public Key', required: true },
      { key: 'private_key', label: 'Private Key', type: 'textarea', placeholder: 'PGP Private Key', required: true },
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
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'App Key', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Secret Key', required: true },
    ]
  },
  piprapay: {
    title: 'PipraPay',
    description: 'Payment aggregator',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'API Key', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'API Secret', required: true },
    ]
  },
  uddoktapay: {
    title: 'UddoktaPay',
    description: 'Digital payment solution',
    docsUrl: 'https://uddoktapay.com/documentation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'API Key', required: true },
    ]
  },
  aamarpay: {
    title: 'aamarPay',
    description: 'Payment gateway for Bangladesh',
    docsUrl: 'https://aamarpay.com/developers',
    fields: [
      { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'Store ID', required: true },
      { key: 'signature_key', label: 'Signature Key', type: 'password', placeholder: 'Signature Key', required: true },
    ]
  },
  manual: {
    title: 'Manual Payment',
    description: 'Bank transfer, cash, or other manual methods',
    fields: []
  }
};

// Helper to check if required credentials are configured
const getMissingCredentials = (gateway: string, config: Record<string, any> | null): string[] => {
  const gatewayDef = GATEWAY_CONFIGS[gateway];
  if (!gatewayDef) return [];
  
  const missing: string[] = [];
  gatewayDef.fields.forEach(field => {
    if (field.required && (!config?.[field.key] || config[field.key].toString().trim() === '')) {
      missing.push(field.label);
    }
  });
  return missing;
};

// Memoized input field component to prevent focus loss on parent re-render
const GatewayInputFieldSA = memo(function GatewayInputFieldSA({
  gatewayId,
  fieldKey,
  label,
  type,
  placeholder,
  value,
  onChange,
  showPassword,
  onTogglePassword,
}: {
  gatewayId: string;
  fieldKey: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  // Use local state to handle input without losing focus
  const [localValue, setLocalValue] = useState(value);
  
  // Sync local state when parent value changes (e.g., after save/fetch)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  if (type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Textarea
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={type === 'password' && !showPassword ? 'password' : 'text'}
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="pr-10"
        />
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={onTogglePassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
});

// Memoized number input for fee (prevents focus loss)
const FeeInputField = memo(function FeeInputField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value.toString());
  
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(parseFloat(newValue) || 0);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label>Transaction Fee (%)</Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={localValue}
        onChange={handleChange}
        placeholder="e.g., 2.5 for 2.5%"
      />
      <p className="text-xs text-muted-foreground">
        Fee added on top of payment. Example: 2% on ৳1000 = Customer pays ৳1020
      </p>
    </div>
  );
});

// Memoized textarea for instructions (prevents focus loss)
const InstructionsField = memo(function InstructionsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label>Payment Instructions (shown to customers)</Label>
      <Textarea
        value={localValue}
        onChange={handleChange}
        placeholder="Instructions for customers..."
        rows={3}
      />
    </div>
  );
});

  const handlePaymentSave = async (gateway: string) => {
    const config = paymentConfigs[gateway];
    if (!config) return;
    
    setSavingGateway(gateway);
    
    try {
      // Build config object from fields - include ALL values, even empty ones
      const configData: Record<string, any> = {};
      
      // Copy all config values - let the backend handle validation
      if (config.config && typeof config.config === 'object') {
        Object.entries(config.config).forEach(([key, value]) => {
          // Include all values that are defined (even empty strings, let user clear fields)
          if (value !== undefined && value !== null) {
            configData[key] = value;
          }
        });
      }
      
      // For bKash, keep mode in dedicated column; DO NOT store in config JSON
      const bkashMode = gateway === 'bkash'
        ? (config.config?.bkash_mode || 'tokenized')
        : undefined;

      // Ensure bkash_mode never pollutes the config JSON (it breaks “has credentials” detection)
      if (gateway === 'bkash') {
        delete (configData as any).bkash_mode;
      }

      const updateData: any = {
        is_enabled: config.is_enabled,
        sandbox_mode: config.sandbox_mode,
        config: configData,
        instructions: config.instructions || null,
        transaction_fee_percent: config.transaction_fee_percent || 0,
      };

      // Save bkash_mode to column directly for bKash gateway
      if (gateway === 'bkash') {
        updateData.bkash_mode = bkashMode;
      }
      
      console.log('Saving gateway config:', { gateway, id: config.id, updateData, configKeys: Object.keys(configData) });
      
      const success = await updateGateway(config.id, updateData);
      
      if (success) {
        // If this gateway has credentials, offer to sync to tenants
        const hasCredentials = Object.keys(configData).filter(k => k !== 'bkash_mode' && configData[k]).length > 0;
        if (hasCredentials && gateway !== 'manual') {
          await syncCredentialsToTenants(gateway);
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save gateway settings. Please try again.',
      });
    } finally {
      setSavingGateway(null);
    }
  };

  const syncCredentialsToTenants = async (gateway: string) => {
    try {
      const { data, error } = await supabase.rpc('sync_global_gateway_to_tenants', { _gateway: gateway });
      if (!error && data > 0) {
        toast({ title: 'Synced', description: `Credentials synced to ${data} tenant(s) with empty config` });
      }
    } catch (err) {
      console.error('Failed to sync gateway to tenants:', err);
    }
  };

  const PaymentGatewayCard = ({ gateway }: { gateway: string }) => {
    const config = paymentConfigs[gateway];
    const gatewayDef = GATEWAY_CONFIGS[gateway] || {
      title: config?.display_name || gateway.charAt(0).toUpperCase() + gateway.slice(1),
      description: 'Payment gateway',
      docsUrl: undefined,
      hasModeSelector: false,
      fields: [] as { key: string; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string; required?: boolean }[]
    };
    
    if (!config) return null;

    const isBkash = gateway === 'bkash';
    const missingCreds = getMissingCredentials(gateway, config.config);
    const hasWarning = config.is_enabled && missingCreds.length > 0;

    return (
      <Card className={hasWarning ? 'border-amber-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {gatewayDef.title}
                {config.is_enabled && !hasWarning && <Badge variant="success">Active</Badge>}
                {hasWarning && <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-500">Missing Credentials</Badge>}
                {config.sandbox_mode && <Badge variant="outline">Sandbox</Badge>}
              </CardTitle>
              <CardDescription>{gatewayDef.description}</CardDescription>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={async (v) => {
                // Block enabling without credentials (except manual/rocket)
                if (v && missingCreds.length > 0 && gateway !== 'manual' && gateway !== 'rocket') {
                  toast({
                    variant: 'destructive',
                    title: 'Cannot Enable Gateway',
                    description: `Please configure required credentials first: ${missingCreds.join(', ')}`
                  });
                  return; // Don't enable
                }
                setPaymentConfigs({
                  ...paymentConfigs,
                  [gateway]: { ...config, is_enabled: v }
                });
                await updateGateway(config.id, { is_enabled: v });
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning alert for missing credentials */}
          {hasWarning && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-300 text-amber-800">
              <AlertTitle className="text-amber-900">Credentials Required</AlertTitle>
              <AlertDescription>
                Missing: {missingCreds.join(', ')}. Payments will fail until these are configured.
              </AlertDescription>
            </Alert>
          )}

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
            <GatewayInputFieldSA
              key={field.key}
              gatewayId={gateway}
              fieldKey={field.key}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              value={config.config?.[field.key] || ''}
              onChange={(value) => {
                setPaymentConfigs(prev => ({
                  ...prev,
                  [gateway]: {
                    ...prev[gateway],
                    config: { ...prev[gateway].config, [field.key]: value }
                  }
                }));
              }}
              showPassword={showPasswords[`${gateway}-${field.key}`] || false}
              onTogglePassword={() => togglePasswordVisibility(`${gateway}-${field.key}`)}
            />
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

          {/* Transaction Fee Percent - Using memoized component */}
          <FeeInputField
            value={config.transaction_fee_percent || 0}
            onChange={(value) => {
              setPaymentConfigs(prev => ({
                ...prev,
                [gateway]: { ...prev[gateway], transaction_fee_percent: value }
              }));
            }}
          />

          {/* Instructions - Using memoized component */}
          <InstructionsField
            value={config.instructions || ''}
            onChange={(value) => {
              setPaymentConfigs(prev => ({
                ...prev,
                [gateway]: { ...prev[gateway], instructions: value }
              }));
            }}
          />

          <Button 
            onClick={() => handlePaymentSave(gateway)} 
            disabled={savingGateway === gateway}
          >
            {savingGateway === gateway ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {savingGateway === gateway ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Count gateways with missing credentials
  const gatewaysWithIssues = Object.entries(paymentConfigs).filter(([gateway, config]) => {
    if (gateway === 'manual' || gateway === 'rocket') return false;
    return config.is_enabled && getMissingCredentials(gateway, config.config).length > 0;
  });

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

        {/* Global warning for missing credentials */}
        {gatewaysWithIssues.length > 0 && (
          <Alert variant="destructive" className="bg-red-50 border-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment Gateways Not Configured</AlertTitle>
            <AlertDescription>
              {gatewaysWithIssues.length} gateway(s) are enabled but missing API credentials: {' '}
              <strong>{gatewaysWithIssues.map(([gw]) => GATEWAY_CONFIGS[gw]?.title || gw).join(', ')}</strong>.
              {' '}All payments will fail until credentials are configured below.
            </AlertDescription>
          </Alert>
        )}

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
