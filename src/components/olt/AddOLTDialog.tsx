import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Loader2, CheckCircle, XCircle, Router, Wifi, Search } from 'lucide-react';
import { toast } from 'sonner';
import { addOLT } from '@/hooks/useOLTData';
import { Constants } from '@/integrations/supabase/types';
import { Separator } from '@/components/ui/separator';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { resolvePollingServerUrl } from '@/lib/polling-server';

const oltBrands = Constants.public.Enums.olt_brand;

const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const addOLTSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  brand: z.enum(['ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'DBC', 'CDATA', 'ECOM', 'Other']),
  oltMode: z.enum(['EPON', 'GPON']),
  ipAddress: z.string().regex(ipRegex, 'Invalid IP address'),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(100),
  // MikroTik fields (all optional)
  mikrotikIp: z.string().optional().refine(
    (val) => !val || ipRegex.test(val),
    { message: 'Invalid IP address' }
  ),
  mikrotikPort: z.coerce.number().min(1).max(65535).optional().or(z.literal('')),
  mikrotikUsername: z.string().optional(),
  mikrotikPassword: z.string().optional(),
});

type AddOLTFormValues = z.infer<typeof addOLTSchema>;

interface AddOLTDialogProps {
  onOLTAdded?: () => void;
}

// Complete Protocol and Port Documentation for each OLT brand
const brandConnectionInfo: Record<string, { 
  defaultPort: number; 
  protocol: string; 
  hint: string;
  telnetPort?: number;
  webPorts?: number[];
  sshPort?: number;
}> = {
  ZTE: { 
    defaultPort: 22, 
    protocol: 'SSH', 
    hint: 'SSH পোর্ট 22 (CLI commands)',
    sshPort: 22,
    telnetPort: 23
  },
  Huawei: { 
    defaultPort: 22, 
    protocol: 'SSH', 
    hint: 'SSH পোর্ট 22 (CLI commands)',
    sshPort: 22,
    telnetPort: 23
  },
  Nokia: { 
    defaultPort: 22, 
    protocol: 'SSH', 
    hint: 'SSH পোর্ট 22',
    sshPort: 22
  },
  VSOL: { 
    defaultPort: 8085, 
    protocol: 'HTTP API', 
    hint: 'Web API 8085 বা Telnet 23 (fallback)',
    webPorts: [80, 8080, 8085, 8086],
    telnetPort: 23
  },
  DBC: { 
    defaultPort: 80, 
    protocol: 'HTTP API', 
    hint: 'Web API 80/8080 বা Telnet 23',
    webPorts: [80, 8080],
    telnetPort: 23
  },
  CDATA: { 
    defaultPort: 80, 
    protocol: 'HTTP API', 
    hint: 'Web API 80/8080 বা Telnet 23',
    webPorts: [80, 8080],
    telnetPort: 23
  },
  ECOM: { 
    defaultPort: 80, 
    protocol: 'HTTP API', 
    hint: 'Web API 80/8080 বা Telnet 23',
    webPorts: [80, 8080],
    telnetPort: 23
  },
  BDCOM: { 
    defaultPort: 23, 
    protocol: 'Telnet', 
    hint: 'Telnet পোর্ট 23 (EPON CLI)',
    telnetPort: 23,
    sshPort: 22
  },
  Fiberhome: { 
    defaultPort: 23, 
    protocol: 'Telnet', 
    hint: 'Telnet পোর্ট 23',
    telnetPort: 23,
    sshPort: 22
  },
  Other: { 
    defaultPort: 23, 
    protocol: 'Auto', 
    hint: 'Auto-detect: SSH 22, Telnet 23, HTTP 80/8080',
    sshPort: 22,
    telnetPort: 23,
    webPorts: [80, 8080]
  },
};

