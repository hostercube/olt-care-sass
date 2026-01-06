import { useState, useCallback, useMemo, memo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePackages } from '@/hooks/usePackages';
import { 
  Package, Plus, Edit, Trash2, Check, X, Server, MessageSquare, Mail, Code, 
  Globe, Paintbrush, Activity, Users, CreditCard, MapPin, ShoppingCart, 
  Headphones, FileText, Database, Router, Infinity, DollarSign, ClipboardList, Ticket
} from 'lucide-react';
import { 
  AVAILABLE_MODULES, PAYMENT_GATEWAYS, SMS_GATEWAYS,
  type TenantFeatures, type PaymentGatewayPermissions, type SMSGatewayPermissions 
} from '@/types/saas';

const DEFAULT_FEATURES: TenantFeatures = {
  olt_care: false,
  isp_billing: false,
  isp_customers: false,
  isp_resellers: false,
  isp_mikrotik: false,
  isp_areas: false,
  isp_crm: false,
  isp_inventory: false,
  isp_salary_payroll: false,
  isp_btrc_reports: false,
  isp_tickets: false,
  sms_alerts: false,
  email_alerts: false,
  api_access: false,
  custom_domain: false,
  white_label: false,
  advanced_monitoring: false,
  multi_user: false,
  reports_export: false,
  backup_restore: false,
  payment_gateways: {
    sslcommerz: false,
    bkash: false,
    rocket: false,
    nagad: false,
    uddoktapay: false,
    shurjopay: false,
    aamarpay: false,
    portwallet: false,
    manual: true,
  },
  sms_gateways: {
    smsnoc: false,
    mimsms: false,
    revesms: false,
    greenweb: false,
    bulksmsbd: false,
    smsq: false,
    custom: false,
  },
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  olt_care: Server,
  isp_billing: CreditCard,
  isp_customers: Users,
  isp_resellers: Users,
  isp_mikrotik: Router,
  isp_areas: MapPin,
  isp_crm: Headphones,
  isp_inventory: ShoppingCart,
  isp_salary_payroll: DollarSign,
  isp_btrc_reports: ClipboardList,
  isp_tickets: Ticket,
  sms_alerts: MessageSquare,
  email_alerts: Mail,
  api_access: Code,
  custom_domain: Globe,
  white_label: Paintbrush,
  advanced_monitoring: Activity,
  multi_user: Users,
  reports_export: FileText,
  backup_restore: Database,
};

interface FormData {
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_olts: number | null;
  max_onus: number | null;
  max_users: number | null;
  max_mikrotiks: number | null;
  max_customers: number | null;
  max_areas: number | null;
  max_resellers: number | null;
  features: TenantFeatures;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

// Memoized LimitInput component
const LimitInput = memo(function LimitInput({ 
  label, 
  value, 
  onChange, 
  allowUnlimited = true,
  defaultLimitedValue = 1
}: { 
  label: string; 
  value: number | null; 
  onChange: (v: number | null) => void;
  allowUnlimited?: boolean;
  defaultLimitedValue?: number;
}) {
  const isUnlimited = value === null || value === -1;
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={isUnlimited ? '' : (value ?? '')}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || val === null) {
              onChange(null);
            } else {
              onChange(parseInt(val, 10));
            }
          }}
          placeholder={allowUnlimited ? 'Unlimited' : '0'}
          disabled={allowUnlimited && isUnlimited}
          className="flex-1"
        />
        {allowUnlimited && (
          <Button
            type="button"
            variant={isUnlimited ? 'outline' : 'default'}
            size="sm"
            onClick={() => onChange(isUnlimited ? defaultLimitedValue : null)}
            className="whitespace-nowrap"
          >
            <Infinity className="h-4 w-4 mr-1" />
            {isUnlimited ? 'Limited' : 'Unlimited'}
          </Button>
        )}
      </div>
    </div>
  );
});

