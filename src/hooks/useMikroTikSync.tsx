import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { toast } from 'sonner';
import { normalizePollingServerUrl } from '@/lib/polling-server';

interface SyncResult {
  success: boolean;
  pppoeUsers?: number;
  activeUsers?: number;
  queues?: number;
  error?: string;
}

interface CustomerNetworkStatus {
  pppoeUsername: string;
  isOnline: boolean;
  uptime?: string;
  callerId?: string;
  address?: string;
  rxBytes?: number;
  txBytes?: number;
  rxRate?: number;
  txRate?: number;
}

export function useMikroTikSync() {
  const { tenantId } = useTenantContext();
  const { settings } = useSystemSettings();
  const apiBase = normalizePollingServerUrl(settings?.apiServerUrl);

  const [syncing, setSyncing] = useState(false);
  const [syncingRouter, setSyncingRouter] = useState<string | null>(null);

  // Helper to get router credentials and configuration
  const getRouterConfig = async (routerId: string) => {
    const { data, error } = await supabase
      .from('mikrotik_routers')
      .select('*')
      .eq('id', routerId)
      .single();

    if (error || !data) return null;

    return {
      ip: data.ip_address,
      port: data.port,
      username: data.username,
      password: data.password_encrypted,
      allow_customer_delete: (data as any).allow_customer_delete ?? true,
      allow_queue_delete: (data as any).allow_queue_delete ?? true,
      use_expired_profile: (data as any).use_expired_profile ?? false,
      expired_profile_name: (data as any).expired_profile_name || 'expired',
      auto_disable_expired: (data as any).auto_disable_expired ?? true,
    };
  };

  const getRouterTenantId = async (routerId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('mikrotik_routers')
      .select('tenant_id')
      .eq('id', routerId)
      .single();

    if (error) return tenantId || null;
    return (data as any)?.tenant_id || tenantId || null;
  };

  // Sync PPPoE users from MikroTik to software (creates customers)
  const syncPPPoEUsers = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncingRouter(routerId);
    try {
      const effectiveTenantId = await getRouterTenantId(routerId);
      if (!effectiveTenantId) throw new Error('Tenant not selected');

      const response = await fetch(`${apiBase}/api/mikrotik/sync/pppoe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId, tenantId: effectiveTenantId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`PPPoE sync: ${result.secrets || 0} secrets found, ${result.customersInserted || 0} customers created`);
        return { success: true, pppoeUsers: result.secrets || 0 };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('PPPoE sync error:', err);
      toast.error(err.message || 'Failed to sync PPPoE users');
      return { success: false, error: err.message };
    } finally {
      setSyncingRouter(null);
    }
  }, [apiBase, tenantId]);

  // Sync packages/queues from MikroTik
  const syncQueues = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncingRouter(routerId);
    try {
      const effectiveTenantId = await getRouterTenantId(routerId);
      if (!effectiveTenantId) throw new Error('Tenant not selected');

      const response = await fetch(`${apiBase}/api/mikrotik/sync/queues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId, tenantId: effectiveTenantId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Package sync: ${result.profiles || 0} profiles, ${result.packagesCreated || 0} created, ${result.packagesUpdated || 0} updated`);
        return { success: true, queues: result.profiles || 0 };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('Queue sync error:', err);
      toast.error(err.message || 'Failed to sync queues');
      return { success: false, error: err.message };
    } finally {
      setSyncingRouter(null);
    }
  }, [apiBase, tenantId]);

  // Full sync - PPPoE users + Queues + Active sessions
  const fullSync = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncing(true);
    setSyncingRouter(routerId);
    try {
      const effectiveTenantId = await getRouterTenantId(routerId);
      if (!effectiveTenantId) throw new Error('Tenant not selected');

      const response = await fetch(`${apiBase}/api/mikrotik/sync/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId, tenantId: effectiveTenantId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Full sync: ${result.profiles || 0} profiles, ${result.secrets || 0} secrets, ${result.packagesCreated || 0} packages, ${result.customersInserted || 0} customers`
        );
        return { success: true, pppoeUsers: result.secrets || 0, activeUsers: result.activeSessions || 0 };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('Full sync error:', err);
      toast.error(err.message || 'Full sync failed');
      return { success: false, error: err.message };
    } finally {
      setSyncing(false);
      setSyncingRouter(null);
    }
  }, [apiBase, tenantId]);

  // Create PPPoE user on MikroTik when customer is created
  const createPPPoEUser = useCallback(async (
    routerId: string,
    username: string,
    password: string,
    profile: string,
    callerId?: string,
    comment?: string
  ): Promise<boolean> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) {
        toast.error('Router not found');
        return false;
      }

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mikrotik,
          pppoeUser: { name: username, password, profile, callerId, comment },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`PPPoE user ${username} created on MikroTik`);
        return true;
      } else {
        toast.warning(`Note: ${result.error || 'Could not create PPPoE user'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Create PPPoE user error:', err);
      toast.warning('Note: Could not create PPPoE user on MikroTik');
      return false;
    }
  }, [apiBase]);

  // Enable/Disable PPPoE user
  const togglePPPoEUser = useCallback(async (
    routerId: string,
    username: string,
    disabled: boolean
  ): Promise<boolean> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) return false;

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username, disabled }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`PPPoE user ${username} ${disabled ? 'disabled' : 'enabled'}`);
        return true;
      } else {
        toast.error(result.error || `Failed to ${disabled ? 'disable' : 'enable'} PPPoE user`);
        return false;
      }
    } catch (err: any) {
      console.error('Toggle PPPoE user error:', err);
      toast.error(`Failed to ${disabled ? 'disable' : 'enable'} PPPoE user`);
      return false;
    }
  }, [apiBase]);

  // Get customer network status (online/offline, bandwidth)
  const getCustomerNetworkStatus = useCallback(async (
    routerId: string,
    pppoeUsername: string
  ): Promise<CustomerNetworkStatus | null> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) return null;

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username: pppoeUsername }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          pppoeUsername,
          isOnline: result.isOnline || false,
          uptime: result.uptime,
          callerId: result.callerId,
          address: result.address,
          rxBytes: result.rxBytes,
          txBytes: result.txBytes,
        };
      }

      return { pppoeUsername, isOnline: false };
    } catch (err: any) {
      console.error('Get network status error:', err);
      return null;
    }
  }, [apiBase]);

  // Get live bandwidth for customer
  const getLiveBandwidth = useCallback(async (
    routerId: string,
    pppoeUsername: string
  ): Promise<{ rxBytes: number; txBytes: number; isOnline: boolean } | null> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) return null;

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/bandwidth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username: pppoeUsername }),
      });

      const result = await response.json();
      return result.success ? result : null;
    } catch (err) {
      return null;
    }
  }, [apiBase]);

  // Disconnect PPPoE session
  const disconnectSession = useCallback(async (
    routerId: string,
    pppoeUsername: string
  ): Promise<boolean> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) return false;

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username: pppoeUsername }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('PPPoE session disconnected');
        return true;
      } else {
        toast.error(result.error || 'Failed to disconnect session');
        return false;
      }
    } catch (err: any) {
      console.error('Disconnect session error:', err);
      toast.error('Failed to disconnect session');
      return false;
    }
  }, [apiBase]);

  // Update PPPoE user (rename/password/profile/comment/caller-id)
  const updatePPPoEUser = useCallback(async (
    routerId: string,
    username: string,
    updates: {
      newUsername?: string;
      password?: string;
      profile?: string;
      comment?: string;
      callerId?: string;
    }
  ): Promise<boolean> => {
    try {
      const mikrotik = await getRouterConfig(routerId);
      if (!mikrotik) {
        toast.error('Router not found');
        return false;
      }

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username, ...updates }),
      });

      const result = await response.json().catch(() => ({}));

      if (result.success) {
        toast.success('MikroTik updated');
        return true;
      }

      toast.error(result.error || 'Failed to update MikroTik');
      return false;
    } catch (err: any) {
      console.error('Update PPPoE user error:', err);
      toast.error(err.message || 'Failed to update MikroTik');
      return false;
    }
  }, [apiBase]);

  // Save Caller-ID (MAC binding)
  const saveCallerId = useCallback(async (
    routerId: string,
    username: string,
    callerId: string
  ): Promise<boolean> => {
    return updatePPPoEUser(routerId, username, { callerId });
  }, [updatePPPoEUser]);

  // Remove Caller-ID (unbind MAC)
  const removeCallerId = useCallback(async (
    routerId: string,
    username: string
  ): Promise<boolean> => {
    return updatePPPoEUser(routerId, username, { callerId: '' });
  }, [updatePPPoEUser]);

  // Switch customer to expired profile (restricted internet)
  const switchToExpiredProfile = useCallback(async (
    routerId: string,
    username: string
  ): Promise<boolean> => {
    try {
      const config = await getRouterConfig(routerId);
      if (!config) return false;

      // If use_expired_profile is disabled, just disable the user
      if (!config.use_expired_profile) {
        return togglePPPoEUser(routerId, username, true);
      }

      // Switch to expired profile
      const result = await updatePPPoEUser(routerId, username, {
        profile: config.expired_profile_name || 'expired',
      });

      if (result) {
        toast.success(`Switched to expired profile: ${config.expired_profile_name}`);
      }
      return result;
    } catch (err: any) {
      console.error('Switch to expired profile error:', err);
      toast.error('Failed to switch to expired profile');
      return false;
    }
  }, [updatePPPoEUser, togglePPPoEUser]);

  // Activate customer - switch from expired profile to original package profile and enable
  const activateCustomer = useCallback(async (
    routerId: string,
    username: string,
    originalProfile: string
  ): Promise<boolean> => {
    try {
      const config = await getRouterConfig(routerId);
      if (!config) return false;

      // If use_expired_profile is enabled, switch back to original profile
      if (config.use_expired_profile) {
        await updatePPPoEUser(routerId, username, {
          profile: originalProfile,
        });
      }

      // Enable the user
      await togglePPPoEUser(routerId, username, false);
      
      toast.success('Customer activated on MikroTik');
      return true;
    } catch (err: any) {
      console.error('Activate customer error:', err);
      toast.error('Failed to activate customer');
      return false;
    }
  }, [updatePPPoEUser, togglePPPoEUser]);

  // Delete PPPoE user from MikroTik (respects router permission setting)
  const deletePPPoEUser = useCallback(async (
    routerId: string,
    username: string
  ): Promise<boolean> => {
    try {
      const config = await getRouterConfig(routerId);
      if (!config) return false;

      // Check if deletion from MikroTik is allowed
      if (!config.allow_customer_delete) {
        // Permission disabled - only software record will be deleted, MikroTik untouched
        console.info(`MikroTik delete permission disabled for router ${routerId} - PPPoE ${username} kept on router`);
        return true;
      }

      const mikrotik = {
        ip: config.ip,
        port: config.port,
        username: config.username,
        password: config.password,
      };

      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`PPPoE user ${username} deleted from MikroTik`);
        return true;
      } else {
        toast.error(result.error || 'Failed to delete PPPoE user');
        return false;
      }
    } catch (err: any) {
      console.error('Delete PPPoE user error:', err);
      toast.error('Failed to delete PPPoE user');
      return false;
    }
  }, [apiBase]);

  // Delete MikroTik profile/queue (respects router permission setting)
  const deleteProfile = useCallback(async (
    routerId: string,
    profileName: string
  ): Promise<boolean> => {
    try {
      const config = await getRouterConfig(routerId);
      if (!config) return false;

      // Check if deletion from MikroTik is allowed
      if (!config.allow_queue_delete) {
        // Permission disabled - only software record will be deleted, MikroTik untouched
        console.info(`MikroTik queue delete permission disabled for router ${routerId} - Profile ${profileName} kept on router`);
        return true;
      }

      const mikrotik = {
        ip: config.ip,
        port: config.port,
        username: config.username,
        password: config.password,
      };

      const response = await fetch(`${apiBase}/api/mikrotik/profile/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, profileName }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Profile ${profileName} deleted from MikroTik`);
        return true;
      } else {
        toast.error(result.error || 'Failed to delete profile');
        return false;
      }
    } catch (err: any) {
      console.error('Delete profile error:', err);
      toast.error('Failed to delete profile');
      return false;
    }
  }, [apiBase]);

  return {
    syncing,
    syncingRouter,
    syncPPPoEUsers,
    syncQueues,
    fullSync,
    createPPPoEUser,
    togglePPPoEUser,
    getCustomerNetworkStatus,
    getLiveBandwidth,
    disconnectSession,
    updatePPPoEUser,
    saveCallerId,
    removeCallerId,
    deletePPPoEUser,
    deleteProfile,
    switchToExpiredProfile,
    activateCustomer,
    getRouterConfig,
  };
}