export function AddOLTDialog({ onOLTAdded }: AddOLTDialogProps) {
  const { pollingServerUrl } = usePollingServerUrl();
  const pollingBase = resolvePollingServerUrl(pollingServerUrl);

  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testingAllProtocols, setTestingAllProtocols] = useState(false);
  const [protocolResults, setProtocolResults] = useState<any>(null);

  const form = useForm<AddOLTFormValues>({
    resolver: zodResolver(addOLTSchema),
    defaultValues: {
      name: '',
      brand: 'VSOL',
      oltMode: 'GPON',
      ipAddress: '',
      port: 8085,  // Default to HTTP API port for VSOL
      username: '',
      password: '',
      mikrotikIp: '',
      mikrotikPort: 8728,
      mikrotikUsername: '',
      mikrotikPassword: '',
    },
  });

  const selectedBrand = form.watch('brand');
  const selectedPort = form.watch('port');
  
  // Get connection type info with better descriptions
  const getConnectionType = (port: number) => {
    if (port === 22) return 'SSH (CLI Commands)';
    if (port === 23) return 'Telnet (CLI Commands)';
    if (port === 161) return 'SNMP (Read-only Status)';
    if ([80, 443, 8080, 8085, 8086, 8041].includes(port)) return 'HTTP API (Web Interface)';
    if (port === 8728) return 'MikroTik API';
    // Custom ports > 1024 - for VSOL, DBC, CDATA, ECOM brands try Telnet first
    if (port > 1024 && ['VSOL', 'DBC', 'CDATA', 'ECOM'].includes(selectedBrand)) {
      return 'Telnet First (Port Forwarding)';
    }
    return 'Auto-Detect (Telnet → HTTP → SSH)';
  };

  // Update port when brand changes
  const handleBrandChange = (brand: string) => {
    const info = brandConnectionInfo[brand] || brandConnectionInfo.Other;
    form.setValue('brand', brand as any);
    form.setValue('port', info.defaultPort);
    setTestResult(null);
    setProtocolResults(null);
  };

  // Test all protocols to find working ones
  const handleTestAllProtocols = async () => {
    const values = form.getValues();
    
    if (!values.ipAddress || !values.username || !values.password) {
      toast.error('Please fill in IP, username and password first');
      return;
    }

    if (!pollingBase) {
      toast.error('Polling server not configured. Ask Super Admin to set it in Platform Settings → Infrastructure.');
      return;
    }

    setTestingAllProtocols(true);
    setProtocolResults(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const baseUrl = pollingBase.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/test-all-protocols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          olt: {
            ip_address: values.ipAddress,
            port: values.port,
            username: values.username,
            password_encrypted: values.password,
            brand: values.brand,
          },
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      setProtocolResults(data);
      
      if (data.recommended) {
        toast.success(`Recommended: ${data.recommended.protocol} on port ${data.recommended.port}`);
        // Auto-set the recommended port
        form.setValue('port', data.recommended.port);
        setTestResult('success');
      } else {
        toast.error('No working protocol found. Check IP/credentials.');
        setTestResult('error');
      }
    } catch (error: any) {
      console.warn('Test all protocols failed:', error);
      toast.error(`Protocol test failed: ${error.message}`);
    } finally {
      setTestingAllProtocols(false);
    }
  };

  const handleTestConnection = async () => {
    const values = form.getValues();
    const result = addOLTSchema.safeParse(values);
    
    if (!result.success) {
      toast.error('Please fill in all required fields correctly before testing');
      return;
    }

    if (!pollingBase) {
      toast.warning('Polling server not configured. OLT will be added without connection test.');
      setTestResult('success');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const baseUrl = pollingBase.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          olt: {
            ip_address: values.ipAddress,
            port: values.port,
            username: values.username,
            password_encrypted: values.password,
            brand: values.brand,
          },
          mikrotik: values.mikrotikIp ? {
            ip: values.mikrotikIp,
            port: values.mikrotikPort || 8728,
            username: values.mikrotikUsername,
            password: values.mikrotikPassword,
          } : null,
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.olt?.success) {
        setTestResult('success');
        const methodInfo = data.olt.method ? ` (${data.olt.method})` : '';
        const mikrotikMsg = data.mikrotik?.success 
          ? ' | MikroTik: Connected' 
          : (values.mikrotikIp ? ' | MikroTik: Failed' : '');
        toast.success(`OLT Connected${methodInfo}!${mikrotikMsg}`);
      } else {
        setTestResult('error');
        toast.error(`Connection failed: ${data.olt?.error || 'Unable to connect'}`);
      }
    } catch (error: any) {
      console.warn('Test connection failed:', error);
      if (error.name === 'AbortError') {
        toast.warning('Connection test timed out. You can still add the OLT.');
        setTestResult('error');
      } else {
        toast.error(`Connection test failed: ${error.message}`);
        setTestResult('error');
      }
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (values: AddOLTFormValues) => {
    setSaving(true);
    try {
      await addOLT({
        name: values.name,
        brand: values.brand,
        olt_mode: values.oltMode,
        ip_address: values.ipAddress,
        port: values.port,
        username: values.username,
        password_encrypted: values.password,
        mikrotik_ip: values.mikrotikIp || null,
        mikrotik_port: values.mikrotikPort || 8728,
        mikrotik_username: values.mikrotikUsername || null,
        mikrotik_password_encrypted: values.mikrotikPassword || null,
      });
      
      toast.success(`OLT "${values.name}" added successfully!`);
      onOLTAdded?.();
      setOpen(false);
      form.reset();
      setTestResult(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add OLT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow" className="gap-2">
          <Plus className="h-4 w-4" />
          Add OLT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add New OLT</DialogTitle>
          <DialogDescription>
            Enter the OLT connection details. Port determines connection type (SSH/Telnet/API).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* OLT Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OLT Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., VSOL 4port" {...field} className="bg-secondary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OLT Brand</FormLabel>
                      <Select onValueChange={handleBrandChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Select OLT brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          {oltBrands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {brandConnectionInfo[selectedBrand]?.hint || 'Select brand'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oltMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OLT Mode</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4 h-9 items-center"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="EPON" id="epon" />
                            <label htmlFor="epon" className="text-sm font-medium cursor-pointer">EPON</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="GPON" id="gpon" />
                            <label htmlFor="gpon" className="text-sm font-medium cursor-pointer">GPON</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ipAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OLT Public IP</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.201.4" {...field} className="bg-secondary font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port Number</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="22, 23, or custom" {...field} className="bg-secondary font-mono" />
                      </FormControl>
                      <FormDescription className="text-xs flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        {getConnectionType(selectedPort)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} className="bg-secondary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-secondary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* MikroTik Optional Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Router className="h-4 w-4" />
                <span>MikroTik Integration (Optional) - For PPPoE, Router Name & MAC</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mikrotikIp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MikroTik IP</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.1" {...field} className="bg-secondary font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mikrotikPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="8728" {...field} className="bg-secondary font-mono" />
                      </FormControl>
                      <FormDescription className="text-xs">Default: 8728</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mikrotikUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Read Permission)</FormLabel>
                      <FormControl>
                        <Input placeholder="api-read" {...field} className="bg-secondary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mikrotikPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-secondary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Protocol Results */}
            {protocolResults && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="text-sm font-medium">Protocol Test Results:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {protocolResults.http?.success ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span>HTTP: {protocolResults.http?.success ? `Port ${protocolResults.http.port}` : 'Failed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {protocolResults.telnet?.success ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span>Telnet: {protocolResults.telnet?.success ? `Port ${protocolResults.telnet.port}` : 'Failed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {protocolResults.ssh?.success ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span>SSH: {protocolResults.ssh?.success ? 'Port 22' : 'Failed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {protocolResults.snmp?.success ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span>SNMP: {protocolResults.snmp?.success ? 'Port 161' : 'Failed'}</span>
                  </div>
                </div>
                {protocolResults.recommended && (
                  <p className="text-xs text-success font-medium">
                    ✓ Recommended: {protocolResults.recommended.protocol} on port {protocolResults.recommended.port}
                    {protocolResults.recommended.note && ` (${protocolResults.recommended.note})`}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex-1">
                <p className="text-sm font-medium">Connection Status</p>
                <p className="text-xs text-muted-foreground">
                  {testResult === 'success'
                    ? 'Connection verified'
                    : testResult === 'error'
                    ? 'Connection failed'
                    : 'Not tested'}
                </p>
              </div>
              {testResult === 'success' && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              {testResult === 'error' && (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestAllProtocols}
                disabled={testingAllProtocols || testing}
                title="Test all protocols (HTTP, Telnet, SSH, SNMP)"
              >
                {testingAllProtocols ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1" />
                    Scan Ports
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || testingAllProtocols}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glow" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add OLT'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
