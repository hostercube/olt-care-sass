import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  Trash2, RefreshCw, Package, Wifi, WifiOff, X, Loader2, AlertTriangle, Store
} from 'lucide-react';
import type { Customer } from '@/types/isp';
import type { ISPPackage } from '@/types/isp';
import type { Reseller } from '@/types/reseller';
import { toast } from 'sonner';

interface BulkActionsToolbarProps {
  selectedCustomers: Customer[];
  packages: ISPPackage[];
  resellers?: Reseller[];
  onClearSelection: () => void;
  onBulkDelete: (customerIds: string[]) => Promise<void>;
  onBulkRecharge: (customerIds: string[], months: number) => Promise<void>;
  onBulkPackageChange: (customerIds: string[], packageId: string) => Promise<void>;
  onBulkNetworkEnable: (customerIds: string[]) => Promise<void>;
  onBulkNetworkDisable: (customerIds: string[]) => Promise<void>;
  onBulkResellerAssign?: (customerIds: string[], resellerId: string | null) => Promise<void>;
}

const getLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'Master';
    case 2: return 'Sub';
    case 3: return 'Sub-Sub';
    default: return `L${level}`;
  }
};

export function BulkActionsToolbar({
  selectedCustomers,
  packages,
  resellers = [],
  onClearSelection,
  onBulkDelete,
  onBulkRecharge,
  onBulkPackageChange,
  onBulkNetworkEnable,
  onBulkNetworkDisable,
  onBulkResellerAssign,
}: BulkActionsToolbarProps) {
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResellerDialog, setShowResellerDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [rechargeMonths, setRechargeMonths] = useState(1);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');

  const count = selectedCustomers.length;

  const handleBulkRecharge = async () => {
    setLoading(true);
    try {
      await onBulkRecharge(selectedCustomers.map(c => c.id), rechargeMonths);
      setShowRechargeDialog(false);
      onClearSelection();
    } catch (err) {
      console.error('Bulk recharge error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPackageChange = async () => {
    if (!selectedPackageId) {
      toast.error('Please select a package');
      return;
    }
    setLoading(true);
    try {
      await onBulkPackageChange(selectedCustomers.map(c => c.id), selectedPackageId);
      setShowPackageDialog(false);
      onClearSelection();
    } catch (err) {
      console.error('Bulk package change error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      await onBulkDelete(selectedCustomers.map(c => c.id));
      setShowDeleteDialog(false);
      onClearSelection();
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkNetworkEnable = async () => {
    setLoading(true);
    try {
      await onBulkNetworkEnable(selectedCustomers.map(c => c.id));
      onClearSelection();
    } catch (err) {
      console.error('Bulk enable error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkNetworkDisable = async () => {
    setLoading(true);
    try {
      await onBulkNetworkDisable(selectedCustomers.map(c => c.id));
      onClearSelection();
    } catch (err) {
      console.error('Bulk disable error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkResellerAssign = async () => {
    if (!onBulkResellerAssign) return;
    
    setLoading(true);
    try {
      // Pass null if 'direct' is selected to remove reseller assignment
      const resellerId = selectedResellerId === 'direct' ? null : selectedResellerId;
      await onBulkResellerAssign(selectedCustomers.map(c => c.id), resellerId);
      setShowResellerDialog(false);
      setSelectedResellerId('');
      onClearSelection();
    } catch (err) {
      console.error('Bulk reseller assign error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build reseller options for searchable select
  const resellerOptions = [
    { value: 'direct', label: 'Direct (Remove Reseller)', searchTerms: ['direct', 'remove'] },
    ...resellers.filter(r => r.is_active).map(r => ({
      value: r.id,
      label: `${r.name} (${getLevelLabel(r.level || 1)})`,
      searchTerms: [r.name, r.phone || '', getLevelLabel(r.level || 1)]
    }))
  ];

  if (count === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
        <Badge variant="secondary" className="font-medium">
          {count} selected
        </Badge>
        
        <div className="flex-1 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRechargeDialog(true)}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Bulk Recharge
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPackageDialog(true)}
            disabled={loading}
          >
            <Package className="h-4 w-4 mr-1" />
            Change Package
          </Button>

          {onBulkResellerAssign && resellers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResellerDialog(true)}
              disabled={loading}
            >
              <Store className="h-4 w-4 mr-1" />
              Assign Reseller
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkNetworkEnable}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wifi className="h-4 w-4 mr-1" />}
            Enable Network
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkNetworkDisable}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <WifiOff className="h-4 w-4 mr-1" />}
            Disable Network
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Recharge</DialogTitle>
            <DialogDescription>
              Recharge {count} customer(s) for the specified number of months
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Months</Label>
              <Input
                type="number"
                value={rechargeMonths}
                onChange={(e) => setRechargeMonths(parseInt(e.target.value) || 1)}
                min="1"
                max="12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRecharge} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Recharge {count} Customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Change Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Package Change</DialogTitle>
            <DialogDescription>
              Change package for {count} customer(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Package</Label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - ৳{pkg.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPackageChange} disabled={loading || !selectedPackageId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {count} Customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reseller Assignment Dialog */}
      <Dialog open={showResellerDialog} onOpenChange={setShowResellerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Reseller</DialogTitle>
            <DialogDescription>
              Assign {count} customer(s) to a reseller or sub-reseller. 
              Select "Direct" to remove reseller assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Reseller</Label>
              <SearchableSelect
                options={resellerOptions}
                value={selectedResellerId}
                onValueChange={setSelectedResellerId}
                placeholder="Choose a reseller..."
                searchPlaceholder="Search by name or phone..."
              />
              {selectedResellerId === 'direct' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Customers will be moved to Direct (no reseller). They will appear in your main customer list.
                </p>
              )}
              {selectedResellerId && selectedResellerId !== 'direct' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Customers will be assigned to this reseller. The reseller will be able to manage and recharge these customers.
                </p>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground mb-2">Selected customers:</p>
              {selectedCustomers.slice(0, 10).map((c) => (
                <p key={c.id} className="text-sm">
                  • {c.name} ({c.customer_code || 'N/A'})
                  {c.reseller && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Current: {c.reseller.name}
                    </Badge>
                  )}
                </p>
              ))}
              {count > 10 && (
                <p className="text-sm text-muted-foreground">...and {count - 10} more</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResellerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkResellerAssign} disabled={loading || !selectedResellerId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedResellerId === 'direct' ? `Move ${count} to Direct` : `Assign ${count} Customers`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Bulk Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {count} customer(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedCustomers.slice(0, 10).map((c) => (
              <p key={c.id} className="text-sm text-muted-foreground">
                • {c.name} ({c.customer_code || c.pppoe_username || 'N/A'})
              </p>
            ))}
            {count > 10 && (
              <p className="text-sm text-muted-foreground">...and {count - 10} more</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete {count} Customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
