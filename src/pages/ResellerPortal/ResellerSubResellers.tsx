import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Loader2, UserPlus, Plus, Wallet, Search, RefreshCcw, 
  MoreHorizontal, Edit, Eye, History, Minus,
  ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ResellerSubResellers() {
  const navigate = useNavigate();
  const { 
    session, 
    reseller, 
    loading, 
    subResellers, 
    transactions,
    logout, 
    createSubReseller, 
    fundSubReseller,
    deductSubReseller,
    updateSubReseller,
    refetch,
    hasPermission,
  } = useResellerPortal();
  
  const [activeTab, setActiveTab] = useState('list');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    address: '',
    username: '', 
    password: '', 
    can_add_customers: true, 
    can_edit_customers: true,
    can_recharge_customers: true,
    can_create_sub_reseller: false,
    can_view_sub_customers: false,
    commission_type: 'percentage',
    commission_value: '',
    rate_type: 'discount',
    max_customers: '0',
    max_sub_resellers: '0',
  });
  const [fundAmount, setFundAmount] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');

  useEffect(() => { 
    if (!loading && !session) navigate('/reseller/login'); 
  }, [loading, session, navigate]);

  // Filtered sub-resellers
  const filteredSubResellers = useMemo(() => {
    if (!searchTerm) return subResellers;
    const term = searchTerm.toLowerCase();
    return subResellers.filter(sub => 
      sub.name.toLowerCase().includes(term) ||
      sub.username.toLowerCase().includes(term) ||
      sub.phone?.toLowerCase().includes(term)
    );
  }, [subResellers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSubResellers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredSubResellers.length);
  const paginatedSubResellers = filteredSubResellers.slice(startIndex, endIndex);

  // Get transactions for selected sub-reseller
  const subResellerTransactions = useMemo(() => {
    if (!selectedSub) return [];
    return transactions.filter(t => 
      t.to_reseller_id === selectedSub.id || 
      t.from_reseller_id === selectedSub.id ||
      (t.reseller_id === selectedSub.id)
    ).slice(0, 50);
  }, [selectedSub, transactions]);

  // Stats
  const stats = useMemo(() => {
    const total = subResellers.length;
    const active = subResellers.filter(s => s.is_active).length;
    const totalBalance = subResellers.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalCustomers = subResellers.reduce((sum, s) => sum + (s.total_customers || 0), 0);
    return { total, active, totalBalance, totalCustomers };
  }, [subResellers]);

  const resetForm = () => {
    setFormData({ 
      name: '', 
      phone: '', 
      email: '',
      address: '',
      username: '', 
      password: '', 
      can_add_customers: true, 
      can_edit_customers: true,
      can_recharge_customers: true,
      can_create_sub_reseller: false,
      can_view_sub_customers: false,
      commission_type: 'percentage',
      commission_value: '',
      rate_type: 'discount',
      max_customers: '0',
      max_sub_resellers: '0',
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) { 
      toast.error('Name, username and password required'); 
      return; 
    }
    setSaving(true);
    const success = await createSubReseller({ 
      name: formData.name, 
      phone: formData.phone, 
      email: formData.email,
      address: formData.address,
      username: formData.username, 
      password: formData.password, 
      can_add_customers: formData.can_add_customers, 
      can_edit_customers: formData.can_edit_customers,
      can_recharge_customers: formData.can_recharge_customers,
      can_create_sub_reseller: formData.can_create_sub_reseller,
      can_view_sub_customers: formData.can_view_sub_customers,
      max_customers: parseInt(formData.max_customers) || 0,
      max_sub_resellers: parseInt(formData.max_sub_resellers) || 0,
    } as any);
    setSaving(false);
    if (success) { 
      setShowAddDialog(false); 
      resetForm();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !formData.name) return;
    
    setSaving(true);
    const success = await updateSubReseller(selectedSub.id, {
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      can_add_customers: formData.can_add_customers,
      can_edit_customers: formData.can_edit_customers,
      can_recharge_customers: formData.can_recharge_customers,
      can_create_sub_reseller: formData.can_create_sub_reseller,
      can_view_sub_customers: formData.can_view_sub_customers,
      max_customers: parseInt(formData.max_customers) || 0,
      max_sub_resellers: parseInt(formData.max_sub_resellers) || 0,
    } as any);
    setSaving(false);
    if (success) {
      setShowEditDialog(false);
      setSelectedSub(null);
      resetForm();
    }
  };

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !fundAmount) return;
    setSaving(true);
    const success = await fundSubReseller(selectedSub.id, parseFloat(fundAmount), `Balance transfer to ${selectedSub.name}`);
    setSaving(false);
    if (success) { 
      setShowFundDialog(false); 
      setSelectedSub(null); 
      setFundAmount(''); 
    }
  };

  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !deductAmount) return;
    
    const amount = parseFloat(deductAmount);
    if (amount > selectedSub.balance) {
      toast.error('Deduct amount cannot exceed sub-reseller balance');
      return;
    }
    
    setSaving(true);
    const success = await deductSubReseller(
      selectedSub.id, 
      amount, 
      deductReason || `Balance deducted from ${selectedSub.name}`
    );
    setSaving(false);
    if (success) { 
      setShowDeductDialog(false); 
      setSelectedSub(null); 
      setDeductAmount('');
      setDeductReason('');
    }
  };

  const openEditDialog = (sub: any) => {
    setSelectedSub(sub);
    setFormData({
      name: sub.name,
      phone: sub.phone || '',
      email: sub.email || '',
      address: sub.address || '',
      username: sub.username,
      password: '',
      can_add_customers: sub.can_add_customers ?? true,
      can_edit_customers: sub.can_edit_customers ?? true,
      can_recharge_customers: sub.can_recharge_customers ?? true,
      can_create_sub_reseller: sub.can_create_sub_reseller ?? false,
      can_view_sub_customers: sub.can_view_sub_customers ?? false,
      commission_type: sub.commission_type || 'percentage',
      commission_value: sub.commission_value?.toString() || '',
      rate_type: sub.rate_type || 'discount',
      max_customers: sub.max_customers?.toString() || '0',
      max_sub_resellers: sub.max_sub_resellers?.toString() || '0',
    });
    setShowEditDialog(true);
  };

  const openHistoryDialog = (sub: any) => {
    setSelectedSub(sub);
    setShowHistoryDialog(true);
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCreate = reseller?.can_create_sub_reseller && (reseller.max_sub_resellers === 0 || subResellers.length < reseller.max_sub_resellers);

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <UserPlus className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wallet className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-xl font-bold text-blue-600">৳{stats.totalBalance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <UserPlus className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="list">Sub-Resellers</TabsTrigger>
              <TabsTrigger value="history">Balance History</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {canCreate && (
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sub-Reseller
                </Button>
              )}
            </div>
          </div>

          {/* Sub-Resellers List */}
          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Sub-Resellers ({filteredSubResellers.length})
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Username</TableHead>
                        <TableHead className="hidden md:table-cell">Phone</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead className="hidden lg:table-cell">Customers</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSubResellers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No sub-resellers found
                          </TableCell>
                        </TableRow>
                      ) : paginatedSubResellers.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">@{sub.username}</TableCell>
                          <TableCell className="hidden md:table-cell">{sub.phone || '-'}</TableCell>
                          <TableCell className="font-medium text-blue-600">
                            ৳{(sub.balance || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{sub.total_customers || 0}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{RESELLER_ROLE_LABELS[sub.role] || sub.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border border-border">
                                {reseller?.can_transfer_balance && (
                                  <>
                                    <DropdownMenuItem onClick={() => { setSelectedSub(sub); setShowFundDialog(true); }}>
                                      <ArrowUpRight className="h-4 w-4 mr-2 text-green-600" />
                                      Add Balance
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedSub(sub); setShowDeductDialog(true); }}>
                                      <ArrowDownLeft className="h-4 w-4 mr-2 text-red-600" />
                                      Deduct Balance
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openHistoryDialog(sub)}>
                                  <History className="h-4 w-4 mr-2" />
                                  Transaction History
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredSubResellers.length > 0 && (
                  <TablePagination
                    totalItems={filteredSubResellers.length}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Balance Transfer History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>To/From</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.filter(t => t.type === 'transfer_out' || t.type === 'transfer_in').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transfer history
                          </TableCell>
                        </TableRow>
                      ) : transactions.filter(t => t.type === 'transfer_out' || t.type === 'transfer_in').slice(0, 50).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'transfer_out' ? 'destructive' : 'default'}>
                              {tx.type === 'transfer_out' ? 'Sent' : 'Received'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.type === 'transfer_out' 
                              ? subResellers.find(s => s.id === tx.to_reseller_id)?.name || 'Unknown'
                              : subResellers.find(s => s.id === tx.from_reseller_id)?.name || reseller?.name || 'Unknown'
                            }
                          </TableCell>
                          <TableCell className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                            {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {tx.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Sub-Reseller Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Sub-Reseller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Discount/Commission Rate (%)</Label>
                <Input 
                  type="number" 
                  value={formData.commission_value} 
                  onChange={(e) => setFormData({...formData, commission_value: e.target.value})} 
                  placeholder="e.g. 10"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Discount on recharge amount</p>
              </div>
              <div className="space-y-2">
                <Label>Max Customers (0 = Unlimited)</Label>
                <Input type="number" value={formData.max_customers} onChange={(e) => setFormData({...formData, max_customers: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Add Customers</Label>
                  <Switch checked={formData.can_add_customers} onCheckedChange={(c) => setFormData({...formData, can_add_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Edit Customers</Label>
                  <Switch checked={formData.can_edit_customers} onCheckedChange={(c) => setFormData({...formData, can_edit_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Recharge</Label>
                  <Switch checked={formData.can_recharge_customers} onCheckedChange={(c) => setFormData({...formData, can_recharge_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Create Sub-Reseller</Label>
                  <Switch checked={formData.can_create_sub_reseller} onCheckedChange={(c) => setFormData({...formData, can_create_sub_reseller: c})} />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub-Reseller Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(o) => { setShowEditDialog(o); if (!o) { setSelectedSub(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sub-Reseller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Discount/Commission Rate (%)</Label>
                <Input 
                  type="number" 
                  value={formData.commission_value} 
                  onChange={(e) => setFormData({...formData, commission_value: e.target.value})} 
                  placeholder="e.g. 10"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Customers (0 = Unlimited)</Label>
                <Input type="number" value={formData.max_customers} onChange={(e) => setFormData({...formData, max_customers: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Add Customers</Label>
                  <Switch checked={formData.can_add_customers} onCheckedChange={(c) => setFormData({...formData, can_add_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Edit Customers</Label>
                  <Switch checked={formData.can_edit_customers} onCheckedChange={(c) => setFormData({...formData, can_edit_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Recharge</Label>
                  <Switch checked={formData.can_recharge_customers} onCheckedChange={(c) => setFormData({...formData, can_recharge_customers: c})} />
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <Label className="text-sm">Create Sub-Reseller</Label>
                  <Switch checked={formData.can_create_sub_reseller} onCheckedChange={(c) => setFormData({...formData, can_create_sub_reseller: c})} />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fund (Add Balance) Dialog */}
      <Dialog open={showFundDialog} onOpenChange={(o) => { setShowFundDialog(o); if (!o) { setSelectedSub(null); setFundAmount(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Balance to {selectedSub?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFund} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><strong>Your Balance:</strong> ৳{(reseller?.balance || 0).toLocaleString()}</p>
              <p><strong>Their Balance:</strong> ৳{(selectedSub?.balance || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input 
                type="number" 
                value={fundAmount} 
                onChange={(e) => setFundAmount(e.target.value)} 
                placeholder="Enter amount"
                max={reseller?.balance || 0}
                required 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFundDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deduct Balance Dialog */}
      <Dialog open={showDeductDialog} onOpenChange={(o) => { setShowDeductDialog(o); if (!o) { setSelectedSub(null); setDeductAmount(''); setDeductReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deduct Balance from {selectedSub?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeduct} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><strong>Their Balance:</strong> ৳{(selectedSub?.balance || 0).toLocaleString()}</p>
              <p><strong>Your Balance:</strong> ৳{(reseller?.balance || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input 
                type="number" 
                value={deductAmount} 
                onChange={(e) => setDeductAmount(e.target.value)} 
                placeholder="Enter amount"
                max={selectedSub?.balance || 0}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input 
                value={deductReason} 
                onChange={(e) => setDeductReason(e.target.value)} 
                placeholder="Reason for deduction"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeductDialog(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Deduct
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={(o) => { setShowHistoryDialog(o); if (!o) setSelectedSub(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History - {selectedSub?.name}</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subResellerTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : subResellerTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.amount < 0 ? 'destructive' : 'default'}>
                        {tx.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                      {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>৳{(tx.balance_after || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {tx.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </ResellerPortalLayout>
  );
}
