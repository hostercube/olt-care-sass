import { useState, useMemo } from 'react';
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
import { useTenantRoles } from '@/hooks/useTenantRoles';
import { usePayrollSystem } from '@/hooks/usePayrollSystem';
import { LeaveManagement } from '@/components/payroll/LeaveManagement';
import { PerformanceManagement } from '@/components/payroll/PerformanceManagement';
import { LoanManagement } from '@/components/payroll/LoanManagement';
import { ShiftManagement } from '@/components/payroll/ShiftManagement';
import { 
  Users, Plus, Edit, Loader2, DollarSign, Calendar as CalendarIcon, 
  Clock, CheckCircle, XCircle, Search, RefreshCw, 
  UserCheck, Receipt, History, Banknote, Timer, TreePalm, Star, CreditCard, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StaffPayroll() {
  const { roles } = useTenantRoles();
  const {
    staff, activeStaff, attendance, leaveTypes, leaveRequests, leaveBalances,
    performanceReviews, loans, shifts, payments, payrollRuns, loading,
    fetchData, saveStaff, markAttendance, checkOut,
    saveLeaveType, submitLeaveRequest, handleLeaveRequest, initializeLeaveBalances,
    savePerformanceReview, createLoan, approveLoan, saveShift,
    calculatePayroll, processPayroll, paySalary, tenantId
  } = usePayrollSystem();

  const [activeTab, setActiveTab] = useState('staff');
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showProcessPayrollDialog, setShowProcessPayrollDialog] = useState(false);

  // Selected items
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
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

  // Stats
  const totalSalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);
  const thisMonthPayments = payments.filter(p => p.month === format(new Date(), 'yyyy-MM'));
  const paidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.net_salary, 0);
  const pendingPayments = activeStaff.length - thisMonthPayments.filter(p => p.status === 'paid').length;

  // Attendance stats for today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;

  // Pending items count
  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending').length;
  const pendingLoans = loans.filter(l => l.status === 'pending').length;

  // ============= STAFF MANAGEMENT =============
  const resetStaffForm = () => {
    setStaffForm({
      name: '', email: '', phone: '', role: 'staff', role_id: '',
      department: '', designation: '', salary: '0', salary_type: 'monthly',
      join_date: format(new Date(), 'yyyy-MM-dd'), username: '', password: '', can_login: false,
    });
  };

  const handleEditStaff = (s: any) => {
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
        name: staffForm.name, email: staffForm.email || null,
        phone: staffForm.phone || null, role: staffForm.role, role_id: staffForm.role_id || null,
        department: staffForm.department || null, designation: staffForm.designation || null,
        salary: parseFloat(staffForm.salary) || 0, salary_type: staffForm.salary_type,
        join_date: staffForm.join_date || null, can_login: staffForm.can_login,
      };
      if (staffForm.can_login) {
        if (staffForm.username) data.username = staffForm.username;
        if (staffForm.password) data.password = staffForm.password;
      }
      await saveStaff(data, editingStaff?.id);
      setShowStaffDialog(false);
      setEditingStaff(null);
      resetStaffForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  // ============= ATTENDANCE =============
  const handleMarkAttendance = async (staffMember: any, status: string) => {
    const dateStr = format(attendanceDate, 'yyyy-MM-dd');
    const now = new Date();
    const checkIn = status === 'present' || status === 'late' ? format(now, 'HH:mm:ss') : undefined;
    
    try {
      await markAttendance(staffMember.id, dateStr, status, checkIn);
      toast.success(`${staffMember.name} marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark attendance');
    }
  };

  const getAttendanceForStaff = (staffId: string, date: string) => {
    return attendance.find(a => a.staff_id === staffId && a.date === date);
  };

  // ============= PAYROLL PROCESSING =============
  const handleProcessPayroll = async () => {
    setSaving(true);
    try {
      await processPayroll(paymentForm.month);
      setShowProcessPayrollDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payroll');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySalary = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await paySalary(selectedStaff.id, paymentForm.month, paymentForm.payment_method, paymentForm.transaction_ref);
      setShowPaymentDialog(false);
      setSelectedStaff(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to pay salary');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentDialog = (s: any) => {
    setSelectedStaff(s);
    const staffAtt = attendance.filter(a => a.staff_id === s.id);
    const calc = calculatePayroll(s, format(new Date(), 'yyyy-MM'), staffAtt);
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
      title="HR & Payroll Management"
      subtitle="Staff, attendance, leave, performance, and salary management"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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
                <p className="text-lg font-bold">৳{totalSalary.toLocaleString()}</p>
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
                <p className="text-lg font-bold text-green-600">৳{paidThisMonth.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Leaves</p>
                <p className="text-2xl font-bold text-orange-600">{pendingLeaves}</p>
              </div>
              <TreePalm className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Loans</p>
                <p className="text-2xl font-bold text-purple-600">{pendingLoans}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" /> Staff
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <UserCheck className="h-4 w-4" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <TreePalm className="h-4 w-4" /> Leave
              {pendingLeaves > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">{pendingLeaves}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
              <Receipt className="h-4 w-4" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Star className="h-4 w-4" /> Performance
            </TabsTrigger>
            <TabsTrigger value="loans" className="gap-2">
              <CreditCard className="h-4 w-4" /> Loans
              {pendingLoans > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">{pendingLoans}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="shifts" className="gap-2">
              <Clock className="h-4 w-4" /> Shifts
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
                      <TableHead>Check-Out</TableHead>
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
                          <TableCell>{att?.check_out || '-'}</TableCell>
                          <TableCell>
                            {att ? (
                              <Badge variant={
                                att.status === 'present' ? 'default' : 
                                att.status === 'late' ? 'secondary' : 
                                att.status === 'leave' ? 'outline' : 'destructive'
                              }>
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
                            <Button size="sm" variant={att?.status === 'half_day' ? 'secondary' : 'outline'} onClick={() => handleMarkAttendance(s, 'half_day')}>
                              ½
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

        {/* Leave Management Tab */}
        <TabsContent value="leave">
          <LeaveManagement
            staff={staff}
            leaveTypes={leaveTypes}
            leaveRequests={leaveRequests}
            leaveBalances={leaveBalances}
            loading={loading}
            onSaveLeaveType={saveLeaveType}
            onSubmitLeave={submitLeaveRequest}
            onHandleRequest={handleLeaveRequest}
            onInitializeBalances={initializeLeaveBalances}
          />
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payroll data for this month. Click "Process Payroll" to generate.</TableCell></TableRow>
                    ) : filteredPayments.map((p) => {
                      const staffMember = staff.find(s => s.id === p.staff_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{staffMember?.name || 'Unknown'}</TableCell>
                          <TableCell>৳{p.basic_salary.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">{p.present_days} days</TableCell>
                          <TableCell className="text-red-600">{p.absent_days}/{p.late_days}</TableCell>
                          <TableCell className="text-red-600">৳{((p.absent_deduction || 0) + (p.late_deduction || 0) + (p.loan_deduction || 0)).toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600">৳{(p.overtime_pay || 0).toLocaleString()}</TableCell>
                          <TableCell className="font-bold">৳{p.net_salary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.status !== 'paid' && staffMember && (
                              <Button size="sm" variant="outline" onClick={() => openPaymentDialog(staffMember)}>
                                Pay
                              </Button>
                            )}
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

        {/* Performance Management Tab */}
        <TabsContent value="performance">
          <PerformanceManagement
            staff={staff}
            reviews={performanceReviews}
            loading={loading}
            onSaveReview={savePerformanceReview}
          />
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <LoanManagement
            staff={staff}
            loans={loans}
            loading={loading}
            onCreateLoan={createLoan}
            onApproveLoan={approveLoan}
          />
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts">
          <ShiftManagement
            shifts={shifts}
            loading={loading}
            onSaveShift={saveShift}
          />
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input type="date" value={staffForm.join_date} onChange={(e) => setStaffForm(p => ({ ...p, join_date: e.target.value }))} />
              </div>
            </div>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Login Access</Label>
                  <p className="text-xs text-muted-foreground">Allow this staff to log into the system</p>
                </div>
                <Switch checked={staffForm.can_login} onCheckedChange={(c) => setStaffForm(p => ({ ...p, can_login: c }))} />
              </div>
              {staffForm.can_login && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={staffForm.username} onChange={(e) => setStaffForm(p => ({ ...p, username: e.target.value }))} placeholder="staff123" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={staffForm.password} onChange={(e) => setStaffForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStaffDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStaff ? 'Update' : 'Add'} Staff
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input type="number" value={paymentForm.basic_salary} disabled />
              </div>
              <div className="space-y-2">
                <Label>Overtime</Label>
                <Input type="number" value={paymentForm.overtime_pay} disabled />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Present Days</Label>
                <Input type="number" value={paymentForm.present_days} disabled />
              </div>
              <div className="space-y-2">
                <Label>Absent Days</Label>
                <Input type="number" value={paymentForm.absent_days} disabled />
              </div>
              <div className="space-y-2">
                <Label>Late Days</Label>
                <Input type="number" value={paymentForm.late_days} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Absent Deduction</Label>
                <Input type="number" value={paymentForm.absent_deduction} disabled className="text-red-600" />
              </div>
              <div className="space-y-2">
                <Label>Late Deduction</Label>
                <Input type="number" value={paymentForm.late_deduction} disabled className="text-red-600" />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-lg font-bold">
                Net Salary: ৳{(
                  parseFloat(paymentForm.basic_salary) + 
                  parseFloat(paymentForm.overtime_pay) - 
                  parseFloat(paymentForm.absent_deduction) - 
                  parseFloat(paymentForm.late_deduction)
                ).toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transaction Ref</Label>
                <Input value={paymentForm.transaction_ref} onChange={(e) => setPaymentForm(p => ({ ...p, transaction_ref: e.target.value }))} placeholder="Optional" />
              </div>
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
            <DialogTitle>Process Monthly Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Input type="month" value={paymentForm.month} onChange={(e) => setPaymentForm(p => ({ ...p, month: e.target.value }))} />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">This will calculate salary for:</p>
              <p className="font-medium">{activeStaff.length} active staff members</p>
              <p className="text-sm text-muted-foreground mt-2">Based on attendance records, it will calculate:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Deductions for absent days</li>
                <li>Deductions for late arrivals</li>
                <li>Overtime payments</li>
                <li>Loan/advance deductions</li>
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
