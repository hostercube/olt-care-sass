import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isWeekend, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export interface Staff {
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

export interface Attendance {
  id: string;
  staff_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
  late_minutes: number;
  overtime_minutes: number;
  overtime_hours: number;
  notes: string | null;
  source: string;
  shift_id: string | null;
}

export interface LeaveType {
  id: string;
  tenant_id: string;
  name: string;
  short_name: string | null;
  max_days_per_year: number;
  is_paid: boolean;
  is_active: boolean;
  color: string;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  staff?: Staff;
  leave_type?: LeaveType;
}

export interface LeaveBalance {
  id: string;
  staff_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  leave_type?: LeaveType;
}

export interface PerformanceReview {
  id: string;
  staff_id: string;
  reviewer_id: string | null;
  review_period: string;
  review_date: string;
  overall_rating: number | null;
  ratings: Record<string, number>;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals: string | null;
  comments: string | null;
  status: 'draft' | 'submitted' | 'acknowledged';
  staff?: Staff;
}

export interface StaffLoan {
  id: string;
  staff_id: string;
  loan_type: 'advance' | 'loan';
  amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  disbursed_at: string | null;
  created_at: string;
  staff?: Staff;
}

export interface StaffShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  late_tolerance_minutes: number;
  is_active: boolean;
}

