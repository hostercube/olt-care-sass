import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addONU } from '@/hooks/useOLTData';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type OLTRow = Tables<'olts'>;

interface AddONUDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  olts: OLTRow[];
  defaultOltId?: string;
}

export function AddONUDialog({ open, onOpenChange, olts, defaultOltId }: AddONUDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    olt_id: defaultOltId || '',
    pon_port: '',
    onu_index: 1,
    status: 'unknown' as 'online' | 'offline' | 'warning' | 'unknown',
    mac_address: '',
    serial_number: '',
    pppoe_username: '',
    router_name: '',
    rx_power: '',
    tx_power: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addONU({
        name: formData.name,
        olt_id: formData.olt_id,
        pon_port: formData.pon_port,
        onu_index: formData.onu_index,
        status: formData.status,
        mac_address: formData.mac_address || null,
        serial_number: formData.serial_number || null,
        pppoe_username: formData.pppoe_username || null,
        router_name: formData.router_name || null,
        rx_power: formData.rx_power ? parseFloat(formData.rx_power) : null,
        tx_power: formData.tx_power ? parseFloat(formData.tx_power) : null,
      });

      toast({
        title: 'Success',
        description: 'ONU added successfully',
      });
      onOpenChange(false);
      setFormData({
        name: '',
        olt_id: defaultOltId || '',
        pon_port: '',
        onu_index: 1,
        status: 'unknown' as 'online' | 'offline' | 'warning' | 'unknown',
        mac_address: '',
        serial_number: '',
        pppoe_username: '',
        router_name: '',
        rx_power: '',
        tx_power: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add ONU',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle>Add New ONU</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">ONU Name *</Label>
              <Input
                id="name"
                placeholder="e.g., ONU-001"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="olt_id">Select OLT *</Label>
              <Select
                value={formData.olt_id}
                onValueChange={(value) => setFormData({ ...formData, olt_id: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select OLT" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {olts.map((olt) => (
                    <SelectItem key={olt.id} value={olt.id}>
                      {olt.name} ({olt.ip_address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pon_port">PON Port *</Label>
              <Input
                id="pon_port"
                placeholder="e.g., 1/1/1"
                value={formData.pon_port}
                onChange={(e) => setFormData({ ...formData, pon_port: e.target.value })}
                className="bg-secondary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onu_index">ONU Index *</Label>
              <Input
                id="onu_index"
                type="number"
                min={1}
                value={formData.onu_index}
                onChange={(e) => setFormData({ ...formData, onu_index: parseInt(e.target.value) || 1 })}
                className="bg-secondary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'online' | 'offline' | 'warning' | 'unknown') => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mac_address">MAC Address</Label>
              <Input
                id="mac_address"
                placeholder="e.g., AA:BB:CC:DD:EE:FF"
                value={formData.mac_address}
                onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                placeholder="e.g., ZTEG12345678"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pppoe_username">PPPoE Username</Label>
              <Input
                id="pppoe_username"
                placeholder="e.g., customer123"
                value={formData.pppoe_username}
                onChange={(e) => setFormData({ ...formData, pppoe_username: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="router_name">Router Name</Label>
              <Input
                id="router_name"
                placeholder="e.g., MikroTik-Customer1"
                value={formData.router_name}
                onChange={(e) => setFormData({ ...formData, router_name: e.target.value })}
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rx_power">RX Power (dBm)</Label>
              <Input
                id="rx_power"
                type="number"
                step="0.01"
                placeholder="e.g., -18.5"
                value={formData.rx_power}
                onChange={(e) => setFormData({ ...formData, rx_power: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx_power">TX Power (dBm)</Label>
              <Input
                id="tx_power"
                type="number"
                step="0.01"
                placeholder="e.g., 2.3"
                value={formData.tx_power}
                onChange={(e) => setFormData({ ...formData, tx_power: e.target.value })}
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" disabled={loading || !formData.name || !formData.olt_id || !formData.pon_port}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add ONU'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
