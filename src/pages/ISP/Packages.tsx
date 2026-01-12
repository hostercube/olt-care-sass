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
import { useISPPackages } from '@/hooks/useISPPackages';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { Package, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import type { ISPPackage } from '@/types/isp';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function ISPPackages() {
  const { packages, loading, createPackage, updatePackage, deletePackage } = useISPPackages();
  const { t, formatCurrency } = useLanguageCurrency();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ISPPackage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ISPPackage | null>(null);
  const [saving, setSaving] = useState(false);

  // Billing cycle options with translations
  const billingCycles = [
    { value: 'monthly', label: t('monthly'), days: 30 },
    { value: '3-monthly', label: t('three_monthly'), days: 90 },
    { value: '6-monthly', label: t('six_monthly'), days: 180 },
    { value: 'yearly', label: t('yearly'), days: 365 },
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    download_speed: '10',
    upload_speed: '10',
    speed_unit: 'mbps' as 'mbps' | 'gbps',
    price: '',
    billing_cycle: 'monthly',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      download_speed: '10',
      upload_speed: '10',
      speed_unit: 'mbps',
      price: '',
      billing_cycle: 'monthly',
    });
    setEditingPackage(null);
  };

  const handleEdit = (pkg: ISPPackage) => {
    setEditingPackage(pkg);
    // Determine billing cycle from validity_days
    let cycle = 'monthly';
    if (pkg.validity_days >= 365) cycle = 'yearly';
    else if (pkg.validity_days >= 180) cycle = '6-monthly';
    else if (pkg.validity_days >= 90) cycle = '3-monthly';
    
    // Also check if billing_cycle column exists
    const existingCycle = (pkg as any).billing_cycle;
    if (existingCycle && billingCycles.some(c => c.value === existingCycle)) {
      cycle = existingCycle;
    }
    
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      download_speed: pkg.download_speed.toString(),
      upload_speed: pkg.upload_speed.toString(),
      speed_unit: pkg.speed_unit,
      price: pkg.price.toString(),
      billing_cycle: cycle,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedCycle = billingCycles.find(c => c.value === formData.billing_cycle);
      
      const data = {
        name: formData.name,
        description: formData.description || null,
        download_speed: parseInt(formData.download_speed),
        upload_speed: parseInt(formData.upload_speed),
        speed_unit: formData.speed_unit,
        price: parseFloat(formData.price),
        validity_days: selectedCycle?.days || 30,
        billing_cycle: formData.billing_cycle,
      };

      if (editingPackage) {
        await updatePackage(editingPackage.id, data);
      } else {
        await createPackage(data);
      }

      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error saving package:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deletePackage(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const getBillingCycleLabel = (pkg: ISPPackage) => {
    // Check billing_cycle column first
    const cycle = (pkg as any).billing_cycle;
    if (cycle) {
      const found = billingCycles.find(c => c.value === cycle);
      if (found) return found.label;
    }
    // Fallback to deriving from validity_days
    if (pkg.validity_days >= 365) return t('yearly');
    if (pkg.validity_days >= 180) return t('six_monthly');
    if (pkg.validity_days >= 90) return t('three_monthly');
    return t('monthly');
  };

  return (
    <DashboardLayout
      title={t('packages')}
      subtitle={t('manage_internet_packages')}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('packages')}
          </CardTitle>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add_package')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('speed')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>{t('billing_cycle')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('no_packages_found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground">{pkg.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pkg.download_speed}/{pkg.upload_speed} {pkg.speed_unit.toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(pkg.price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getBillingCycleLabel(pkg)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                          {pkg.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(pkg)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(pkg)}>
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
            <DialogTitle>{editingPackage ? t('edit_package') : t('add_package')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('package_name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Basic 10 Mbps"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('description')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('download_speed')}</Label>
                <Input
                  type="number"
                  value={formData.download_speed}
                  onChange={(e) => setFormData(prev => ({ ...prev, download_speed: e.target.value }))}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('upload_speed')}</Label>
                <Input
                  type="number"
                  value={formData.upload_speed}
                  onChange={(e) => setFormData(prev => ({ ...prev, upload_speed: e.target.value }))}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unit')}</Label>
                <Select
                  value={formData.speed_unit}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, speed_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mbps">Mbps</SelectItem>
                    <SelectItem value="gbps">Gbps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('price')} *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('billing_cycle')}</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billing_cycle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCycles.map((cycle) => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        {cycle.label} ({cycle.days} {t('days')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={saving || !formData.name || !formData.price}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingPackage ? t('save_changes') : t('create_package')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_package')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('are_you_sure')} "{deleteConfirm?.name}"? {t('this_will_deactivate')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}