import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from './useSuperAdmin';

export interface NotificationPreferences {
  id: string;
  tenant_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_address: string | null;
  phone_number: string | null;
  alert_notifications: boolean;
  subscription_reminders: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  tenant_id: string | null;
  notification_type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  error_message: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export function useNotificationPreferences() {
  const { tenantId } = useTenantContext();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPreferences();
    fetchNotifications();
  }, [fetchPreferences, fetchNotifications]);

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!tenantId) return;

    try {
      if (preferences?.id) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            tenant_id: tenantId,
            ...updates,
          });

        if (error) throw error;
      }

      toast({
        title: 'Preferences Saved',
        description: 'Notification preferences have been updated',
      });

      await fetchPreferences();
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    }
  };

  const queueNotification = async (
    notification_type: string,
    channel: 'email' | 'sms',
    recipient: string,
    message: string,
    subject?: string,
    scheduled_at?: Date
  ) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('notification_queue')
        .insert({
          tenant_id: tenantId,
          notification_type,
          channel,
          recipient,
          message,
          subject,
          scheduled_at: scheduled_at?.toISOString() || new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Notification Queued',
        description: 'Notification has been added to the queue',
      });

      await fetchNotifications();
    } catch (error: any) {
      console.error('Error queuing notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to queue notification',
        variant: 'destructive',
      });
    }
  };

  return {
    preferences,
    notifications,
    loading,
    savePreferences,
    queueNotification,
    refetch: fetchPreferences,
  };
}
