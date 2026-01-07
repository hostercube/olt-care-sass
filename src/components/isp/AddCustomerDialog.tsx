import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useCustomers } from '@/hooks/useCustomers';
import { useISPPackages } from '@/hooks/useISPPackages';
import { useAreas } from '@/hooks/useAreas';
import { useResellers } from '@/hooks/useResellers';
import { useMikroTikRouters } from '@/hooks/useMikroTikRouters';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { useCustomerTypes } from '@/hooks/useCustomerTypes';
import {
  Loader2, User, Network, Package, MapPin, ChevronLeft, ChevronRight,
  Check, Router, Key, Calendar, Building2, Plus
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchJsonSafe, resolvePollingServerUrl, summarizeHttpError } from '@/lib/polling-server';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'package', label: 'Package', icon: Package },
];

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const { createCustomer } = useCustomers();
  const { packages } = useISPPackages();
  const { areas } = useAreas();
  const { resellers } = useResellers();
  const { routers } = useMikroTikRouters();
  const { pollingServerUrl } = usePollingServerUrl();
  const { tenantId } = useTenantContext();
  const { customerTypes, createCustomerType } = useCustomerTypes();
  const apiBase = resolvePollingServerUrl(pollingServerUrl);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [creatingPPPoE, setCreatingPPPoE] = useState(false);
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Get primary router as default
  const primaryRouter = useMemo(() => {
    return routers.find(r => r.is_primary) || null;
  }, [routers]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    reseller_id: '',
    mikrotik_id: '',
    pppoe_username: '',
    pppoe_password: '',
    package_id: '',
    connection_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    monthly_bill: '',
    notes: '',
    is_auto_disable: true,
    create_mikrotik_user: true,
    customer_type_id: '',
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set primary router as default when routers load
  useEffect(() => {
    if (primaryRouter && !formData.mikrotik_id) {
      setFormData(prev => ({ ...prev, mikrotik_id: primaryRouter.id }));
    }
  }, [primaryRouter]);

  // Auto-calculate expiry when package changes
  useEffect(() => {
    if (formData.package_id && formData.connection_date) {
      const pkg = packages.find(p => p.id === formData.package_id);
      if (pkg) {
        const connectionDate = new Date(formData.connection_date);
        const expiryDate = addDays(connectionDate, pkg.validity_days);
        setFormData(prev => ({
          ...prev,
          expiry_date: format(expiryDate, 'yyyy-MM-dd'),
          monthly_bill: pkg.price.toString(),
        }));
      }
    }
  }, [formData.package_id, formData.connection_date, packages]);

  // Auto-generate PPPoE username when name changes
  useEffect(() => {
    if (formData.name && !formData.pppoe_username) {
      const username = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 20);
      setFormData(prev => ({ ...prev, pppoe_username: username }));
    }
  }, [formData.name]);

  const validateStep = async (step: number): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (formData.phone && !/^01\d{9}$/.test(formData.phone)) {
          newErrors.phone = 'Enter valid 11-digit phone number starting with 01';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Enter valid email address';
        }
        break;
      case 1: // Location (now step 2)
        // No required fields in location step
        break;
      case 2: // Network (now step 3)
        if (!formData.pppoe_username.trim()) newErrors.pppoe_username = 'PPPoE username is required';
        if (!formData.pppoe_password.trim()) newErrors.pppoe_password = 'PPPoE password is required';
        if (formData.pppoe_password.length < 4) newErrors.pppoe_password = 'Password must be at least 4 characters';
        break;
      case 3: // Package (now step 4)
        if (!formData.package_id) newErrors.package_id = 'Please select a package';
        break;
    }

    // PPPoE username uniqueness (same tenant)
    if (step === 2 && !newErrors.pppoe_username) {
      const username = formData.pppoe_username.trim();
      if (username) {
        try {
          let q = supabase
            .from('customers')
            .select('id')
            .ilike('pppoe_username', username)
            .limit(1);

          if (tenantId) q = q.eq('tenant_id', tenantId);

          const { data, error } = await q;

          if (!error && data && data.length > 0) {
            newErrors.pppoe_username = 'This PPPoE username already exists';
          }
        } catch {
          // If check fails, do not block step navigation
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const createPPPoEOnMikroTik = async (): Promise<boolean> => {
    if (!formData.create_mikrotik_user || !formData.mikrotik_id || formData.mikrotik_id === 'none') {
      return true;
    }

    if (!apiBase) {
      toast.error('Polling server URL not configured. Configure it in Super Admin → Settings → Infrastructure.');
      return false;
    }

    const router = routers.find((r) => r.id === formData.mikrotik_id);
    if (!router) {
      toast.error('Selected MikroTik router not found');
      return false;
    }

    try {
      setCreatingPPPoE(true);

      // Get package profile name
      const pkg = packages.find((p) => p.id === formData.package_id);
      const profileName = pkg?.name || 'default';

      console.log('Creating PPPoE user on MikroTik:', {
        router: router.ip_address,
        pppoeUsername: formData.pppoe_username,
        profile: profileName,
        apiBase,
      });

      const { ok, status, data, text } = await fetchJsonSafe<any>(
        `${apiBase}/api/mikrotik/pppoe/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mikrotik: {
              ip: router.ip_address,
              port: router.port || 8728,
              username: router.username,
              password: router.password_encrypted,
            },
            pppoeUser: {
              name: formData.pppoe_username,
              password: formData.pppoe_password,
              profile: profileName,
              comment: `Customer: ${formData.name}`,
            },
          }),
        }
      );

      console.log('PPPoE creation response:', { ok, status, data, textLength: text?.length });

      const result = data || {};

      if (ok && result?.success) {
        toast.success('PPPoE user created on MikroTik');
        return true;
      }

      const fallback = !ok ? `Request failed (HTTP ${status})` : 'PPPoE user was not created on MikroTik';
      const msg = String(result?.error || '').trim() || (data ? fallback : summarizeHttpError(status, text));
      toast.error(msg);
      return false;
    } catch (err) {
      console.warn('MikroTik PPPoE creation failed:', err);
      toast.error('Could not create PPPoE user on MikroTik');
      return false;
    } finally {
      setCreatingPPPoE(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    for (let i = 0; i < STEPS.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await validateStep(i);
      if (!ok) {
        setCurrentStep(i);
        return;
      }
    }

    setLoading(true);

    try {
      // First, create PPPoE user on MikroTik (if enabled)
      const pppoeOk = await createPPPoEOnMikroTik();
      if (!pppoeOk) return;

      // Then create customer in database
      await createCustomer({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id && formData.area_id !== 'none' ? formData.area_id : null,
        reseller_id: formData.reseller_id && formData.reseller_id !== 'none' ? formData.reseller_id : null,
        mikrotik_id: formData.mikrotik_id && formData.mikrotik_id !== 'none' ? formData.mikrotik_id : null,
        pppoe_username: formData.pppoe_username || null,
        pppoe_password: formData.pppoe_password || null,
        package_id: formData.package_id || null,
        connection_date: formData.connection_date || null,
        expiry_date: formData.expiry_date || null,
        monthly_bill: parseFloat(formData.monthly_bill) || 0,
        due_amount: parseFloat(formData.monthly_bill) || 0,
        notes: formData.notes || null,
        is_auto_disable: formData.is_auto_disable,
        status: 'active',
        customer_type_id: formData.customer_type_id && formData.customer_type_id !== 'none' ? formData.customer_type_id : null,
      } as any);
      
      onSuccess?.();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      area_id: '',
      reseller_id: '',
      mikrotik_id: primaryRouter?.id || '',
      pppoe_username: '',
      pppoe_password: '',
      package_id: '',
      connection_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: '',
      monthly_bill: '',
      notes: '',
      is_auto_disable: true,
      create_mikrotik_user: true,
      customer_type_id: '',
    });
    setCurrentStep(0);
    setErrors({});
  };

  const handleAddCustomerType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await createCustomerType({ name: newTypeName.trim() });
      setNewTypeName('');
      setShowAddTypeDialog(false);
    } catch (err) {
      // Error already handled in hook
    }
  };

  // Get area display label with full location hierarchy
  const getAreaDisplayLabel = (area: any) => {
    const parts = [];
    if (area.name) parts.push(area.name);
    if (area.village) parts.push(area.village);
    if (area.union_name) parts.push(area.union_name);
    if (area.upazila) parts.push(area.upazila);
    if (area.district) parts.push(`(${area.district})`);
    return parts.join(', ') || area.name;
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const selectedPackage = packages.find(p => p.id === formData.package_id);
  const selectedRouter = routers.find(r => r.id === formData.mikrotik_id);
  const selectedArea = areas.find(a => a.id === formData.area_id);

  // Group resellers by level for better display
  const resellersByLevel = useMemo(() => {
    const active = resellers.filter(r => r.is_active);
    return {
      level1: active.filter(r => r.level === 1),
      level2: active.filter(r => r.level === 2),
      level3: active.filter(r => r.level === 3),
    };
  }, [resellers]);

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (index < currentStep || (await validateStep(currentStep))) {
                        setCurrentStep(index);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full",
                      isActive && "bg-primary/10",
                      isCompleted && "text-primary",
                      !isActive && !isCompleted && "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted"
                    )}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-2 rounded",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d+]/g, '');
                      if (value.startsWith('+880')) value = '0' + value.substring(4);
                      else if (value.startsWith('880')) value = '0' + value.substring(3);
                      setFormData(prev => ({ ...prev, phone: value }));
                    }}
                    placeholder="01XXXXXXXXX"
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone ? (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Enter 11 digit number starting with 01</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* User Type Field */}
              <div className="space-y-2">
                <Label>User Type</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.customer_type_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, customer_type_id: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customerTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddTypeDialog(true)}
                    title="Add new user type"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customer category (Home, Office, Shop, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 2: Location (moved from step 4) */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Area Selection with full location display */}
              <div className="space-y-2">
                <Label>Area / Location</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, area_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{getAreaDisplayLabel(area)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the area where this customer is located
                </p>
              </div>

              {/* Show selected area details */}
              {selectedArea && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Selected Location
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Area:</span> <span className="font-medium">{selectedArea.name}</span></div>
                      {selectedArea.village && <div><span className="text-muted-foreground">Village:</span> <span className="font-medium">{selectedArea.village}</span></div>}
                      {selectedArea.union_name && <div><span className="text-muted-foreground">Union:</span> <span className="font-medium">{selectedArea.union_name}</span></div>}
                      {selectedArea.upazila && <div><span className="text-muted-foreground">Upazila:</span> <span className="font-medium">{selectedArea.upazila}</span></div>}
                      {selectedArea.district && <div><span className="text-muted-foreground">District:</span> <span className="font-medium">{selectedArea.district}</span></div>}
                      {selectedArea.road_no && <div><span className="text-muted-foreground">Road:</span> <span className="font-medium">{selectedArea.road_no}</span></div>}
                      {selectedArea.house_no && <div><span className="text-muted-foreground">House:</span> <span className="font-medium">{selectedArea.house_no}</span></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reseller Selection */}
              <div className="space-y-2">
                <Label>Reseller (Optional)</Label>
                <Select
                  value={formData.reseller_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, reseller_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reseller (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Direct Customer)</SelectItem>
                    {resellersByLevel.level1.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">Resellers</div>
                        {resellersByLevel.level1.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">L1</Badge>
                              {reseller.name} {reseller.phone && `(${reseller.phone})`}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {resellersByLevel.level2.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">Sub-Resellers</div>
                        {resellersByLevel.level2.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">L2</Badge>
                              └ {reseller.name} {reseller.phone && `(${reseller.phone})`}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {resellersByLevel.level3.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">Sub-Sub-Resellers</div>
                        {resellersByLevel.level3.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">L3</Badge>
                              └└ {reseller.name} {reseller.phone && `(${reseller.phone})`}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Network (was step 2) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* MikroTik Selection */}
              <div className="space-y-2">
                <Label>MikroTik Router</Label>
                <Select
                  value={formData.mikrotik_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, mikrotik_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select MikroTik router" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {routers.map((router) => (
                      <SelectItem key={router.id} value={router.id}>
                        <div className="flex items-center gap-2">
                          <Router className="h-4 w-4" />
                          {router.name} ({router.ip_address})
                          {router.is_primary && <Badge variant="default" className="ml-1 text-xs bg-green-600">Primary</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {primaryRouter ? `Primary router "${primaryRouter.name}" is selected by default` : 'Select which MikroTik router this customer belongs to'}
                </p>
              </div>

              {/* PPPoE Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pppoe_username">
                    <Key className="h-3 w-3 inline mr-1" />
                    PPPoE Username *
                  </Label>
                  <Input
                    id="pppoe_username"
                    value={formData.pppoe_username}
                    onChange={(e) => setFormData(prev => ({ ...prev, pppoe_username: e.target.value }))}
                    placeholder="customer_username"
                    className={errors.pppoe_username ? 'border-destructive' : ''}
                  />
                  {errors.pppoe_username && <p className="text-xs text-destructive">{errors.pppoe_username}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pppoe_password">
                    <Key className="h-3 w-3 inline mr-1" />
                    PPPoE Password *
                  </Label>
                  <Input
                    id="pppoe_password"
                    type="password"
                    value={formData.pppoe_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, pppoe_password: e.target.value }))}
                    placeholder="Password"
                    className={errors.pppoe_password ? 'border-destructive' : ''}
                  />
                  {errors.pppoe_password && <p className="text-xs text-destructive">{errors.pppoe_password}</p>}
                </div>
              </div>

              {/* Auto-create on MikroTik */}
              {formData.mikrotik_id && formData.mikrotik_id !== 'none' && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Router className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Auto-create on MikroTik</p>
                          <p className="text-sm text-muted-foreground">
                            Automatically create PPPoE user on {selectedRouter?.name}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.create_mikrotik_user}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, create_mikrotik_user: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto-disable expired */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Auto-Disable on Expiry</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically disable PPPoE when subscription expires
                  </p>
                </div>
                <Switch
                  checked={formData.is_auto_disable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_auto_disable: checked }))}
                />
              </div>
            </div>
          )}

          {/* Step 4: Package (was step 3) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Package *</Label>
                <Select
                  value={formData.package_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, package_id: value }))}
                >
                  <SelectTrigger className={errors.package_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {pkg.name} - ৳{pkg.price}/month ({pkg.download_speed}/{pkg.upload_speed} {pkg.speed_unit})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.package_id && <p className="text-xs text-destructive">{errors.package_id}</p>}
              </div>

              {/* Selected Package Preview */}
              {selectedPackage && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-medium">{selectedPackage.name}</span>
                      <Badge variant="outline">
                        {selectedPackage.download_speed}/{selectedPackage.upload_speed} {selectedPackage.speed_unit}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly Price:</span>
                        <span className="ml-2 font-medium">৳{selectedPackage.price}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Validity:</span>
                        <span className="ml-2 font-medium">{selectedPackage.validity_days} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="connection_date">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Connection Date
                  </Label>
                  <Input
                    id="connection_date"
                    type="date"
                    value={formData.connection_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, connection_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Expiry Date
                  </Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_bill">Monthly Bill (৳)</Label>
                <Input
                  id="monthly_bill"
                  type="number"
                  value={formData.monthly_bill}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_bill: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Summary Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Customer Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.name}</span></div>
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{formData.phone || 'N/A'}</span></div>
                    <div><span className="text-muted-foreground">PPPoE:</span> <span className="font-medium">{formData.pppoe_username}</span></div>
                    <div><span className="text-muted-foreground">Package:</span> <span className="font-medium">{selectedPackage?.name || 'N/A'}</span></div>
                    <div><span className="text-muted-foreground">Router:</span> <span className="font-medium">{selectedRouter?.name || 'None'}</span></div>
                    <div><span className="text-muted-foreground">Monthly:</span> <span className="font-medium">৳{formData.monthly_bill || '0'}</span></div>
                    {selectedArea && <div className="col-span-2"><span className="text-muted-foreground">Area:</span> <span className="font-medium">{getAreaDisplayLabel(selectedArea)}</span></div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { resetForm(); onOpenChange(false); }}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              {currentStep > 0 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevious}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {!isLastStep ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="flex-1 sm:flex-none"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={loading || creatingPPPoE || !formData.name}
                  className="flex-1 sm:flex-none"
                >
                  {(loading || creatingPPPoE) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creatingPPPoE ? 'Creating PPPoE...' : 'Add Customer'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>

        {/* Add Customer Type Dialog */}
        <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add User Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-type-name">Type Name</Label>
                <Input
                  id="new-type-name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., Home, Office, Shop"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTypeDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomerType} disabled={!newTypeName.trim()}>
                Add Type
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
