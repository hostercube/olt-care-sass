import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();

        if (error) throw error;
        setIsSuperAdmin(!!data);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading };
}

export function useTenantContext() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenant = useCallback(async () => {
    if (!user) {
      setTenantId(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      // First get tenant_user record
      const { data: tenantUser, error: tuError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tuError) throw tuError;

      if (tenantUser?.tenant_id) {
        setTenantId(tenantUser.tenant_id);

        // Fetch full tenant details
        const { data: tenantData, error: tError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantUser.tenant_id)
          .single();

        if (tError) throw tError;
        setTenant(tenantData);
      } else {
        setTenantId(null);
        setTenant(null);
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setTenantId(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return { 
    tenantId, 
    tenant, 
    loading: loading || superAdminLoading, 
    refetch: fetchTenant,
    isSuperAdmin,
  };
}
