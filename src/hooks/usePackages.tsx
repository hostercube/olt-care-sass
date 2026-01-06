import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Package, TenantFeatures } from '@/types/saas';

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Transform data to match Package type
      const transformedData = (data || []).map(item => ({
        ...item,
        price_monthly: Number(item.price_monthly),
        price_yearly: Number(item.price_yearly),
        features: (item.features || {}) as TenantFeatures,
        is_public: (item as any).is_public ?? true,
      })) as Package[];
      
      setPackages(transformedData);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch packages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const createPackage = async (packageData: { name: string } & Partial<Package>) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert([packageData as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Package created successfully',
      });

      await fetchPackages();
      return data;
    } catch (error: any) {
      console.error('Error creating package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create package',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePackage = async (id: string, updates: Partial<Package>) => {
    try {
      // Cast features to any to avoid Json type conflicts
      const dbUpdates = { 
        ...updates, 
        features: updates.features as any,
        is_public: (updates as any).is_public,
      };
      const { error } = await supabase
        .from('packages')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      // When package is updated, all tenants subscribed to this package 
      // who don't have manual_features_enabled will automatically get updated features
      // because useModuleAccess reads from the subscription's package

      toast({
        title: 'Success',
        description: 'Package updated successfully. All subscribed tenants will receive the updated permissions.',
      });

      await fetchPackages();
    } catch (error: any) {
      console.error('Error updating package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update package',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      });

      await fetchPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete package',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    packages,
    loading,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
  };
}
