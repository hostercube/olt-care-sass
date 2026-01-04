import { useState, useEffect } from 'react';
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
import { useCustomers } from '@/hooks/useCustomers';
import { useISPPackages } from '@/hooks/useISPPackages';
import { useAreas } from '@/hooks/useAreas';
import { useResellers } from '@/hooks/useResellers';
import { useMikroTikSync } from '@/hooks/useMikroTikSync';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Customer } from '@/types/isp';

interface EditCustomerDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange, onSuccess }: EditCustomerDialogProps) {
  const { updateCustomer } = useCustomers();
  const { packages } = useISPPackages();
  const { areas } = useAreas();
  const { resellers } = useResellers();
  const { updatePPPoEUser } = useMikroTikSync();
  const [loading, setLoading] = useState(false);
  const [updateMikroTik, setUpdateMikroTik] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    reseller_id: '',
    router_mac: '',
    pppoe_username: '',
    pppoe_password: '',
    package_id: '',
    expiry_date: '',
    monthly_bill: '',
    notes: '',
    status: 'active' as 'active' | 'expired' | 'suspended' | 'pending' | 'cancelled',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        area_id: customer.area_id || '',
        reseller_id: customer.reseller_id || '',
        router_mac: customer.router_mac || '',
        pppoe_username: customer.pppoe_username || '',
        pppoe_password: customer.pppoe_password || '',
        package_id: customer.package_id || '',
        expiry_date: customer.expiry_date || '',
        monthly_bill: customer.monthly_bill?.toString() || '',
        notes: customer.notes || '',
        status: customer.status,
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const oldUsername = (customer.pppoe_username || '').trim();
      const newUsername = (formData.pppoe_username || '').trim();
      const routerId = customer.mikrotik_id || '';

      const nextPackage = packages.find((p) => p.id === formData.package_id);
      const prevPackage = packages.find((p) => p.id === customer.package_id);

      const shouldUpdateMikroTik = updateMikroTik && !!routerId && !!oldUsername;

      if (shouldUpdateMikroTik) {
        const updates: any = {};

        if (newUsername && newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
          updates.newUsername = newUsername;
        }

        if (formData.pppoe_password && formData.pppoe_password.trim().length > 0) {
          updates.password = formData.pppoe_password.trim();
        }

        // Profile update when package changed
        if ((customer.package_id || '') !== (formData.package_id || '')) {
          const desiredProfile = nextPackage?.name || 'default';
          if ((prevPackage?.name || 'default') !== desiredProfile) {
            updates.profile = desiredProfile;
          }
        }

        // MAC binding update when router_mac changed
        if ((customer.router_mac || '') !== (formData.router_mac || '')) {
          updates.callerId = (formData.router_mac || '').trim();
        }

        if (Object.keys(updates).length > 0) {
          const ok = await updatePPPoEUser(routerId, oldUsername, updates);
          if (!ok) {
            setLoading(false);
            return;
          }
        }
      }

      const updateData: any = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id || null,
        reseller_id: formData.reseller_id || null,
        router_mac: formData.router_mac || null,
        pppoe_username: formData.pppoe_username || null,
        package_id: formData.package_id || null,
        expiry_date: formData.expiry_date || null,
        monthly_bill: parseFloat(formData.monthly_bill) || 0,
        notes: formData.notes || null,
        status: formData.status,
      };

      // Only update PPPoE password if user explicitly typed one.
      if (formData.pppoe_password && formData.pppoe_password.trim().length > 0) {
        updateData.pppoe_password = formData.pppoe_password.trim();
      }

      await updateCustomer(customer.id, updateData);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error updating customer:', err);
      toast.error(err?.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pppoe">PPPoE Username</Label>
              <Input
                id="edit-pppoe"
                value={formData.pppoe_username}
                onChange={(e) => setFormData(prev => ({ ...prev, pppoe_username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pppoe-pass">PPPoE Password</Label>
              <Input
                id="edit-pppoe-pass"
                type="password"
                value={formData.pppoe_password}
                onChange={(e) => setFormData(prev => ({ ...prev, pppoe_password: e.target.value }))}
                placeholder="Leave empty to keep current"
              />
            </div>
          </div>

          {/* MikroTik sync toggle */}
          {customer.mikrotik_id && customer.pppoe_username && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Update MikroTik</p>
                <p className="text-xs text-muted-foreground">
                  PPPoE username/password/package change router এও update হবে
                </p>
              </div>
              <Switch checked={updateMikroTik} onCheckedChange={setUpdateMikroTik} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Package</Label>
            <Select
              value={formData.package_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, package_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - ৳{pkg.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-expiry">Expiry Date</Label>
              <Input
                id="edit-expiry"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bill">Monthly Bill (৳)</Label>
              <Input
                id="edit-bill"
                type="number"
                value={formData.monthly_bill}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_bill: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Area</Label>
              <Select
                value={formData.area_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Textarea
              id="edit-address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
