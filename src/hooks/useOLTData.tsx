import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useTenantContext, useSuperAdmin } from '@/hooks/useSuperAdmin';

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
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  const fetchOLTs = useCallback(async () => {
    if (tenantLoading || superAdminLoading) return;
    
    try {
      let query = supabase
        .from('olts')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by tenant for non-super-admin users
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOLTs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, isSuperAdmin, superAdminLoading]);

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

  return { olts, loading: loading || tenantLoading || superAdminLoading, error, refetch: fetchOLTs };
}

export function useONUs() {
  const [onus, setONUs] = useState<ONURow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  const fetchONUs = useCallback(async () => {
    if (tenantLoading || superAdminLoading) return;
    
    try {
      // First get tenant's OLT IDs if not super admin
      let oltIds: string[] = [];
      if (!isSuperAdmin && tenantId) {
        const { data: tenantOlts } = await supabase
          .from('olts')
          .select('id')
          .eq('tenant_id', tenantId);
        oltIds = (tenantOlts || []).map(o => o.id);
      }

      let query = supabase
        .from('onus')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by tenant's OLTs
      if (!isSuperAdmin && tenantId && oltIds.length > 0) {
        query = query.in('olt_id', oltIds);
      } else if (!isSuperAdmin && tenantId && oltIds.length === 0) {
        // Tenant has no OLTs, return empty
        setONUs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;
      setONUs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, isSuperAdmin, superAdminLoading]);

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

  return { onus, loading: loading || tenantLoading || superAdminLoading, error, refetch: fetchONUs };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  const fetchAlerts = useCallback(async () => {
    if (tenantLoading || superAdminLoading) return;
    
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by tenant for non-super-admin users
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, isSuperAdmin, superAdminLoading]);

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

  return { alerts, loading: loading || tenantLoading || superAdminLoading, error, refetch: fetchAlerts, markAsRead, markAllAsRead };
}

export function useDashboardStats() {
  const { olts } = useOLTs();
  const { onus } = useONUs();
  const { alerts } = useAlerts();

  // Calculate average power only from ONUs that have power readings
  const onusWithPower = onus.filter(o => o.rx_power !== null && o.rx_power !== undefined);
  const avgRxPower = onusWithPower.length > 0 
    ? parseFloat((onusWithPower.reduce((acc, o) => acc + (o.rx_power ?? 0), 0) / onusWithPower.length).toFixed(2))
    : null;

  const stats: DashboardStats = {
    totalOLTs: olts.length,
    onlineOLTs: olts.filter(o => o.status === 'online').length,
    offlineOLTs: olts.filter(o => o.status === 'offline').length,
    totalONUs: onus.length,
    onlineONUs: onus.filter(o => o.status === 'online').length,
    offlineONUs: onus.filter(o => o.status === 'offline').length,
    activeAlerts: alerts.filter(a => !a.is_read).length,
    avgRxPower: avgRxPower ?? 0,
  };

  return stats;
}

export async function addOLT(data: {
  name: string;
  brand: OLTRow['brand'];
  olt_mode: 'EPON' | 'GPON';
  ip_address: string;
  port: number;
  username: string;
  password_encrypted: string;
  mikrotik_ip?: string | null;
  mikrotik_port?: number;
  mikrotik_username?: string | null;
  mikrotik_password_encrypted?: string | null;
  tenant_id?: string | null;
}) {
  // Get current user for created_by field
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to add an OLT');
  }

  // Get user's tenant_id if not provided
  let tenantId = data.tenant_id;
  if (!tenantId) {
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();
    tenantId = tenantUser?.tenant_id || null;
  }

  // Check if user is super admin (skip limit check for super admins)
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();

  const isSuperAdmin = !!userRoles;

  // Check package limit for OLTs (only for non-super-admins with tenant)
  if (!isSuperAdmin && tenantId) {
    const { checkPackageLimit } = await import('@/hooks/usePackageLimits');
    const limitCheck = await checkPackageLimit(tenantId, 'olts', 1);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'OLT limit reached. Please upgrade your package.');
    }
  }

  const insertData: any = {
    name: data.name,
    brand: data.brand,
    olt_mode: data.olt_mode,
    ip_address: data.ip_address,
    port: data.port,
    username: data.username,
    password_encrypted: data.password_encrypted,
    status: 'unknown',
    created_by: user.id,
    tenant_id: tenantId,
  };

  // Only add MikroTik fields if IP is provided
  if (data.mikrotik_ip) {
    insertData.mikrotik_ip = data.mikrotik_ip;
    insertData.mikrotik_port = data.mikrotik_port || 8728;
    insertData.mikrotik_username = data.mikrotik_username;
    insertData.mikrotik_password_encrypted = data.mikrotik_password_encrypted;
  }

  const { error } = await supabase.from('olts').insert(insertData);

  if (error) {
    console.error('Failed to add OLT:', error);
    throw new Error(error.message || 'Failed to add OLT');
  }
}

export async function deleteOLT(id: string) {
  const { error } = await supabase.from('olts').delete().eq('id', id);
  if (error) throw error;
}

export async function updateOLT(id: string, data: Partial<OLTRow>) {
  const { error } = await supabase.from('olts').update(data).eq('id', id);
  if (error) throw error;
}
