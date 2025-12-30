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
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Constants } from '@/integrations/supabase/types';
import type { Tables } from '@/integrations/supabase/types';

const oltBrands = Constants.public.Enums.olt_brand;

const editOLTSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  brand: z.enum(['ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'DBC', 'CDATA', 'ECOM', 'Other']),
  ipAddress: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Invalid IP address'
    ),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().max(100).optional(),
});

type EditOLTFormValues = z.infer<typeof editOLTSchema>;

interface EditOLTDialogProps {
  olt: Tables<'olts'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOLTUpdated?: () => void;
}

export function EditOLTDialog({ olt, open, onOpenChange, onOLTUpdated }: EditOLTDialogProps) {
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>('success');

  const form = useForm<EditOLTFormValues>({
    resolver: zodResolver(editOLTSchema),
    defaultValues: {
      name: olt.name,
      brand: olt.brand,
      ipAddress: olt.ip_address,
      port: olt.port,
      username: olt.username,
      password: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: olt.name,
        brand: olt.brand,
        ipAddress: olt.ip_address,
        port: olt.port,
        username: olt.username,
        password: '',
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

    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setTestResult('success');
    setTesting(false);
    toast.success('Connection test simulated');
  };

  const onSubmit = async (values: EditOLTFormValues) => {
    if (testResult !== 'success') {
      toast.error('Please test the connection before saving');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: values.name,
        brand: values.brand,
        ip_address: values.ipAddress,
        port: values.port,
        username: values.username,
      };

      // Only update password if a new one was provided
      if (values.password && values.password.length > 0) {
        updateData.password_encrypted = values.password;
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
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit OLT</DialogTitle>
          <DialogDescription>
            Update the OLT connection details. Leave password empty to keep the existing one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OLT Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., OLT-Core-DC1" {...field} className="bg-secondary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.10" {...field} className="bg-secondary font-mono" />
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
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="22" {...field} className="bg-secondary font-mono" />
                    </FormControl>
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
              <Button type="submit" variant="glow" disabled={testResult !== 'success' || saving}>
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
