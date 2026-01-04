import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { MikroTikRouter } from '@/types/isp';

export function useMikroTikRouters() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [routers, setRouters] = useState<MikroTikRouter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRouters = useCallback(async () => {
    // Always require tenant context for ISP users
    if (!isSuperAdmin && !tenantId) {
      setRouters([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('mikrotik_routers')
        .select('*')
        .order('name', { ascending: true });

      // CRITICAL: Always filter by tenant_id for non-super-admins
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRouters((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching MikroTik routers:', err);
      setRouters([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  return {
    routers,
    loading,
    refetch: fetchRouters,
  };
}