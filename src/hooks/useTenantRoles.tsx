import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export function useTenantRoles() {
  const { tenantId } = useTenantContext();
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!tenantId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRoles((data as TenantRole[]) || []);
    } catch (err) {
      console.error('Error fetching tenant roles:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (data: Partial<TenantRole>) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    try {
      const insertData = {
        tenant_id: tenantId,
        name: data.name || '',
        description: data.description || null,
        permissions: data.permissions || {},
        is_system: false,
        is_active: true,
      };
      
      const { error } = await supabase
        .from('tenant_roles')
        .insert(insertData);

      if (error) throw error;
      toast.success('Role created');
      fetchRoles();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
      return false;
    }
  };

  const updateRole = async (id: string, data: Partial<TenantRole>) => {
    try {
      const { error } = await supabase
        .from('tenant_roles')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      toast.success('Role updated');
      fetchRoles();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
      return false;
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tenant_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Role deleted');
      fetchRoles();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
      return false;
    }
  };

  return {
    roles,
    loading,
    refetch: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}
