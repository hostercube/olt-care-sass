import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useTenantRoles } from '@/hooks/useTenantRoles';
import { Users, Plus, Edit, Loader2, DollarSign, Calendar, Key } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  role_id: string | null;
  department: string | null;
  designation: string | null;
  salary: number;
  salary_type: string;
  is_active: boolean;
  join_date: string | null;
  username: string | null;
  password: string | null;
  can_login: boolean;
}

interface SalaryPayment {
  id: string;
  staff_id: string;
  month: string;
  basic_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  status: string;
  payment_date: string | null;
}

export default function StaffPage() {
  const { tenantId } = useTenantContext();
  const { roles } = useTenantRoles();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    role_id: '',
    department: '',
    designation: '',
    salary: '0',
    salary_type: 'monthly',
    join_date: format(new Date(), 'yyyy-MM-dd'),
    username: '',
    password: '',
    can_login: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    basic_salary: '0',
    bonus: '0',
    deductions: '0',
  });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [staffRes, payRes] = await Promise.all([
        supabase.from('staff').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('salary_payments').select('*').eq('tenant_id', tenantId).order('month', { ascending: false }).limit(100),
      ]);
      setStaff((staffRes.data as any[]) || []);
      setPayments((payRes.data as any[]) || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveStaff = async () => {
    if (!tenantId || !staffForm.name) return;
    setSaving(true);
    try {
      const data: any = {
        tenant_id: tenantId,
        name: staffForm.name,
        email: staffForm.email || null,
        phone: staffForm.phone || null,
        role: staffForm.role,
        role_id: staffForm.role_id || null,
        department: staffForm.department || null,
        designation: staffForm.designation || null,
        salary: parseFloat(staffForm.salary) || 0,
        salary_type: staffForm.salary_type,
        join_date: staffForm.join_date || null,
        can_login: staffForm.can_login,
      };

      // Only update username/password if can_login is enabled
      if (staffForm.can_login) {
        if (staffForm.username) data.username = staffForm.username;
        if (staffForm.password) data.password = staffForm.password;
      }

      if (editingStaff) {
        await supabase.from('staff').update(data).eq('id', editingStaff.id);
        toast.success('Staff updated');
      } else {
        await supabase.from('staff').insert(data);
        toast.success('Staff added');
      }
      setShowStaffDialog(false);
      setEditingStaff(null);
      resetStaffForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySalary = async () => {
    if (!tenantId || !selectedStaff) return;
    setSaving(true);
    try {
      const netSalary = parseFloat(paymentForm.basic_salary) + parseFloat(paymentForm.bonus) - parseFloat(paymentForm.deductions);
      await supabase.from('salary_payments').insert({
        tenant_id: tenantId,
        staff_id: selectedStaff.id,
        month: paymentForm.month,
        basic_salary: parseFloat(paymentForm.basic_salary),
        bonus: parseFloat(paymentForm.bonus),
        deductions: parseFloat(paymentForm.deductions),
        net_salary: netSalary,
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Salary paid');
      setShowPaymentDialog(false);
      setSelectedStaff(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pay salary');
    } finally {
      setSaving(false);
    }
  };

  const resetStaffForm = () => {
    setStaffForm({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      role_id: '',
      department: '',
      designation: '',
      salary: '0',
      salary_type: 'monthly',
      join_date: format(new Date(), 'yyyy-MM-dd'),
      username: '',
      password: '',
      can_login: false,
    });
  };

  const handleEditStaff = (s: Staff) => {
    setEditingStaff(s);
    setStaffForm({
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      role: s.role,
      role_id: s.role_id || '',
      department: s.department || '',
      designation: s.designation || '',
      salary: s.salary.toString(),
      salary_type: s.salary_type,
      join_date: s.join_date || '',
      username: s.username || '',
      password: '',
      can_login: s.can_login || false,
    });
    setShowStaffDialog(true);
  };

  const openPaymentDialog = (s: Staff) => {
    setSelectedStaff(s);
    setPaymentForm({
      month: format(new Date(), 'yyyy-MM'),
      basic_salary: s.salary.toString(),
      bonus: '0',
      deductions: '0',
    });
    setShowPaymentDialog(true);
  };

  const activeStaff = staff.filter(s => s.is_active);
  const totalSalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);
  const thisMonthPayments = payments.filter(p => p.month === format(new Date(), 'yyyy-MM'));
  const paidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.net_salary, 0);

  return (
    <DashboardLayout
      title="Staff & Salary Management"
      subtitle="Manage employees and payroll"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{activeStaff.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-bold">৳{totalSalary.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">৳{paidThisMonth.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {activeStaff.length - thisMonthPayments.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff List</CardTitle>
            <CardDescription>Manage your employees</CardDescription>
          </div>
          <Button onClick={() => { resetStaffForm(); setEditingStaff(null); setShowStaffDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : staff.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No staff found</TableCell></TableRow>
                ) : (
                  staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="capitalize">{s.role}</TableCell>
                      <TableCell>{s.department || '-'}</TableCell>
                      <TableCell>{s.phone || '-'}</TableCell>
                      <TableCell>৳{s.salary.toLocaleString()}/{s.salary_type === 'monthly' ? 'mo' : 'hr'}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditStaff(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openPaymentDialog(s)}>
                          Pay Salary
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

      {/* Add/Edit Staff Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={staffForm.name} onChange={(e) => setStaffForm(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={staffForm.phone} onChange={(e) => setStaffForm(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={staffForm.email} onChange={(e) => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={staffForm.role_id || staffForm.role} 
                  onValueChange={(v) => {
                    const isRoleId = roles.some(r => r.id === v);
                    if (isRoleId) {
                      const role = roles.find(r => r.id === v);
                      setStaffForm(p => ({ ...p, role_id: v, role: role?.name.toLowerCase() || 'staff' }));
                    } else {
                      setStaffForm(p => ({ ...p, role: v, role_id: '' }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? (
                      roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="collector">Bill Collector</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={staffForm.department} onChange={(e) => setStaffForm(p => ({ ...p, department: e.target.value }))} placeholder="Technical" />
              </div>
            </div>
            
            {/* Login Credentials Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" /> Login Access
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable login credentials for this staff</p>
                </div>
                <Switch
                  checked={staffForm.can_login}
                  onCheckedChange={(checked) => setStaffForm(p => ({ ...p, can_login: checked }))}
                />
              </div>
              
              {staffForm.can_login && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input 
                      value={staffForm.username} 
                      onChange={(e) => setStaffForm(p => ({ ...p, username: e.target.value }))} 
                      placeholder="staff_username" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password {editingStaff ? '(leave empty to keep current)' : '*'}</Label>
                    <Input 
                      type="password"
                      value={staffForm.password} 
                      onChange={(e) => setStaffForm(p => ({ ...p, password: e.target.value }))} 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Salary (৳)</Label>
                <Input type="number" value={staffForm.salary} onChange={(e) => setStaffForm(p => ({ ...p, salary: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select value={staffForm.salary_type} onValueChange={(v) => setStaffForm(p => ({ ...p, salary_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Join Date</Label>
                <Input type="date" value={staffForm.join_date} onChange={(e) => setStaffForm(p => ({ ...p, join_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStaffDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff} disabled={saving || !staffForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Salary - {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={paymentForm.month} onChange={(e) => setPaymentForm(p => ({ ...p, month: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (৳)</Label>
                <Input type="number" value={paymentForm.basic_salary} onChange={(e) => setPaymentForm(p => ({ ...p, basic_salary: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bonus (৳)</Label>
                <Input type="number" value={paymentForm.bonus} onChange={(e) => setPaymentForm(p => ({ ...p, bonus: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Deductions (৳)</Label>
                <Input type="number" value={paymentForm.deductions} onChange={(e) => setPaymentForm(p => ({ ...p, deductions: e.target.value }))} />
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Net Salary</p>
              <p className="text-2xl font-bold">
                ৳{(parseFloat(paymentForm.basic_salary) + parseFloat(paymentForm.bonus) - parseFloat(paymentForm.deductions)).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handlePaySalary} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Pay Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
