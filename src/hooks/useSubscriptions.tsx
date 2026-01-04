import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Subscription, SubscriptionStatus, BillingCycle, TenantFeatures } from '@/types/saas';

export function useSubscriptions(tenantId?: string) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          tenant:tenants(id, name, email, company_name, status),
          package:packages(id, name, price_monthly, price_yearly, max_olts, features)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data
      const transformedData = (data || []).map(item => ({
        ...item,
        amount: Number(item.amount),
        billing_cycle: item.billing_cycle as BillingCycle,
        status: item.status as SubscriptionStatus,
        package: item.package ? {
          ...item.package,
          price_monthly: Number(item.package.price_monthly),
          price_yearly: Number(item.package.price_yearly),
          features: (item.package.features || {}) as TenantFeatures
        } : undefined
      })) as Subscription[];
      
      setSubscriptions(transformedData);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, tenantId]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const createSubscription = async (subscriptionData: { tenant_id: string; package_id: string; amount: number; ends_at: string } & Partial<Subscription>) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscriptionData as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Subscription created successfully',
      });

      await fetchSubscriptions();
      return data;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Subscription updated successfully',
      });

      await fetchSubscriptions();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const cancelSubscription = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason,
          auto_renew: false,
        } as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Subscription Cancelled',
        description: 'The subscription has been cancelled',
      });

      await fetchSubscriptions();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const renewSubscription = async (id: string, endDate: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          ends_at: endDate,
          cancelled_at: null,
          cancelled_reason: null,
        } as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Subscription Renewed',
        description: 'The subscription has been renewed',
      });

      await fetchSubscriptions();
    } catch (error: any) {
      console.error('Error renewing subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to renew subscription',
        variant: 'destructive',
      });
    }
  };

  return {
    subscriptions,
    loading,
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    renewSubscription,
  };
}
