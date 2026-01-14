import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { CustomerAppsConfig, CustomerAppsLink } from '@/types/customerApps';

export function useCustomerApps() {
  const { tenantId } = useTenantContext();
  const [config, setConfig] = useState<CustomerAppsConfig | null>(null);
  const [links, setLinks] = useState<CustomerAppsLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('customer_apps_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching apps config:', error);
    }
  }, [tenantId]);

  const fetchLinks = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('customer_apps_links')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category')
        .order('sort_order');

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchLinks()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchConfig, fetchLinks]);

  const saveConfig = async (data: Partial<CustomerAppsConfig>) => {
    if (!tenantId) return;

    try {
      if (config?.id) {
        const { error } = await supabase
          .from('customer_apps_config')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_apps_config')
          .insert({ ...data, tenant_id: tenantId });
        if (error) throw error;
      }
      toast.success('Apps configuration saved');
      await fetchConfig();
    } catch (error: any) {
      toast.error('Failed to save configuration');
      console.error('Error saving config:', error);
    }
  };

  const createLink = async (data: Partial<CustomerAppsLink>) => {
    if (!tenantId) return;

    try {
      const insertData = {
        category: data.category || 'custom',
        title: data.title || '',
        url: data.url || '',
        tenant_id: tenantId,
        description: data.description,
        icon_url: data.icon_url,
        is_active: data.is_active ?? true,
        open_in_browser: data.open_in_browser ?? false,
        requires_login: data.requires_login ?? false,
        sort_order: data.sort_order ?? 0,
      };
      
      const { error } = await supabase
        .from('customer_apps_links')
        .insert(insertData);

      if (error) throw error;
      toast.success('Link created successfully');
      await fetchLinks();
    } catch (error: any) {
      toast.error('Failed to create link');
      console.error('Error creating link:', error);
    }
  };

  const updateLink = async (id: string, data: Partial<CustomerAppsLink>) => {
    try {
      const { error } = await supabase
        .from('customer_apps_links')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Link updated successfully');
      await fetchLinks();
    } catch (error: any) {
      toast.error('Failed to update link');
      console.error('Error updating link:', error);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_apps_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Link deleted successfully');
      await fetchLinks();
    } catch (error: any) {
      toast.error('Failed to delete link');
      console.error('Error deleting link:', error);
    }
  };

  return {
    config,
    links,
    loading,
    saveConfig,
    createLink,
    updateLink,
    deleteLink,
    refetch: () => Promise.all([fetchConfig(), fetchLinks()]),
  };
}
