import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { toast } from 'sonner';
import { fetchJsonSafe, normalizePollingServerUrl } from '@/lib/polling-server';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  mikrotikCreated: number;
  errors: { row: number; error: string }[];
}

export function useCustomerImport() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const { settings } = useSystemSettings();
  const apiBase = normalizePollingServerUrl(settings?.apiServerUrl);
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

  const findOrCreatePackage = async (packageName: string, price: number): Promise<{ id: string; name: string } | null> => {
    if (!packageName || !tenantId) return null;
    
    // Try to find existing package
    const { data: existing } = await supabase
      .from('isp_packages')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .ilike('name', packageName)
      .single();
    
    if (existing) return { id: existing.id, name: existing.name };
    
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
      .select('id, name')
      .single();
    
    if (error) {
      console.error('Error creating package:', error);
      return null;
    }
    
    return newPkg ? { id: newPkg.id, name: newPkg.name } : null;
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

  const findMikroTik = async (mikrotikName: string): Promise<{ id: string; ip: string; port: number; username: string; password: string } | null> => {
    if (!mikrotikName || !tenantId) return null;
    
    // Try exact match first, then partial match
    let data = null;
    
    // First try exact match
    const { data: exactData } = await supabase
      .from('mikrotik_routers')
      .select('id, ip_address, port, username, password_encrypted')
      .eq('tenant_id', tenantId)
      .ilike('name', mikrotikName)
      .single();
    
    if (exactData) {
      data = exactData;
    } else {
      // Try partial match
      const { data: partialData } = await supabase
        .from('mikrotik_routers')
        .select('id, ip_address, port, username, password_encrypted')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${mikrotikName}%`)
        .limit(1)
        .single();
      
      data = partialData;
    }
    
    if (!data) {
      console.log(`MikroTik router not found for name: ${mikrotikName}`);
      return null;
    }
    
    console.log(`Found MikroTik router: ${data.ip_address} for name: ${mikrotikName}`);
    
    return {
      id: data.id,
      ip: data.ip_address,
      port: data.port || 8728,
      username: data.username,
      password: data.password_encrypted,
    };
  };

  // Create PPPoE user on MikroTik
  const createPPPoEOnMikroTik = async (
    mikrotik: { ip: string; port: number; username: string; password: string },
    pppoeUser: { name: string; password: string; profile: string; comment?: string }
  ): Promise<boolean> => {
    if (!apiBase) {
      console.warn('API server URL not configured, skipping MikroTik PPPoE creation');
      toast.error('API Server URL not configured. Go to Settings to configure VPS connection.');
      return false;
    }

    try {
      console.log(`Creating PPPoE user ${pppoeUser.name} on MikroTik ${mikrotik.ip} with profile: ${pppoeUser.profile}`);
      
      const { ok, status, data, text } = await fetchJsonSafe<any>(
        `${apiBase}/api/mikrotik/pppoe/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mikrotik: {
              ip: mikrotik.ip,
              port: mikrotik.port,
              username: mikrotik.username,
              password: mikrotik.password,
            },
            pppoeUser: {
              name: pppoeUser.name,
              password: pppoeUser.password,
              profile: pppoeUser.profile,
              comment: pppoeUser.comment || '',
            },
          }),
        }
      );

      const result = data || {};
      console.log(`PPPoE create result for ${pppoeUser.name}:`, result);

      if (ok && result.success === true) {
        return true;
      }

      const fallback = !ok ? `Request failed (HTTP ${status})` : (result.error || 'Unknown error');
      console.error(`Failed to create PPPoE user ${pppoeUser.name}: ${fallback}`);
      if (!data) {
        console.error('Non-JSON response:', text);
      }
      return false;
    } catch (err) {
      console.error('Failed to create PPPoE on MikroTik:', err);
      return false;
    }
  };

  const importCustomers = useCallback(async (file: File): Promise<ImportResult> => {
    if (!tenantId && !isSuperAdmin) {
      toast.error('No tenant context available');
      return { total: 0, success: 0, failed: 0, mikrotikCreated: 0, errors: [] };
    }

    setImporting(true);
    setProgress(0);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error('No valid data found in CSV');
        return { total: 0, success: 0, failed: 0, mikrotikCreated: 0, errors: [] };
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
        mikrotikCreated: 0,
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

          // Find or create package (now returns name too)
          const packageName = row.package || row.package_name || row.plan || '';
          const packagePrice = parseFloat(row.price || row.monthly_bill || row.bill || '0');
          const packageInfo = packageName ? await findOrCreatePackage(packageName, packagePrice) : null;

          // Find or create area
          const areaName = row.area || row.area_name || row.zone || '';
          const district = row.district || '';
          const upazila = row.upazila || row.thana || '';
          const areaId = areaName ? await findOrCreateArea(areaName, district, upazila) : null;

          // Find MikroTik (now returns full router info)
          const mikrotikName = row.mikrotik || row.router || '';
          const mikrotikInfo = mikrotikName ? await findMikroTik(mikrotikName) : null;

          const pppoeUsername = row.pppoe_username || row.username || row.pppoe || null;
          const pppoePassword = row.pppoe_password || row.password || null;

          // Create customer
          const customerData: any = {
            tenant_id: tenantId,
            name,
            phone: row.phone || row.mobile || row.contact || null,
            email: row.email || null,
            address: row.address || row.location || null,
            pppoe_username: pppoeUsername,
            pppoe_password: pppoePassword,
            onu_mac: row.onu_mac || row.mac || null,
            router_mac: row.router_mac || null,
            package_id: packageInfo?.id || null,
            area_id: areaId,
            mikrotik_id: mikrotikInfo?.id || null,
            monthly_bill: packagePrice || 0,
            due_amount: parseFloat(row.due || row.due_amount || '0'),
            connection_date: row.connection_date || row.start_date || new Date().toISOString().split('T')[0],
            expiry_date: row.expiry_date || row.expire_date || null,
            status: (row.status || 'active').toLowerCase() as any,
            notes: row.notes || row.remarks || null,
          };

          const { data: insertedCustomer, error } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id')
            .single();

          if (error) {
            result.failed++;
            result.errors.push({ row: i + 2, error: error.message });
          } else {
            result.success++;

            // Create PPPoE user on MikroTik if conditions are met
            console.log(`Import row ${i + 2}: mikrotikInfo=${!!mikrotikInfo}, pppoeUsername=${pppoeUsername}, pppoePassword=${!!pppoePassword}`);
            
            if (mikrotikInfo && pppoeUsername && pppoePassword) {
              const profileName = packageInfo?.name || 'default';
              console.log(`Creating PPPoE on MikroTik for ${pppoeUsername} with profile: ${profileName}`);
              
              const pppoeCreated = await createPPPoEOnMikroTik(
                mikrotikInfo,
                {
                  name: pppoeUsername,
                  password: pppoePassword,
                  profile: profileName,
                  comment: name,
                }
              );
              
              if (pppoeCreated) {
                result.mikrotikCreated++;
                console.log(`PPPoE user ${pppoeUsername} created successfully`);
              } else {
                console.warn(`PPPoE user ${pppoeUsername} failed to create on MikroTik`);
              }
            } else {
              console.log(`Skipping MikroTik PPPoE creation: missing ${!mikrotikInfo ? 'mikrotik' : !pppoeUsername ? 'username' : 'password'}`);
            }
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
        const msg = result.mikrotikCreated > 0 
          ? `Imported ${result.success} customers, ${result.mikrotikCreated} PPPoE users created on MikroTik`
          : `Imported ${result.success} of ${result.total} customers`;
        toast.success(msg);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} customers failed to import`);
      }

      return result;
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Failed to import customers');
      return { total: 0, success: 0, failed: 0, mikrotikCreated: 0, errors: [] };
    } finally {
      setImporting(false);
      setProgress(0);
    }
  }, [tenantId, isSuperAdmin, apiBase]);

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