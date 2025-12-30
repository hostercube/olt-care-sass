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
import { Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addOLT } from '@/hooks/useOLTData';
import { Constants } from '@/integrations/supabase/types';

const oltBrands = Constants.public.Enums.olt_brand;

const addOLTSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  brand: z.enum(['ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'Other']),
  ipAddress: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Invalid IP address'
    ),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(100),
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
      brand: 'ZTE',
      ipAddress: '',
      port: 22,
      username: '',
      password: '',
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    const result = addOLTSchema.safeParse(values);
    
    if (!result.success) {
      toast.error('Please fill in all fields correctly before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Simulate connection test (in production, this would call your VPS backend)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // For now, always succeed since we don't have a real backend yet
    setTestResult('success');
    setTesting(false);
    toast.success('Connection test simulated - add your VPS backend to test real connections');
  };

  const onSubmit = async (values: AddOLTFormValues) => {
    if (testResult !== 'success') {
      toast.error('Please test the connection before adding');
      return;
    }

    setSaving(true);
    try {
      await addOLT({
        name: values.name,
        brand: values.brand,
        ip_address: values.ipAddress,
        port: values.port,
        username: values.username,
        password_encrypted: values.password, // In production, encrypt this on your backend
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
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add New OLT</DialogTitle>
          <DialogDescription>
            Enter the OLT connection details. A connection test will be performed before adding.
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-secondary" />
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glow" disabled={testResult !== 'success' || saving}>
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
