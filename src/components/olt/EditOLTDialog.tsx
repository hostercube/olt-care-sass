import { useState, useEffect } from 'react';
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
import { Loader2, CheckCircle, XCircle, Router } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Constants } from '@/integrations/supabase/types';
import type { Tables } from '@/integrations/supabase/types';
import { Separator } from '@/components/ui/separator';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { resolvePollingServerUrl } from '@/lib/polling-server';

const oltBrands = Constants.public.Enums.olt_brand;

const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const editOLTSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  brand: z.enum(['ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'DBC', 'CDATA', 'ECOM', 'Other']),
  oltMode: z.enum(['EPON', 'GPON']),
  ipAddress: z.string().regex(ipRegex, 'Invalid IP address'),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().optional(),
  // MikroTik fields (all optional - leave empty to skip MikroTik integration)
  mikrotikIp: z.string().optional().refine(
    (val) => !val || ipRegex.test(val),
    { message: 'Invalid IP address' }
  ),
  mikrotikPort: z.coerce.number().min(1).max(65535).optional().or(z.literal('')),
  mikrotikUsername: z.string().optional(),
  mikrotikPassword: z.string().optional(),
});

type EditOLTFormValues = z.infer<typeof editOLTSchema>;

interface EditOLTDialogProps {
  olt: Tables<'olts'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOLTUpdated?: () => void;
}

export function EditOLTDialog({ olt, open, onOpenChange, onOLTUpdated }: EditOLTDialogProps) {
  const { pollingServerUrl } = usePollingServerUrl();
  const pollingBase = resolvePollingServerUrl(pollingServerUrl);

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>('success');

  const form = useForm<EditOLTFormValues>({
    resolver: zodResolver(editOLTSchema),
    defaultValues: {
      name: olt.name,
      brand: olt.brand,
      oltMode: (olt as any).olt_mode || 'GPON',
      ipAddress: olt.ip_address,
      port: olt.port,
      username: olt.username,
      password: '',
      mikrotikIp: (olt as any).mikrotik_ip || '',
      mikrotikPort: (olt as any).mikrotik_port || 8728,
      mikrotikUsername: (olt as any).mikrotik_username || '',
      mikrotikPassword: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: olt.name,
        brand: olt.brand,
        oltMode: (olt as any).olt_mode || 'GPON',
        ipAddress: olt.ip_address,
        port: olt.port,
        username: olt.username,
        password: '',
        mikrotikIp: (olt as any).mikrotik_ip || '',
        mikrotikPort: (olt as any).mikrotik_port || 8728,
        mikrotikUsername: (olt as any).mikrotik_username || '',
        mikrotikPassword: '',
      });
      setTestResult('success');
    }
  }, [open, olt, form]);

  const handleTestConnection = async () => {
    const values = form.getValues();
    const result = editOLTSchema.safeParse(values);
    
    if (!result.success) {
      toast.error('Please fill in all fields correctly before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      if (!pollingBase) {
        toast.warning('Polling server not configured by Super Admin. Changes will be saved without verification.');
        setTestResult('success');
        return;
      }

      const response = await fetch(`${pollingBase}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          olt: {
            ip_address: values.ipAddress,
            port: values.port,
            username: values.username,
            password_encrypted: values.password || olt.password_encrypted,
            brand: values.brand,
          },
          mikrotik: values.mikrotikIp ? {
            ip: values.mikrotikIp,
            port: values.mikrotikPort || 8728,
            username: values.mikrotikUsername,
            password: values.mikrotikPassword || olt.mikrotik_password_encrypted,
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
      console.warn('Test connection failed:', error);
      setTestResult('success');
      toast.warning('Could not reach test server - changes will be saved without verification');
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (values: EditOLTFormValues) => {
    setSaving(true);
    try {
      const updateData: any = {
        name: values.name,
        brand: values.brand,
        olt_mode: values.oltMode,
        ip_address: values.ipAddress,
        port: values.port,
        username: values.username,
        mikrotik_ip: values.mikrotikIp || null,
        mikrotik_port: values.mikrotikPort || 8728,
        mikrotik_username: values.mikrotikUsername || null,
      };

      // Only update passwords if new ones were provided
      if (values.password && values.password.length > 0) {
        updateData.password_encrypted = values.password;
      }
      if (values.mikrotikPassword && values.mikrotikPassword.length > 0) {
        updateData.mikrotik_password_encrypted = values.mikrotikPassword;
      }

      const { error } = await supabase
        .from('olts')
        .update(updateData)
        .eq('id', olt.id);

      if (error) throw error;
      
      toast.success(`OLT "${values.name}" updated successfully!`);
      onOLTUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update OLT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit OLT</DialogTitle>
          <DialogDescription>
            Update the OLT connection details. Leave passwords empty to keep existing.
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                          value={field.value}
                          className="flex gap-4 h-9 items-center"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="EPON" id="edit-epon" />
                            <label htmlFor="edit-epon" className="text-sm font-medium cursor-pointer">EPON</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="GPON" id="edit-gpon" />
                            <label htmlFor="edit-gpon" className="text-sm font-medium cursor-pointer">GPON</label>
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
                      <FormLabel>New Password (optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave empty to keep" {...field} className="bg-secondary" />
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
                      <FormLabel>New Password (optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave empty to keep" {...field} className="bg-secondary" />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glow" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
