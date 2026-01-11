import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useTenantRoles } from '@/hooks/useTenantRoles';
import { 
  Users, Plus, Edit, Loader2, DollarSign, Calendar as CalendarIcon, Key, 
  Clock, CheckCircle, XCircle, AlertCircle, Search, RefreshCw, 
  UserCheck, Receipt, History, Download, Banknote, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface Attendance {
  id: string;
  staff_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
  late_minutes: number;
  overtime_minutes: number;
  notes: string | null;
  source: string;
}

interface SalaryPayment {
  id: string;
  staff_id: string;
  month: string;
  basic_salary: number;
  bonus: number;
  deductions: number;
  overtime_pay: number;
  late_deduction: number;
  absent_deduction: number;
  net_salary: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  status: string;
  payment_date: string | null;
  payment_method: string;
  transaction_ref: string | null;
  staff?: Staff;
}

interface PayrollRun {
  id: string;
  month: string;
  status: string;
  total_staff: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  processed_at: string | null;
  notes: string | null;
}

export default function StaffPayroll() {
  const { tenantId } = useTenantContext();
  const { roles } = useTenantRoles();
  const [activeTab, setActiveTab] = useState('staff');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showProcessPayrollDialog, setShowProcessPayrollDialog] = useState(false);

  // Selected items
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  // Forms
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', phone: '', role: 'staff', role_id: '',
    department: '', designation: '', salary: '0', salary_type: 'monthly',
    join_date: format(new Date(), 'yyyy-MM-dd'), username: '', password: '', can_login: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    basic_salary: '0', bonus: '0', deductions: '0', overtime_pay: '0',
    late_deduction: '0', absent_deduction: '0', payment_method: 'cash',
    transaction_ref: '', present_days: '0', absent_days: '0', late_days: '0',
  });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [staffRes, attRes, payRes, runRes] = await Promise.all([
        supabase.from('staff').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('staff_attendance').select('*').eq('tenant_id', tenantId)
          .gte('date', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
          .lte('date', format(endOfMonth(new Date()), 'yyyy-MM-dd')),
        supabase.from('salary_payments').select('*').eq('tenant_id', tenantId)
          .order('month', { ascending: false }).limit(200),
        supabase.from('payroll_runs').select('*').eq('tenant_id', tenantId)
          .order('month', { ascending: false }).limit(24),
      ]);
      setStaff((staffRes.data as any[]) || []);
      setAttendance((attRes.data as any[]) || []);
      setPayments((payRes.data as any[]) || []);
      setPayrollRuns((runRes.data as any[]) || []);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const activeStaff = staff.filter(s => s.is_active);
  const totalSalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);
  const thisMonthPayments = payments.filter(p => p.month === format(new Date(), 'yyyy-MM'));
  const paidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.net_salary, 0);
  const pendingPayments = activeStaff.length - thisMonthPayments.length;

  // Attendance stats for today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;

  // ============= STAFF MANAGEMENT =============
  const resetStaffForm = () => {
    setStaffForm({
      name: '', email: '', phone: '', role: 'staff', role_id: '',
      department: '', designation: '', salary: '0', salary_type: 'monthly',
      join_date: format(new Date(), 'yyyy-MM-dd'), username: '', password: '', can_login: false,
    });
  };

  const handleEditStaff = (s: Staff) => {
    setEditingStaff(s);
    setStaffForm({
      name: s.name, email: s.email || '', phone: s.phone || '',
      role: s.role, role_id: s.role_id || '', department: s.department || '',
      designation: s.designation || '', salary: s.salary.toString(),
      salary_type: s.salary_type, join_date: s.join_date || '',
      username: s.username || '', password: '', can_login: s.can_login || false,
    });
    setShowStaffDialog(true);
  };

  const handleSaveStaff = async () => {
    if (!tenantId || !staffForm.name) return;
    setSaving(true);
    try {
      const data: any = {
        tenant_id: tenantId, name: staffForm.name, email: staffForm.email || null,
        phone: staffForm.phone || null, role: staffForm.role, role_id: staffForm.role_id || null,
        department: staffForm.department || null, designation: staffForm.designation || null,
        salary: parseFloat(staffForm.salary) || 0, salary_type: staffForm.salary_type,
        join_date: staffForm.join_date || null, can_login: staffForm.can_login,
      };
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

  // ============= ATTENDANCE =============
  const handleMarkAttendance = async (staffMember: Staff, status: string) => {
    if (!tenantId) return;
    const dateStr = format(attendanceDate, 'yyyy-MM-dd');
    const now = new Date();
    const checkIn = status === 'present' || status === 'late' ? format(now, 'HH:mm:ss') : null;
    
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('staff_id', staffMember.id)
        .eq('date', dateStr)
        .single();

      if (existing) {
        await supabase.from('staff_attendance')
          .update({ status, check_in: checkIn, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('staff_attendance').insert({
          tenant_id: tenantId, staff_id: staffMember.id, date: dateStr,
          status, check_in: checkIn, source: 'manual',
        });
      }
      toast.success(`${staffMember.name} marked as ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark attendance');
    }
  };

  const getAttendanceForStaff = (staffId: string, date: string) => {
    return attendance.find(a => a.staff_id === staffId && a.date === date);
  };

  // ============= PAYROLL PROCESSING =============
  const calculatePayrollForStaff = (staffMember: Staff, month: string) => {
    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(monthStart);
    const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(d => !isWeekend(d)).length;

    const staffAttendance = attendance.filter(a => 
      a.staff_id === staffMember.id && a.date.startsWith(month)
    );
    
    const presentDays = staffAttendance.filter(a => a.status === 'present').length;
    const lateDays = staffAttendance.filter(a => a.status === 'late').length;
    const absentDays = workingDays - presentDays - lateDays;
    
    const dailyRate = staffMember.salary / workingDays;
    const absentDeduction = Math.round(absentDays * dailyRate);
    const lateDeduction = Math.round(lateDays * (dailyRate * 0.25)); // 25% deduction for late
    const overtimeMinutes = staffAttendance.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0);
    const overtimePay = Math.round((overtimeMinutes / 60) * (dailyRate / 8) * 1.5);

    return {
      basic_salary: staffMember.salary,
      present_days: presentDays + lateDays,
      absent_days: absentDays,
      late_days: lateDays,
      absent_deduction: absentDeduction,
      late_deduction: lateDeduction,
      overtime_pay: overtimePay,
      net_salary: staffMember.salary - absentDeduction - lateDeduction + overtimePay,
    };
  };

  const handleProcessPayroll = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const month = paymentForm.month;
      
      // Create payroll run
      const { data: run, error: runErr } = await supabase
        .from('payroll_runs')
        .upsert({
          tenant_id: tenantId, month, status: 'processing',
          total_staff: activeStaff.length, processed_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,month' })
        .select()
        .single();

      if (runErr) throw runErr;

      // Calculate and insert payments for each active staff
      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      
      for (const s of activeStaff) {
        const calc = calculatePayrollForStaff(s, month);
        
        await supabase.from('salary_payments').upsert({
          tenant_id: tenantId, staff_id: s.id, month,
          basic_salary: calc.basic_salary, bonus: 0, deductions: 0,
          overtime_pay: calc.overtime_pay, late_deduction: calc.late_deduction,
          absent_deduction: calc.absent_deduction, net_salary: calc.net_salary,
          present_days: calc.present_days, absent_days: calc.absent_days,
          late_days: calc.late_days, status: 'pending',
          payroll_run_id: run.id,
        }, { onConflict: 'tenant_id,staff_id,month', ignoreDuplicates: false });

        totalGross += calc.basic_salary;
        totalDeductions += calc.absent_deduction + calc.late_deduction;
        totalNet += calc.net_salary;
      }

      // Update payroll run totals
      await supabase.from('payroll_runs').update({
        status: 'completed', total_gross: totalGross,
        total_deductions: totalDeductions, total_net: totalNet,
      }).eq('id', run.id);

      toast.success(`Payroll processed for ${activeStaff.length} staff`);
      setShowProcessPayrollDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payroll');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySalary = async () => {
    if (!tenantId || !selectedStaff) return;
    setSaving(true);
    try {
      const netSalary = parseFloat(paymentForm.basic_salary) + parseFloat(paymentForm.bonus) 
        + parseFloat(paymentForm.overtime_pay) - parseFloat(paymentForm.deductions) 
        - parseFloat(paymentForm.late_deduction) - parseFloat(paymentForm.absent_deduction);

      await supabase.from('salary_payments').upsert({
        tenant_id: tenantId, staff_id: selectedStaff.id, month: paymentForm.month,
        basic_salary: parseFloat(paymentForm.basic_salary),
        bonus: parseFloat(paymentForm.bonus), deductions: parseFloat(paymentForm.deductions),
        overtime_pay: parseFloat(paymentForm.overtime_pay),
        late_deduction: parseFloat(paymentForm.late_deduction),
        absent_deduction: parseFloat(paymentForm.absent_deduction),
        net_salary: netSalary, status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentForm.payment_method,
        transaction_ref: paymentForm.transaction_ref || null,
        present_days: parseInt(paymentForm.present_days) || 0,
        absent_days: parseInt(paymentForm.absent_days) || 0,
        late_days: parseInt(paymentForm.late_days) || 0,
      }, { onConflict: 'tenant_id,staff_id,month' });

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

  const openPaymentDialog = (s: Staff) => {
    setSelectedStaff(s);
    const calc = calculatePayrollForStaff(s, format(new Date(), 'yyyy-MM'));
    setPaymentForm({
      month: format(new Date(), 'yyyy-MM'),
      basic_salary: s.salary.toString(),
      bonus: '0', deductions: '0',
      overtime_pay: calc.overtime_pay.toString(),
      late_deduction: calc.late_deduction.toString(),
      absent_deduction: calc.absent_deduction.toString(),
      payment_method: 'cash', transaction_ref: '',
      present_days: calc.present_days.toString(),
      absent_days: calc.absent_days.toString(),
      late_days: calc.late_days.toString(),
    });
    setShowPaymentDialog(true);
  };

  // Filter staff by search
  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staff;
    const term = searchTerm.toLowerCase();
    return staff.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.phone?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term)
    );
  }, [staff, searchTerm]);

  // Filter payments by month
  const filteredPayments = useMemo(() => {
    return payments.filter(p => p.month === selectedMonth);
  }, [payments, selectedMonth]);

  return (
    <DashboardLayout
      title="Payroll & HR Management"
      subtitle="Staff, attendance, and salary management"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{presentToday}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-xl font-bold">৳{totalSalary.toLocaleString()}</p>
              </div>
              <Banknote className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-xl font-bold text-green-600">৳{paidThisMonth.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingPayments}</p>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" /> Staff
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <UserCheck className="h-4 w-4" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
              <Receipt className="h-4 w-4" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Staff Management Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff List</CardTitle>
                <CardDescription>Manage employees and their details</CardDescription>
              </div>
              <Button onClick={() => { resetStaffForm(); setEditingStaff(null); setShowStaffDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Staff
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role/Designation</TableHead>
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
                    ) : filteredStaff.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No staff found</TableCell></TableRow>
                    ) : filteredStaff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            {s.can_login && <Badge variant="outline" className="text-xs">Can Login</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="capitalize">{s.role}</p>
                            <p className="text-sm text-muted-foreground">{s.designation || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{s.department || '-'}</TableCell>
                        <TableCell>{s.phone || '-'}</TableCell>
                        <TableCell>৳{s.salary.toLocaleString()}/{s.salary_type === 'monthly' ? 'mo' : 'hr'}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? 'default' : 'secondary'}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditStaff(s)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openPaymentDialog(s)}>
                            <DollarSign className="h-4 w-4 mr-1" /> Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Attendance</CardTitle>
                <CardDescription>Mark attendance for {format(attendanceDate, 'EEEE, MMMM d, yyyy')}</CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(attendanceDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={attendanceDate} onSelect={(d) => d && setAttendanceDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Mark Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStaff.map((s) => {
                      const att = getAttendanceForStaff(s.id, format(attendanceDate, 'yyyy-MM-dd'));
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.department || '-'}</TableCell>
                          <TableCell>{att?.check_in || '-'}</TableCell>
                          <TableCell>
                            {att ? (
                              <Badge variant={att.status === 'present' ? 'default' : att.status === 'late' ? 'secondary' : 'destructive'}>
                                {att.status}
                              </Badge>
                            ) : <Badge variant="outline">Not Marked</Badge>}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant={att?.status === 'present' ? 'default' : 'outline'} onClick={() => handleMarkAttendance(s, 'present')}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant={att?.status === 'late' ? 'secondary' : 'outline'} onClick={() => handleMarkAttendance(s, 'late')}>
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant={att?.status === 'absent' ? 'destructive' : 'outline'} onClick={() => handleMarkAttendance(s, 'absent')}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Processing Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Process Payroll</CardTitle>
                <CardDescription>Generate salary for all staff based on attendance</CardDescription>
              </div>
              <Button onClick={() => setShowProcessPayrollDialog(true)}>
                <Receipt className="h-4 w-4 mr-2" /> Process Payroll
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Select Month</Label>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48 mt-1" />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Basic</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent/Late</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payroll data for this month</TableCell></TableRow>
                    ) : filteredPayments.map((p) => {
                      const staffMember = staff.find(s => s.id === p.staff_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{staffMember?.name || 'Unknown'}</TableCell>
                          <TableCell>৳{p.basic_salary.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">{p.present_days} days</TableCell>
                          <TableCell className="text-red-600">{p.absent_days}/{p.late_days}</TableCell>
                          <TableCell className="text-red-600">৳{((p.absent_deduction || 0) + (p.late_deduction || 0)).toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600">৳{(p.overtime_pay || 0).toLocaleString()}</TableCell>
                          <TableCell className="font-bold">৳{p.net_salary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>View all past payroll runs and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Total Staff</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRuns.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payroll history</TableCell></TableRow>
                    ) : payrollRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.month}</TableCell>
                        <TableCell>{run.total_staff}</TableCell>
                        <TableCell>৳{(run.total_gross || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">৳{(run.total_deductions || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">৳{(run.total_net || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.processed_at ? format(new Date(run.processed_at), 'dd MMM yyyy HH:mm') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <Select value={staffForm.role_id || staffForm.role} onValueChange={(v) => {
                  const isRoleId = roles.some(r => r.id === v);
                  if (isRoleId) {
                    const role = roles.find(r => r.id === v);
                    setStaffForm(p => ({ ...p, role_id: v, role: role?.name.toLowerCase() || 'staff' }));
                  } else {
                    setStaffForm(p => ({ ...p, role: v, role_id: '' }));
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    )) : (
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
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={staffForm.designation} onChange={(e) => setStaffForm(p => ({ ...p, designation: e.target.value }))} placeholder="Senior Technician" />
            </div>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2"><Key className="h-4 w-4" /> Login Access</Label>
                  <p className="text-sm text-muted-foreground">Enable login credentials for staff portal</p>
                </div>
                <Switch checked={staffForm.can_login} onCheckedChange={(checked) => setStaffForm(p => ({ ...p, can_login: checked }))} />
              </div>
              {staffForm.can_login && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input value={staffForm.username} onChange={(e) => setStaffForm(p => ({ ...p, username: e.target.value }))} placeholder="staff_username" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password {editingStaff ? '(leave empty to keep)' : '*'}</Label>
                    <Input type="password" value={staffForm.password} onChange={(e) => setStaffForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
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
            <Button onClick={handleSaveStaff} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStaff ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Salary - {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={paymentForm.month} onChange={(e) => setPaymentForm(p => ({ ...p, month: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (৳)</Label>
                <Input type="number" value={paymentForm.basic_salary} onChange={(e) => setPaymentForm(p => ({ ...p, basic_salary: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bonus (৳)</Label>
                <Input type="number" value={paymentForm.bonus} onChange={(e) => setPaymentForm(p => ({ ...p, bonus: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overtime Pay (৳)</Label>
                <Input type="number" value={paymentForm.overtime_pay} onChange={(e) => setPaymentForm(p => ({ ...p, overtime_pay: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Other Deductions (৳)</Label>
                <Input type="number" value={paymentForm.deductions} onChange={(e) => setPaymentForm(p => ({ ...p, deductions: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Late Deduction (৳)</Label>
                <Input type="number" value={paymentForm.late_deduction} onChange={(e) => setPaymentForm(p => ({ ...p, late_deduction: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Absent Deduction (৳)</Label>
                <Input type="number" value={paymentForm.absent_deduction} onChange={(e) => setPaymentForm(p => ({ ...p, absent_deduction: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-muted rounded text-center">
                <p className="text-muted-foreground">Present</p>
                <p className="font-bold text-green-600">{paymentForm.present_days} days</p>
              </div>
              <div className="p-2 bg-muted rounded text-center">
                <p className="text-muted-foreground">Absent</p>
                <p className="font-bold text-red-600">{paymentForm.absent_days} days</p>
              </div>
              <div className="p-2 bg-muted rounded text-center">
                <p className="text-muted-foreground">Late</p>
                <p className="font-bold text-orange-600">{paymentForm.late_days} days</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transaction Ref</Label>
                <Input value={paymentForm.transaction_ref} onChange={(e) => setPaymentForm(p => ({ ...p, transaction_ref: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Net Salary</p>
              <p className="text-2xl font-bold text-primary">
                ৳{(parseFloat(paymentForm.basic_salary) + parseFloat(paymentForm.bonus) + parseFloat(paymentForm.overtime_pay) 
                  - parseFloat(paymentForm.deductions) - parseFloat(paymentForm.late_deduction) - parseFloat(paymentForm.absent_deduction)).toLocaleString()}
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

      {/* Process Payroll Dialog */}
      <Dialog open={showProcessPayrollDialog} onOpenChange={setShowProcessPayrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Input type="month" value={paymentForm.month} onChange={(e) => setPaymentForm(p => ({ ...p, month: e.target.value }))} />
            </div>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">This will calculate salaries for all <strong>{activeStaff.length}</strong> active staff members based on their attendance records.</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Absent days will be deducted at daily rate</li>
                <li>Late arrivals will have 25% daily rate deduction</li>
                <li>Overtime will be paid at 1.5x hourly rate</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessPayrollDialog(false)}>Cancel</Button>
            <Button onClick={handleProcessPayroll} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
