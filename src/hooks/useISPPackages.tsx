import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { ISPPackage } from '@/types/isp';
import { toast } from 'sonner';

export function useISPPackages() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [packages, setPackages] = useState<ISPPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    // Always require tenant context for ISP users
    if (!isSuperAdmin && !tenantId) {
      setPackages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('isp_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // CRITICAL: Always filter by tenant_id for non-super-admins
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPackages((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching ISP packages:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const createPackage = async (data: Partial<ISPPackage>) => {
    try {
      const pkgData: any = { ...data };
      
      if (tenantId) {
        pkgData.tenant_id = tenantId;
      } else if (!isSuperAdmin) {
        throw new Error('No tenant context available');
      }
      
      const { data: newPkg, error } = await supabase
        .from('isp_packages')
        .insert(pkgData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Package created successfully');
      fetchPackages();
      return newPkg;
    } catch (err) {
      console.error('Error creating package:', err);
      toast.error('Failed to create package');
      throw err;
    }
  };

  const updatePackage = async (id: string, data: Partial<ISPPackage>) => {
    try {
      const { error } = await supabase
        .from('isp_packages')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Package updated successfully');
      fetchPackages();
    } catch (err) {
      console.error('Error updating package:', err);
      toast.error('Failed to update package');
      throw err;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('isp_packages')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (err) {
      console.error('Error deleting package:', err);
      toast.error('Failed to delete package');
      throw err;
    }
  };

  return {
    packages,
    loading,
    refetch: fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
  };
}
