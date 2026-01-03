import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailTemplate {
  id: string;
  template_type: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_type', { ascending: true });

      if (error) throw error;
      
      // Transform data to match EmailTemplate interface
      const transformed = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : JSON.parse(t.variables as string || '[]'),
      }));
      
      setTemplates(transformed as EmailTemplate[]);
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: updates.name,
          subject: updates.subject,
          body: updates.body,
          is_active: updates.is_active,
          variables: updates.variables,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template Updated',
        description: 'Email template has been saved successfully',
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error updating email template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const createTemplate = async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          template_type: template.template_type,
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          is_active: template.is_active,
        });

      if (error) throw error;

      toast({
        title: 'Template Created',
        description: 'Email template has been created successfully',
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error creating email template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template Deleted',
        description: 'Email template has been deleted',
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting email template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    updateTemplate,
    createTemplate,
    deleteTemplate,
  };
}
