-- Create attendance table for staff attendance tracking
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present',
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view attendance for their tenant"
  ON public.staff_attendance FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can manage attendance for their tenant"
  ON public.staff_attendance FOR ALL
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Create payroll_runs table to track payroll processing
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_staff INTEGER DEFAULT 0,
  total_gross NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  total_net NUMERIC(12,2) DEFAULT 0,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, month)
);

-- Enable RLS
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll for their tenant"
  ON public.payroll_runs FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can manage payroll for their tenant"
  ON public.payroll_runs FOR ALL
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Add additional columns to salary_payments if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'overtime_pay') THEN
    ALTER TABLE public.salary_payments ADD COLUMN overtime_pay NUMERIC(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'late_deduction') THEN
    ALTER TABLE public.salary_payments ADD COLUMN late_deduction NUMERIC(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'absent_deduction') THEN
    ALTER TABLE public.salary_payments ADD COLUMN absent_deduction NUMERIC(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'present_days') THEN
    ALTER TABLE public.salary_payments ADD COLUMN present_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'absent_days') THEN
    ALTER TABLE public.salary_payments ADD COLUMN absent_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'late_days') THEN
    ALTER TABLE public.salary_payments ADD COLUMN late_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'payroll_run_id') THEN
    ALTER TABLE public.salary_payments ADD COLUMN payroll_run_id UUID REFERENCES public.payroll_runs(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'payment_method') THEN
    ALTER TABLE public.salary_payments ADD COLUMN payment_method TEXT DEFAULT 'cash';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'bank_account') THEN
    ALTER TABLE public.salary_payments ADD COLUMN bank_account TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salary_payments' AND column_name = 'transaction_ref') THEN
    ALTER TABLE public.salary_payments ADD COLUMN transaction_ref TEXT;
  END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_tenant_date ON public.staff_attendance(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON public.staff_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_month ON public.payroll_runs(tenant_id, month);