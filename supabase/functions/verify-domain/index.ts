import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DNSRecord {
  type: string;
  name: string;
  data: string;
}

async function checkDNSRecords(domain: string, expectedIP: string, expectedTXT: string): Promise<{
  aRecordValid: boolean;
  txtRecordValid: boolean;
  aRecordFound: string | null;
  txtRecordFound: string | null;
}> {
  let aRecordValid = false;
  let txtRecordValid = false;
  let aRecordFound: string | null = null;
  let txtRecordFound: string | null = null;

  try {
    // Check A record using DNS over HTTPS (Cloudflare)
    const aResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
    });
    
    if (aResponse.ok) {
      const aData = await aResponse.json();
      console.log('A record response:', JSON.stringify(aData));
      
      if (aData.Answer && aData.Answer.length > 0) {
        for (const record of aData.Answer) {
          if (record.type === 1) { // A record type
            aRecordFound = record.data;
            if (record.data === expectedIP) {
              aRecordValid = true;
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking A record:', err);
  }

  try {
    // Check TXT record for _isppoint subdomain
    const txtDomain = `_isppoint.${domain}`;
    const txtResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${txtDomain}&type=TXT`, {
      headers: { 'Accept': 'application/dns-json' },
    });
    
    if (txtResponse.ok) {
      const txtData = await txtResponse.json();
      console.log('TXT record response:', JSON.stringify(txtData));
      
      if (txtData.Answer && txtData.Answer.length > 0) {
        for (const record of txtData.Answer) {
          if (record.type === 16) { // TXT record type
            // TXT records come with quotes, remove them
            const txtValue = record.data.replace(/"/g, '');
            txtRecordFound = txtValue;
            if (txtValue === expectedTXT) {
              txtRecordValid = true;
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking TXT record:', err);
  }

  return { aRecordValid, txtRecordValid, aRecordFound, txtRecordFound };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { domain_id, domain, tenant_id, expected_txt } = await req.json();
    
    if (!domain_id || !domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Verifying domain: ${domain} for tenant: ${tenant_id}`);

    // Get server IP from system settings
    const { data: ipSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'customDomainServerIP')
      .single();

    let serverIP = '';
    if (ipSetting?.value) {
      if (typeof ipSetting.value === 'string') {
        serverIP = ipSetting.value;
      } else if (typeof ipSetting.value === 'object') {
        serverIP = (ipSetting.value as any).value || (ipSetting.value as any).ip || '';
      }
    }

    if (!serverIP) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server IP not configured. Please contact administrator.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Expected IP: ${serverIP}, Expected TXT: ${expected_txt}`);

    // Check DNS records
    const dnsResult = await checkDNSRecords(domain, serverIP, expected_txt);
    
    console.log('DNS check result:', JSON.stringify(dnsResult));

    const isVerified = dnsResult.aRecordValid && dnsResult.txtRecordValid;

    if (isVerified) {
      // Update domain as verified
      const { error: updateError } = await supabase
        .from('tenant_custom_domains')
        .update({ 
          is_verified: true,
          ssl_status: 'active',
          verified_at: new Date().toISOString()
        })
        .eq('id', domain_id);

      if (updateError) {
        console.error('Error updating domain:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update domain status' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          message: 'Domain verified successfully!',
          details: {
            aRecord: { found: dnsResult.aRecordFound, expected: serverIP, valid: dnsResult.aRecordValid },
            txtRecord: { found: dnsResult.txtRecordFound, expected: expected_txt, valid: dnsResult.txtRecordValid }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Not verified yet
      const issues: string[] = [];
      
      if (!dnsResult.aRecordValid) {
        if (dnsResult.aRecordFound) {
          issues.push(`A record points to ${dnsResult.aRecordFound} instead of ${serverIP}`);
        } else {
          issues.push(`A record not found. Please add: @ -> ${serverIP}`);
        }
      }
      
      if (!dnsResult.txtRecordValid) {
        if (dnsResult.txtRecordFound) {
          issues.push(`TXT record value is "${dnsResult.txtRecordFound}" instead of "${expected_txt}"`);
        } else {
          issues.push(`TXT record not found. Please add: _isppoint -> ${expected_txt}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: false,
          message: 'Domain not verified yet. Please check DNS configuration.',
          issues,
          details: {
            aRecord: { found: dnsResult.aRecordFound, expected: serverIP, valid: dnsResult.aRecordValid },
            txtRecord: { found: dnsResult.txtRecordFound, expected: expected_txt, valid: dnsResult.txtRecordValid }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error in verify-domain function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
