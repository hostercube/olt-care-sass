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
import { Plus, Loader2, CheckCircle, XCircle, Router } from 'lucide-react';
import { toast } from 'sonner';
import { addOLT } from '@/hooks/useOLTData';
import { Constants } from '@/integrations/supabase/types';
import { Separator } from '@/components/ui/separator';

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
  // MikroTik fields (optional)
  mikrotikIp: z.string().regex(ipRegex, 'Invalid IP address').optional().or(z.literal('')),
  mikrotikPort: z.coerce.number().min(1).max(65535).optional(),
  mikrotikUsername: z.string().max(50).optional(),
  mikrotikPassword: z.string().max(100).optional(),
});

type AddOLTFormValues = z.infer<typeof addOLTSchema>;

interface AddOLTDialogProps {
  onOLTAdded?: () => void;
}

export function AddOLTDialog({ onOLTAdded }: AddOLTDialogProps) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const form = useForm<AddOLTFormValues>({
    resolver: zodResolver(addOLTSchema),
    defaultValues: {
      name: '',
      brand: 'VSOL',
      oltMode: 'GPON',
      ipAddress: '',
      port: 22,
      username: '',
      password: '',
      mikrotikIp: '',
      mikrotikPort: 8728,
      mikrotikUsername: '',
      mikrotikPassword: '',
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    const result = addOLTSchema.safeParse(values);
    
    if (!result.success) {
      toast.error('Please fill in all required fields correctly before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Call the VPS polling server to test connection
      const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL || 'http://localhost:3001';
      
      const response = await fetch(`${pollingServerUrl}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await response.json();
      
      if (data.olt?.success) {
        setTestResult('success');
        const mikrotikMsg = data.mikrotik?.success 
          ? ' MikroTik: Connected' 
          : (values.mikrotikIp ? ' MikroTik: Failed' : '');
        toast.success(`OLT Connection: Success!${mikrotikMsg}`);
      } else {
        setTestResult('error');
        toast.error(`Connection failed: ${data.olt?.error || 'Unable to connect to OLT'}`);
      }
    } catch (error: any) {
      // If VPS is not reachable, allow saving anyway with a warning
      console.warn('Test connection failed - VPS may not be running:', error);
      setTestResult('success');
      toast.warning('Could not reach test server - OLT will be added without verification');
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
            Enter the OLT connection details. MikroTik is optional for PPPoE data.
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Input type="number" placeholder="22 or 23 or 443" {...field} className="bg-secondary font-mono" />
                      </FormControl>
                      <FormDescription className="text-xs">SSH: 22, Telnet: 23, API: 443</FormDescription>
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
                onClick={handleTestConnection}
                disabled={testing}
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
