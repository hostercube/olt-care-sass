import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface Brand {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  short_name: string;
  unit_type: string;
  is_active: boolean;
  created_at: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  invoice_header: string | null;
  invoice_footer: string | null;
  invoice_terms: string | null;
  invoice_prefix: string | null;
  thermal_printer_enabled: boolean;
}

export function useInventoryExtended() {
  const { tenantId } = useTenantContext();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('inventory_brands')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      setBrands((data || []) as Brand[]);
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  }, [tenantId]);

  const fetchUnits = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('inventory_units')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      setUnits((data || []) as Unit[]);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  }, [tenantId]);

  const fetchTenantInfo = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, company_name, logo_url, phone, email, address, invoice_header, invoice_footer, invoice_terms, invoice_prefix, thermal_printer_enabled')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      setTenantInfo(data as TenantInfo);
    } catch (err) {
      console.error('Error fetching tenant info:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([fetchBrands(), fetchUnits(), fetchTenantInfo()])
        .finally(() => setLoading(false));
    }
  }, [tenantId, fetchBrands, fetchUnits, fetchTenantInfo]);

  // Brand CRUD
  const createBrand = async (data: { name: string; description?: string; logo_url?: string }) => {
    if (!tenantId) return null;
    try {
      const { data: brand, error } = await supabase
        .from('inventory_brands')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          logo_url: data.logo_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Brand created');
      fetchBrands();
      return brand;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create brand');
      return null;
    }
  };

  const updateBrand = async (id: string, data: Partial<Brand>) => {
    try {
      const { error } = await supabase
        .from('inventory_brands')
        .update({
          name: data.name,
          description: data.description,
          logo_url: data.logo_url,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Brand updated');
      fetchBrands();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update brand');
      return false;
    }
  };

  const deleteBrand = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_brands')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Brand deleted');
      fetchBrands();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brand');
      return false;
    }
  };

  // Unit CRUD
  const createUnit = async (data: { name: string; short_name: string; unit_type: string }) => {
    if (!tenantId) return null;
    try {
      const { data: unit, error } = await supabase
        .from('inventory_units')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          short_name: data.short_name,
          unit_type: data.unit_type,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Unit created');
      fetchUnits();
      return unit;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create unit');
      return null;
    }
  };

  const updateUnit = async (id: string, data: Partial<Unit>) => {
    try {
      const { error } = await supabase
        .from('inventory_units')
        .update({
          name: data.name,
          short_name: data.short_name,
          unit_type: data.unit_type,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Unit updated');
      fetchUnits();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update unit');
      return false;
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_units')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Unit deleted');
      fetchUnits();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete unit');
      return false;
    }
  };

  // Update tenant invoice settings
  const updateTenantInvoiceSettings = async (data: Partial<TenantInfo>) => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          invoice_header: data.invoice_header,
          invoice_footer: data.invoice_footer,
          invoice_terms: data.invoice_terms,
          invoice_prefix: data.invoice_prefix,
          thermal_printer_enabled: data.thermal_printer_enabled,
        })
        .eq('id', tenantId);
      if (error) throw error;
      toast.success('Invoice settings updated');
      fetchTenantInfo();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
      return false;
    }
  };

  return {
    brands,
    units,
    tenantInfo,
    loading,
    refetch: () => {
      fetchBrands();
      fetchUnits();
      fetchTenantInfo();
    },
    // Brand operations
    createBrand,
    updateBrand,
    deleteBrand,
    // Unit operations
    createUnit,
    updateUnit,
    deleteUnit,
    // Tenant operations
    updateTenantInvoiceSettings,
  };
}

// Default unit types
export const UNIT_TYPES = [
  { value: 'quantity', label: 'Quantity (pcs, units)' },
  { value: 'weight', label: 'Weight (kg, gram, lb)' },
  { value: 'length', label: 'Length (meter, feet, inch)' },
  { value: 'volume', label: 'Volume (liter, ml)' },
  { value: 'area', label: 'Area (sqft, sqm)' },
  { value: 'pack', label: 'Pack (box, carton, bundle)' },
];

// Default units for quick setup
export const DEFAULT_UNITS = [
  { name: 'Piece', short_name: 'pcs', unit_type: 'quantity' },
  { name: 'Kilogram', short_name: 'kg', unit_type: 'weight' },
  { name: 'Gram', short_name: 'g', unit_type: 'weight' },
  { name: 'Meter', short_name: 'm', unit_type: 'length' },
  { name: 'Feet', short_name: 'ft', unit_type: 'length' },
  { name: 'Liter', short_name: 'L', unit_type: 'volume' },
  { name: 'Box', short_name: 'box', unit_type: 'pack' },
  { name: 'Carton', short_name: 'ctn', unit_type: 'pack' },
  { name: 'Set', short_name: 'set', unit_type: 'quantity' },
  { name: 'Pair', short_name: 'pair', unit_type: 'quantity' },
];
