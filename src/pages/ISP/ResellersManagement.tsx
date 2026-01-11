import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { useResellerSystem } from '@/hooks/useResellerSystem';
import { useAreas } from '@/hooks/useAreas';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy';
import { 
  Users, Plus, Edit, Trash2, Loader2, Wallet, ArrowRightLeft, 
  Building2, Shield, ChevronRight, Eye, UserPlus
} from 'lucide-react';
import type { Reseller, ResellerBranch } from '@/types/reseller';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import ResellerTransactionsDialog from '@/components/reseller/ResellerTransactionsDialog';
import ResellerDetailsSheet from '@/components/reseller/ResellerDetailsSheet';

export default function ResellersManagement() {
  const { 
    resellers, branches, loading, createReseller, updateReseller, 
    deleteReseller, rechargeBalance, createBranch, updateBranch,
    getSubResellers
  } = useResellerSystem();
  const { areas } = useAreas();
  const { employees } = useEmployees();
  const { villages, unions, upazilas, districts } = useLocationHierarchy();
  
  const [activeTab, setActiveTab] = useState('resellers');
  const [showDialog, setShowDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [editingBranch, setEditingBranch] = useState<ResellerBranch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Reseller | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    branch_id: '',
    parent_id: '',
    commission_type: 'percentage' as 'percentage' | 'flat',
    commission_value: '',
    customer_rate: '',
    rate_type: 'per_customer',
    max_sub_resellers: '0',
    max_customers: '',
    can_create_sub_reseller: false,
    can_view_sub_customers: true,
    can_control_sub_customers: false,
    can_recharge_customers: true,
    can_add_customers: true,
    can_edit_customers: false,
    can_delete_customers: false,
    nid_number: '',
    username: '',
    password: '',
  });

  const [branchFormData, setBranchFormData] = useState({
    name: '',
    address: '',
    phone: '',
    manager_reseller_id: '',
  });

  // Filter resellers by level
  const filteredResellers = useMemo(() => {
    const active = resellers.filter(r => r.is_active !== false);
    if (filterLevel === 'all') return active;
    return active.filter(r => r.level === parseInt(filterLevel));
  }, [resellers, filterLevel]);

  // Get level 1 resellers for parent selection
  const parentOptions = useMemo(() => {
    const level = editingReseller?.level || 1;
    // Can only select resellers with level < current (or level < 3 for new)
    return resellers.filter(r => r.is_active !== false && r.level < 3 && (!editingReseller || r.level < level));
  }, [resellers, editingReseller]);

  // Build area options for reseller (must reference legacy Areas table due to FK)
  const areaOptions = useMemo<SearchableSelectOption[]>(() => {
    return areas.map((area) => {
      const parts = [] as string[];
      if (area.name) parts.push(area.name);
      if (area.village) parts.push(area.village);
      if (area.union_name) parts.push(area.union_name);
      if (area.upazila) parts.push(area.upazila);
      if (area.district) parts.push(`(${area.district})`);

      return {
        value: area.id,
        label: parts.join(', ') || area.name,
      };
    });
  }, [areas]);

  // Build employee/staff options for branch manager
  const staffOptions = useMemo<SearchableSelectOption[]>(() => {
    return employees
      .filter(e => e.status === 'active')
      .map(e => ({
        value: e.id,
        label: `${e.name}${e.designation ? ` (${e.designation})` : ''}${e.phone ? ` - ${e.phone}` : ''}`,
      }));
  }, [employees]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      area_id: '',
      branch_id: '',
      parent_id: '',
      commission_type: 'percentage',
      commission_value: '',
      customer_rate: '',
      rate_type: 'per_customer',
      max_sub_resellers: '0',
      max_customers: '',
      can_create_sub_reseller: false,
      can_view_sub_customers: true,
      can_control_sub_customers: false,
      can_recharge_customers: true,
      can_add_customers: true,
      can_edit_customers: false,
      can_delete_customers: false,
      nid_number: '',
      username: '',
      password: '',
    });
    setEditingReseller(null);
  };

  const handleEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      phone: reseller.phone || '',
      email: reseller.email || '',
      address: reseller.address || '',
      area_id: reseller.area_id || '',
      branch_id: reseller.branch_id || '',
      parent_id: reseller.parent_id || '',
      commission_type: reseller.commission_type,
      commission_value: reseller.commission_value?.toString() || '',
      customer_rate: reseller.customer_rate?.toString() || '',
      rate_type: reseller.rate_type || 'per_customer',
      max_sub_resellers: reseller.max_sub_resellers?.toString() || '0',
      max_customers: reseller.max_customers?.toString() || '',
      can_create_sub_reseller: reseller.can_create_sub_reseller,
      can_view_sub_customers: reseller.can_view_sub_customers,
      can_control_sub_customers: reseller.can_control_sub_customers,
      can_recharge_customers: reseller.can_recharge_customers,
      can_add_customers: reseller.can_add_customers,
      can_edit_customers: reseller.can_edit_customers,
      can_delete_customers: reseller.can_delete_customers,
      nid_number: reseller.nid_number || '',
      username: reseller.username || '',
      password: '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data: any = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id || null,
        branch_id: formData.branch_id || null,
        parent_id: formData.parent_id || null,
        commission_type: formData.commission_type,
        commission_value: parseFloat(formData.commission_value) || 0,
        customer_rate: parseFloat(formData.customer_rate) || 0,
        rate_type: formData.rate_type,
        max_sub_resellers: parseInt(formData.max_sub_resellers) || 0,
        max_customers: formData.max_customers ? parseInt(formData.max_customers) : null,
        can_create_sub_reseller: formData.can_create_sub_reseller,
        can_view_sub_customers: formData.can_view_sub_customers,
        can_control_sub_customers: formData.can_control_sub_customers,
        can_recharge_customers: formData.can_recharge_customers,
        can_add_customers: formData.can_add_customers,
        can_edit_customers: formData.can_edit_customers,
        can_delete_customers: formData.can_delete_customers,
        nid_number: formData.nid_number || null,
        username: formData.username || null,
      };

      // Only update password if provided
      if (formData.password) {
        data.password = formData.password;
      }

      if (editingReseller) {
        await updateReseller(editingReseller.id, data);
      } else {
        await createReseller(data);
      }

      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error saving reseller:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRecharge = async () => {
    if (selectedReseller && rechargeAmount) {
      setSaving(true);
      try {
        await rechargeBalance(selectedReseller.id, parseFloat(rechargeAmount), rechargeNote || 'Balance recharge');
        setShowRechargeDialog(false);
        setSelectedReseller(null);
        setRechargeAmount('');
        setRechargeNote('');
      } catch (err) {
        console.error('Error recharging:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, branchFormData as any);
      } else {
        await createBranch(branchFormData as any);
      }
      setShowBranchDialog(false);
      setBranchFormData({ name: '', address: '', phone: '', manager_reseller_id: '' });
      setEditingBranch(null);
    } catch (err) {
      console.error('Error saving branch:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteReseller(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-500';
      case 2: return 'bg-purple-500';
      case 3: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout
      title="Resellers Management"
      subtitle="Multi-level reseller system with wallet and permissions"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="resellers" className="gap-2">
            <Users className="h-4 w-4" /> Resellers
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="h-4 w-4" /> Branches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resellers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resellers ({filteredResellers.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="1">Resellers</SelectItem>
                    <SelectItem value="2">Sub-Resellers</SelectItem>
                    <SelectItem value="3">Sub-Sub-Resellers</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reseller
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Sub-Resellers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredResellers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No resellers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResellers.map((reseller) => (
                        <TableRow key={reseller.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {reseller.level > 1 && (
                                <span className="text-muted-foreground">
                                  {'└'.repeat(reseller.level - 1)}
                                </span>
                              )}
                              <div>
                                <p className="font-medium">{reseller.name}</p>
                                {reseller.username && (
                                  <p className="text-xs text-muted-foreground">@{reseller.username}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getLevelBadgeColor(reseller.level)}>
                              {RESELLER_ROLE_LABELS[reseller.role] || `Level ${reseller.level}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reseller.parent?.name || '-'}
                          </TableCell>
                          <TableCell>{reseller.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{reseller.commission_value}{reseller.commission_type === 'percentage' ? '%' : '৳'}</p>
                              {reseller.customer_rate > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  +৳{reseller.customer_rate}/customer
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={reseller.balance > 0 ? 'text-green-600 font-medium' : ''}>
                              ৳{reseller.balance.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {reseller.can_create_sub_reseller ? (
                              <span className="text-sm">
                                {getSubResellers(reseller.id).length}/{reseller.max_sub_resellers || '∞'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reseller.is_active ? 'default' : 'secondary'}>
                              {reseller.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="View Details"
                                onClick={() => { setSelectedReseller(reseller); setShowDetailsSheet(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Wallet Transactions"
                                onClick={() => { setSelectedReseller(reseller); setShowTransactionsDialog(true); }}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Recharge Balance"
                                onClick={() => { setSelectedReseller(reseller); setShowRechargeDialog(true); }}
                              >
                                <Wallet className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(reseller)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(reseller)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="branches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branches
              </CardTitle>
              <Button onClick={() => { setEditingBranch(null); setShowBranchDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No branches found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell className="font-medium">{branch.name}</TableCell>
                          <TableCell>{branch.address || '-'}</TableCell>
                          <TableCell>{branch.phone || '-'}</TableCell>
                          <TableCell>{branch.manager?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                              {branch.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingBranch(branch);
                                setBranchFormData({
                                  name: branch.name,
                                  address: branch.address || '',
                                  phone: branch.phone || '',
                                  // branch manager is staff now
                                  manager_reseller_id: (branch as any).manager_staff_id || branch.manager_reseller_id || '',
                                });
                                setShowBranchDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Reseller Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReseller ? 'Edit Reseller' : 'Add New Reseller'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Reseller name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Login username"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password {editingReseller ? '(leave empty to keep)' : ''}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="reseller@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parent Reseller</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level)</SelectItem>
                    {parentOptions.map((reseller) => (
                      <SelectItem key={reseller.id} value={reseller.id}>
                        {reseller.name} ({RESELLER_ROLE_LABELS[reseller.role]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {branches.filter(b => b.is_active).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area</Label>
                <SearchableSelect
                  value={formData.area_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
                  options={areaOptions}
                  placeholder="Search or select area..."
                  searchPlaceholder="Search areas..."
                  emptyText="No areas found"
                  allowClear
                  clearLabel="None"
                />
              </div>
              <div className="space-y-2">
                <Label>NID Number</Label>
                <Input
                  value={formData.nid_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, nid_number: e.target.value }))}
                  placeholder="National ID"
                />
              </div>
            </div>

            {/* Commission Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Commission Settings
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Commission Type</Label>
                  <Select
                    value={formData.commission_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, commission_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Commission Value</Label>
                  <Input
                    type="number"
                    value={formData.commission_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, commission_value: e.target.value }))}
                    placeholder={formData.commission_type === 'percentage' ? '10' : '100'}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per Customer Rate (৳)</Label>
                  <Input
                    type="number"
                    value={formData.customer_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_rate: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" /> Permissions & Limits
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Sub-Resellers</Label>
                  <Input
                    type="number"
                    value={formData.max_sub_resellers}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_sub_resellers: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Customers (empty = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_customers}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_customers: e.target.value }))}
                    placeholder="Unlimited"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Can Create Sub-Reseller</Label>
                  <Switch
                    checked={formData.can_create_sub_reseller}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_create_sub_reseller: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can View Sub-Customers</Label>
                  <Switch
                    checked={formData.can_view_sub_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_view_sub_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Control Sub-Customers</Label>
                  <Switch
                    checked={formData.can_control_sub_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_control_sub_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Recharge Customers</Label>
                  <Switch
                    checked={formData.can_recharge_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_recharge_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Add Customers</Label>
                  <Switch
                    checked={formData.can_add_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_add_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Edit Customers</Label>
                  <Switch
                    checked={formData.can_edit_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_edit_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Delete Customers</Label>
                  <Switch
                    checked={formData.can_delete_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_delete_customers: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingReseller ? 'Save Changes' : 'Create Reseller'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Balance - {selectedReseller?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">৳{selectedReseller?.balance.toLocaleString() || 0}</p>
            </div>
            <div className="space-y-2">
              <Label>Recharge Amount (৳)</Label>
              <Input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={rechargeNote}
                onChange={(e) => setRechargeNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecharge} disabled={saving || !rechargeAmount}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Recharge
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBranchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input
                value={branchFormData.name}
                onChange={(e) => setBranchFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Branch name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={branchFormData.address}
                onChange={(e) => setBranchFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Branch address"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={branchFormData.phone}
                onChange={(e) => setBranchFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Branch Manager (Staff)</Label>
              <SearchableSelect
                value={branchFormData.manager_reseller_id}
                onValueChange={(value) => setBranchFormData(prev => ({ ...prev, manager_reseller_id: value }))}
                options={staffOptions}
                placeholder="Search or select staff..."
                searchPlaceholder="Search staff..."
                emptyText="No staff found. Add staff first in Staff module."
                allowClear
                clearLabel="None"
              />
              <p className="text-xs text-muted-foreground">
                Add staff from the Staff module to assign as branch managers
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBranchDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !branchFormData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingBranch ? 'Save Changes' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      {selectedReseller && (
        <ResellerTransactionsDialog
          open={showTransactionsDialog}
          onOpenChange={setShowTransactionsDialog}
          reseller={selectedReseller}
        />
      )}

      {/* Details Sheet */}
      {selectedReseller && (
        <ResellerDetailsSheet
          open={showDetailsSheet}
          onOpenChange={setShowDetailsSheet}
          reseller={selectedReseller}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Reseller</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deleteConfirm?.name}"? They will no longer be able to manage customers or sub-resellers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
