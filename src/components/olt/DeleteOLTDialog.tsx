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
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface DeleteOLTDialogProps {
  oltId: string;
  oltName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteOLTDialog({ oltId, oltName, open, onOpenChange, onDeleted }: DeleteOLTDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete alerts associated with this OLT (not cascaded automatically)
      await supabase
        .from('alerts')
        .delete()
        .eq('device_id', oltId);

      // Delete the OLT - cascading deletes will handle ONUs, power_readings, status_history, debug_logs
      const { error: oltError } = await supabase
        .from('olts')
        .delete()
        .eq('id', oltId);

      if (oltError) throw oltError;

      toast.success(`OLT "${oltName}" and all related data have been deleted`);
      onDeleted?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete OLT');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete OLT</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong className="text-foreground">{oltName}</strong>? 
            This will also delete all ONUs associated with this OLT. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete OLT'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
