import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useToast } from '@/hooks/use-toast';
import type { SMSTemplate, SMSQueue } from '@/types/saas';

export function useSMSTemplates() {
  const { tenantId } = useTenantContext();
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      
      const transformedData = (data || []).map(item => ({
        ...item,
        variables: Array.isArray(item.variables) ? item.variables : []
      })) as SMSTemplate[];
      
      setTemplates(transformedData);
    } catch (error: any) {
      console.error('Error fetching SMS templates:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (template: { name: string; template_type: string; message: string; variables?: string[]; is_active?: boolean }) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('sms_templates')
        .insert([{ 
          name: template.name,
          template_type: template.template_type,
          message: template.message,
          variables: template.variables || [],
          is_active: template.is_active ?? true,
          tenant_id: tenantId 
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'SMS template created successfully',
      });

      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const updateTemplate = async (id: string, updates: Partial<SMSTemplate>) => {
    try {
      const { error } = await supabase
        .from('sms_templates')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'SMS template updated successfully',
      });

      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'SMS template deleted successfully',
      });

      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

export function useSMSQueue() {
  const { tenantId } = useTenantContext();
  const [queue, setQueue] = useState<SMSQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQueue = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const transformedData = (data || []).map(item => ({
        ...item,
        recipients: Array.isArray(item.recipients) ? item.recipients : []
      })) as SMSQueue[];
      
      setQueue(transformedData);
    } catch (error: any) {
      console.error('Error fetching SMS queue:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const sendSingleSMS = async (phoneNumber: string, message: string, templateId?: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('sms_queue')
        .insert([{
          tenant_id: tenantId,
          send_type: 'single',
          recipients: [phoneNumber],
          message,
          template_id: templateId,
          total_count: 1,
          status: 'pending',
        }]);

      if (error) throw error;

      toast({
        title: 'SMS Queued',
        description: 'SMS has been queued for sending',
      });

      await fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue SMS',
        variant: 'destructive',
      });
    }
  };

  const sendBulkSMS = async (phoneNumbers: string[], message: string, templateId?: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('sms_queue')
        .insert([{
          tenant_id: tenantId,
          send_type: 'bulk',
          recipients: phoneNumbers,
          message,
          template_id: templateId,
          total_count: phoneNumbers.length,
          status: 'pending',
        }]);

      if (error) throw error;

      toast({
        title: 'Bulk SMS Queued',
        description: `${phoneNumbers.length} SMS messages have been queued`,
      });

      await fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue bulk SMS',
        variant: 'destructive',
      });
    }
  };

  const sendGroupSMS = async (
    groupFilter: { area_id?: string; reseller_id?: string; status?: string },
    message: string,
    templateId?: string
  ) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('sms_queue')
        .insert([{
          tenant_id: tenantId,
          send_type: 'group',
          recipients: [],
          group_filter: groupFilter,
          message,
          template_id: templateId,
          status: 'pending',
        }]);

      if (error) throw error;

      toast({
        title: 'Group SMS Queued',
        description: 'Group SMS has been queued for sending',
      });

      await fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue group SMS',
        variant: 'destructive',
      });
    }
  };

  return {
    queue,
    loading,
    fetchQueue,
    sendSingleSMS,
    sendBulkSMS,
    sendGroupSMS,
  };
}