// Memoized Module Toggle Item
const ModuleToggleItem = memo(function ModuleToggleItem({
  module,
  isEnabled,
  onToggle,
  icon: Icon
}: {
  module: { id: string; name: string; description: string };
  isEnabled: boolean;
  onToggle: (id: string, value: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium">{module.name}</span>
          <p className="text-xs text-muted-foreground">{module.description}</p>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={(v) => onToggle(module.id, v)}
      />
    </div>
  );
});

export default function PackageManagement() {
  const { packages, loading, createPackage, updatePackage, deletePackage } = usePackages();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  const initialFormData: FormData = useMemo(() => ({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_olts: 1,
    max_onus: 100,
    max_users: 1,
    max_mikrotiks: 1,
    max_customers: null,
    max_areas: null,
    max_resellers: null,
    features: { ...DEFAULT_FEATURES },
    is_active: true,
    is_public: true,
    sort_order: 0,
  }), []);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleCreate = async () => {
    await createPackage(formData);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (editingPackage) {
      await updatePackage(editingPackage.id, formData);
      setEditingPackage(null);
      resetForm();
    }
  };

  const openEdit = (pkg: any) => {
    // Properly preserve null values for unlimited resources
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price_monthly: Number(pkg.price_monthly) || 0,
      price_yearly: Number(pkg.price_yearly) || 0,
      max_olts: pkg.max_olts === null ? null : (pkg.max_olts ?? 1),
      max_onus: pkg.max_onus === null ? null : (pkg.max_onus ?? 100),
      max_users: pkg.max_users === null ? null : (pkg.max_users ?? 1),
      max_mikrotiks: pkg.max_mikrotiks === null ? null : (pkg.max_mikrotiks ?? 1),
      max_customers: pkg.max_customers ?? null,
      max_areas: pkg.max_areas ?? null,
      max_resellers: pkg.max_resellers ?? null,
      features: { ...DEFAULT_FEATURES, ...(pkg.features || {}) },
      is_active: pkg.is_active ?? true,
      is_public: pkg.is_public ?? true,
      sort_order: pkg.sort_order || 0,
    });
    setEditingPackage(pkg);
  };

  const getModuleIcon = (moduleId: string) => {
    return MODULE_ICONS[moduleId] || Check;
  };

  const handleFeatureChange = useCallback((key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value }
    }));
  }, []);

  const handlePaymentGatewayChange = useCallback((gatewayId: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        payment_gateways: {
          ...(prev.features.payment_gateways as PaymentGatewayPermissions),
          [gatewayId]: enabled,
        },
      },
    }));
  }, []);

  const handleSMSGatewayChange = useCallback((gatewayId: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        sms_gateways: {
          ...(prev.features.sms_gateways as SMSGatewayPermissions),
          [gatewayId]: enabled,
        },
      },
    }));
  }, []);

  const handleLimitChange = useCallback((field: keyof FormData, value: number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const formatLimit = (value: number | null) => {
    return value === null ? 'Unlimited' : value;
  };

  const packageFormContent = (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-6 pr-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Basic Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Basic Plan"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Package description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Price (৳)</Label>
              <Input
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (৳)</Label>
              <Input
                type="number"
                value={formData.price_yearly}
                onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_public: v }))}
              />
              <Label htmlFor="is_public">Public (Show on website)</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Resource Limits */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Resource Limits</h4>
          <p className="text-sm text-muted-foreground">Set maximum limits for resources. Use "Unlimited" for no restrictions.</p>
          <div className="grid grid-cols-2 gap-4">
            <LimitInput
              label="Max OLTs"
              value={formData.max_olts}
              onChange={(v) => handleLimitChange('max_olts', v)}
            />
            <LimitInput
              label="Max ONUs"
              value={formData.max_onus}
              onChange={(v) => handleLimitChange('max_onus', v)}
            />
            <LimitInput
              label="Max MikroTiks"
              value={formData.max_mikrotiks}
              onChange={(v) => handleLimitChange('max_mikrotiks', v)}
            />
            <LimitInput
              label="Max Users"
              value={formData.max_users}
              onChange={(v) => handleLimitChange('max_users', v)}
            />
            <LimitInput
              label="Max Customers"
              value={formData.max_customers}
              onChange={(v) => handleLimitChange('max_customers', v)}
            />
            <LimitInput
              label="Max Areas"
              value={formData.max_areas}
              onChange={(v) => handleLimitChange('max_areas', v)}
            />
            <LimitInput
              label="Max Resellers"
              value={formData.max_resellers}
              onChange={(v) => handleLimitChange('max_resellers', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Modules */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Modules & Features</h4>
          <p className="text-sm text-muted-foreground">Select which modules are included in this package</p>
          
          {['core', 'isp', 'alerts', 'advanced'].map((category) => {
            const categoryModules = AVAILABLE_MODULES.filter(m => m.category === category);
            const categoryLabel = {
              core: 'Core Modules',
              isp: 'ISP Management',
              alerts: 'Alerts & Notifications',
              advanced: 'Advanced Features'
            }[category];
            
            return (
              <div key={category} className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">{categoryLabel}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {categoryModules.map((module) => (
                    <ModuleToggleItem
                      key={module.id}
                      module={module}
                      isEnabled={(formData.features[module.id] as boolean) ?? false}
                      onToggle={handleFeatureChange}
                      icon={getModuleIcon(module.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Payment Gateways */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Payment Gateway Access</h4>
          <p className="text-sm text-muted-foreground">Select which payment gateways tenants can use</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_GATEWAYS.map((gateway) => {
              const isEnabled = (formData.features.payment_gateways as PaymentGatewayPermissions)?.[gateway.id as keyof PaymentGatewayPermissions];
              return (
                <div 
                  key={gateway.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{gateway.name}</span>
                      <p className="text-xs text-muted-foreground">{gateway.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled ?? false}
                    onCheckedChange={(v) => handlePaymentGatewayChange(gateway.id, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* SMS Gateways */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">SMS Gateway Access</h4>
          <p className="text-sm text-muted-foreground">Select which SMS gateways tenants can use</p>
          <div className="grid grid-cols-2 gap-2">
            {SMS_GATEWAYS.map((gateway) => {
              const isEnabled = (formData.features.sms_gateways as SMSGatewayPermissions)?.[gateway.id as keyof SMSGatewayPermissions];
              return (
                <div 
                  key={gateway.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{gateway.name}</span>
                      <p className="text-xs text-muted-foreground">{gateway.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled ?? false}
                    onCheckedChange={(v) => handleSMSGatewayChange(gateway.id, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <DashboardLayout title="Package Management" subtitle="Manage subscription packages">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Package Management</h1>
            <p className="text-muted-foreground">Create and manage subscription packages with resource limits and module access</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Package</DialogTitle>
                <DialogDescription>Define a new subscription package with limits and features</DialogDescription>
              </DialogHeader>
              {packageFormContent}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Package</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`relative ${!pkg.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      {pkg.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{pkg.description || 'No description'}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editingPackage?.id === pkg.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingPackage(null);
                        resetForm();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Edit Package</DialogTitle>
                          <DialogDescription>Modify package settings and features</DialogDescription>
                        </DialogHeader>
                        {packageFormContent}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingPackage(null)}>Cancel</Button>
                          <Button onClick={handleUpdate}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePackage(pkg.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">৳{pkg.price_monthly.toLocaleString()}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">৳{pkg.price_yearly.toLocaleString()}/year</p>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Server className="h-3 w-3 text-muted-foreground" />
                    <span>OLTs: {formatLimit(pkg.max_olts)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>Users: {formatLimit(pkg.max_users)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>Customers: {formatLimit(pkg.max_customers)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Router className="h-3 w-3 text-muted-foreground" />
                    <span>MikroTiks: {formatLimit(pkg.max_mikrotiks)}</span>
                  </div>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-1">
                  {pkg.is_active ? (
                    <Badge variant="success" className="text-xs"><Check className="h-3 w-3 mr-1" />Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs"><X className="h-3 w-3 mr-1" />Inactive</Badge>
                  )}
                  {(pkg as any).is_public ? (
                    <Badge variant="default" className="text-xs"><Globe className="h-3 w-3 mr-1" />Public</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Admin Only</Badge>
                  )}
                  {(pkg.features as TenantFeatures)?.olt_care && (
                    <Badge variant="outline" className="text-xs">OLT Care</Badge>
                  )}
                  {(pkg.features as TenantFeatures)?.isp_billing && (
                    <Badge variant="outline" className="text-xs">Billing</Badge>
                  )}
                  {(pkg.features as TenantFeatures)?.sms_alerts && (
                    <Badge variant="outline" className="text-xs">SMS</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {packages.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No packages yet</h3>
            <p className="text-muted-foreground mb-4">Create your first subscription package to get started</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
