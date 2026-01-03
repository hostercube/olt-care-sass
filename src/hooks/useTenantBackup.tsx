import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export interface TenantBackup {
  id: string;
  tenant_id: string;
  file_name: string;
  file_size: number | null;
  backup_type: string;
  status: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export function useTenantBackup() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [backups, setBackups] = useState<TenantBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchBackups = useCallback(async () => {
    if (!tenantId && !isSuperAdmin) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('tenant_backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      setBackups((data as TenantBackup[]) || []);
    } catch (err) {
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  const exportData = useCallback(async (targetTenantId?: string) => {
    const exportTenantId = targetTenantId || tenantId;
    if (!exportTenantId) {
      toast.error('No tenant selected for export');
      return null;
    }

    setExporting(true);
    try {
      // Call the export function
      const { data, error } = await supabase.rpc('export_tenant_data', {
        _tenant_id: exportTenantId
      });

      if (error) throw error;

      // Create a backup record
      const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const jsonData = JSON.stringify(data, null, 2);
      const fileSize = new Blob([jsonData]).size;

      const { error: backupError } = await supabase
        .from('tenant_backups')
        .insert({
          tenant_id: exportTenantId,
          file_name: fileName,
          file_size: fileSize,
          backup_type: 'full',
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as any);

      if (backupError) {
        console.error('Error recording backup:', backupError);
      }

      // Download the file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
      await fetchBackups();
      return data;
    } catch (err) {
      console.error('Error exporting data:', err);
      toast.error('Failed to export data');
      return null;
    } finally {
      setExporting(false);
    }
  }, [tenantId, fetchBackups]);

  return {
    backups,
    loading,
    exporting,
    fetchBackups,
    exportData,
  };
}