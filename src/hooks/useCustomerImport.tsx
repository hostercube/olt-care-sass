import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

export function useCustomerImport() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  const findOrCreatePackage = async (packageName: string, price: number): Promise<string | null> => {
    if (!packageName || !tenantId) return null;
    
    // Try to find existing package
    const { data: existing } = await supabase
      .from('isp_packages')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', packageName)
      .single();
    
    if (existing) return existing.id;
    
    // Create new package
    const { data: newPkg, error } = await supabase
      .from('isp_packages')
      .insert({
        tenant_id: tenantId,
        name: packageName,
        price: price || 0,
        download_speed: 10,
        upload_speed: 10,
        validity_days: 30,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating package:', error);
      return null;
    }
    
    return newPkg?.id || null;
  };

  const findOrCreateArea = async (areaName: string, district?: string, upazila?: string): Promise<string | null> => {
    if (!areaName || !tenantId) return null;
    
    // Try to find existing area
    const { data: existing } = await supabase
      .from('areas')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', areaName)
      .single();
    
    if (existing) return existing.id;
    
    // Create new area
    const { data: newArea, error } = await supabase
      .from('areas')
      .insert({
        tenant_id: tenantId,
        name: areaName,
        district: district || null,
        upazila: upazila || null,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating area:', error);
      return null;
    }
    
    return newArea?.id || null;
  };

  const findMikroTik = async (mikrotikName: string): Promise<string | null> => {
    if (!mikrotikName || !tenantId) return null;
    
    const { data } = await supabase
      .from('mikrotik_routers')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${mikrotikName}%`)
      .single();
    
    return data?.id || null;
  };

  const importCustomers = useCallback(async (file: File): Promise<ImportResult> => {
    if (!tenantId && !isSuperAdmin) {
      toast.error('No tenant context available');
      return { total: 0, success: 0, failed: 0, errors: [] };
    }

    setImporting(true);
    setProgress(0);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error('No valid data found in CSV');
        return { total: 0, success: 0, failed: 0, errors: [] };
      }

      // Log import batch
      const { data: importLog } = await supabase
        .from('customer_imports')
        .insert({
          tenant_id: tenantId,
          file_name: file.name,
          total_rows: rows.length,
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      const result: ImportResult = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        try {
          // Map CSV columns to customer fields
          const name = row.name || row.customer_name || row.username || '';
          if (!name) {
            result.failed++;
            result.errors.push({ row: i + 2, error: 'Name is required' });
            continue;
          }

          // Find or create package
          const packageName = row.package || row.package_name || row.plan || '';
          const packagePrice = parseFloat(row.price || row.monthly_bill || row.bill || '0');
          const packageId = packageName ? await findOrCreatePackage(packageName, packagePrice) : null;

          // Find or create area
          const areaName = row.area || row.area_name || row.zone || '';
          const district = row.district || '';
          const upazila = row.upazila || row.thana || '';
          const areaId = areaName ? await findOrCreateArea(areaName, district, upazila) : null;

          // Find MikroTik
          const mikrotikName = row.mikrotik || row.router || '';
          const mikrotikId = mikrotikName ? await findMikroTik(mikrotikName) : null;

          // Create customer
          const customerData: any = {
            tenant_id: tenantId,
            name,
            phone: row.phone || row.mobile || row.contact || null,
            email: row.email || null,
            address: row.address || row.location || null,
            pppoe_username: row.pppoe_username || row.username || row.pppoe || null,
            pppoe_password: row.pppoe_password || row.password || null,
            onu_mac: row.onu_mac || row.mac || null,
            router_mac: row.router_mac || null,
            package_id: packageId,
            area_id: areaId,
            mikrotik_id: mikrotikId,
            monthly_bill: packagePrice || 0,
            due_amount: parseFloat(row.due || row.due_amount || '0'),
            connection_date: row.connection_date || row.start_date || new Date().toISOString().split('T')[0],
            expiry_date: row.expiry_date || row.expire_date || null,
            status: (row.status || 'active').toLowerCase() as any,
            notes: row.notes || row.remarks || null,
          };

          const { error } = await supabase
            .from('customers')
            .insert(customerData);

          if (error) {
            result.failed++;
            result.errors.push({ row: i + 2, error: error.message });
          } else {
            result.success++;
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push({ row: i + 2, error: err.message || 'Unknown error' });
        }
      }

      // Update import log
      if (importLog?.id) {
        await supabase
          .from('customer_imports')
          .update({
            imported_count: result.success,
            failed_count: result.failed,
            status: 'completed',
            error_log: result.errors.length > 0 ? result.errors : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', importLog.id);
      }

      if (result.success > 0) {
        toast.success(`Imported ${result.success} of ${result.total} customers`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} customers failed to import`);
      }

      return result;
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Failed to import customers');
      return { total: 0, success: 0, failed: 0, errors: [] };
    } finally {
      setImporting(false);
      setProgress(0);
    }
  }, [tenantId, isSuperAdmin]);

  const downloadTemplate = () => {
    const template = 'name,phone,email,address,pppoe_username,pppoe_password,package,price,area,district,upazila,mikrotik,onu_mac,due_amount,connection_date,expiry_date,status,notes\n';
    const example = 'John Doe,01712345678,john@example.com,123 Main St,john_pppoe,password123,10 Mbps,500,Zone A,Dhaka,Dhanmondi,Main Router,AA:BB:CC:DD:EE:FF,0,2024-01-01,2024-02-01,active,New customer\n';
    
    const blob = new Blob([template + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    importCustomers,
    downloading: downloadTemplate,
    importing,
    progress,
  };
}