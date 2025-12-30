import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type OLTRow = Tables<'olts'>;
export type ONURow = Tables<'onus'>;
export type AlertRow = Tables<'alerts'>;

export interface DashboardStats {
  totalOLTs: number;
  onlineOLTs: number;
  offlineOLTs: number;
  totalONUs: number;
  onlineONUs: number;
  offlineONUs: number;
  activeAlerts: number;
  avgRxPower: number;
}

export function useOLTs() {
  const [olts, setOLTs] = useState<OLTRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOLTs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('olts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOLTs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOLTs();

    // Set up real-time subscription
    const channel = supabase
      .channel('olts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'olts' },
        () => {
          fetchOLTs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOLTs]);

  return { olts, loading, error, refetch: fetchOLTs };
}

export function useONUs() {
  const [onus, setONUs] = useState<ONURow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchONUs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('onus')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setONUs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchONUs();

    // Set up real-time subscription
    const channel = supabase
      .channel('onus-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'onus' },
        () => {
          fetchONUs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchONUs]);

  return { onus, loading, error, refetch: fetchONUs };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);
      
      if (error) throw error;
      fetchAlerts();
    } catch (err: any) {
      console.error('Error marking alert as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (error) throw error;
      fetchAlerts();
    } catch (err: any) {
      console.error('Error marking all alerts as read:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  return { alerts, loading, error, refetch: fetchAlerts, markAsRead, markAllAsRead };
}

export function useDashboardStats() {
  const { olts } = useOLTs();
  const { onus } = useONUs();
  const { alerts } = useAlerts();

  const stats: DashboardStats = {
    totalOLTs: olts.length,
    onlineOLTs: olts.filter(o => o.status === 'online').length,
    offlineOLTs: olts.filter(o => o.status === 'offline').length,
    totalONUs: onus.length,
    onlineONUs: onus.filter(o => o.status === 'online').length,
    offlineONUs: onus.filter(o => o.status === 'offline').length,
    activeAlerts: alerts.filter(a => !a.is_read).length,
    avgRxPower: onus.length > 0 
      ? parseFloat((onus.reduce((acc, o) => acc + (o.rx_power || 0), 0) / onus.length).toFixed(2))
      : 0,
  };

  return stats;
}

export async function addOLT(data: {
  name: string;
  brand: OLTRow['brand'];
  ip_address: string;
  port: number;
  username: string;
  password_encrypted: string;
}) {
  const { error } = await supabase.from('olts').insert({
    name: data.name,
    brand: data.brand,
    ip_address: data.ip_address,
    port: data.port,
    username: data.username,
    password_encrypted: data.password_encrypted,
    status: 'unknown',
  });

  if (error) throw error;
}

export async function deleteOLT(id: string) {
  const { error } = await supabase.from('olts').delete().eq('id', id);
  if (error) throw error;
}
