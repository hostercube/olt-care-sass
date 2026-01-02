import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useTenantContext, useSuperAdmin } from '@/hooks/useSuperAdmin';

export type ONURow = Tables<'onus'>;

export interface ONUWithOLTName extends ONURow {
  oltName?: string;
}

/**
 * Hook for real-time ONU data with Supabase subscriptions
 * Automatically updates when any ONU data changes in database
 * No duplicate entries - deduplicates by olt_id + pon_port + onu_index
 * Supports tenant isolation
 */
export function useRealtimeONUs(oltId?: string) {
  const [onus, setONUs] = useState<ONURow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
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
        .order('updated_at', { ascending: false });

      if (oltId) {
        query = query.eq('olt_id', oltId);
      } else if (!isSuperAdmin && tenantId && oltIds.length > 0) {
        query = query.in('olt_id', oltIds);
      } else if (!isSuperAdmin && tenantId && oltIds.length === 0) {
        setONUs([]);
        setLastUpdate(new Date());
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;
      setONUs(data || []);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [oltId, tenantId, tenantLoading, isSuperAdmin, superAdminLoading]);

  useEffect(() => {
    fetchONUs();

    // Set up real-time subscription for instant updates
    const channelName = oltId ? `onus-olt-${oltId}` : 'onus-all';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'onus',
          ...(oltId ? { filter: `olt_id=eq.${oltId}` } : {})
        },
        (payload) => {
          console.log('ONU realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setONUs(prev => {
              const newOnu = payload.new as ONURow;
              // Check if already exists (by hardware identity)
              const key = `${newOnu.olt_id}|${newOnu.pon_port}|${newOnu.onu_index}`;
              const exists = prev.some(o => 
                `${o.olt_id}|${o.pon_port}|${o.onu_index}` === key
              );
              if (exists) {
                // Update existing instead of adding duplicate
                return prev.map(o => 
                  `${o.olt_id}|${o.pon_port}|${o.onu_index}` === key ? newOnu : o
                );
              }
              return [newOnu, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setONUs(prev => 
              prev.map(o => o.id === (payload.new as ONURow).id ? payload.new as ONURow : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setONUs(prev => 
              prev.filter(o => o.id !== (payload.old as any).id)
            );
          }
          
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchONUs, oltId]);

  // Deduplicate ONUs by hardware identity (olt_id + pon_port + onu_index)
  const deduplicatedONUs = useMemo(() => {
    const byKey = new Map<string, ONURow>();
    
    for (const onu of onus) {
      const key = `${onu.olt_id}|${onu.pon_port}|${onu.onu_index}`;
      const prev = byKey.get(key);
      
      if (!prev) {
        byKey.set(key, onu);
        continue;
      }
      
      // Keep the more recently updated one
      const prevTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const curTime = onu.updated_at ? new Date(onu.updated_at).getTime() : 0;
      
      if (curTime >= prevTime) {
        byKey.set(key, onu);
      }
    }
    
    return Array.from(byKey.values());
  }, [onus]);

  return { 
    onus: deduplicatedONUs, 
    loading: loading || tenantLoading || superAdminLoading, 
    error, 
    refetch: fetchONUs,
    lastUpdate,
    totalRaw: onus.length,
    totalUnique: deduplicatedONUs.length
  };
}

/**
 * Hook for real-time OLT data with Supabase subscriptions
 * Supports tenant isolation
 */
export function useRealtimeOLTs() {
  const [olts, setOLTs] = useState<Tables<'olts'>[]>([]);
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

    // Real-time subscription for OLTs
    const channel = supabase
      .channel('olts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'olts' },
        (payload) => {
          console.log('OLT realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setOLTs(prev => [payload.new as Tables<'olts'>, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOLTs(prev => 
              prev.map(o => o.id === (payload.new as Tables<'olts'>).id ? payload.new as Tables<'olts'> : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOLTs(prev => 
              prev.filter(o => o.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOLTs]);

  return { olts, loading: loading || tenantLoading || superAdminLoading, error, refetch: fetchOLTs };
}
