import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { Employee, EmployeeType, MonthlySalary, SalaryPayment, EmployeeLedger } from '@/types/erp';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [monthlySalaries, setMonthlySalaries] = useState<MonthlySalary[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchEmployeeTypes = useCallback(async () => {
    const query = supabase.from('employee_types').select('*').eq('is_active', true);
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('name');
    if (error) {
      console.error('Error fetching employee types:', error);
      return;
    }
    setEmployeeTypes((data || []) as EmployeeType[]);
  }, [isSuperAdmin, tenantId]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('employees').select('*, employee_types(*)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('name');
    if (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } else {
      const mapped = (data || []).map((e: any) => ({
        ...e,
        employee_type: e.employee_types,
      }));
      setEmployees(mapped as Employee[]);
    }
    setLoading(false);
  }, [isSuperAdmin, tenantId]);

  const fetchMonthlySalaries = useCallback(async (month?: string) => {
    const query = supabase.from('monthly_salaries').select('*, employees(*)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    if (month) {
      query.eq('salary_month', month);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching monthly salaries:', error);
      return;
    }
    const mapped = (data || []).map((s: any) => ({
      ...s,
      employee: s.employees,
    }));
    setMonthlySalaries(mapped as MonthlySalary[]);
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchEmployeeTypes();
    fetchEmployees();
    fetchMonthlySalaries();
  }, [fetchEmployeeTypes, fetchEmployees, fetchMonthlySalaries]);

  const createEmployeeType = async (data: Partial<EmployeeType>) => {
    if (!tenantId) { toast.error('No tenant context'); return false; }
    const { error } = await (supabase.from as any)('employee_types').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed to create employee type'); return false; }
    toast.success('Employee type created'); fetchEmployeeTypes(); return true;
  };

  const createEmployee = async (data: Partial<Employee>) => {
    if (!tenantId) { toast.error('No tenant context'); return false; }
    const { error } = await (supabase.from as any)('employees').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed to create employee'); console.error(error); return false; }
    toast.success('Employee created');
    fetchEmployees();
    return true;
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    const { error } = await supabase.from('employees').update(data).eq('id', id);
    if (error) {
      toast.error('Failed to update employee');
      return false;
    }
    toast.success('Employee updated');
    fetchEmployees();
    return true;
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').update({ status: 'terminated' }).eq('id', id);
    if (error) {
      toast.error('Failed to delete employee');
      return false;
    }
    toast.success('Employee terminated');
    fetchEmployees();
    return true;
  };

  const generateMonthlySalary = async (month: string) => {
    if (!tenantId) return false;
    const activeEmployees = employees.filter(e => e.status === 'active');
    const salaryRecords = activeEmployees.map(emp => ({
      tenant_id: tenantId, employee_id: emp.id, salary_month: month,
      basic_salary: emp.basic_salary || 0,
      allowances: (emp.house_rent || 0) + (emp.medical_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowances || 0),
      deductions: 0, bonus: 0, overtime: 0,
      net_salary: (emp.basic_salary || 0) + (emp.house_rent || 0) + (emp.medical_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowances || 0),
      working_days: 26, present_days: 26, absent_days: 0, leave_days: 0, status: 'pending', paid_amount: 0,
    }));
    const { error } = await (supabase.from as any)('monthly_salaries').upsert(salaryRecords, {
      onConflict: 'employee_id,salary_month',
      ignoreDuplicates: true 
    });
    
    if (error) {
      toast.error('Failed to generate salaries');
      console.error(error);
      return false;
    }
    toast.success('Monthly salaries generated');
    fetchMonthlySalaries(month);
    return true;
  };

  const paySalary = async (salaryId: string, amount: number, paymentMethod: string, notes?: string) => {
    if (!tenantId) return false;

    const salary = monthlySalaries.find(s => s.id === salaryId);
    if (!salary) return false;

    const newPaidAmount = (salary.paid_amount || 0) + amount;
    const newStatus = newPaidAmount >= salary.net_salary ? 'paid' : 'partial';

    const { error: paymentError } = await supabase.from('salary_payments').insert({
      tenant_id: tenantId,
      monthly_salary_id: salaryId,
      employee_id: salary.employee_id,
      amount,
      payment_method: paymentMethod,
      notes,
    });

    if (paymentError) {
      toast.error('Failed to record payment');
      return false;
    }

    const { error: updateError } = await supabase.from('monthly_salaries').update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
    }).eq('id', salaryId);

    if (updateError) {
      toast.error('Failed to update salary status');
      return false;
    }

    toast.success('Salary payment recorded');
    fetchMonthlySalaries();
    return true;
  };

  const getEmployeeLedger = async (employeeId: string): Promise<EmployeeLedger[]> => {
    const { data, error } = await supabase
      .from('employee_ledger')
      .select('*')
      .eq('employee_id', employeeId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching employee ledger:', error);
      return [];
    }
    return (data || []) as EmployeeLedger[];
  };

  return {
    employees,
    employeeTypes,
    monthlySalaries,
    loading,
    refetch: fetchEmployees,
    refetchTypes: fetchEmployeeTypes,
    refetchSalaries: fetchMonthlySalaries,
    createEmployeeType,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    generateMonthlySalary,
    paySalary,
    getEmployeeLedger,
  };
}
