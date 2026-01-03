import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomers } from '@/hooks/useCustomers';
import { useISPPackages } from '@/hooks/useISPPackages';
import { useAreas } from '@/hooks/useAreas';
import { useResellers } from '@/hooks/useResellers';
import { useRealtimeONUs } from '@/hooks/useRealtimeONUs';
import { useMikroTikRouters } from '@/hooks/useMikroTikRouters';
import { Loader2, User, Network, Package, MapPin } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const { createCustomer } = useCustomers();
  const { packages } = useISPPackages();
  const { areas } = useAreas();
  const { resellers } = useResellers();
  const { onus } = useRealtimeONUs();
  const { routers } = useMikroTikRouters();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    reseller_id: '',
    mikrotik_id: '',
    onu_id: '',
    onu_mac: '',
    pon_port: '',
    onu_index: '',
    router_mac: '',
    pppoe_username: '',
    pppoe_password: '',
    package_id: '',
    connection_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    monthly_bill: '',
    notes: '',
    is_auto_disable: true,
  });

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

  // Auto-fill ONU details when selected
  useEffect(() => {
    if (formData.onu_id) {
      const onu = onus.find(o => o.id === formData.onu_id);
      if (onu) {
        setFormData(prev => ({
          ...prev,
          onu_mac: onu.mac_address || '',
          pon_port: onu.pon_port || '',
          onu_index: onu.onu_index?.toString() || '',
          router_mac: onu.router_mac || '',
          pppoe_username: onu.pppoe_username || prev.pppoe_username,
        }));
      }
    }
  }, [formData.onu_id, onus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createCustomer({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id && formData.area_id !== 'none' ? formData.area_id : null,
        reseller_id: formData.reseller_id && formData.reseller_id !== 'none' ? formData.reseller_id : null,
        mikrotik_id: formData.mikrotik_id && formData.mikrotik_id !== 'none' ? formData.mikrotik_id : null,
        onu_id: formData.onu_id && formData.onu_id !== 'none' ? formData.onu_id : null,
        onu_mac: formData.onu_mac || null,
        pon_port: formData.pon_port || null,
        onu_index: formData.onu_index ? parseInt(formData.onu_index) : null,
        router_mac: formData.router_mac || null,
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
      });
      
      onSuccess?.();
      resetForm();
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
      mikrotik_id: '',
      onu_id: '',
      onu_mac: '',
      pon_port: '',
      onu_index: '',
      router_mac: '',
      pppoe_username: '',
      pppoe_password: '',
      package_id: '',
      connection_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: '',
      monthly_bill: '',
      notes: '',
      is_auto_disable: true,
    });
    setActiveTab('basic');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic" className="gap-2">
                <User className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-2">
                <Network className="h-4 w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger value="package" className="gap-2">
                <Package className="h-4 w-4" />
                Package
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="network" className="space-y-4 mt-4">
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
                        {router.name} ({router.ip_address})
                        {router.is_primary && ' - Primary'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which MikroTik router this customer belongs to
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link to ONU Device</Label>
                <Select
                  value={formData.onu_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, onu_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ONU device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {onus.map((onu) => (
                      <SelectItem key={onu.id} value={onu.id}>
                        {onu.name} - {onu.pon_port}:{onu.onu_index} 
                        {onu.pppoe_username && ` (${onu.pppoe_username})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onu_mac">ONU MAC</Label>
                  <Input
                    id="onu_mac"
                    value={formData.onu_mac}
                    onChange={(e) => setFormData(prev => ({ ...prev, onu_mac: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="router_mac">Router MAC</Label>
                  <Input
                    id="router_mac"
                    value={formData.router_mac}
                    onChange={(e) => setFormData(prev => ({ ...prev, router_mac: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pppoe_username">PPPoE Username *</Label>
                  <Input
                    id="pppoe_username"
                    value={formData.pppoe_username}
                    onChange={(e) => setFormData(prev => ({ ...prev, pppoe_username: e.target.value }))}
                    placeholder="pppoe_user"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pppoe_password">PPPoE Password</Label>
                  <Input
                    id="pppoe_password"
                    type="password"
                    value={formData.pppoe_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, pppoe_password: e.target.value }))}
                    placeholder="Password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pon_port">PON Port</Label>
                  <Input
                    id="pon_port"
                    value={formData.pon_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, pon_port: e.target.value }))}
                    placeholder="0/1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onu_index">ONU Index</Label>
                  <Input
                    id="onu_index"
                    type="number"
                    value={formData.onu_index}
                    onChange={(e) => setFormData(prev => ({ ...prev, onu_index: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="package" className="space-y-4 mt-4">
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
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ৳{pkg.price}/month ({pkg.download_speed}/{pkg.upload_speed} {pkg.speed_unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
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
                    <SelectItem value="none">None</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name} 
                        {area.village && `, ${area.village}`}
                        {area.upazila && `, ${area.upazila}`}
                        {area.district && ` (${area.district})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reseller</Label>
                <Select
                  value={formData.reseller_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reseller_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reseller (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {resellers.filter(r => r.is_active).map((reseller) => (
                      <SelectItem key={reseller.id} value={reseller.id}>
                        {reseller.name} {reseller.phone && `(${reseller.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}