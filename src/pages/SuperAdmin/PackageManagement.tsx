import { useState } from 'react';
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
  Headphones, FileText, Database, Router, Infinity
} from 'lucide-react';
import { 
  AVAILABLE_MODULES, PAYMENT_GATEWAYS, SMS_GATEWAYS,
  type TenantFeatures, type PaymentGatewayPermissions, type SMSGatewayPermissions 
} from '@/types/saas';

const DEFAULT_FEATURES: TenantFeatures = {
  olt_care: true,
  isp_billing: false,
  isp_customers: false,
  isp_resellers: false,
  isp_mikrotik: false,
  isp_areas: false,
  isp_crm: false,
  isp_inventory: false,
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
    manual: true,
  },
  sms_gateways: {
    smsnoc: false,
    custom: false,
  },
};

export default function PackageManagement() {
  const { packages, loading, createPackage, updatePackage, deletePackage } = usePackages();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    // Resource limits
    max_olts: 1,
    max_onus: 100,
    max_users: 1,
    max_mikrotiks: 1,
    max_customers: null as number | null,
    max_areas: null as number | null,
    max_resellers: null as number | null,
    // Features
    features: { ...DEFAULT_FEATURES },
    is_active: true,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
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
      sort_order: 0,
    });
  };

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
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price_monthly: pkg.price_monthly,
      price_yearly: pkg.price_yearly,
      max_olts: pkg.max_olts,
      max_onus: pkg.max_onus || 100,
      max_users: pkg.max_users,
      max_mikrotiks: pkg.max_mikrotiks || 1,
      max_customers: pkg.max_customers,
      max_areas: pkg.max_areas,
      max_resellers: pkg.max_resellers,
      features: { ...DEFAULT_FEATURES, ...(pkg.features || {}) },
      is_active: pkg.is_active,
      sort_order: pkg.sort_order || 0,
    });
    setEditingPackage(pkg);
  };

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'olt_care': return Server;
      case 'isp_billing': return CreditCard;
      case 'isp_customers': return Users;
      case 'isp_resellers': return Users;
      case 'isp_mikrotik': return Router;
      case 'isp_areas': return MapPin;
      case 'isp_crm': return Headphones;
      case 'isp_inventory': return ShoppingCart;
      case 'sms_alerts': return MessageSquare;
      case 'email_alerts': return Mail;
      case 'api_access': return Code;
      case 'custom_domain': return Globe;
      case 'white_label': return Paintbrush;
      case 'advanced_monitoring': return Activity;
      case 'multi_user': return Users;
      case 'reports_export': return FileText;
      case 'backup_restore': return Database;
      default: return Check;
    }
  };

  const updatePaymentGateway = (gatewayId: string, enabled: boolean) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        payment_gateways: {
          ...(formData.features.payment_gateways as PaymentGatewayPermissions),
          [gatewayId]: enabled,
        },
      },
    });
  };

  const updateSMSGateway = (gatewayId: string, enabled: boolean) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        sms_gateways: {
          ...(formData.features.sms_gateways as SMSGatewayPermissions),
          [gatewayId]: enabled,
        },
      },
    });
  };

  const LimitInput = ({ 
    label, 
    value, 
    onChange, 
    allowUnlimited = true 
  }: { 
    label: string; 
    value: number | null; 
    onChange: (v: number | null) => void;
    allowUnlimited?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
          placeholder={allowUnlimited ? 'Unlimited' : '0'}
          disabled={allowUnlimited && value === null}
          className="flex-1"
        />
        {allowUnlimited && (
          <Button
            type="button"
            variant={value === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(value === null ? 100 : null)}
            className="whitespace-nowrap"
          >
            <Infinity className="h-4 w-4 mr-1" />
            {value === null ? 'Limited' : 'Unlimited'}
          </Button>
        )}
      </div>
    </div>
  );

  const PackageForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Basic Plan"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Package description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Price (৳)</Label>
              <Input
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (৳)</Label>
              <Input
                type="number"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
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
              onChange={(v) => setFormData({ ...formData, max_olts: v || 1 })}
              allowUnlimited={false}
            />
            <LimitInput
              label="Max ONUs"
              value={formData.max_onus}
              onChange={(v) => setFormData({ ...formData, max_onus: v })}
            />
            <LimitInput
              label="Max MikroTiks"
              value={formData.max_mikrotiks}
              onChange={(v) => setFormData({ ...formData, max_mikrotiks: v })}
            />
            <LimitInput
              label="Max Users"
              value={formData.max_users}
              onChange={(v) => setFormData({ ...formData, max_users: v || 1 })}
              allowUnlimited={false}
            />
            <LimitInput
              label="Max Customers"
              value={formData.max_customers}
              onChange={(v) => setFormData({ ...formData, max_customers: v })}
            />
            <LimitInput
              label="Max Areas"
              value={formData.max_areas}
              onChange={(v) => setFormData({ ...formData, max_areas: v })}
            />
            <LimitInput
              label="Max Resellers"
              value={formData.max_resellers}
              onChange={(v) => setFormData({ ...formData, max_resellers: v })}
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
                  {categoryModules.map((module) => {
                    const Icon = getModuleIcon(module.id);
                    const isDisabled = module.id === 'olt_care';
                    const isEnabled = formData.features[module.id] as boolean;
                    return (
                      <div 
                        key={module.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border'
                        } ${isDisabled ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{module.name}</span>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled ?? false}
                          disabled={isDisabled}
                          onCheckedChange={(v) => setFormData({ 
                            ...formData, 
                            features: { ...formData.features, [module.id]: v } 
                          })}
                        />
                      </div>
                    );
                  })}
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
                    onCheckedChange={(v) => updatePaymentGateway(gateway.id, v)}
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
                    onCheckedChange={(v) => updateSMSGateway(gateway.id, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingPackage(null); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!formData.name}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </div>
    </ScrollArea>
  );

  const formatLimit = (value: number | null) => {
    return value === null ? 'Unlimited' : value;
  };

  return (
    <DashboardLayout title="Package Management" subtitle="Manage subscription packages">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Package Management</h1>
            <p className="text-muted-foreground">Create and manage subscription packages with resource limits and module access</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
              <PackageForm onSubmit={handleCreate} submitLabel="Create Package" />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p>Loading packages...</p>
          ) : packages.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No packages created yet</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Package
                </Button>
              </CardContent>
            </Card>
          ) : (
            packages.map((pkg) => (
              <Card key={pkg.id} className={!pkg.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {pkg.name}
                    </CardTitle>
                    <Badge variant={pkg.is_active ? 'success' : 'default'}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">৳{pkg.price_monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    or ৳{pkg.price_yearly}/year
                  </div>

                  {/* Resource Limits */}
                  <div className="space-y-2 text-sm border-t pt-3">
                    <h5 className="font-medium text-muted-foreground">Resource Limits</h5>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="flex justify-between">
                        <span>OLTs</span>
                        <span className="font-medium">{pkg.max_olts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ONUs</span>
                        <span className="font-medium">{formatLimit(pkg.max_onus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MikroTiks</span>
                        <span className="font-medium">{formatLimit(pkg.max_mikrotiks)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Users</span>
                        <span className="font-medium">{pkg.max_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customers</span>
                        <span className="font-medium">{formatLimit(pkg.max_customers)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Areas</span>
                        <span className="font-medium">{formatLimit(pkg.max_areas)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Resellers</span>
                        <span className="font-medium">{formatLimit(pkg.max_resellers)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="border-t pt-3 space-y-1">
                    <h5 className="font-medium text-muted-foreground text-sm mb-2">Modules</h5>
                    <div className="grid grid-cols-2 gap-1">
                      {AVAILABLE_MODULES.slice(0, 6).map((module) => {
                        const Icon = getModuleIcon(module.id);
                        const isEnabled = pkg.features?.[module.id];
                        return (
                          <div key={module.id} className="flex items-center gap-1 text-xs">
                            {isEnabled ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={!isEnabled ? 'text-muted-foreground' : ''}>
                              {module.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {AVAILABLE_MODULES.length > 6 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        +{AVAILABLE_MODULES.length - 6} more modules...
                      </p>
                    )}
                  </div>

                  {/* Payment Gateways */}
                  <div className="border-t pt-3">
                    <h5 className="font-medium text-muted-foreground text-sm mb-2">Payment Gateways</h5>
                    <div className="flex flex-wrap gap-1">
                      {PAYMENT_GATEWAYS.map((gw) => {
                        const isEnabled = (pkg.features?.payment_gateways as PaymentGatewayPermissions)?.[gw.id as keyof PaymentGatewayPermissions];
                        return (
                          <Badge key={gw.id} variant={isEnabled ? 'success' : 'outline'} className="text-xs">
                            {gw.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(pkg)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deletePackage(pkg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPackage} onOpenChange={(open) => !open && setEditingPackage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>Update package details, limits, and features</DialogDescription>
            </DialogHeader>
            <PackageForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
