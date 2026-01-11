-- Leave Types table
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  max_days_per_year INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Balance table (yearly leave balances per staff)
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days INTEGER DEFAULT 0,
  used_days INTEGER DEFAULT 0,
  remaining_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, staff_id, leave_type_id, year)
);

-- Performance Reviews table
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  reviewer_id UUID,
  review_period TEXT NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_rating NUMERIC(3,2) CHECK (overall_rating >= 0 AND overall_rating <= 5),
  ratings JSONB DEFAULT '{}',
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Loans/Advances table
CREATE TABLE IF NOT EXISTS public.staff_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL DEFAULT 'advance' CHECK (loan_type IN ('advance', 'loan')),
  amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  monthly_deduction NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Loan Repayments table
CREATE TABLE IF NOT EXISTS public.staff_loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES public.staff_loans(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'salary_deduction',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shift Management table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_tolerance_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Shift Assignments table
CREATE TABLE IF NOT EXISTS public.staff_shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.staff_shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, staff_id, shift_id, effective_from)
);

-- Add overtime_hours to staff_attendance
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.staff_shifts(id);

-- Add allowances breakdown to salary_payments
ALTER TABLE public.salary_payments 
ADD COLUMN IF NOT EXISTS house_rent NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_allowance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowances NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loan_deduction NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_salary NUMERIC(12,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_types
CREATE POLICY "Tenant users can view leave types" ON public.leave_types
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage leave types" ON public.leave_types
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for leave_requests
CREATE POLICY "Tenant users can view leave requests" ON public.leave_requests
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage leave requests" ON public.leave_requests
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for leave_balances
CREATE POLICY "Tenant users can view leave balances" ON public.leave_balances
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage leave balances" ON public.leave_balances
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for performance_reviews
CREATE POLICY "Tenant users can view performance reviews" ON public.performance_reviews
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage performance reviews" ON public.performance_reviews
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for staff_loans
CREATE POLICY "Tenant users can view staff loans" ON public.staff_loans
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage staff loans" ON public.staff_loans
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for staff_loan_repayments
CREATE POLICY "Tenant users can view loan repayments" ON public.staff_loan_repayments
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage loan repayments" ON public.staff_loan_repayments
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for staff_shifts
CREATE POLICY "Tenant users can view staff shifts" ON public.staff_shifts
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage staff shifts" ON public.staff_shifts
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS Policies for staff_shift_assignments
CREATE POLICY "Tenant users can view shift assignments" ON public.staff_shift_assignments
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant users can manage shift assignments" ON public.staff_shift_assignments
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON public.leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_staff_year ON public.leave_balances(staff_id, year);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_staff ON public.performance_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_loans_staff_id ON public.staff_loans(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_loans_status ON public.staff_loans(status);