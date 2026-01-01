-- Create audit log table for ONU edit history
CREATE TABLE public.onu_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id UUID NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.onu_edit_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view edit history" 
ON public.onu_edit_history 
FOR SELECT 
USING (true);

CREATE POLICY "Operators and admins can insert edit history" 
ON public.onu_edit_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_onu_edit_history_onu_id ON public.onu_edit_history(onu_id);
CREATE INDEX idx_onu_edit_history_edited_at ON public.onu_edit_history(edited_at DESC);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.onu_edit_history;