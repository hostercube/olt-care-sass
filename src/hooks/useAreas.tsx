import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { Area } from '@/types/isp';
import { toast } from 'sonner';

export function useAreas() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('areas')
        .select('*')
        .order('name', { ascending: true });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAreas((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = async (data: Partial<Area>) => {
    try {
      const { data: newArea, error } = await supabase
        .from('areas')
        .insert({ ...data, tenant_id: tenantId } as any)
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
