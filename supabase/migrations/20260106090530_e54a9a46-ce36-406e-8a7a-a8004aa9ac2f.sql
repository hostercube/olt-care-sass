-- Fix system_settings RLS to allow public read of non-sensitive settings
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super admins can manage system_settings" ON public.system_settings;

-- Create new policies
-- Allow anyone to read non-sensitive settings (for auth page)
CREATE POLICY "Anyone can read system_settings"
ON public.system_settings
FOR SELECT
USING (
  -- Only allow reading non-sensitive settings publicly
  key IN (
    'platformName', 'platformEmail', 'platformPhone', 'supportEmail',
    'currency', 'currencySymbol', 'timezone', 'dateFormat',
    'enableSignup', 'requireEmailVerification', 'enableCaptcha', 
    'captchaSiteKey', 'defaultTrialDays', 'autoSuspendDays',
    'maintenanceMode', 'maintenanceMessage', 'pollingServerUrl'
  )
  OR auth.uid() IS NOT NULL
);

-- Super admins can manage all settings
CREATE POLICY "Super admins can manage system_settings"
ON public.system_settings
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());