import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Plus, Edit, RefreshCcw, Search, Filter, X, Eye } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { toast } from 'sonner';

export default function ResellerCustomers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    session,
    reseller,
    loading,
    customers,
    packages,
    areas,
    mikrotikRouters,
    logout,
    createCustomer,
    updateCustomer,
    rechargeCustomer,
    refetch,
  } = useResellerPortal();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    package_id: '',
    area_id: '',
    mikrotik_id: '',
    pppoe_username: '',
    pppoe_password: '',
    monthly_bill: '',
  });

  const [rechargeData, setRechargeData] = useState({
    amount: '',
    months: '1',
  });

  useEffect(() => {
    if (!loading && !session) {
      navigate('/reseller/login');
    }
  }, [loading, session, navigate]);

  // Open add dialog if action=add in URL
  useEffect(() => {
    if (searchParams.get('action') === 'add' && reseller?.can_add_customers) {
      setShowAddDialog(true);
    }
  }, [searchParams, reseller]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !search || 
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
        customer.customer_code?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      package_id: '',
      area_id: '',
      mikrotik_id: '',
      pppoe_username: '',
      pppoe_password: '',
      monthly_bill: '',
    });
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Customer name is required');
      return;
    }

    setSaving(true);
    const pkg = packages.find(p => p.id === formData.package_id);
    
    const success = await createCustomer({
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      package_id: formData.package_id || null,
      area_id: formData.area_id || null,
      mikrotik_id: formData.mikrotik_id || null,
      pppoe_username: formData.pppoe_username || null,
      monthly_bill: formData.monthly_bill ? parseFloat(formData.monthly_bill) : (pkg?.price || null),
      status: 'inactive',
    } as any);

    setSaving(false);
    if (success) {
      setShowAddDialog(false);
      resetForm();
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setSaving(true);
    const pkg = packages.find(p => p.id === formData.package_id);

    const success = await updateCustomer(selectedCustomer.id, {
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      package_id: formData.package_id || null,
      area_id: formData.area_id || null,
      mikrotik_id: formData.mikrotik_id || null,
      pppoe_username: formData.pppoe_username || null,
      monthly_bill: formData.monthly_bill ? parseFloat(formData.monthly_bill) : (pkg?.price || null),
    } as any);

    setSaving(false);
    if (success) {
      setShowEditDialog(false);
      setSelectedCustomer(null);
      resetForm();
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !rechargeData.amount) return;

    setSaving(true);
    const success = await rechargeCustomer(
      selectedCustomer.id,
      parseFloat(rechargeData.amount),
      parseInt(rechargeData.months)
    );

    setSaving(false);
    if (success) {
      setShowRechargeDialog(false);
      setSelectedCustomer(null);
      setRechargeData({ amount: '', months: '1' });
    }
  };

  const openEditDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      package_id: customer.package_id || '',
      area_id: customer.area_id || '',
      mikrotik_id: customer.mikrotik_id || '',
      pppoe_username: customer.pppoe_username || '',
      pppoe_password: '',
      monthly_bill: customer.monthly_bill?.toString() || '',
    });
    setShowEditDialog(true);
  };

  const openRechargeDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setRechargeData({
      amount: customer.monthly_bill?.toString() || '',
      months: '1',
    });
    setShowRechargeDialog(true);
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {reseller?.can_add_customers && (
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {(search || statusFilter !== 'all') && (
                <Button variant="ghost" size="icon" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customers ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-mono text-xs">
                          {customer.customer_code || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{customer.phone || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{customer.package?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            customer.status === 'active' ? 'default' :
                            customer.status === 'expired' ? 'destructive' :
                            'secondary'
                          }>
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {customer.expiry_date 
                            ? new Date(customer.expiry_date).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {reseller?.can_recharge_customers && (
                              <Button variant="ghost" size="icon" onClick={() => openRechargeDialog(customer)}>
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {reseller?.can_edit_customers && (
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(customer)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={formData.package_id} onValueChange={(v) => {
                  const pkg = packages.find(p => p.id === v);
                  setFormData({ ...formData, package_id: v, monthly_bill: pkg?.price?.toString() || '' });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ৳{pkg.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Bill (৳)</Label>
                <Input
                  type="number"
                  value={formData.monthly_bill}
                  onChange={(e) => setFormData({ ...formData, monthly_bill: e.target.value })}
                  placeholder="0"
                />
              </div>
              {areas.length > 0 && (
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Select value={formData.area_id} onValueChange={(v) => setFormData({ ...formData, area_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {mikrotikRouters.length > 0 && (
                <div className="space-y-2">
                  <Label>MikroTik Router</Label>
                  <Select value={formData.mikrotik_id} onValueChange={(v) => setFormData({ ...formData, mikrotik_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select router" />
                    </SelectTrigger>
                    <SelectContent>
                      {mikrotikRouters.map((router) => (
                        <SelectItem key={router.id} value={router.id}>{router.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>PPPoE Username</Label>
                <Input
                  value={formData.pppoe_username}
                  onChange={(e) => setFormData({ ...formData, pppoe_username: e.target.value })}
                  placeholder="pppoe_user"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setSelectedCustomer(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={formData.package_id} onValueChange={(v) => {
                  const pkg = packages.find(p => p.id === v);
                  setFormData({ ...formData, package_id: v, monthly_bill: pkg?.price?.toString() || formData.monthly_bill });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ৳{pkg.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Bill (৳)</Label>
                <Input
                  type="number"
                  value={formData.monthly_bill}
                  onChange={(e) => setFormData({ ...formData, monthly_bill: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={(open) => { setShowRechargeDialog(open); if (!open) setSelectedCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecharge} className="space-y-4">
            {selectedCustomer && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer.customer_code}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                value={rechargeData.amount}
                onChange={(e) => setRechargeData({ ...rechargeData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={rechargeData.months} onValueChange={(v) => setRechargeData({ ...rechargeData, months: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="2">2 Months</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
              Your balance: ৳{(reseller?.balance || 0).toLocaleString()}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRechargeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !rechargeData.amount}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Recharge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ResellerPortalLayout>
  );
}
