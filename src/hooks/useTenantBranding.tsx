import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantBranding {
  company_name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
  dashboard_theme: string;
}

const defaultBranding: TenantBranding = {
  company_name: 'ISP Point',
  subtitle: 'Internet Service Provider',
  logo_url: '',
  favicon_url: '',
  theme_color: 'cyan',
  dashboard_theme: 'dark-default',
};

// Prebuilt dashboard themes
export const DASHBOARD_THEMES = [
  { 
    id: 'dark-default', 
    name: 'Dark Default', 
    description: 'Modern dark theme with cyan accents',
    preview: 'bg-slate-900',
    sidebar: 'bg-slate-950',
    accent: 'bg-cyan-500',
    mode: 'dark'
  },
  { 
    id: 'light-default', 
    name: 'Light Default', 
    description: 'Clean light theme with professional feel',
    preview: 'bg-slate-100',
    sidebar: 'bg-white',
    accent: 'bg-cyan-500',
    mode: 'light'
  },
  { 
    id: 'admin-lte', 
    name: 'Admin LTE', 
    description: 'Classic admin panel with blue sidebar',
    preview: 'bg-slate-100',
    sidebar: 'bg-blue-600',
    accent: 'bg-blue-500',
    mode: 'light'
  },
  { 
    id: 'dark-fixed', 
    name: 'Dark Fixed', 
    description: 'Dark theme with fixed sidebar layout',
    preview: 'bg-slate-800',
    sidebar: 'bg-slate-900',
    accent: 'bg-indigo-500',
    mode: 'dark'
  },
  { 
    id: 'light-fixed', 
    name: 'Light Fixed', 
    description: 'Light theme with fixed sidebar layout',
    preview: 'bg-gray-50',
    sidebar: 'bg-gray-100',
    accent: 'bg-indigo-500',
    mode: 'light'
  },
  { 
    id: 'dark-scrollable', 
    name: 'Dark Scrollable', 
    description: 'Dark theme with scrollable content',
    preview: 'bg-zinc-900',
    sidebar: 'bg-zinc-950',
    accent: 'bg-purple-500',
    mode: 'dark'
  },
  { 
    id: 'magenta-modern', 
    name: 'Magenta Modern', 
    description: 'Vibrant magenta accents on dark background',
    preview: 'bg-slate-900',
    sidebar: 'bg-pink-600',
    accent: 'bg-pink-500',
    mode: 'dark'
  },
  { 
    id: 'green-nature', 
    name: 'Green Nature', 
    description: 'Fresh green theme for eco-friendly brands',
    preview: 'bg-slate-800',
    sidebar: 'bg-emerald-700',
    accent: 'bg-emerald-500',
    mode: 'dark'
  },
];

export const THEME_COLORS = [
  { name: 'Cyan', value: 'cyan', class: 'bg-cyan-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
];

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
        .select('company_name, subtitle, logo_url, favicon_url, theme_color, dashboard_theme')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setBranding({
          company_name: data.company_name || defaultBranding.company_name,
          subtitle: data.subtitle || defaultBranding.subtitle,
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
          theme_color: data.theme_color || defaultBranding.theme_color,
          dashboard_theme: data.dashboard_theme || defaultBranding.dashboard_theme,
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
        
        // Build upload URL - use /api/upload endpoint
        const baseUrl = pollingServerUrl.replace(/\/+$/, '');
        const uploadUrl = `${baseUrl}/api/upload/${tenantId}`;
        
        console.log('Uploading to VPS:', uploadUrl);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Upload response:', data);
          if (data.success && data.url) {
            toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
            return data.url;
          }
        } else {
          const errorText = await response.text();
          console.warn('VPS upload failed:', response.status, errorText);
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
          .select('company_name, subtitle, logo_url, favicon_url, theme_color, dashboard_theme')
          .eq('id', tenantId)
          .single();

        if (error) throw error;

        if (data) {
          setBranding({
            company_name: data.company_name || defaultBranding.company_name,
            subtitle: data.subtitle || defaultBranding.subtitle,
            logo_url: data.logo_url || '',
            favicon_url: data.favicon_url || '',
            theme_color: data.theme_color || defaultBranding.theme_color,
            dashboard_theme: data.dashboard_theme || defaultBranding.dashboard_theme,
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
