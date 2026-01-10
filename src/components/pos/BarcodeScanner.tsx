import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanLine, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [buffer, setBuffer] = useState('');
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle barcode scanner input (rapid keystrokes)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!open || mode !== 'scanner') return;

    // Ignore modifier keys
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.key === 'Enter') {
      if (buffer.length >= 3) {
        onScan(buffer);
        toast.success(`Scanned: ${buffer}`);
        onOpenChange(false);
      }
      setBuffer('');
      return;
    }

    // Only accept alphanumeric characters
    if (event.key.length === 1 && /[\w\d-]/.test(event.key)) {
      setBuffer(prev => prev + event.key);
      
      // Clear buffer after 100ms of inactivity (scanner inputs are rapid)
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
      bufferTimeoutRef.current = setTimeout(() => {
        setBuffer('');
      }, 100);
    }
  }, [open, mode, buffer, onScan, onOpenChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setBuffer('');
      setManualCode('');
    }
  }, [open]);

  const handleManualSubmit = () => {
    if (manualCode.trim().length >= 3) {
      onScan(manualCode.trim());
      toast.success(`Code entered: ${manualCode.trim()}`);
      onOpenChange(false);
    } else {
      toast.error('Please enter at least 3 characters');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Scan a barcode or enter the code manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'scanner' ? 'default' : 'outline'}
              onClick={() => setMode('scanner')}
              className="flex-1"
            >
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>

          {mode === 'scanner' ? (
            <div className="text-center py-8 space-y-4">
              <div className="relative mx-auto w-48 h-48 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center">
                <ScanLine className="h-16 w-16 text-primary animate-pulse" />
                <div className="absolute inset-2 border border-primary/30 rounded" />
              </div>
              <p className="text-sm text-muted-foreground">
                Point your barcode scanner at the product.<br/>
                The code will be detected automatically.
              </p>
              {buffer && (
                <div className="bg-muted p-2 rounded font-mono text-lg">
                  {buffer}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Using a USB/Bluetooth barcode scanner? Just scan!<br/>
                The scanner types the barcode like a keyboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enter Barcode / SKU</Label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode or product code..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit();
                    }
                  }}
                />
              </div>
              <Button onClick={handleManualSubmit} className="w-full">
                Find Product
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for continuous barcode scanning without modal
export function useBarcodeScanner(onScan: (barcode: string) => void, enabled: boolean = true) {
  const buffer = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) return;

      if (event.key === 'Enter') {
        if (buffer.current.length >= 3) {
          onScan(buffer.current);
          toast.success(`Scanned: ${buffer.current}`);
        }
        buffer.current = '';
        return;
      }

      if (event.key.length === 1 && /[\w\d-]/.test(event.key)) {
        buffer.current += event.key;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          buffer.current = '';
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan, enabled]);
}
