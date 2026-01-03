import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface District {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Upazila {
  id: string;
  tenant_id: string;
  district_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Union {
  id: string;
  tenant_id: string;
  upazila_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Village {
  id: string;
  tenant_id: string;
  union_id: string;
  name: string;
  section_block: string | null;
  created_at: string;
  updated_at: string;
}

export function useLocationHierarchy() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDistricts = useCallback(async () => {
    try {
      let query = supabase.from('districts').select('*').order('name');
      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDistricts(data || []);
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
      setUpazilas(data || []);
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
      setUnions(data || []);
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
      setVillages(data || []);
    } catch (err) {
      console.error('Error fetching villages:', err);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDistricts(), fetchUpazilas(), fetchUnions(), fetchVillages()]);
      setLoading(false);
    };
    if (tenantId || isSuperAdmin) {
      loadAll();
    }
  }, [fetchDistricts, fetchUpazilas, fetchUnions, fetchVillages, tenantId, isSuperAdmin]);

  // CRUD functions for districts
  const createDistrict = async (name: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('districts')
        .insert({ name, tenant_id: tid })
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

  const createUpazila = async (name: string, districtId: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('upazilas')
        .insert({ name, district_id: districtId, tenant_id: tid })
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

  const createUnion = async (name: string, upazilaId: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('unions')
        .insert({ name, upazila_id: upazilaId, tenant_id: tid })
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

  const createVillage = async (name: string, unionId: string, sectionBlock?: string) => {
    if (!tenantId && !isSuperAdmin) return null;
    const tid = tenantId || '';
    try {
      const { data, error } = await supabase
        .from('villages')
        .insert({ name, union_id: unionId, tenant_id: tid, section_block: sectionBlock || null })
        .select()
        .single();
      if (error) throw error;
      toast.success('Village/Market created');
      await fetchVillages();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create village');
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

  return {
    districts,
    upazilas,
    unions,
    villages,
    loading,
    fetchDistricts,
    fetchUpazilas,
    fetchUnions,
    fetchVillages,
    createDistrict,
    createUpazila,
    createUnion,
    createVillage,
    deleteDistrict,
    deleteUpazila,
    deleteUnion,
    deleteVillage,
  };
}
