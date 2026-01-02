import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Alert = Tables<'alerts'>;

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setAlerts(data || []);
      setUnreadCount(data?.filter(a => !a.is_read).length || 0);
    }
    setLoading(false);
  }, []);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    if (!error) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .in('id', unreadIds);
    
    if (!error) {
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);
    
    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts(prev => [newAlert, ...prev.slice(0, 99)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for critical alerts
          if (newAlert.severity === 'critical') {
            toast({
              variant: 'destructive',
              title: `🚨 ${newAlert.title}`,
              description: newAlert.message,
            });
          } else if (newAlert.severity === 'warning') {
            toast({
              title: `⚠️ ${newAlert.title}`,
              description: newAlert.message,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          const updatedAlert = payload.new as Alert;
          setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          const deletedId = (payload.old as Alert).id;
          setAlerts(prev => prev.filter(a => a.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, toast]);

  return {
    alerts,
    unreadCount,
    loading,
    fetchAlerts,
    markAsRead,
    markAllAsRead,
    deleteAlert,
  };
}
