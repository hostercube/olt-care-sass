import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Loader2, Users, Plus, Edit, RefreshCcw, Search, Filter, X, Eye, 
  MoreHorizontal, UserCheck, Clock, Ban, UserX, RotateCcw, CreditCard,
  Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Wifi, WifiOff
} from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { SharedCustomerDialog, type SharedCustomerDialogData } from '@/components/isp/SharedCustomerDialog';
import { toast } from 'sonner';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay, addDays } from 'date-fns';

type CustomerStatus = 'active' | 'expired' | 'suspended' | 'pending' | 'cancelled' | 'inactive';

const statusConfig: Record<CustomerStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  active: { label: 'Active', variant: 'default', icon: UserCheck },
  expired: { label: 'Expired', variant: 'destructive', icon: Clock },
  suspended: { label: 'Suspended', variant: 'destructive', icon: Ban },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: UserX },
  inactive: { label: 'Inactive', variant: 'secondary', icon: UserX },
};

interface FilterState {
  status: string;
  package: string;
  area: string;
  mikrotik: string;
  expiryFilter: string;
  expiryDateFrom: Date | undefined;
  expiryDateTo: Date | undefined;
}

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
    olts,
    logout,
    createCustomer,
    updateCustomer,
    rechargeCustomer,
    refetch,
    hasPermission,
  } = useResellerPortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('all');

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    package: 'all',
    area: 'all',
    mikrotik: 'all',
    expiryFilter: 'all',
    expiryDateFrom: undefined,
    expiryDateTo: undefined,
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

  useEffect(() => {
    if (searchParams.get('action') === 'add' && hasPermission('customer_create')) {
      setShowAddDialog(true);
    }
  }, [searchParams, hasPermission]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const expired = customers.filter(c => c.status === 'expired').length;
    const suspended = customers.filter(c => c.status === 'suspended').length;
    const pending = customers.filter(c => c.status === 'pending' || c.status === 'inactive').length;
    const totalDue = customers.reduce((sum, c) => sum + (c.due_amount || 0), 0);
    return { total, active, expired, suspended, pending, totalDue };
  }, [customers]);

  // Filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.package !== 'all') count++;
    if (filters.area !== 'all') count++;
    if (filters.mikrotik !== 'all') count++;
    if (filters.expiryFilter !== 'all') count++;
    if (filters.expiryDateFrom || filters.expiryDateTo) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      status: 'all',
      package: 'all',
      area: 'all',
      mikrotik: 'all',
      expiryFilter: 'all',
      expiryDateFrom: undefined,
      expiryDateTo: undefined,
    });
    setActiveTab('all');
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const today = startOfDay(new Date());
    
    return customers.filter(customer => {
      // Search filter
      const matchesSearch = !searchTerm || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.pppoe_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customer_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab !== 'all' && customer.status !== activeTab) return false;

      // Status filter
      if (filters.status !== 'all' && customer.status !== filters.status) return false;

      // Package filter
      if (filters.package !== 'all' && customer.package_id !== filters.package) return false;

      // Area filter
      if (filters.area !== 'all' && customer.area?.id !== filters.area) return false;

      // MikroTik filter
      if (filters.mikrotik !== 'all' && customer.mikrotik_id !== filters.mikrotik) return false;

      // Expiry status filter
      if (filters.expiryFilter !== 'all') {
        const expiryDate = customer.expiry_date ? startOfDay(parseISO(customer.expiry_date)) : null;
        
        switch (filters.expiryFilter) {
          case 'expired':
            if (!expiryDate || !isBefore(expiryDate, today)) return false;
            break;
          case 'expiring_today':
            if (!expiryDate || expiryDate.getTime() !== today.getTime()) return false;
            break;
          case 'expiring_week':
            const weekFromNow = addDays(today, 7);
            if (!expiryDate || isBefore(expiryDate, today) || isAfter(expiryDate, weekFromNow)) return false;
            break;
          case 'expiring_month':
            const monthFromNow = addDays(today, 30);
            if (!expiryDate || isBefore(expiryDate, today) || isAfter(expiryDate, monthFromNow)) return false;
            break;
        }
      }

      // Expiry date range filter
      if (filters.expiryDateFrom || filters.expiryDateTo) {
        const expDate = customer.expiry_date ? parseISO(customer.expiry_date) : null;
        if (!expDate) return false;
        if (filters.expiryDateFrom && isBefore(expDate, startOfDay(filters.expiryDateFrom))) return false;
        if (filters.expiryDateTo && isAfter(expDate, endOfDay(filters.expiryDateTo))) return false;
      }

      return true;
    });
  }, [customers, searchTerm, activeTab, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCustomers.length);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, filters, pageSize]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCustomers.map(c => c.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Context data for SharedCustomerDialog
  const dialogContextData = useMemo<SharedCustomerDialogData>(() => ({
    packages: packages.map(p => ({ ...p, validity_days: 30 })),
    areas: areas.map(a => ({ id: a.id, name: a.name })),
    mikrotikRouters,
    tenantId: reseller?.tenant_id || '',
    resellerId: reseller?.id,
  }), [packages, areas, mikrotikRouters, reseller]);

  const handleCreateCustomer = async (data: any): Promise<boolean> => {
    return await createCustomer(data);
  };

  const handleUpdateCustomer = async (id: string, data: any): Promise<boolean> => {
    return await updateCustomer(id, data);
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

  const openViewDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setShowViewDialog(true);
  };

  const exportCSV = () => {
    const headers = ['Code', 'Name', 'Phone', 'PPPoE', 'Package', 'Status', 'Expiry', 'Due'];
    const rows = filteredCustomers.map(c => [
      c.customer_code || '',
      c.name,
      c.phone || '',
      c.pppoe_username || '',
      c.package?.name || '',
      c.status,
      c.expiry_date || '',
      c.due_amount || 0,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
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
                  <UserCheck className="h-5 w-5 text-green-500" />
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
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Clock className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Ban className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.suspended}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <span className="text-yellow-600 font-bold text-lg">৳</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Due</p>
                  <p className="text-xl font-bold text-yellow-600">৳{stats.totalDue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <TabsList className="grid grid-cols-5 w-full lg:w-auto">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({stats.expired})</TabsTrigger>
              <TabsTrigger value="suspended">Suspended ({stats.suspended})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasPermission('customer_create') && (
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {/* Search & Filters */}
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, phone, PPPoE, code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      variant={showFilters ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setShowFilters(!showFilters)}
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">Package</Label>
                        <Select value={filters.package} onValueChange={(v) => setFilters(f => ({ ...f, package: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All Packages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Packages</SelectItem>
                            {packages.map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Area</Label>
                        <Select value={filters.area} onValueChange={(v) => setFilters(f => ({ ...f, area: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All Areas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Areas</SelectItem>
                            {areas.map(area => (
                              <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">MikroTik</Label>
                        <Select value={filters.mikrotik} onValueChange={(v) => setFilters(f => ({ ...f, mikrotik: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All Routers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Routers</SelectItem>
                            {mikrotikRouters.map(router => (
                              <SelectItem key={router.id} value={router.id}>{router.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Expiry Status</Label>
                        <Select value={filters.expiryFilter} onValueChange={(v) => setFilters(f => ({ ...f, expiryFilter: v }))}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="expired">Already Expired</SelectItem>
                            <SelectItem value="expiring_today">Expiring Today</SelectItem>
                            <SelectItem value="expiring_week">Expiring in 7 Days</SelectItem>
                            <SelectItem value="expiring_month">Expiring in 30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Selection Info */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg mb-4">
                    <span className="font-medium">{selectedIds.size} customer(s) selected</span>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                  </div>
                )}

                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="hidden md:table-cell">PPPoE</TableHead>
                        <TableHead className="hidden lg:table-cell">Package</TableHead>
                        <TableHead className="hidden lg:table-cell">Expiry</TableHead>
                        <TableHead className="hidden xl:table-cell">Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedCustomers.map((customer) => {
                          const status = customer.status as CustomerStatus;
                          const statusInfo = statusConfig[status] || statusConfig.pending;
                          const StatusIcon = statusInfo.icon;
                          return (
                            <TableRow key={customer.id} className={selectedIds.has(customer.id) ? 'bg-primary/5' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(customer.id)}
                                  onCheckedChange={() => toggleSelection(customer.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {customer.customer_code || '-'}
                              </TableCell>
                              <TableCell>
                                <button 
                                  onClick={() => openViewDialog(customer)}
                                  className="font-medium text-primary hover:underline cursor-pointer text-left"
                                >
                                  {customer.name}
                                </button>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{customer.phone || '-'}</TableCell>
                              <TableCell className="hidden md:table-cell font-mono text-xs">
                                {customer.pppoe_username || '-'}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {customer.package?.name || '-'}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {customer.expiry_date 
                                  ? format(new Date(customer.expiry_date), 'dd MMM yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                {(customer.due_amount || 0) > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    ৳{(customer.due_amount || 0).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-green-600">৳0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusInfo.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  <span className="hidden sm:inline">{statusInfo.label}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {hasPermission('customer_view_profile') && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => openViewDialog(customer)}
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {hasPermission('customer_recharge') && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => openRechargeDialog(customer)}
                                      title="Recharge"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-popover border border-border">
                                      {hasPermission('customer_view_profile') && (
                                        <DropdownMenuItem onClick={() => openViewDialog(customer)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission('customer_edit') && (
                                        <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission('customer_recharge') && (
                                        <DropdownMenuItem onClick={() => openRechargeDialog(customer)}>
                                          <RotateCcw className="h-4 w-4 mr-2" />
                                          Recharge
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission('network_enable') && customer.status === 'suspended' && (
                                        <DropdownMenuItem onClick={() => updateCustomer(customer.id, { status: 'active' })}>
                                          <Wifi className="h-4 w-4 mr-2" />
                                          Enable Network
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission('network_disable') && customer.status === 'active' && (
                                        <DropdownMenuItem onClick={() => updateCustomer(customer.id, { status: 'suspended' })}>
                                          <WifiOff className="h-4 w-4 mr-2" />
                                          Disable Network
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredCustomers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Show</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => setPageSize(Number(v))}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>
                        Showing {startIndex + 1} to {endIndex} of {filteredCustomers.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="mx-2">
                        Page {currentPage} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Customer Dialog - Using SharedCustomerDialog */}
      <SharedCustomerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => refetch()}
        contextData={dialogContextData}
        onCreateCustomer={handleCreateCustomer}
        mode="add"
        permissions={{
          canEditStatus: hasPermission('customer_status_change'),
          canEditMikroTik: hasPermission('mikrotik_view'),
          canEditPPPoE: true,
          showReseller: false,
        }}
      />

      {/* Edit Customer Dialog - Using SharedCustomerDialog */}
      <SharedCustomerDialog
        open={showEditDialog}
        onOpenChange={(open) => { 
          setShowEditDialog(open); 
          if (!open) setSelectedCustomer(null); 
        }}
        onSuccess={() => refetch()}
        contextData={dialogContextData}
        onCreateCustomer={handleCreateCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        mode="edit"
        customer={selectedCustomer}
        permissions={{
          canEditStatus: hasPermission('customer_status_change'),
          canEditMikroTik: hasPermission('mikrotik_view'),
          canEditPPPoE: hasPermission('customer_edit'),
          showReseller: false,
        }}
      />

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={(open) => { setShowRechargeDialog(open); if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recharge Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecharge} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>Customer:</strong> {selectedCustomer?.name}</p>
              <p><strong>Package:</strong> {selectedCustomer?.package?.name || 'N/A'}</p>
              <p><strong>Your Balance:</strong> ৳{(reseller?.balance || 0).toLocaleString()}</p>
            </div>
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
              <Label>Months</Label>
              <Select value={rechargeData.months} onValueChange={(v) => setRechargeData({ ...rechargeData, months: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map((m) => (
                    <SelectItem key={m} value={m.toString()}>{m} Month{m > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRechargeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Recharge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={(open) => { setShowViewDialog(open); if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedCustomer.customer_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedCustomer.status as CustomerStatus]?.variant || 'secondary'}>
                    {statusConfig[selectedCustomer.status as CustomerStatus]?.label || selectedCustomer.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedCustomer.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Package</p>
                  <p className="font-medium">{selectedCustomer.package?.name || 'N/A'}</p>
                </div>
                {hasPermission('customer_view_balance') && (
                  <div>
                    <p className="text-muted-foreground">Monthly Bill</p>
                    <p className="font-medium">৳{(selectedCustomer.monthly_bill || 0).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">PPPoE Username</p>
                  <p className="font-medium font-mono">{selectedCustomer.pppoe_username || 'N/A'}</p>
                </div>
                {hasPermission('customer_view_balance') && (
                  <div>
                    <p className="text-muted-foreground">Due Amount</p>
                    <p className="font-medium text-red-600">৳{(selectedCustomer.due_amount || 0).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Connection Date</p>
                  <p className="font-medium">
                    {selectedCustomer.connection_date 
                      ? format(new Date(selectedCustomer.connection_date), 'dd MMM yyyy') 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">
                    {selectedCustomer.expiry_date 
                      ? format(new Date(selectedCustomer.expiry_date), 'dd MMM yyyy') 
                      : 'N/A'}
                  </p>
                </div>
                {hasPermission('onu_view_mac') && selectedCustomer.onu_mac && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">ONU MAC</p>
                    <p className="font-medium font-mono">{selectedCustomer.onu_mac}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {hasPermission('network_enable') && selectedCustomer.status === 'suspended' && (
                  <Button variant="outline" onClick={() => { updateCustomer(selectedCustomer.id, { status: 'active' }); setShowViewDialog(false); }}>
                    <Wifi className="h-4 w-4 mr-2" />
                    Enable
                  </Button>
                )}
                {hasPermission('network_disable') && selectedCustomer.status === 'active' && (
                  <Button variant="outline" onClick={() => { updateCustomer(selectedCustomer.id, { status: 'suspended' }); setShowViewDialog(false); }}>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                )}
                {hasPermission('customer_recharge') && (
                  <Button onClick={() => { setShowViewDialog(false); openRechargeDialog(selectedCustomer); }}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Recharge
                  </Button>
                )}
                {hasPermission('customer_edit') && (
                  <Button variant="outline" onClick={() => { setShowViewDialog(false); openEditDialog(selectedCustomer); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ResellerPortalLayout>
  );
}
