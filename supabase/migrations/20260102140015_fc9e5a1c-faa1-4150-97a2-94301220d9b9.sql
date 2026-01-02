-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to queue subscription renewal reminders
CREATE OR REPLACE FUNCTION public.queue_subscription_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription RECORD;
  _prefs RECORD;
  _days_until_expiry INTEGER;
  _message TEXT;
BEGIN
  -- Find subscriptions expiring within reminder days
  FOR _subscription IN
    SELECT 
      s.id,
      s.tenant_id,
      s.ends_at,
      s.amount,
      s.billing_cycle,
      t.name as tenant_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      p.name as package_name
    FROM subscriptions s
    JOIN tenants t ON s.tenant_id = t.id
    JOIN packages p ON s.package_id = p.id
    WHERE s.status = 'active'
      AND s.ends_at > now()
      AND s.ends_at <= now() + INTERVAL '30 days'
  LOOP
    -- Get notification preferences for this tenant
    SELECT * INTO _prefs 
    FROM notification_preferences 
    WHERE tenant_id = _subscription.tenant_id;
    
    -- Calculate days until expiry
    _days_until_expiry := EXTRACT(DAY FROM (_subscription.ends_at - now()))::INTEGER;
    
    -- Only send if within reminder days preference (default 7 if no prefs)
    IF _prefs IS NULL OR _days_until_expiry <= COALESCE(_prefs.reminder_days_before, 7) THEN
      _message := format(
        'Your %s subscription expires in %s days on %s. Amount due: ৳%s. Please renew to continue service.',
        _subscription.package_name,
        _days_until_expiry,
        to_char(_subscription.ends_at, 'Mon DD, YYYY'),
        _subscription.amount
      );
      
      -- Queue email notification if enabled
      IF _prefs IS NULL OR (_prefs.email_enabled AND _prefs.subscription_reminders) THEN
        INSERT INTO notification_queue (
          tenant_id,
          notification_type,
          channel,
          recipient,
          subject,
          message,
          status,
          scheduled_at
        ) 
        SELECT 
          _subscription.tenant_id,
          'subscription_reminder',
          'email',
          COALESCE(_prefs.email_address, _subscription.tenant_email),
          'Subscription Renewal Reminder - ' || _subscription.package_name,
          _message,
          'pending',
          now()
        WHERE NOT EXISTS (
          -- Don't duplicate if already queued today
          SELECT 1 FROM notification_queue 
          WHERE tenant_id = _subscription.tenant_id
            AND notification_type = 'subscription_reminder'
            AND channel = 'email'
            AND created_at > now() - INTERVAL '1 day'
        );
      END IF;
      
      -- Queue SMS notification if enabled
      IF _prefs IS NOT NULL AND _prefs.sms_enabled AND _prefs.subscription_reminders AND _prefs.phone_number IS NOT NULL THEN
        INSERT INTO notification_queue (
          tenant_id,
          notification_type,
          channel,
          recipient,
          message,
          status,
          scheduled_at
        )
        SELECT 
          _subscription.tenant_id,
          'subscription_reminder',
          'sms',
          _prefs.phone_number,
          _message,
          'pending',
          now()
        WHERE NOT EXISTS (
          SELECT 1 FROM notification_queue 
          WHERE tenant_id = _subscription.tenant_id
            AND notification_type = 'subscription_reminder'
            AND channel = 'sms'
            AND created_at > now() - INTERVAL '1 day'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.queue_subscription_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_subscription_reminders() TO service_role;