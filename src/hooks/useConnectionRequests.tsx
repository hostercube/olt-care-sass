import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { ConnectionRequest } from '@/types/erp';

export function useConnectionRequests() {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('connection_requests').select('*, areas(*), isp_packages(*)');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching connection requests:', error);
      toast.error('Failed to fetch connection requests');
    } else {
      setRequests((data || []) as ConnectionRequest[]);
    }
    setLoading(false);
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (data: Partial<ConnectionRequest>) => {
    if (!tenantId) { toast.error('No tenant context'); return false; }
    const { data: countData } = await (supabase.from as any)('connection_requests')
      .select('id', { count: 'exact' }).eq('tenant_id', tenantId);
    const requestNumber = `REQ${String((countData?.length || 0) + 1).padStart(6, '0')}`;
    const { error } = await (supabase.from as any)('connection_requests').insert({ 
      ...data, tenant_id: tenantId, request_number: requestNumber,
    });
    if (error) { toast.error('Failed to create connection request'); console.error(error);
      return false;
    }
    toast.success('Connection request created');
    fetchRequests();
    return true;
  };

  const updateRequest = async (id: string, data: Partial<ConnectionRequest>) => {
    const { error } = await supabase.from('connection_requests').update(data).eq('id', id);
    if (error) {
      toast.error('Failed to update connection request');
      return false;
    }
    toast.success('Connection request updated');
    fetchRequests();
    return true;
  };

  const approveRequest = async (id: string) => {
    return updateRequest(id, { status: 'approved' });
  };

  const rejectRequest = async (id: string, reason: string) => {
    return updateRequest(id, { status: 'rejected', rejection_reason: reason });
  };

  const completeRequest = async (id: string, customerId: string) => {
    return updateRequest(id, { 
      status: 'completed', 
      customer_id: customerId,
      completed_at: new Date().toISOString(),
    });
  };

  return {
    requests,
    loading,
    refetch: fetchRequests,
    createRequest,
    updateRequest,
    approveRequest,
    rejectRequest,
    completeRequest,
  };
}
