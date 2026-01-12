import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';
import { fetchJsonSafe, resolvePollingServerUrl, summarizeHttpError } from '@/lib/polling-server';
import * as XLSX from 'xlsx';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  mikrotikCreated: number;
  errors: { row: number; error: string }[];
}

export function useCustomerImport() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const { pollingServerUrl } = usePollingServerUrl();
  const apiBase = resolvePollingServerUrl(pollingServerUrl);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Parse CSV file
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => normalizeHeader(h));
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

  // Parse XLSX file
  const parseXLSX = async (file: File): Promise<Record<string, string>[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<any>(firstSheet, { defval: '' });
    
    // Normalize headers for each row
    return rawData.map((row: any) => {
      const normalizedRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const normalizedKey = normalizeHeader(key);
        let value = row[key];
        
        // Handle date values
        if (value instanceof Date) {
          value = formatDate(value);
        } else {
          value = String(value ?? '').trim();
        }
        
        normalizedRow[normalizedKey] = value;
      }
      return normalizedRow;
    });
  };

  // Normalize header names for consistent mapping
  const normalizeHeader = (header: string): string => {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse various date formats including m/d/y
  const parseExpiryDate = (dateStr: string | Date | null | undefined): string | null => {
    if (!dateStr) return null;
    
    // Handle Date objects
    if (dateStr instanceof Date) {
      return formatDate(dateStr);
    }
    
    const str = String(dateStr).trim();
    if (!str) return null;
    
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.split('T')[0];
    }
    
    // Handle m/d/y or m/d/yy format (like 4/25/25)
    const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mdyMatch) {
      const [, month, day, yearPart] = mdyMatch;
      let year = parseInt(yearPart);
      // Handle 2-digit year
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // Handle d/m/y format
    const dmyMatch = str.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})$/);
    if (dmyMatch) {
      const [, day, month, yearPart] = dmyMatch;
      let year = parseInt(yearPart);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return null;
  };

  // Map row data to customer fields
  const mapRowToCustomerData = (row: Record<string, string>) => {
    // Name mapping (multiple possible column names)
    const name = row.customer_name || row.name || row.username || row.client_name || '';
    
    // Phone/Mobile mapping
    const phone = row.mobile || row.phone || row.contact || row.cell || '';
    
    // Email mapping
    const email = row.email || row.mail || '';
    
    // Address mapping
    const address = row.address || row.location || row.full_address || '';
    
    // Package mapping
    const packageName = row.packagename || row.package_name || row.package || row.plan || row.plan_name || '';
    
    // Bandwidth/Speed extraction from package name or dedicated field
    let bandwidth = parseInt(row.bandwidth || row.speed || '0') || 0;
    if (!bandwidth && packageName) {
      const bwMatch = packageName.match(/(\d+)\s*mb/i);
      if (bwMatch) bandwidth = parseInt(bwMatch[1]);
    }
    
    // MikroTik/Router mapping
    const mikrotikName = row.router_name || row.router || row.mikrotik || row.mikrotik_name || '';
    
    // PPPoE credentials mapping
    // Note: Some ISPs use email field as PPPoE username
    const pppoeSecret = row.pppoe_secret || row.pppoe_username || row.username || row.pppoe || '';
    const pppoePassword = row.pppoe_password || row.password || row.secret || '';
    
    // Status mapping
    const subscriptionStatus = (row.subscription__status || row.subscription_status || row.status || 'active').toLowerCase();
    const accStatus = (row.acc__status || row.acc_status || row.account_status || 'active').toLowerCase();
    
    // Map status values
    let status: 'active' | 'suspended' | 'expired' | 'pending' = 'active';
    const statusStr = subscriptionStatus || accStatus;
    if (statusStr.includes('suspend') || statusStr.includes('disabled') || statusStr.includes('inactive')) {
      status = 'suspended';
    } else if (statusStr.includes('expire')) {
      status = 'expired';
    } else if (statusStr.includes('pending') || statusStr.includes('new')) {
      status = 'pending';
    }
    
    // Area mapping
    const area = row.area || row.zone || row.area_name || row.locality || '';
    
    // Expiry date mapping
    const expiryStr = row.willexpire_m_d_y_ || row.willexpire || row.expire_date || row.expiry_date || row.expiry || row.will_expire || '';
    const expiryDate = parseExpiryDate(expiryStr);
    
    // Monthly bill / Price mapping
    const monthlyBill = parseFloat(row.price || row.monthly_bill || row.bill || row.amount || '0') || 0;
    
    // Due amount
    const dueAmount = parseFloat(row.due || row.due_amount || row.balance || '0') || 0;
    
    // Connection date
    const connectionDateStr = row.connection_date || row.start_date || row.activation_date || '';
    const connectionDate = parseExpiryDate(connectionDateStr) || new Date().toISOString().split('T')[0];
    
    // ONU/MAC mapping
    const onuMac = row.onu_mac || row.mac || row.mac_address || '';
    const routerMac = row.router_mac || row.device_mac || '';
    
    // Notes/Remarks
    const notes = row.notes || row.remarks || row.comment || '';
    
    // NID
    const nidNumber = row.nid || row.nid_number || row.national_id || '';

    return {
      name,
      phone: normalizePhone(phone),
      email,
      address,
      packageName,
      bandwidth,
      mikrotikName,
      pppoeUsername: pppoeSecret,
      pppoePassword,
      status,
      area,
      expiryDate,
      monthlyBill,
      dueAmount,
      connectionDate,
      onuMac,
      routerMac,
      notes,
      nidNumber,
    };
  };

  // Normalize phone number (Bangladeshi format)
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('880')) {
      return digits;
    } else if (digits.startsWith('0')) {
      return '880' + digits.substring(1);
    } else if (digits.length === 10 && digits.startsWith('1')) {
      return '880' + digits;
    }
    
    return digits;
  };

  const findOrCreatePackage = async (packageName: string, price: number, bandwidth: number): Promise<{ id: string; name: string } | null> => {
    if (!packageName || !tenantId) return null;
    
    // Try to find existing package
    const { data: existing } = await supabase
      .from('isp_packages')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .ilike('name', packageName)
      .single();
    
    if (existing) return { id: existing.id, name: existing.name };
    
    // Create new package with extracted bandwidth
    const speed = bandwidth || 10;
    const { data: newPkg, error } = await supabase
      .from('isp_packages')
      .insert({
        tenant_id: tenantId,
        name: packageName,
        price: price || 0,
        download_speed: speed,
        upload_speed: speed,
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
    
    // Try exact match first
    const { data: exactData } = await supabase
      .from('mikrotik_routers')
      .select('id, ip_address, port, username, password_encrypted')
      .eq('tenant_id', tenantId)
      .ilike('name', mikrotikName)
      .single();
    
    if (exactData) {
      return {
        id: exactData.id,
        ip: exactData.ip_address,
        port: exactData.port || 8728,
        username: exactData.username,
        password: exactData.password_encrypted,
      };
    }
    
    // Try partial match
    const { data: partialData } = await supabase
      .from('mikrotik_routers')
      .select('id, ip_address, port, username, password_encrypted')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${mikrotikName}%`)
      .limit(1)
      .single();
    
    if (partialData) {
      console.log(`Found MikroTik router: ${partialData.ip_address} for name: ${mikrotikName}`);
      return {
        id: partialData.id,
        ip: partialData.ip_address,
        port: partialData.port || 8728,
        username: partialData.username,
        password: partialData.password_encrypted,
      };
    }
    
    console.log(`MikroTik router not found for name: ${mikrotikName}`);
    return null;
  };

  // Create PPPoE user on MikroTik
  const createPPPoEOnMikroTik = async (
    mikrotik: { ip: string; port: number; username: string; password: string },
    pppoeUser: { name: string; password: string; profile: string; comment?: string }
  ): Promise<boolean> => {
    if (!apiBase) {
      console.warn('API server URL not configured, skipping MikroTik PPPoE creation');
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
      let rows: Record<string, string>[] = [];
      const fileName = file.name.toLowerCase();
      
      // Parse based on file type
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        rows = await parseXLSX(file);
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }
      
      if (rows.length === 0) {
        toast.error('No valid data found in file');
        return { total: 0, success: 0, failed: 0, mikrotikCreated: 0, errors: [] };
      }

      console.log('Parsed rows sample:', rows.slice(0, 2));

      let canProvisionPppoe = !!apiBase;

      // Check polling server health
      if (canProvisionPppoe) {
        let health = await fetchJsonSafe<any>(`${apiBase}/api/health`);
        if (!health.ok) {
          health = await fetchJsonSafe<any>(`${apiBase}/health`);
        }
        if (!health.ok) {
          canProvisionPppoe = false;
          toast.warning(`Polling server unavailable - customers will be imported without MikroTik PPPoE creation`);
        }
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
          // Map row to customer data using the unified mapper
          const mapped = mapRowToCustomerData(row);
          
          if (!mapped.name) {
            result.failed++;
            result.errors.push({ row: i + 2, error: 'Customer name is required' });
            continue;
          }

          // Find or create package
          const packageInfo = mapped.packageName 
            ? await findOrCreatePackage(mapped.packageName, mapped.monthlyBill, mapped.bandwidth) 
            : null;

          // Find or create area
          const areaId = mapped.area ? await findOrCreateArea(mapped.area) : null;

          // Find MikroTik
          const mikrotikInfo = mapped.mikrotikName ? await findMikroTik(mapped.mikrotikName) : null;

          // Create customer
          const customerData: any = {
            tenant_id: tenantId,
            name: mapped.name,
            phone: mapped.phone || null,
            email: mapped.email || null,
            address: mapped.address || null,
            pppoe_username: mapped.pppoeUsername || null,
            pppoe_password: mapped.pppoePassword || null,
            onu_mac: mapped.onuMac || null,
            router_mac: mapped.routerMac || null,
            package_id: packageInfo?.id || null,
            area_id: areaId,
            mikrotik_id: mikrotikInfo?.id || null,
            monthly_bill: mapped.monthlyBill || 0,
            due_amount: mapped.dueAmount || 0,
            connection_date: mapped.connectionDate,
            expiry_date: mapped.expiryDate || null,
            status: mapped.status,
            notes: mapped.notes || null,
            nid_number: mapped.nidNumber || null,
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
            if (canProvisionPppoe && mikrotikInfo && mapped.pppoeUsername && mapped.pppoePassword) {
              const profileName = packageInfo?.name || 'default';
              console.log(`Creating PPPoE on MikroTik for ${mapped.pppoeUsername} with profile: ${profileName}`);

              const pppoeCreated = await createPPPoEOnMikroTik(
                mikrotikInfo,
                {
                  name: mapped.pppoeUsername,
                  password: mapped.pppoePassword,
                  profile: profileName,
                  comment: mapped.name,
                }
              );
              
              if (pppoeCreated) {
                result.mikrotikCreated++;
                console.log(`PPPoE user ${mapped.pppoeUsername} created successfully`);
              } else {
                console.warn(`PPPoE user ${mapped.pppoeUsername} failed to create on MikroTik`);
              }
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
    const headers = [
      'Customer Name',
      'Mobile',
      'Email',
      'Address',
      'PackageName',
      'Bandwidth',
      'Router name',
      'PPPoE Secret',
      'PPPoE Password',
      'Area',
      'WillExpire(m/d/y)',
      'Subscription. Status',
      'Notes'
    ];
    
    const exampleRow = [
      'Abdul Karim',
      '01712345678',
      'abdul@example.com',
      'House 12, Road 5, Dhanmondi',
      '10MB',
      '10',
      'Main Router',
      'abdul_pppoe',
      'password123',
      'Dhanmondi',
      '4/25/25',
      'active',
      'New customer'
    ];
    
    const csv = [
      headers.join(','),
      exampleRow.map(v => `"${v}"`).join(',')
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
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
