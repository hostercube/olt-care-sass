// Shared Customer Dialog that works for both Tenant and Reseller Portal
// This is a wrapper that provides the correct context based on usage

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, User, Network, Package, MapPin, ChevronLeft, ChevronRight,
  Check, Router, Key, Calendar
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SharedCustomerDialogData {
  packages: { id: string; name: string; price: number; validity_days?: number }[];
  areas: { id: string; name: string; upazila?: string; district?: string }[];
  mikrotikRouters: { id: string; name: string }[];
  tenantId: string;
  resellerId?: string; // Only for reseller context
}

interface SharedCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  contextData: SharedCustomerDialogData;
  onCreateCustomer: (data: any) => Promise<boolean>;
  mode?: 'add' | 'edit';
  customer?: any; // For edit mode
  onUpdateCustomer?: (id: string, data: any) => Promise<boolean>;
  permissions?: {
    canEditStatus?: boolean;
    canEditMikroTik?: boolean;
    canEditPPPoE?: boolean;
    showReseller?: boolean;
  };
}

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'package', label: 'Package', icon: Package },
];

export function SharedCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
  contextData,
  onCreateCustomer,
  mode = 'add',
  customer,
  onUpdateCustomer,
  permissions = {},
}: SharedCustomerDialogProps) {
  const {
    canEditStatus = true,
    canEditMikroTik = true,
    canEditPPPoE = true,
    showReseller = false,
  } = permissions;

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    nid_number: '',
    address: '',
    area_id: '',
    mikrotik_id: '',
    pppoe_username: '',
    pppoe_password: '',
    package_id: '',
    connection_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    monthly_bill: '',
    notes: '',
    status: 'active' as string,
  });

  // Initialize form for edit mode
  useEffect(() => {
    if (mode === 'edit' && customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        nid_number: customer.nid_number || '',
        address: customer.address || '',
        area_id: customer.area_id || customer.area?.id || '',
        mikrotik_id: customer.mikrotik_id || '',
        pppoe_username: customer.pppoe_username || '',
        pppoe_password: '',
        package_id: customer.package_id || '',
        connection_date: customer.connection_date || '',
        expiry_date: customer.expiry_date || '',
        monthly_bill: customer.monthly_bill?.toString() || '',
        notes: customer.notes || '',
        status: customer.status || 'active',
      });
      setCurrentStep(0);
    }
  }, [mode, customer]);

  // Auto-calculate expiry when package changes
  useEffect(() => {
    if (mode === 'add' && formData.package_id && formData.connection_date) {
      const pkg = contextData.packages.find(p => p.id === formData.package_id);
      if (pkg) {
        const connectionDate = new Date(formData.connection_date);
        const validityDays = pkg.validity_days || 30;
        const expiryDate = addDays(connectionDate, validityDays);
        setFormData(prev => ({
          ...prev,
          expiry_date: format(expiryDate, 'yyyy-MM-dd'),
          monthly_bill: pkg.price.toString(),
        }));
      }
    }
  }, [formData.package_id, formData.connection_date, contextData.packages, mode]);

  // Sensible defaults (add mode): auto-select first allowed area/router
  useEffect(() => {
    if (mode !== 'add') return;

    // Auto-select Area when only one option is available
    if (!formData.area_id && contextData.areas.length === 1) {
      setFormData(prev => ({ ...prev, area_id: contextData.areas[0].id }));
    }

    // Auto-select MikroTik when only one option is available
    if (!formData.mikrotik_id && contextData.mikrotikRouters.length === 1) {
      setFormData(prev => ({ ...prev, mikrotik_id: contextData.mikrotikRouters[0].id }));
    }
  }, [mode, contextData.areas, contextData.mikrotikRouters, formData.area_id, formData.mikrotik_id]);

  // Auto-generate PPPoE username when name changes (add mode only)
  useEffect(() => {
    if (mode === 'add' && formData.name && !formData.pppoe_username) {
      const username = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 20);
      setFormData(prev => ({ ...prev, pppoe_username: username }));
    }
  }, [formData.name, mode]);

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
      case 1: // Location
        // No required fields
        break;
      case 2: // Network
        if (canEditPPPoE) {
          if (!formData.pppoe_username.trim()) newErrors.pppoe_username = 'PPPoE username is required';
          if (mode === 'add' && !formData.pppoe_password.trim()) newErrors.pppoe_password = 'PPPoE password is required';
          if (mode === 'add' && formData.pppoe_password.length < 4) newErrors.pppoe_password = 'Password must be at least 4 characters';
        }
        break;
      case 3: // Package
        if (!formData.package_id) newErrors.package_id = 'Please select a package';
        break;
    }

    // PPPoE username uniqueness check (add mode only)
    if (mode === 'add' && step === 2 && !newErrors.pppoe_username && formData.pppoe_username.trim()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', contextData.tenantId)
          .ilike('pppoe_username', formData.pppoe_username.trim())
          .limit(1);

        if (!error && data && data.length > 0) {
          newErrors.pppoe_username = 'This PPPoE username already exists';
        }
      } catch {
        // If check fails, don't block
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    for (let i = 0; i < STEPS.length; i++) {
      const ok = await validateStep(i);
      if (!ok) {
        setCurrentStep(i);
        return;
      }
    }

    setLoading(true);

    try {
      const resellerMode = !!contextData.resellerId;

      const customerData: any = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id && formData.area_id !== 'none' ? formData.area_id : null,
        mikrotik_id: formData.mikrotik_id && formData.mikrotik_id !== 'none' ? formData.mikrotik_id : null,
        pppoe_username: formData.pppoe_username || null,
        package_id: formData.package_id || null,
        connection_date: formData.connection_date || null,
        expiry_date: formData.expiry_date || null,
        monthly_bill: parseFloat(formData.monthly_bill) || 0,
        notes: formData.notes || null,
      };

      // NOTE: Some reseller backends don't have nid_number column yet.
      // Keep it for tenant context only.
      if (!resellerMode) {
        customerData.nid_number = formData.nid_number || null;
      }

      if (mode === 'add') {
        customerData.pppoe_password = formData.pppoe_password || null;
        customerData.status = 'pending';
        customerData.due_amount = parseFloat(formData.monthly_bill) || 0;

        const success = await onCreateCustomer(customerData);
        if (success) {
          onSuccess?.();
          resetForm();
          onOpenChange(false);
        }
      } else if (mode === 'edit' && onUpdateCustomer && customer) {
        if (formData.pppoe_password) {
          customerData.pppoe_password = formData.pppoe_password;
        }
        if (canEditStatus) {
          customerData.status = formData.status;
        }

        const success = await onUpdateCustomer(customer.id, customerData);
        if (success) {
          onSuccess?.();
          onOpenChange(false);
        }
      }
    } catch (err) {
      console.error('Error saving customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      nid_number: '',
      address: '',
      area_id: '',
      mikrotik_id: '',
      pppoe_username: '',
      pppoe_password: '',
      package_id: '',
      connection_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: '',
      monthly_bill: '',
      notes: '',
      status: 'active',
    });
    setCurrentStep(0);
    setErrors({});
  };

  // Searchable options for Area
  const areaOptions = useMemo<SearchableSelectOption[]>(() => {
    return contextData.areas.map(area => ({
      value: area.id,
      label: `${area.name}${area.upazila ? ` (${area.upazila})` : ''}${area.district ? ` - ${area.district}` : ''}`,
    }));
  }, [contextData.areas]);

  const isLastStep = currentStep === STEPS.length - 1;
  const selectedPackage = contextData.packages.find(p => p.id === formData.package_id);

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
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
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isCompleted ? "bg-primary text-primary-foreground" :
                        isActive ? "bg-primary text-primary-foreground" :
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-xs mt-1 hidden sm:block",
                      isActive ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-1 mx-2",
                      isCompleted ? "bg-primary" : "bg-muted"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').substring(0, 11) }))}
                    placeholder="01XXXXXXXXX"
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="nid">NID Number</Label>
                  <Input
                    id="nid"
                    value={formData.nid_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, nid_number: e.target.value.replace(/\D/g, '').substring(0, 17) }))}
                    placeholder="National ID"
                    maxLength={17}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Area</Label>
                <SearchableSelect
                  options={areaOptions}
                  value={formData.area_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
                  placeholder="Select or search area..."
                  emptyText="No areas found"
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="House, Road, Village, Upazila, District"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Network */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {canEditMikroTik && contextData.mikrotikRouters.length > 0 && (
                <div className="space-y-2">
                  <Label>MikroTik Router</Label>
                  <Select
                    value={formData.mikrotik_id || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, mikrotik_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select router" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contextData.mikrotikRouters.map(router => (
                        <SelectItem key={router.id} value={router.id}>
                          <div className="flex items-center gap-2">
                            <Router className="h-4 w-4" />
                            {router.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {canEditPPPoE && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pppoe_username">PPPoE Username *</Label>
                      <Input
                        id="pppoe_username"
                        value={formData.pppoe_username}
                        onChange={(e) => setFormData(prev => ({ ...prev, pppoe_username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        placeholder="username"
                        className={errors.pppoe_username ? 'border-destructive' : ''}
                      />
                      {errors.pppoe_username && <p className="text-xs text-destructive">{errors.pppoe_username}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pppoe_password">
                        PPPoE Password {mode === 'add' ? '*' : '(leave empty to keep)'}
                      </Label>
                      <Input
                        id="pppoe_password"
                        type="password"
                        value={formData.pppoe_password}
                        onChange={(e) => setFormData(prev => ({ ...prev, pppoe_password: e.target.value }))}
                        placeholder={mode === 'add' ? 'Password' : 'Leave empty to keep current'}
                        className={errors.pppoe_password ? 'border-destructive' : ''}
                      />
                      {errors.pppoe_password && <p className="text-xs text-destructive">{errors.pppoe_password}</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Package */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Package *</Label>
                <Select
                  value={formData.package_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, package_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger className={errors.package_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select package</SelectItem>
                    {contextData.packages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {pkg.name} - ৳{pkg.price}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.package_id && <p className="text-xs text-destructive">{errors.package_id}</p>}
              </div>

              {selectedPackage && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedPackage.name}</p>
                        <p className="text-sm text-muted-foreground">Monthly: ৳{selectedPackage.price}</p>
                      </div>
                      <Badge variant="secondary">
                        {selectedPackage.validity_days || 30} Days
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="connection_date">Connection Date</Label>
                  <Input
                    id="connection_date"
                    type="date"
                    value={formData.connection_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, connection_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_bill">Monthly Bill (৳)</Label>
                  <Input
                    id="monthly_bill"
                    type="number"
                    value={formData.monthly_bill}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_bill: e.target.value }))}
                  />
                </div>
                {mode === 'edit' && canEditStatus && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'add' ? 'Create Customer' : 'Save Changes'}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
