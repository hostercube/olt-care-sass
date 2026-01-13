import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LocationVisit {
  id: string;
  tenant_id: string;
  token: string;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  area: string | null;
  district: string | null;
  thana: string | null;
  ip_address: string | null;
  isp_name: string | null;
  asn: string | null;
  device_type: string | null;
  name: string | null;
  phone: string | null;
  verified_status: 'pending' | 'verified' | 'completed';
  verified_by: string | null;
  verified_at: string | null;
  visited_at: string;
  created_at: string;
  updated_at: string;
}

export interface LocationSettings {
  id: string;
  tenant_id: string;
  unique_token: string;
  is_active: boolean;
  popup_title: string;
  popup_description: string;
  require_name: boolean;
  require_phone: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationFilters {
  status?: string;
  area?: string;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useCustomerLocation(tenantId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch location visits
  const { data: visits, isLoading: visitsLoading, refetch: refetchVisits } = useQuery({
    queryKey: ['location-visits', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('location_visits')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('visited_at', { ascending: false });
      
      if (error) throw error;
      return data as LocationVisit[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  // Fetch location settings
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['location-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('tenant_location_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LocationSettings | null;
    },
    enabled: !!tenantId,
  });

  // Generate unique token
  const generateToken = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  // Create or update settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: Partial<LocationSettings>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const token = settingsData.unique_token || generateToken();
      
      const { data: existing } = await supabase
        .from('tenant_location_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('tenant_location_settings')
          .update({
            ...settingsData,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('tenant_location_settings')
          .insert({
            tenant_id: tenantId,
            unique_token: token,
            is_active: true,
            popup_title: 'Please provide your details',
            popup_description: 'Enter your name and phone number for verification',
            require_name: false,
            require_phone: false,
            ...settingsData,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-settings', tenantId] });
      toast({
        title: 'Settings saved',
        description: 'Location capture settings updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Regenerate token
  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const newToken = generateToken();
      
      const { data, error } = await supabase
        .from('tenant_location_settings')
        .update({
          unique_token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-settings', tenantId] });
      toast({
        title: 'Token regenerated',
        description: 'A new unique link has been generated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify location visit
  const verifyVisitMutation = useMutation({
    mutationFn: async ({ visitId, status }: { visitId: string; status: 'verified' | 'completed' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('location_visits')
        .update({
          verified_status: status,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-visits', tenantId] });
      toast({
        title: 'Status updated',
        description: 'Location visit status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter visits
  const filterVisits = useCallback((filters: LocationFilters) => {
    if (!visits) return [];
    
    return visits.filter(visit => {
      if (filters.status && visit.verified_status !== filters.status) return false;
      if (filters.area && visit.area !== filters.area) return false;
      if (filters.district && visit.district !== filters.district) return false;
      if (filters.dateFrom && new Date(visit.visited_at) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(visit.visited_at) > new Date(filters.dateTo)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          visit.name?.toLowerCase().includes(searchLower) ||
          visit.phone?.includes(filters.search) ||
          visit.ip_address?.includes(filters.search) ||
          visit.full_address?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [visits]);

  // Get unique areas and districts for filters
  const uniqueAreas = [...new Set(visits?.map(v => v.area).filter(Boolean) || [])];
  const uniqueDistricts = [...new Set(visits?.map(v => v.district).filter(Boolean) || [])];

  // Calculate live visitor count (visits in last 5 minutes)
  const liveVisitorCount = visits?.filter(v => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(v.visited_at) > fiveMinutesAgo;
  }).length || 0;

  return {
    visits,
    settings,
    visitsLoading,
    settingsLoading,
    refetchVisits,
    refetchSettings,
    saveSettings: saveSettingsMutation.mutate,
    regenerateToken: regenerateTokenMutation.mutate,
    verifyVisit: verifyVisitMutation.mutate,
    filterVisits,
    uniqueAreas,
    uniqueDistricts,
    liveVisitorCount,
    isSaving: saveSettingsMutation.isPending,
    isRegenerating: regenerateTokenMutation.isPending,
    isVerifying: verifyVisitMutation.isPending,
  };
}
