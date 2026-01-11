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

      let areaRows = ((data as any[]) || []) as Area[];

      // Backfill legacy `areas` from location hierarchy (villages) if tenant only uses new location tables.
      // This fixes: reseller/customer area dropdown showing "None" even though tenant added locations.
      if (!isSuperAdmin && tenantId && areaRows.length === 0) {
        try {
          const { data: villages, error: vErr } = await supabase
            .from('villages')
            .select('id, name, union_id, section_block, road_no, house_no')
            .eq('tenant_id', tenantId)
            .order('name');

          if (!vErr && villages && villages.length > 0) {
            // Fetch unions + upazilas + districts names for display fields in areas table
            const unionIds = Array.from(new Set(villages.map((v: any) => v.union_id).filter(Boolean)));

            const { data: unions } = await supabase
              .from('unions')
              .select('id, name, upazila_id')
              .in('id', unionIds);

            const upazilaIds = Array.from(new Set((unions || []).map((u: any) => u.upazila_id).filter(Boolean)));

            const { data: upazilas } = await supabase
              .from('upazilas')
              .select('id, name, district_id')
              .in('id', upazilaIds);

            const districtIds = Array.from(new Set((upazilas || []).map((u: any) => u.district_id).filter(Boolean)));

            const { data: districts } = await supabase
              .from('districts')
              .select('id, name')
              .in('id', districtIds);

            const unionById = new Map((unions || []).map((u: any) => [u.id, u]));
            const upazilaById = new Map((upazilas || []).map((u: any) => [u.id, u]));
            const districtById = new Map((districts || []).map((d: any) => [d.id, d]));

            // Insert missing legacy areas (idempotent check via village_id)
            for (const v of villages as any[]) {
              const { data: existing } = await supabase
                .from('areas')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('village_id', v.id)
                .maybeSingle();

              if (existing?.id) continue;

              const union = unionById.get(v.union_id);
              const upazila = union ? upazilaById.get(union.upazila_id) : undefined;
              const district = upazila ? districtById.get(upazila.district_id) : undefined;

              await supabase.from('areas').insert({
                tenant_id: tenantId,
                name: v.name,
                village: v.name,
                village_id: v.id,
                union_id: union?.id ?? null,
                union_name: union?.name ?? null,
                upazila_id: upazila?.id ?? null,
                upazila: upazila?.name ?? null,
                district_id: district?.id ?? null,
                district: district?.name ?? null,
                section_block: v.section_block ?? null,
                road_no: v.road_no ?? null,
                house_no: v.house_no ?? null,
              } as any);
            }

            // Re-fetch after backfill
            const { data: refetched } = await supabase
              .from('areas')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('name', { ascending: true });

            areaRows = ((refetched as any[]) || []) as Area[];
          }
        } catch (syncErr) {
          console.warn('Legacy areas sync failed:', syncErr);
        }
      }

      setAreas(areaRows);
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
