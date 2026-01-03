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
import { usePackages } from '@/hooks/usePackages';
import { Package, Plus, Edit, Trash2, Check, X, Server, MessageSquare, Mail, Code, Globe, Paintbrush, Activity, Users, CreditCard } from 'lucide-react';
import { AVAILABLE_MODULES, type TenantFeatures } from '@/types/saas';

const DEFAULT_FEATURES: TenantFeatures = {
  olt_care: true,  // Always enabled
  isp_billing: false,
  isp_customers: false,
  isp_resellers: false,
  isp_mikrotik: false,
  sms_alerts: false,
  email_alerts: false,
  api_access: false,
  custom_domain: false,
  white_label: false,
  advanced_monitoring: false,
  multi_user: false,
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
    max_olts: 1,
    max_onus: 100,
    max_users: 1,
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
      case 'isp_mikrotik': return Server;
      case 'sms_alerts': return MessageSquare;
      case 'email_alerts': return Mail;
      case 'api_access': return Code;
      case 'custom_domain': return Globe;
      case 'white_label': return Paintbrush;
      case 'advanced_monitoring': return Activity;
      case 'multi_user': return Users;
      default: return Check;
    }
  };

  const FeatureToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  const PackageForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
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
          <Label>Max OLTs</Label>
          <Input
            type="number"
            value={formData.max_olts}
            onChange={(e) => setFormData({ ...formData, max_olts: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max ONUs</Label>
          <Input
            type="number"
            value={formData.max_onus}
            onChange={(e) => setFormData({ ...formData, max_onus: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Users</Label>
          <Input
            type="number"
            value={formData.max_users}
            onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
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

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-medium">Modules & Features</h4>
        <p className="text-sm text-muted-foreground mb-4">Select which modules and features are included in this package</p>
        
        <div className="grid grid-cols-2 gap-3">
          {AVAILABLE_MODULES.map((module) => {
            const Icon = getModuleIcon(module.id);
            const isDisabled = module.id === 'olt_care'; // OLT Care is always enabled
            return (
              <div 
                key={module.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  formData.features[module.id] ? 'border-primary/50 bg-primary/5' : 'border-border'
                } ${isDisabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="cursor-pointer">{module.name}</Label>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
                <Switch
                  checked={formData.features[module.id] ?? false}
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

      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingPackage(null); resetForm(); }}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!formData.name}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <DashboardLayout title="Package Management" subtitle="Manage subscription packages">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Package Management</h1>
            <p className="text-muted-foreground">Create and manage subscription packages</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Package</DialogTitle>
                <DialogDescription>Define a new subscription package</DialogDescription>
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

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Max OLTs</span>
                      <span className="font-medium">{pkg.max_olts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max ONUs</span>
                      <span className="font-medium">{pkg.max_onus || 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Users</span>
                      <span className="font-medium">{pkg.max_users}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-1">
                    {AVAILABLE_MODULES.map((module) => {
                      const Icon = getModuleIcon(module.id);
                      const isEnabled = pkg.features?.[module.id];
                      return (
                        <div key={module.id} className="flex items-center gap-2 text-sm">
                          {isEnabled ? (
                            <Icon className="h-4 w-4 text-success" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={!isEnabled ? 'text-muted-foreground line-through' : ''}>
                            {module.name}
                          </span>
                        </div>
                      );
                    })}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>Update package details</DialogDescription>
            </DialogHeader>
            <PackageForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
