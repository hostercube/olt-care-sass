import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MapPin, Plus, Edit, Trash2, RefreshCcw } from 'lucide-react';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { toast } from 'sonner';

type AreaRow = {
  id: string;
  name: string;
  description?: string | null;
  district?: string | null;
  upazila?: string | null;
  union_name?: string | null;
  village?: string | null;
};

export default function ResellerAreas() {
  const navigate = useNavigate();
  const {
    session,
    reseller,
    loading,
    areas,
    logout,
    refetch,
    hasPermission,
    createArea,
    updateArea,
    deleteArea,
  } = useResellerPortal();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AreaRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AreaRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    district: '',
    upazila: '',
    union_name: '',
    village: '',
  });

  useEffect(() => {
    if (!loading && !session) navigate('/reseller/login');
  }, [loading, session, navigate]);

  const canView = hasPermission('area_view');
  const canCreate = hasPermission('area_create');
  const canEdit = hasPermission('area_edit');
  const canDelete = hasPermission('area_delete');

  const tableRows = useMemo(() => {
    return (areas as any as AreaRow[]).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [areas]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', district: '', upazila: '', union_name: '', village: '' });
    setShowDialog(true);
  };

  const openEdit = (row: AreaRow) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      description: row.description || '',
      district: row.district || '',
      upazila: row.upazila || '',
      union_name: row.union_name || '',
      village: row.village || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Area name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        district: form.district.trim() || null,
        upazila: form.upazila.trim() || null,
        union_name: form.union_name.trim() || null,
        village: form.village.trim() || null,
      };

      const ok = editing ? await updateArea(editing.id, payload) : await createArea(payload);
      if (ok) {
        setShowDialog(false);
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const ok = await deleteArea(deleteConfirm.id);
      if (ok) setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canView) {
    return (
      <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You do not have permission to view areas.</p>
          </CardContent>
        </Card>
      </ResellerPortalLayout>
    );
  }

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Areas</h1>
            <p className="text-muted-foreground">Manage your allowed areas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Area List ({tableRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Upazila</TableHead>
                    <TableHead className="hidden lg:table-cell">District</TableHead>
                    <TableHead className="hidden lg:table-cell">Union</TableHead>
                    <TableHead className="hidden lg:table-cell">Village</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(canEdit || canDelete) ? 6 : 5} className="text-center py-10 text-muted-foreground">
                        No areas available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{a.upazila || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{a.district || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{a.union_name || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{a.village || '-'}</TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canEdit && (
                                <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(a)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Area' : 'Add Area'}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Area Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Upazila</Label>
                <Input value={form.upazila} onChange={(e) => setForm((p) => ({ ...p, upazila: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Union</Label>
                <Input value={form.union_name} onChange={(e) => setForm((p) => ({ ...p, union_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Village</Label>
                <Input value={form.village} onChange={(e) => setForm((p) => ({ ...p, village: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || (editing ? !canEdit : !canCreate)}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Area</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirm?.name}"? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResellerPortalLayout>
  );
}