export interface SalaryPayment {
  id: string;
  staff_id: string;
  month: string;
  basic_salary: number;
  bonus: number;
  deductions: number;
  overtime_pay: number;
  late_deduction: number;
  absent_deduction: number;
  house_rent: number;
  medical_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  loan_deduction: number;
  tax_deduction: number;
  gross_salary: number;
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

export interface PayrollRun {
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

export function usePayrollSystem() {
  const { tenantId } = useTenantContext();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [loans, setLoans] = useState<StaffLoan[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [
        staffRes, attRes, leaveTypesRes, leaveReqRes, leaveBalRes,
        perfRes, loansRes, shiftsRes, payRes, runRes
      ] = await Promise.all([
        supabase.from('staff').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('staff_attendance').select('*').eq('tenant_id', tenantId)
          .gte('date', monthStart).lte('date', monthEnd),
        supabase.from('leave_types').select('*').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('leave_requests').select('*').eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('leave_balances').select('*').eq('tenant_id', tenantId).eq('year', currentYear),
        supabase.from('performance_reviews').select('*').eq('tenant_id', tenantId)
          .order('review_date', { ascending: false }).limit(100),
        supabase.from('staff_loans').select('*').eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('staff_shifts').select('*').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('salary_payments').select('*').eq('tenant_id', tenantId)
          .order('month', { ascending: false }).limit(200),
        supabase.from('payroll_runs').select('*').eq('tenant_id', tenantId)
          .order('month', { ascending: false }).limit(24),
      ]);

      setStaff((staffRes.data as any[]) || []);
      setAttendance((attRes.data as any[]) || []);
      setLeaveTypes((leaveTypesRes.data as any[]) || []);
      setLeaveRequests((leaveReqRes.data as any[]) || []);
      setLeaveBalances((leaveBalRes.data as any[]) || []);
      setPerformanceReviews((perfRes.data as any[]) || []);
      setLoans((loansRes.data as any[]) || []);
      setShifts((shiftsRes.data as any[]) || []);
      setPayments((payRes.data as any[]) || []);
      setPayrollRuns((runRes.data as any[]) || []);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeStaff = useMemo(() => staff.filter(s => s.is_active), [staff]);

  // Staff Management
  const saveStaff = async (data: Partial<Staff>, staffId?: string) => {
    if (!tenantId) throw new Error('No tenant');
    const payload = { ...data, tenant_id: tenantId } as any;
    if (staffId) {
      const { error } = await supabase.from('staff').update(payload).eq('id', staffId);
      if (error) throw error;
      toast.success('Staff updated');
    } else {
      const { error } = await supabase.from('staff').insert([payload]);
      if (error) throw error;
      toast.success('Staff added');
    }
    fetchData();
  };

  // Attendance
  const markAttendance = async (staffId: string, date: string, status: string, checkIn?: string) => {
    if (!tenantId) throw new Error('No tenant');
    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('id')
      .eq('staff_id', staffId)
      .eq('date', date)
      .single();

    if (existing) {
      await supabase.from('staff_attendance')
        .update({ status, check_in: checkIn || null, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('staff_attendance').insert({
        tenant_id: tenantId, staff_id: staffId, date, status, check_in: checkIn || null, source: 'manual',
      });
    }
    fetchData();
  };

  const checkOut = async (attendanceId: string, checkOutTime: string, overtimeHours?: number) => {
    await supabase.from('staff_attendance').update({
      check_out: checkOutTime,
      overtime_hours: overtimeHours || 0,
      updated_at: new Date().toISOString()
    }).eq('id', attendanceId);
    fetchData();
  };

  // Leave Management
  const saveLeaveType = async (data: Partial<LeaveType>, id?: string) => {
    if (!tenantId) throw new Error('No tenant');
    const payload = { ...data, tenant_id: tenantId } as any;
    if (id) {
      await supabase.from('leave_types').update(payload).eq('id', id);
      toast.success('Leave type updated');
    } else {
      await supabase.from('leave_types').insert([payload]);
      toast.success('Leave type added');
    }
    fetchData();
  };

  const submitLeaveRequest = async (data: {
    staff_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => {
    if (!tenantId) throw new Error('No tenant');
    const totalDays = differenceInDays(parseISO(data.end_date), parseISO(data.start_date)) + 1;
    await supabase.from('leave_requests').insert({
      tenant_id: tenantId, ...data, total_days: totalDays, status: 'pending'
    });
    toast.success('Leave request submitted');
    fetchData();
  };

  const handleLeaveRequest = async (requestId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    const updates: any = { status: action, approved_at: new Date().toISOString() };
    if (action === 'rejected' && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }
    await supabase.from('leave_requests').update(updates).eq('id', requestId);

    // If approved, update leave balance
    if (action === 'approved') {
      const request = leaveRequests.find(r => r.id === requestId);
      if (request && request.leave_type_id) {
        const year = new Date().getFullYear();
        const { data: balance } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('staff_id', request.staff_id)
          .eq('leave_type_id', request.leave_type_id)
          .eq('year', year)
          .single();

        if (balance) {
          await supabase.from('leave_balances').update({
            used_days: (balance.used_days || 0) + request.total_days
          }).eq('id', balance.id);
        }

        // Also mark attendance as leave for those days
        const days = eachDayOfInterval({
          start: parseISO(request.start_date),
          end: parseISO(request.end_date)
        });
        for (const day of days) {
          if (!isWeekend(day)) {
            await markAttendance(request.staff_id, format(day, 'yyyy-MM-dd'), 'leave');
          }
        }
      }
    }

    toast.success(`Leave request ${action}`);
    fetchData();
  };

  const initializeLeaveBalances = async (staffId: string) => {
    if (!tenantId) return;
    const year = new Date().getFullYear();
    for (const lt of leaveTypes) {
      await supabase.from('leave_balances').upsert({
        tenant_id: tenantId,
        staff_id: staffId,
        leave_type_id: lt.id,
        year,
        total_days: lt.max_days_per_year,
        used_days: 0
      }, { onConflict: 'tenant_id,staff_id,leave_type_id,year' });
    }
    fetchData();
  };

  // Performance Reviews
  const savePerformanceReview = async (data: Partial<PerformanceReview>, id?: string) => {
    if (!tenantId) throw new Error('No tenant');
    const payload = { ...data, tenant_id: tenantId } as any;
    if (id) {
      await supabase.from('performance_reviews').update(payload).eq('id', id);
      toast.success('Review updated');
    } else {
      await supabase.from('performance_reviews').insert([payload]);
      toast.success('Review created');
    }
    fetchData();
  };

  // Loans
  const createLoan = async (data: {
    staff_id: string;
    loan_type: 'advance' | 'loan';
    amount: number;
    monthly_deduction: number;
    reason?: string;
  }) => {
    if (!tenantId) throw new Error('No tenant');
    await supabase.from('staff_loans').insert({
      tenant_id: tenantId, ...data, remaining_amount: data.amount, status: 'pending'
    });
    toast.success('Loan request created');
    fetchData();
  };

  const approveLoan = async (loanId: string, approve: boolean) => {
    await supabase.from('staff_loans').update({
      status: approve ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
      disbursed_at: approve ? new Date().toISOString() : null
    }).eq('id', loanId);
    toast.success(approve ? 'Loan approved' : 'Loan rejected');
    fetchData();
  };

  // Shifts
  const saveShift = async (data: Partial<StaffShift>, id?: string) => {
    if (!tenantId) throw new Error('No tenant');
    const payload = { ...data, tenant_id: tenantId } as any;
    if (id) {
      await supabase.from('staff_shifts').update(payload).eq('id', id);
      toast.success('Shift updated');
    } else {
      await supabase.from('staff_shifts').insert([payload]);
      toast.success('Shift created');
    }
    fetchData();
  };

  const deleteShift = async (id: string) => {
    await supabase.from('staff_shifts').update({ is_active: false }).eq('id', id);
    toast.success('Shift deleted');
    fetchData();
  };

  // Delete functions
  const deleteLeaveType = async (id: string) => {
    await supabase.from('leave_types').update({ is_active: false }).eq('id', id);
    toast.success('Leave type deleted');
    fetchData();
  };

  const deleteLeaveRequest = async (id: string) => {
    await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id);
    toast.success('Leave request cancelled');
    fetchData();
  };

  const deletePerformanceReview = async (id: string) => {
    await supabase.from('performance_reviews').delete().eq('id', id);
    toast.success('Review deleted');
    fetchData();
  };

  const deleteLoan = async (id: string) => {
    await supabase.from('staff_loans').delete().eq('id', id);
    toast.success('Loan deleted');
    fetchData();
  };

  const deleteStaff = async (id: string) => {
    await supabase.from('staff').update({ is_active: false }).eq('id', id);
    toast.success('Staff deactivated');
    fetchData();
  };

  // Payroll
  const calculatePayroll = (staffMember: Staff, month: string, staffAttendance: Attendance[]) => {
    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(monthStart);
    const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(d => !isWeekend(d)).length;

    const monthAtt = staffAttendance.filter(a => a.date.startsWith(month));
    const presentDays = monthAtt.filter(a => a.status === 'present').length;
    const lateDays = monthAtt.filter(a => a.status === 'late').length;
    const leaveDays = monthAtt.filter(a => a.status === 'leave').length;
    const halfDays = monthAtt.filter(a => a.status === 'half_day').length;
    const absentDays = workingDays - presentDays - lateDays - leaveDays - halfDays;

    const dailyRate = staffMember.salary / workingDays;
    const absentDeduction = Math.round(absentDays * dailyRate);
    const lateDeduction = Math.round(lateDays * (dailyRate * 0.25));
    const halfDayDeduction = Math.round(halfDays * (dailyRate * 0.5));
    const totalOvertimeHours = monthAtt.reduce((sum, a) => sum + ((a.overtime_hours as number) || 0), 0);
    const overtimePay = Math.round(totalOvertimeHours * (dailyRate / 8) * 1.5);

    // Get active loan deduction
    const staffLoans = loans.filter(l => l.staff_id === staffMember.id && l.status === 'approved' && l.remaining_amount > 0);
    const loanDeduction = staffLoans.reduce((sum, l) => sum + l.monthly_deduction, 0);

    const grossSalary = staffMember.salary;
    const totalDeductions = absentDeduction + lateDeduction + halfDayDeduction + loanDeduction;
    const netSalary = grossSalary - totalDeductions + overtimePay;

    return {
      basic_salary: staffMember.salary,
      gross_salary: grossSalary,
      present_days: presentDays + lateDays,
      absent_days: absentDays,
      late_days: lateDays,
      absent_deduction: absentDeduction,
      late_deduction: lateDeduction + halfDayDeduction,
      overtime_pay: overtimePay,
      loan_deduction: loanDeduction,
      net_salary: Math.max(0, netSalary),
    };
  };

  const processPayroll = async (month: string) => {
    if (!tenantId) throw new Error('No tenant');

    // Fetch attendance for the specific month
    const monthStart = `${month}-01`;
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd');
    const { data: monthAttendance } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', monthStart)
      .lte('date', monthEnd);

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

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const s of activeStaff) {
      const staffAtt = (monthAttendance || []).filter((a: any) => a.staff_id === s.id);
      const calc = calculatePayroll(s, month, staffAtt as Attendance[]);

      await supabase.from('salary_payments').upsert({
        tenant_id: tenantId, staff_id: s.id, month,
        basic_salary: calc.basic_salary, gross_salary: calc.gross_salary,
        bonus: 0, deductions: 0, overtime_pay: calc.overtime_pay,
        late_deduction: calc.late_deduction, absent_deduction: calc.absent_deduction,
        loan_deduction: calc.loan_deduction, net_salary: calc.net_salary,
        present_days: calc.present_days, absent_days: calc.absent_days,
        late_days: calc.late_days, status: 'pending', payroll_run_id: run.id,
      }, { onConflict: 'tenant_id,staff_id,month', ignoreDuplicates: false });

      // Update loan remaining amounts
      const staffLoans = loans.filter(l => l.staff_id === s.id && l.status === 'approved' && l.remaining_amount > 0);
      for (const loan of staffLoans) {
        const newRemaining = Math.max(0, loan.remaining_amount - loan.monthly_deduction);
        await supabase.from('staff_loans').update({
          remaining_amount: newRemaining,
          status: newRemaining === 0 ? 'completed' : 'approved'
        }).eq('id', loan.id);
      }

      totalGross += calc.gross_salary;
      totalDeductions += calc.absent_deduction + calc.late_deduction + calc.loan_deduction;
      totalNet += calc.net_salary;
    }

    await supabase.from('payroll_runs').update({
      status: 'completed', total_gross: totalGross,
      total_deductions: totalDeductions, total_net: totalNet,
    }).eq('id', run.id);

    toast.success(`Payroll processed for ${activeStaff.length} staff`);
    fetchData();
  };

  const paySalary = async (staffId: string, month: string, paymentMethod: string, transactionRef?: string) => {
    await supabase.from('salary_payments').update({
      status: 'paid',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: paymentMethod,
      transaction_ref: transactionRef || null
    }).eq('staff_id', staffId).eq('month', month);
    toast.success('Salary paid');
    fetchData();
  };

  return {
    // Data
    staff, activeStaff, attendance, leaveTypes, leaveRequests, leaveBalances,
    performanceReviews, loans, shifts, payments, payrollRuns, loading,
    // Actions
    fetchData, saveStaff, deleteStaff, markAttendance, checkOut,
    saveLeaveType, deleteLeaveType, submitLeaveRequest, deleteLeaveRequest, handleLeaveRequest, initializeLeaveBalances,
    savePerformanceReview, deletePerformanceReview, createLoan, approveLoan, deleteLoan, saveShift, deleteShift,
    calculatePayroll, processPayroll, paySalary,
    tenantId
  };
}
