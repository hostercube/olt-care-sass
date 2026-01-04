import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useCustomers } from '@/hooks/useCustomers';
import { useISPPackages } from '@/hooks/useISPPackages';
import { useMikroTikSync } from '@/hooks/useMikroTikSync';
import { supabase } from '@/integrations/supabase/client';
import { AddCustomerDialog } from '@/components/isp/AddCustomerDialog';
import { EditCustomerDialog } from '@/components/isp/EditCustomerDialog';
import { ImportCustomersDialog } from '@/components/isp/ImportCustomersDialog';
import { BulkActionsToolbar } from '@/components/isp/BulkActionsToolbar';
import { 
  Users, UserPlus, Search, MoreHorizontal, Eye, Edit, Trash2, 
  RefreshCw, UserCheck, UserX, Clock, Ban, Download, Upload
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer, CustomerStatus } from '@/types/isp';
import { format, addDays } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useTablePagination, PaginationControls } from '@/components/common/TableWithPagination';
import { toast } from 'sonner';

const statusConfig: Record<CustomerStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  active: { label: 'Active', variant: 'default', icon: UserCheck },
  expired: { label: 'Expired', variant: 'destructive', icon: Clock },
  suspended: { label: 'Suspended', variant: 'destructive', icon: Ban },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: UserX },
};

