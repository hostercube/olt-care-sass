import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useResellers } from '@/hooks/useResellers';
import { useAreas } from '@/hooks/useAreas';
import { Users, Plus, Edit, Trash2, Loader2, DollarSign } from 'lucide-react';
import type { Reseller } from '@/types/isp';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function ResellersManagement() {
  const { resellers, loading, createReseller, updateReseller, deleteReseller, rechargeBalance } = useResellers();
  const { areas } = useAreas();
  const [showDialog, setShowDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [rechargeReseller, setRechargeReseller] = useState<Reseller | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Reseller | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area_id: '',
    commission_type: 'percentage' as 'percentage' | 'flat',
    commission_value: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      area_id: '',
      commission_type: 'percentage',
      commission_value: '',
    });
    setEditingReseller(null);
  };

  const handleEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      phone: reseller.phone || '',
      email: reseller.email || '',
      address: reseller.address || '',
      area_id: reseller.area_id || '',
      commission_type: reseller.commission_type,
      commission_value: reseller.commission_value?.toString() || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        area_id: formData.area_id || null,
        commission_type: formData.commission_type,
        commission_value: parseFloat(formData.commission_value) || 0,
      };

      if (editingReseller) {
        await updateReseller(editingReseller.id, data);
      } else {
        await createReseller(data);
      }

      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error saving reseller:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRecharge = async () => {
    if (rechargeReseller && rechargeAmount) {
      setSaving(true);
      try {
        await rechargeBalance(rechargeReseller.id, parseFloat(rechargeAmount), rechargeNote || 'Balance recharge');
        setShowRechargeDialog(false);
        setRechargeReseller(null);
        setRechargeAmount('');
        setRechargeNote('');
      } catch (err) {
        console.error('Error recharging:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteReseller(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <DashboardLayout
      title="Resellers Management"
      subtitle="Manage reseller accounts and commissions"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resellers
          </CardTitle>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reseller
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : resellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No resellers found. Create your first reseller.
                    </TableCell>
                  </TableRow>
                ) : (
                  resellers.map((reseller) => (
                    <TableRow key={reseller.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reseller.name}</p>
                          {reseller.email && (
                            <p className="text-sm text-muted-foreground">{reseller.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{reseller.phone || '-'}</TableCell>
                      <TableCell>{reseller.area?.name || '-'}</TableCell>
                      <TableCell>
                        {reseller.commission_value}
                        {reseller.commission_type === 'percentage' ? '%' : '৳'}
                      </TableCell>
                      <TableCell>
                        <span className={reseller.balance > 0 ? 'text-green-600 font-medium' : ''}>
                          ৳{reseller.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={reseller.is_active ? 'default' : 'secondary'}>
                          {reseller.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setRechargeReseller(reseller); setShowRechargeDialog(true); }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(reseller)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(reseller)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReseller ? 'Edit Reseller' : 'Add New Reseller'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Reseller name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="reseller@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Area</Label>
              <Select
                value={formData.area_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission Type</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, commission_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commission Value</Label>
                <Input
                  type="number"
                  value={formData.commission_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, commission_value: e.target.value }))}
                  placeholder={formData.commission_type === 'percentage' ? '10' : '100'}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingReseller ? 'Save Changes' : 'Create Reseller'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Balance - {rechargeReseller?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">৳{rechargeReseller?.balance.toLocaleString() || 0}</p>
            </div>
            <div className="space-y-2">
              <Label>Recharge Amount (৳)</Label>
              <Input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={rechargeNote}
                onChange={(e) => setRechargeNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecharge} disabled={saving || !rechargeAmount}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Recharge
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Reseller</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{deleteConfirm?.name}"? They will no longer be able to manage customers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
