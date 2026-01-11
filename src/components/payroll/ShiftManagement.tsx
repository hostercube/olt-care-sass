import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Loader2, Clock, Sun, Moon, Sunrise, Trash2 } from 'lucide-react';
import type { StaffShift } from '@/hooks/usePayrollSystem';

interface ShiftManagementProps {
  shifts: StaffShift[];
  loading: boolean;
  onSaveShift: (data: Partial<StaffShift>, id?: string) => Promise<void>;
  onDeleteShift?: (id: string) => Promise<void>;
}

export function ShiftManagement({ shifts, loading, onSaveShift, onDeleteShift }: ShiftManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffShift | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    late_tolerance_minutes: '15'
  });

  const resetForm = () => {
    setForm({ name: '', start_time: '09:00', end_time: '17:00', late_tolerance_minutes: '15' });
  };

  const handleEdit = (shift: StaffShift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      late_tolerance_minutes: shift.late_tolerance_minutes.toString()
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      await onSaveShift({
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        late_tolerance_minutes: parseInt(form.late_tolerance_minutes) || 15
      }, editingShift?.id);
      setShowDialog(false);
      setEditingShift(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !onDeleteShift) return;
    await onDeleteShift(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const getShiftIcon = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 5 && hour < 12) return <Sunrise className="h-5 w-5 text-orange-500" />;
    if (hour >= 12 && hour < 18) return <Sun className="h-5 w-5 text-yellow-500" />;
    return <Moon className="h-5 w-5 text-blue-500" />;
  };

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH;
    let mins = endM - startM;
    if (hours < 0) hours += 24;
    if (mins < 0) {
      hours -= 1;
      mins += 60;
    }
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Shift Management</CardTitle>
            <CardDescription>Configure work shifts and schedules</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setEditingShift(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Shift
          </Button>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts configured yet</p>
              <p className="text-sm">Add shifts to manage staff schedules</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shifts.map(shift => (
                <div key={shift.id} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getShiftIcon(shift.start_time)}
                      <span className="font-medium">{shift.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(shift)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {onDeleteShift && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(shift)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {shift.start_time} - {shift.end_time}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {calculateHours(shift.start_time, shift.end_time)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Late after {shift.late_tolerance_minutes} min tolerance
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Default Shifts Suggestion */}
          {shifts.length === 0 && (
            <div className="mt-4 p-4 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Quick start with common shifts:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Morning Shift', start: '09:00', end: '17:00' },
                  { name: 'Day Shift', start: '10:00', end: '18:00' },
                  { name: 'Night Shift', start: '22:00', end: '06:00' },
                ].map(preset => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm({
                        name: preset.name,
                        start_time: preset.start,
                        end_time: preset.end,
                        late_tolerance_minutes: '15'
                      });
                      setShowDialog(true);
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit' : 'Add'} Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shift Name *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                placeholder="Morning Shift"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input 
                  type="time" 
                  value={form.start_time} 
                  onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input 
                  type="time" 
                  value={form.end_time} 
                  onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))} 
                />
              </div>
            </div>
            {form.start_time && form.end_time && (
              <p className="text-sm text-muted-foreground">
                Shift duration: {calculateHours(form.start_time, form.end_time)}
              </p>
            )}
            <div className="space-y-2">
              <Label>Late Tolerance (minutes)</Label>
              <Input 
                type="number" 
                value={form.late_tolerance_minutes} 
                onChange={(e) => setForm(p => ({ ...p, late_tolerance_minutes: e.target.value }))} 
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">
                Staff arriving within this time after shift start won't be marked late
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
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
    </div>
  );
}
