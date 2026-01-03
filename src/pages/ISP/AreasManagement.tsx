import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useAreas } from '@/hooks/useAreas';
import { MapPin, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import type { Area } from '@/types/isp';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function AreasManagement() {
  const { areas, loading, createArea, updateArea, deleteArea } = useAreas();
  const [showDialog, setShowDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    district: '',
    upazila: '',
    union_name: '',
    village: '',
    road_no: '',
    house_no: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      district: '', 
      upazila: '', 
      union_name: '',
      village: '',
      road_no: '',
      house_no: '',
      description: '' 
    });
    setEditingArea(null);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      district: area.district || '',
      upazila: area.upazila || '',
      union_name: area.union_name || '',
      village: area.village || '',
      road_no: area.road_no || '',
      house_no: area.house_no || '',
      description: area.description || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        district: formData.district || null,
        upazila: formData.upazila || null,
        union_name: formData.union_name || null,
        village: formData.village || null,
        road_no: formData.road_no || null,
        house_no: formData.house_no || null,
        description: formData.description || null,
      };

      if (editingArea) {
        await updateArea(editingArea.id, data);
      } else {
        await createArea(data);
      }

      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error saving area:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteArea(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const getFullAddress = (area: Area) => {
    const parts = [
      area.village,
      area.union_name,
      area.upazila,
      area.district
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <DashboardLayout
      title="Areas Management"
      subtitle="Manage service areas and locations with full address hierarchy"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Areas
          </CardTitle>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Address Details</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : areas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No areas found. Create your first area.
                    </TableCell>
                  </TableRow>
                ) : (
                  areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell className="text-sm">
                        {getFullAddress(area)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {area.road_no && `Road: ${area.road_no}`}
                        {area.road_no && area.house_no && ', '}
                        {area.house_no && `House: ${area.house_no}`}
                        {!area.road_no && !area.house_no && '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{area.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(area)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(area)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Edit Area' : 'Add New Area'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Area Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Block A, Zone 1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>District</Label>
                <Input
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="District name"
                />
              </div>
              <div className="space-y-2">
                <Label>Upazila</Label>
                <Input
                  value={formData.upazila}
                  onChange={(e) => setFormData(prev => ({ ...prev, upazila: e.target.value }))}
                  placeholder="Upazila name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Union</Label>
                <Input
                  value={formData.union_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, union_name: e.target.value }))}
                  placeholder="Union name"
                />
              </div>
              <div className="space-y-2">
                <Label>Village</Label>
                <Input
                  value={formData.village}
                  onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="Village name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Road No (Optional)</Label>
                <Input
                  value={formData.road_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, road_no: e.target.value }))}
                  placeholder="Road number"
                />
              </div>
              <div className="space-y-2">
                <Label>House No (Optional)</Label>
                <Input
                  value={formData.house_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, house_no: e.target.value }))}
                  placeholder="House number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingArea ? 'Save Changes' : 'Create Area'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}