import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface Division {
  id: string;
  tenant_id: string;
  name: string;
  bn_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: string;
  tenant_id: string;
  division_id?: string | null;
  name: string;
  bn_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Upazila {
  id: string;
  tenant_id: string;
  district_id: string;
  name: string;
  bn_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Union {
  id: string;
  tenant_id: string;
  upazila_id: string;
  name: string;
  bn_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Village {
  id: string;
  tenant_id: string;
  union_id: string;
  name: string;
  bn_name?: string | null;
  section_block?: string | null;
  road_no?: string | null;
  house_no?: string | null;
  created_at: string;
  updated_at: string;
}

export function useLocationHierarchy() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDivisions = useCallback(async () => {
    try {
      let query = supabase.from('divisions').select('*').order('name');
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDivisions((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching divisions:', err);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchDistricts = useCallback(async (divisionId?: string) => {
    try {
      let query = supabase.from('districts').select('*').order('name');
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      } else if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDistricts((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchUpazilas = useCallback(async (districtId?: string) => {
    try {
      let query = supabase.from('upazilas').select('*').order('name');
      if (districtId) {
        query = query.eq('district_id', districtId);
      } else if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setUpazilas((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching upazilas:', err);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchUnions = useCallback(async (upazilaId?: string) => {
    try {
      let query = supabase.from('unions').select('*').order('name');
      if (upazilaId) {
        query = query.eq('upazila_id', upazilaId);
      } else if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setUnions((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching unions:', err);
    }
  }, [tenantId, isSuperAdmin]);

  const fetchVillages = useCallback(async (unionId?: string) => {
    try {
      let query = supabase.from('villages').select('*').order('name');
      if (unionId) {
        query = query.eq('union_id', unionId);
      } else if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setVillages((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching villages:', err);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDivisions(),
        fetchDistricts(),
        fetchUpazilas(),
        fetchUnions(),
        fetchVillages()
      ]);
      setLoading(false);
    };
    if (tenantId || isSuperAdmin) {
      loadAll();
    }
  }, [fetchDivisions, fetchDistricts, fetchUpazilas, fetchUnions, fetchVillages, tenantId, isSuperAdmin]);

  // CRUD functions for divisions
  const createDivision = async (name: string, bnName?: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('divisions')
        .insert({ name, bn_name: bnName || null, tenant_id: tid } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Division created');
      await fetchDivisions();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create division');
      return null;
    }
  };

  const deleteDivision = async (id: string) => {
    try {
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Division deleted');
      await fetchDivisions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete division');
    }
  };

  // CRUD functions for districts
  const createDistrict = async (name: string, divisionId?: string, bnName?: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('districts')
        .insert({ 
          name, 
          division_id: divisionId || null, 
          bn_name: bnName || null, 
          tenant_id: tid 
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('District created');
      await fetchDistricts();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create district');
      return null;
    }
  };

  const deleteDistrict = async (id: string) => {
    try {
      const { error } = await supabase.from('districts').delete().eq('id', id);
      if (error) throw error;
      toast.success('District deleted');
      await fetchDistricts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete district');
    }
  };

  const createUpazila = async (name: string, districtId: string, bnName?: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('upazilas')
        .insert({ name, district_id: districtId, bn_name: bnName || null, tenant_id: tid } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Upazila/Police Station created');
      await fetchUpazilas();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create upazila');
      return null;
    }
  };

  const deleteUpazila = async (id: string) => {
    try {
      const { error } = await supabase.from('upazilas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Upazila deleted');
      await fetchUpazilas();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete upazila');
    }
  };

  const createUnion = async (name: string, upazilaId: string, bnName?: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('unions')
        .insert({ name, upazila_id: upazilaId, bn_name: bnName || null, tenant_id: tid } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Union created');
      await fetchUnions();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create union');
      return null;
    }
  };

  const deleteUnion = async (id: string) => {
    try {
      const { error } = await supabase.from('unions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Union deleted');
      await fetchUnions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete union');
    }
  };

  const createVillage = async (
    name: string,
    unionId: string,
    sectionBlock?: string,
    roadNo?: string,
    houseNo?: string,
    bnName?: string
  ) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data: village, error } = await supabase
        .from('villages')
        .insert({
          name,
          union_id: unionId,
          tenant_id: tid,
          section_block: sectionBlock || null,
          road_no: roadNo || null,
          house_no: houseNo || null,
          bn_name: bnName || null
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Also create a matching legacy `areas` row so reseller/customer dropdowns work.
      // Idempotent: only insert if not already present.
      try {
        const { data: existingArea } = await supabase
          .from('areas')
          .select('id')
          .eq('tenant_id', tid)
          .eq('village_id', (village as any).id)
          .maybeSingle();

        if (!existingArea?.id) {
          // Resolve hierarchy names
          const { data: unionRow } = await supabase
            .from('unions')
            .select('id, name, upazila_id')
            .eq('id', unionId)
            .maybeSingle();

          const upazilaId = (unionRow as any)?.upazila_id as string | undefined;
          const { data: upazilaRow } = upazilaId
            ? await supabase.from('upazilas').select('id, name, district_id').eq('id', upazilaId).maybeSingle()
            : { data: null } as any;

          const districtId = (upazilaRow as any)?.district_id as string | undefined;
          const { data: districtRow } = districtId
            ? await supabase.from('districts').select('id, name').eq('id', districtId).maybeSingle()
            : { data: null } as any;

          await supabase.from('areas').insert({
            tenant_id: tid,
            name,
            village: name,
            village_id: (village as any).id,
            union_id: (unionRow as any)?.id ?? null,
            union_name: (unionRow as any)?.name ?? null,
            upazila_id: (upazilaRow as any)?.id ?? null,
            upazila: (upazilaRow as any)?.name ?? null,
            district_id: (districtRow as any)?.id ?? null,
            district: (districtRow as any)?.name ?? null,
            section_block: sectionBlock || null,
            road_no: roadNo || null,
            house_no: houseNo || null,
          } as any);
        }
      } catch (syncErr) {
        console.warn('Legacy area auto-create failed:', syncErr);
      }

      toast.success('Village/Market created');
      await fetchVillages();
      return village;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create village');
      return null;
    }
  };

  const deleteVillage = async (id: string) => {
    try {
      const { error } = await supabase.from('villages').delete().eq('id', id);
      if (error) throw error;
      toast.success('Village deleted');
      await fetchVillages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete village');
    }
  };

  // Helper functions to get parent names
  const getDivisionName = (divisionId: string) => divisions.find(d => d.id === divisionId)?.name || '-';
  const getDistrictName = (districtId: string) => districts.find(d => d.id === districtId)?.name || '-';
  const getUpazilaName = (upazilaId: string) => upazilas.find(u => u.id === upazilaId)?.name || '-';
  const getUnionName = (unionId: string) => unions.find(u => u.id === unionId)?.name || '-';

  return {
    divisions,
    districts,
    upazilas,
    unions,
    villages,
    loading,
    fetchDivisions,
    fetchDistricts,
    fetchUpazilas,
    fetchUnions,
    fetchVillages,
    createDivision,
    deleteDivision,
    createDistrict,
    deleteDistrict,
    createUpazila,
    deleteUpazila,
    createUnion,
    deleteUnion,
    createVillage,
    deleteVillage,
    getDivisionName,
    getDistrictName,
    getUpazilaName,
    getUnionName,
  };
}
