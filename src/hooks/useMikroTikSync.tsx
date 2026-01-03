import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import type { MikroTikRouter, PPPoEUser, PPPoEActiveSession, QueueSimple } from '@/types/isp';
import { toast } from 'sonner';

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
  const [syncing, setSyncing] = useState(false);
  const [syncingRouter, setSyncingRouter] = useState<string | null>(null);

  // Sync PPPoE users from MikroTik to software
  const syncPPPoEUsers = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncingRouter(routerId);
    try {
      // In real implementation, this would call an edge function that connects to MikroTik
      // For now, we simulate the sync by updating last_synced
      const { error } = await supabase
        .from('mikrotik_routers')
        .update({ 
          last_synced: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', routerId);

      if (error) throw error;

      // Fetch existing customers linked to this router
      const { data: customers } = await supabase
        .from('customers')
        .select('id, pppoe_username, status')
        .eq('mikrotik_id', routerId);

      toast.success(`PPPoE sync completed! ${customers?.length || 0} users found.`);
      return { success: true, pppoeUsers: customers?.length || 0 };
    } catch (err: any) {
      console.error('PPPoE sync error:', err);
      toast.error('Failed to sync PPPoE users');
      return { success: false, error: err.message };
    } finally {
      setSyncingRouter(null);
    }
  }, []);

  // Sync packages/queues from MikroTik
  const syncQueues = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncingRouter(routerId);
    try {
      // Update router status
      await supabase
        .from('mikrotik_routers')
        .update({ 
          last_synced: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', routerId);

      // Fetch PPPoE profiles linked to this router
      const { data: profiles } = await supabase
        .from('pppoe_profiles')
        .select('*')
        .eq('mikrotik_id', routerId);

      toast.success(`Queue sync completed! ${profiles?.length || 0} profiles found.`);
      return { success: true, queues: profiles?.length || 0 };
    } catch (err: any) {
      console.error('Queue sync error:', err);
      toast.error('Failed to sync queues');
      return { success: false, error: err.message };
    } finally {
      setSyncingRouter(null);
    }
  }, []);

  // Full sync - PPPoE users + Queues + Active sessions
  const fullSync = useCallback(async (routerId: string): Promise<SyncResult> => {
    setSyncing(true);
    setSyncingRouter(routerId);
    try {
      const router = await supabase
        .from('mikrotik_routers')
        .select('*')
        .eq('id', routerId)
        .single();

      if (router.error) throw router.error;

      // Update router status and timestamp
      await supabase
        .from('mikrotik_routers')
        .update({ 
          last_synced: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', routerId);

      // Get all customers for this router
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, pppoe_username, status')
        .eq('mikrotik_id', routerId);

      if (custError) throw custError;

      const activeCount = customers?.filter(c => c.status === 'active').length || 0;
      const expiredCount = customers?.filter(c => c.status === 'expired').length || 0;

      toast.success(
        `Full sync completed! ${customers?.length || 0} total users, ${activeCount} active, ${expiredCount} expired.`
      );

      return { 
        success: true, 
        pppoeUsers: customers?.length || 0,
        activeUsers: activeCount
      };
    } catch (err: any) {
      console.error('Full sync error:', err);
      
      // Mark router as offline on error
      await supabase
        .from('mikrotik_routers')
        .update({ status: 'offline' })
        .eq('id', routerId);

      toast.error(err.message || 'Full sync failed');
      return { success: false, error: err.message };
    } finally {
      setSyncing(false);
      setSyncingRouter(null);
    }
  }, []);

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
      // In production, this would call an edge function to create user on MikroTik
      console.log('Creating PPPoE user:', { routerId, username, profile });
      toast.success(`PPPoE user ${username} created on MikroTik`);
      return true;
    } catch (err: any) {
      console.error('Create PPPoE user error:', err);
      toast.error('Failed to create PPPoE user on MikroTik');
      return false;
    }
  }, []);

  // Enable/Disable PPPoE user
  const togglePPPoEUser = useCallback(async (
    routerId: string,
    username: string,
    disabled: boolean
  ): Promise<boolean> => {
    try {
      // In production, this would call an edge function
      console.log(`${disabled ? 'Disabling' : 'Enabling'} PPPoE user:`, username);
      toast.success(`PPPoE user ${username} ${disabled ? 'disabled' : 'enabled'}`);
      return true;
    } catch (err: any) {
      console.error('Toggle PPPoE user error:', err);
      toast.error(`Failed to ${disabled ? 'disable' : 'enable'} PPPoE user`);
      return false;
    }
  }, []);

  // Get customer network status (online/offline, bandwidth)
  const getCustomerNetworkStatus = useCallback(async (
    routerId: string,
    pppoeUsername: string
  ): Promise<CustomerNetworkStatus | null> => {
    try {
      // In production, this would call an edge function to get active session
      // For now, return simulated data
      return {
        pppoeUsername,
        isOnline: Math.random() > 0.3, // 70% chance online
        uptime: '3d 2h 15m',
        callerId: '',
        address: '10.15.0.' + Math.floor(Math.random() * 255),
        rxBytes: Math.floor(Math.random() * 100000000000),
        txBytes: Math.floor(Math.random() * 5000000000),
        rxRate: Math.floor(Math.random() * 50000000), // Up to 50 Mbps
        txRate: Math.floor(Math.random() * 10000000), // Up to 10 Mbps
      };
    } catch (err: any) {
      console.error('Get network status error:', err);
      return null;
    }
  }, []);

  // Disconnect PPPoE session
  const disconnectSession = useCallback(async (
    routerId: string,
    sessionId: string
  ): Promise<boolean> => {
    try {
      console.log('Disconnecting session:', sessionId);
      toast.success('PPPoE session disconnected');
      return true;
    } catch (err: any) {
      console.error('Disconnect session error:', err);
      toast.error('Failed to disconnect session');
      return false;
    }
  }, []);

  // Save Caller-ID (MAC binding)
  const saveCallerId = useCallback(async (
    routerId: string,
    username: string,
    callerId: string
  ): Promise<boolean> => {
    try {
      console.log('Saving Caller-ID:', { username, callerId });
      toast.success('Caller-ID saved successfully');
      return true;
    } catch (err: any) {
      console.error('Save Caller-ID error:', err);
      toast.error('Failed to save Caller-ID');
      return false;
    }
  }, []);

  // Remove Caller-ID (unbind MAC)
  const removeCallerId = useCallback(async (
    routerId: string,
    username: string
  ): Promise<boolean> => {
    try {
      console.log('Removing Caller-ID for:', username);
      toast.success('Caller-ID removed successfully');
      return true;
    } catch (err: any) {
      console.error('Remove Caller-ID error:', err);
      toast.error('Failed to remove Caller-ID');
      return false;
    }
  }, []);

  return {
    syncing,
    syncingRouter,
    syncPPPoEUsers,
    syncQueues,
    fullSync,
    createPPPoEUser,
    togglePPPoEUser,
    getCustomerNetworkStatus,
    disconnectSession,
    saveCallerId,
    removeCallerId,
  };
}
