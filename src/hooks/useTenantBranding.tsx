import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantBranding {
  company_name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
}

const defaultBranding: TenantBranding = {
  company_name: 'ISP Point',
  subtitle: 'Internet Service Provider',
  logo_url: '',
  favicon_url: '',
};

export function useTenantBranding() {
  const { tenantId } = useTenantContext();
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBranding = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('company_name, subtitle, logo_url, favicon_url')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setBranding({
          company_name: data.company_name || defaultBranding.company_name,
          subtitle: data.subtitle || defaultBranding.subtitle,
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching tenant branding:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Apply favicon dynamically
  useEffect(() => {
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = branding.favicon_url;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = branding.favicon_url;
        document.head.appendChild(newLink);
      }
    }
  }, [branding.favicon_url]);

  // Update document title with company name
  useEffect(() => {
    if (branding.company_name && branding.company_name !== defaultBranding.company_name) {
      const currentTitle = document.title;
      if (!currentTitle.includes(branding.company_name)) {
        document.title = `${branding.company_name} - ISP Management`;
      }
    }
  }, [branding.company_name]);

  const updateBranding = async (updates: Partial<TenantBranding>) => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update(updates as any)
        .eq('id', tenantId);

      if (error) throw error;

      setBranding(prev => ({ ...prev, ...updates }));
      toast.success('Branding updated successfully');
    } catch (error: any) {
      console.error('Error updating branding:', error);
      toast.error(error.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File, type: 'logo' | 'favicon'): Promise<string | null> => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return null;
    }

    try {
      // Try VPS server upload first
      const pollingServerUrl = await getPollingServerUrl();
      
      if (pollingServerUrl) {
        // Upload to VPS server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        const uploadUrl = `${pollingServerUrl}/api/upload/${tenantId}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.url) {
            toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
            return data.url;
          }
        } else {
          console.warn('VPS upload failed, falling back to Supabase storage');
        }
      }
      
      // Fallback to Supabase storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${tenantId}/${type}_${Date.now()}.${fileExt}`;
      const bucket = 'tenant-assets';

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
      return null;
    }
  };

  // Helper to get polling server URL
  const getPollingServerUrl = async (): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_settings')
        .single();
      
      if (data?.value) {
        const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        let url = settings.pollingServerUrl;
        if (url) {
          // Normalize URL
          url = url.replace(/\/+$/, '').replace(/\/api$/, '');
          return url;
        }
      }
    } catch (error) {
      console.warn('Could not get polling server URL:', error);
    }
    return null;
  };

  return {
    branding,
    loading,
    saving,
    updateBranding,
    uploadLogo,
    refetch: fetchBranding,
  };
}

// Hook to fetch branding for a specific tenant (used in login pages, invoices, etc.)
export function useTenantBrandingById(tenantId: string | null) {
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tenants')
          .select('company_name, subtitle, logo_url, favicon_url')
          .eq('id', tenantId)
          .single();

        if (error) throw error;

        if (data) {
          setBranding({
            company_name: data.company_name || defaultBranding.company_name,
            subtitle: data.subtitle || defaultBranding.subtitle,
            logo_url: data.logo_url || '',
            favicon_url: data.favicon_url || '',
          });
        }
      } catch (error) {
        console.error('Error fetching tenant branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [tenantId]);

  return { branding, loading };
}
