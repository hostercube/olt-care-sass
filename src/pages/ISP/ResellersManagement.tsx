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
import { useResellerRoles } from '@/hooks/useResellerRoles';
import { useAreas } from '@/hooks/useAreas';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy';
import { useMikroTikRouters } from '@/hooks/useMikroTikRouters';
import { useOLTs } from '@/hooks/useOLTData';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, Plus, Edit, Trash2, Loader2, Wallet, ArrowRightLeft, 
  Building2, Shield, ChevronRight, Eye, UserPlus, MinusCircle, KeyRound, LogIn
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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
    deleteReseller, rechargeBalance, deductBalance, createBranch, updateBranch,
    getSubResellers, resetPassword, generateImpersonationToken
  } = useResellerSystem();
  const { roles: resellerRoles } = useResellerRoles();
  const { areas, refetch: refetchAreas } = useAreas();
  const { employees } = useEmployees();
  const { villages, unions, upazilas, districts } = useLocationHierarchy();
  const { routers: mikrotikRouters } = useMikroTikRouters();
  const { olts } = useOLTs();
  
  const [activeTab, setActiveTab] = useState('resellers');
  const [showDialog, setShowDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    branch_id: '',
    parent_id: '',
    role_id: '',
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
    can_transfer_balance: false,
    can_view_reports: false,
    nid_number: '',
    username: '',
    password: '',
    allowed_mikrotik_ids: [] as string[],
    allowed_olt_ids: [] as string[],
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

  // Build area options for reseller.
  // Preferred source: legacy `areas` table (FK target).
  // Fallback: villages list (will auto-create a matching `areas` row on save).
  const areaOptions = useMemo<SearchableSelectOption[]>(() => {
    if (areas.length > 0) {
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
    }

    const unionById = new Map(unions.map((u) => [u.id, u]));
    const upazilaById = new Map(upazilas.map((u) => [u.id, u]));
    const districtById = new Map(districts.map((d) => [d.id, d]));

    return villages.map((v) => {
      const union = unionById.get(v.union_id);
      const upazila = union ? upazilaById.get(union.upazila_id) : undefined;
      const district = upazila ? districtById.get(upazila.district_id) : undefined;

      const labelParts = [v.name];
      if (union?.name) labelParts.push(union.name);
      if (upazila?.name) labelParts.push(upazila.name);
      if (district?.name) labelParts.push(`(${district.name})`);

      return {
        value: `village:${v.id}`,
        label: labelParts.join(', '),
      };
    });
  }, [areas, villages, unions, upazilas, districts]);

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
      role_id: '',
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
      can_transfer_balance: false,
      can_view_reports: false,
      nid_number: '',
      username: '',
      password: '',
      allowed_mikrotik_ids: [],
      allowed_olt_ids: [],
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
      role_id: (reseller as any).role_id || '',
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
      can_transfer_balance: reseller.can_transfer_balance,
      can_view_reports: reseller.can_view_reports,
      nid_number: reseller.nid_number || '',
      username: reseller.username || '',
      password: '',
      allowed_mikrotik_ids: reseller.allowed_mikrotik_ids || [],
      allowed_olt_ids: reseller.allowed_olt_ids || [],
    });
    setShowDialog(true);
  };

  const resolveLegacyAreaId = async (selected: string): Promise<string | null> => {
    if (!selected) return null;

    // Already a legacy areas.id
    if (!selected.startsWith('village:')) return selected;

    const villageId = selected.replace('village:', '').trim();
    if (!villageId) return null;

    // Find existing area row for this village
    const { data: existingArea, error: existingErr } = await supabase
      .from('areas')
      .select('id')
      .eq('village_id', villageId)
      .maybeSingle();

    if (!existingErr && existingArea?.id) return existingArea.id;

    // Create minimal legacy area row from village + hierarchy
    const village = villages.find((v) => v.id === villageId);
    if (!village) return null;

    const union = unions.find((u) => u.id === village.union_id);
    const upazila = union ? upazilas.find((u) => u.id === union.upazila_id) : undefined;
    const district = upazila ? districts.find((d) => d.id === upazila.district_id) : undefined;

    const { data: inserted, error: insertErr } = await supabase
      .from('areas')
      .insert({
        // tenant_id will be set by DB default/RLS in most setups; but include if present in village
        tenant_id: village.tenant_id,
        name: village.name,
        village: village.name,
        village_id: village.id,
        union_id: union?.id ?? null,
        union_name: union?.name ?? null,
        upazila_id: upazila?.id ?? null,
        upazila: upazila?.name ?? null,
        district_id: district?.id ?? null,
        district: district?.name ?? null,
        section_block: village.section_block ?? null,
        road_no: village.road_no ?? null,
        house_no: village.house_no ?? null,
      } as any)
      .select('id')
      .single();

    if (insertErr) {
      console.error('Failed to create legacy area from village:', insertErr);
      return null;
    }

    await refetchAreas();
    return (inserted as any)?.id ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const resolvedAreaId = await resolveLegacyAreaId(formData.area_id);

      const data: any = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: resolvedAreaId,
        branch_id: formData.branch_id || null,
        parent_id: formData.parent_id || null,
        role_id: formData.role_id || null,
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
        can_transfer_balance: formData.can_transfer_balance,
        can_view_reports: formData.can_view_reports,
        nid_number: formData.nid_number || null,
        username: formData.username || null,
        allowed_mikrotik_ids: formData.allowed_mikrotik_ids.length > 0 ? formData.allowed_mikrotik_ids : null,
        allowed_olt_ids: formData.allowed_olt_ids.length > 0 ? formData.allowed_olt_ids : null,
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

  // Handle balance deduction
  const handleDeduct = async () => {
    if (selectedReseller && deductAmount && deductReason.trim()) {
      setSaving(true);
      try {
        await deductBalance(selectedReseller.id, parseFloat(deductAmount), deductReason.trim());
        setShowDeductDialog(false);
        setSelectedReseller(null);
        setDeductAmount('');
        setDeductReason('');
      } catch (err) {
        console.error('Error deducting:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (selectedReseller && newPassword && newPassword === confirmPassword) {
      setSaving(true);
      try {
        await resetPassword(selectedReseller.id, newPassword);
        setShowPasswordDialog(false);
        setSelectedReseller(null);
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        console.error('Error resetting password:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle auto-login (admin impersonation)
  const handleAutoLogin = async (reseller: Reseller) => {
    setSaving(true);
    try {
      const token = await generateImpersonationToken(reseller.id);
      if (token) {
        // Open reseller portal with impersonation token
        const url = `/reseller/dashboard?impersonate=${token}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error generating login:', err);
    } finally {
      setSaving(false);
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
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Auto Login"
                                onClick={() => handleAutoLogin(reseller)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <LogIn className="h-4 w-4" />
                              </Button>
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
                                className="text-green-600 hover:text-green-700"
                              >
                                <Wallet className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Deduct Balance"
                                onClick={() => { setSelectedReseller(reseller); setShowDeductDialog(true); }}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Reset Password"
                                onClick={() => { setSelectedReseller(reseller); setShowPasswordDialog(true); }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <KeyRound className="h-4 w-4" />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label>Role</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Role (Use Legacy Permissions)</SelectItem>
                    {resellerRoles.filter(r => r.is_active).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.role_type})
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
                <div className="flex items-center justify-between">
                  <Label>Can Transfer Balance</Label>
                  <Switch
                    checked={formData.can_transfer_balance}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_transfer_balance: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can View Reports</Label>
                  <Switch
                    checked={formData.can_view_reports}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_view_reports: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Device Restrictions */}
            {(mikrotikRouters.length > 0 || olts.length > 0) && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Device Access (for Customer Creation)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select which devices this reseller can use when creating customers. If none selected, all devices are allowed.
                </p>
                
                {mikrotikRouters.length > 0 && (
                  <div className="space-y-2">
                    <Label>Allowed MikroTik Routers</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                      {mikrotikRouters.map((router) => (
                        <div key={router.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`mikrotik-${router.id}`}
                            checked={formData.allowed_mikrotik_ids.includes(router.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_mikrotik_ids: [...prev.allowed_mikrotik_ids, router.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_mikrotik_ids: prev.allowed_mikrotik_ids.filter(id => id !== router.id)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`mikrotik-${router.id}`} className="text-sm font-normal cursor-pointer">
                            {router.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {olts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Allowed OLTs</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                      {olts.map((olt) => (
                        <div key={olt.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`olt-${olt.id}`}
                            checked={formData.allowed_olt_ids.includes(olt.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_olt_ids: [...prev.allowed_olt_ids, olt.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_olt_ids: prev.allowed_olt_ids.filter(id => id !== olt.id)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`olt-${olt.id}`} className="text-sm font-normal cursor-pointer">
                            {olt.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* Deduct Balance Dialog */}
      <Dialog open={showDeductDialog} onOpenChange={(open) => {
        setShowDeductDialog(open);
        if (!open) {
          setDeductAmount('');
          setDeductReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-orange-600" />
              Deduct Balance - {selectedReseller?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedReseller && (
              <p className="text-sm text-muted-foreground">
                Current Balance: <span className="font-medium text-foreground">৳{selectedReseller.balance.toLocaleString()}</span>
              </p>
            )}
            <div className="space-y-2">
              <Label>Deduct Amount (৳) *</Label>
              <Input
                type="number"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={selectedReseller?.balance || undefined}
              />
              {selectedReseller && parseFloat(deductAmount) > selectedReseller.balance && (
                <p className="text-xs text-destructive">
                  Amount exceeds available balance
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                placeholder="Enter reason for deduction (required)"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeductDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeduct} 
                disabled={saving || !deductAmount || !deductReason.trim() || (selectedReseller && parseFloat(deductAmount) > selectedReseller.balance)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Deduct
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Reset Password - {selectedReseller?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={4}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>
            {newPassword.length > 0 && newPassword.length < 4 && (
              <p className="text-xs text-destructive">
                Password must be at least 4 characters
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordReset} 
                disabled={saving || !newPassword || newPassword.length < 4 || newPassword !== confirmPassword}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