export default function CustomerManagement() {
  const navigate = useNavigate();
  const { customers, loading, stats, refetch, deleteCustomer } = useCustomers();
  const { packages } = useISPPackages();
  const { deletePPPoEUser, togglePPPoEUser } = useMikroTikSync();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.pppoe_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customer_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Pagination
  const {
    paginatedData: paginatedCustomers,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    handlePageSizeChange,
  } = useTablePagination(filteredCustomers, 10);

  const selectedCustomers = useMemo(() => {
    return customers.filter(c => selectedIds.has(c.id));
  }, [customers, selectedIds]);

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

  const setServiceStatus = useCallback(async (customer: Customer, nextStatus: CustomerStatus) => {
    try {
      // Sync MikroTik first (so DB status matches real network state)
      if (customer.mikrotik_id && customer.pppoe_username) {
        const disabled = nextStatus === 'suspended';
        await togglePPPoEUser(customer.mikrotik_id, customer.pppoe_username, disabled);
      }

      const now = new Date().toISOString();
      const patch: any = { status: nextStatus };
      if (nextStatus === 'active') patch.last_activated_at = now;
      if (nextStatus === 'suspended') patch.last_deactivated_at = now;

      const { error } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', customer.id);

      if (error) throw error;

      toast.success(`Customer ${nextStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch (err: any) {
      console.error('Failed to set service status:', err);
      toast.error(err?.message || 'Failed to update status');
      throw err;
    }
  }, [togglePPPoEUser]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    // Keep DB + MikroTik consistent: delete from MikroTik first (if linked)
    if (deleteConfirm.mikrotik_id && deleteConfirm.pppoe_username) {
      const ok = await deletePPPoEUser(deleteConfirm.mikrotik_id, deleteConfirm.pppoe_username);
      if (!ok) return;
    }

    await deleteCustomer(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Bulk action handlers
  const handleBulkDelete = useCallback(async (customerIds: string[]) => {
    let deleted = 0;
    for (const id of customerIds) {
      const customer = customers.find(c => c.id === id);
      if (!customer) continue;

      // Delete from MikroTik if linked
      if (customer.mikrotik_id && customer.pppoe_username) {
        await deletePPPoEUser(customer.mikrotik_id, customer.pppoe_username);
      }

      await deleteCustomer(id);
      deleted++;
    }
    toast.success(`${deleted} customers deleted`);
    refetch();
  }, [customers, deletePPPoEUser, deleteCustomer, refetch]);

  const handleBulkRecharge = useCallback(async (customerIds: string[], months: number) => {
    let recharged = 0;
    for (const id of customerIds) {
      const customer = customers.find(c => c.id === id);
      if (!customer) continue;

      // Calculate new expiry
      const currentExpiry = customer.expiry_date 
        ? new Date(customer.expiry_date)
        : new Date();
      
      // Get package validity or default to 30 days per month
      const pkg = packages.find(p => p.id === customer.package_id);
      const daysPerMonth = pkg?.validity_days || 30;
      
      const newExpiry = addDays(currentExpiry, daysPerMonth * months);

      const { error } = await supabase
        .from('customers')
        .update({
          expiry_date: newExpiry.toISOString().split('T')[0],
          status: 'active',
          last_payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (!error) recharged++;
    }
    toast.success(`${recharged} customers recharged for ${months} month(s)`);
    refetch();
  }, [customers, packages, refetch]);

  const handleBulkPackageChange = useCallback(async (customerIds: string[], packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    const { error } = await supabase
      .from('customers')
      .update({
        package_id: packageId,
        monthly_bill: pkg.price,
      })
      .in('id', customerIds);

    if (error) {
      toast.error('Failed to update packages');
      return;
    }

    toast.success(`${customerIds.length} customers updated to ${pkg.name}`);
    refetch();
  }, [packages, refetch]);

  const handleBulkNetworkEnable = useCallback(async (customerIds: string[]) => {
    let enabled = 0;
    for (const id of customerIds) {
      const customer = customers.find(c => c.id === id);
      if (!customer) continue;

      await setServiceStatus(customer, 'active');
      enabled++;
    }
    toast.success(`${enabled} customers enabled`);
    refetch();
  }, [customers, setServiceStatus, refetch]);

  const handleBulkNetworkDisable = useCallback(async (customerIds: string[]) => {
    let disabled = 0;
    for (const id of customerIds) {
      const customer = customers.find(c => c.id === id);
      if (!customer) continue;

      await setServiceStatus(customer, 'suspended');
      disabled++;
    }
    toast.success(`${disabled} customers disabled`);
    refetch();
  }, [customers, setServiceStatus, refetch]);

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

  return (
    <DashboardLayout
      title="Customer Management"
      subtitle="Manage ISP customers, packages, and billing"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <span className="text-yellow-600 font-bold text-lg">৳</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold text-yellow-600">৳{stats.totalDue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Customers</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, PPPoE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions Toolbar */}
          <BulkActionsToolbar
            selectedCustomers={selectedCustomers}
            packages={packages}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkRecharge={handleBulkRecharge}
            onBulkPackageChange={handleBulkPackageChange}
            onBulkNetworkEnable={handleBulkNetworkEnable}
            onBulkNetworkDisable={handleBulkNetworkDisable}
          />

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
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
                    <TableHead>Phone</TableHead>
                    <TableHead>PPPoE</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Due</TableHead>
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
                      const statusInfo = statusConfig[customer.status];
                      const StatusIcon = statusInfo.icon;
                      return (
                        <TableRow key={customer.id} className={selectedIds.has(customer.id) ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(customer.id)}
                              onCheckedChange={() => toggleSelection(customer.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {customer.customer_code || '-'}
                          </TableCell>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {customer.pppoe_username || '-'}
                          </TableCell>
                          <TableCell>
                            {customer.package?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {customer.expiry_date 
                              ? format(new Date(customer.expiry_date), 'dd MMM yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {customer.due_amount > 0 ? (
                              <span className="text-red-600 font-medium">
                                ৳{customer.due_amount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-green-600">৳0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border border-border">
                                <DropdownMenuItem onClick={() => navigate(`/isp/customers/${customer.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditCustomer(customer)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {customer.status !== 'active' && (
                                  <DropdownMenuItem onClick={() => setServiceStatus(customer, 'active')}>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                {customer.status === 'active' && (
                                  <DropdownMenuItem onClick={() => setServiceStatus(customer, 'suspended')}>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirm(customer)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={goToPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddCustomerDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          refetch();
        }}
      />

      {editCustomer && (
        <EditCustomerDialog
          customer={editCustomer}
          open={!!editCustomer}
          onOpenChange={(open) => !open && setEditCustomer(null)}
          onSuccess={() => {
            setEditCustomer(null);
            refetch();
          }}
        />
      )}

      <ImportCustomersDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={() => {
          setShowImportDialog(false);
          refetch();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
