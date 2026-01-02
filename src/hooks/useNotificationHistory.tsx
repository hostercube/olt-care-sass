import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';

export interface NotificationRecord {
  id: string;
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
  tenant_id: string | null;
}

export function useNotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // If not super admin, filter by tenant
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-success/10 text-success';
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'Mail';
      case 'sms':
        return 'MessageSquare';
      case 'telegram':
        return 'Send';
      default:
        return 'Bell';
    }
  };

  return {
    notifications,
    loading,
    refetch: fetchNotifications,
    getStatusColor,
    getChannelIcon,
  };
}
