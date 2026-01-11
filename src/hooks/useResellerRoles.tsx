import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { ResellerRoleDefinition, ResellerPermissionKey } from '@/types/reseller';

export function useResellerRoles() {
  const { tenantId } = useTenantContext();
  const [roles, setRoles] = useState<ResellerRoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!tenantId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reseller_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_system', { ascending: false })
        .order('level')
        .order('name');

      if (error) throw error;
      setRoles((data as unknown as ResellerRoleDefinition[]) || []);
    } catch (err) {
      console.error('Error fetching reseller roles:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (data: {
    name: string;
    description?: string;
    role_type: string;
    level: number;
    permissions: Record<string, boolean>;
  }): Promise<boolean> => {
    if (!tenantId) {
      toast.error('No tenant context');
      return false;
    }

    try {
      const { error } = await supabase
        .from('reseller_roles')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          role_type: data.role_type,
          level: data.level,
          permissions: data.permissions,
          is_system: false,
          is_active: true,
        });

      if (error) throw error;
      toast.success('Role created successfully');
      await fetchRoles();
      return true;
    } catch (err: any) {
      console.error('Error creating role:', err);
      toast.error(err.message || 'Failed to create role');
      return false;
    }
  };

  const updateRole = async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      role_type: string;
      level: number;
      permissions: Record<string, boolean>;
      is_active: boolean;
    }>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('reseller_roles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Role updated successfully');
      await fetchRoles();
      return true;
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast.error(err.message || 'Failed to update role');
      return false;
    }
  };

  const deleteRole = async (id: string): Promise<boolean> => {
    try {
      // Check if any resellers are using this role
      const { data: usingResellers, error: checkError } = await supabase
        .from('resellers')
        .select('id')
        .eq('role_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (usingResellers && usingResellers.length > 0) {
        toast.error('Cannot delete role that is assigned to resellers');
        return false;
      }

      const { error } = await supabase
        .from('reseller_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Role deleted successfully');
      await fetchRoles();
      return true;
    } catch (err: any) {
      console.error('Error deleting role:', err);
      toast.error(err.message || 'Failed to delete role');
      return false;
    }
  };

  const getRoleById = (id: string): ResellerRoleDefinition | undefined => {
    return roles.find(r => r.id === id);
  };

  const getRolesByLevel = (level: number): ResellerRoleDefinition[] => {
    return roles.filter(r => r.level === level);
  };

  const hasPermission = (role: ResellerRoleDefinition | null | undefined, key: ResellerPermissionKey): boolean => {
    if (!role?.permissions) return false;
    return !!role.permissions[key];
  };

  return {
    roles,
    loading,
    refetch: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    getRoleById,
    getRolesByLevel,
    hasPermission,
  };
}
