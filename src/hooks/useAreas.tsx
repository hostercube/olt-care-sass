import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { Area } from '@/types/isp';
import { toast } from 'sonner';

export function useAreas() {
  const { tenantId, isSuperAdmin, loading: contextLoading } = useTenantContext();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = useCallback(async () => {
    // Wait for context to load first
    if (contextLoading) {
      return;
    }
    
    // Always require tenant context for ISP users
    if (!isSuperAdmin && !tenantId) {
      console.log('No tenant context available for areas fetch');
      setAreas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('areas')
        .select('*')
        .order('name', { ascending: true });

      // CRITICAL: Always filter by tenant_id for non-super-admins
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAreas((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin, contextLoading]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = async (data: Partial<Area>) => {
    try {
      const areaData: any = { ...data };
      
      if (tenantId) {
        areaData.tenant_id = tenantId;
        
        // Check package limit before adding new area
        if (!isSuperAdmin) {
          const { checkPackageLimit } = await import('@/hooks/usePackageLimits');
          const limitCheck = await checkPackageLimit(tenantId, 'areas', 1);
          if (!limitCheck.allowed) {
            toast.error(limitCheck.message || 'Area limit reached. Please upgrade your package.');
            throw new Error(limitCheck.message);
          }
        }
      } else if (!isSuperAdmin) {
        throw new Error('No tenant context available');
      }
      
      const { data: newArea, error } = await supabase
        .from('areas')
        .insert(areaData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Area created successfully');
      fetchAreas();
      return newArea;
    } catch (err) {
      console.error('Error creating area:', err);
      toast.error('Failed to create area');
      throw err;
    }
  };

  const updateArea = async (id: string, data: Partial<Area>) => {
    try {
      const { error } = await supabase
        .from('areas')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Area updated successfully');
      fetchAreas();
    } catch (err) {
      console.error('Error updating area:', err);
      toast.error('Failed to update area');
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Area deleted successfully');
      fetchAreas();
    } catch (err) {
      console.error('Error deleting area:', err);
      toast.error('Failed to delete area');
      throw err;
    }
  };

  return {
    areas,
    loading,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
  };
}
