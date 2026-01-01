import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Database,
  Search,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  duplicateGroupsCount: number;
  recordsDeleted: number;
  recordsToDelete: Array<{
    id: string;
    name: string;
    pon_port: string;
    onu_index: number;
    pppoe_username: string | null;
  }>;
  pppoeDuplicates: Array<{
    username: string;
    count: number;
    onus: Array<{ id: string; name: string; pon_port: string; onu_index: number }>;
  }>;
  pppoeDuplicateCount: number;
}

interface DatabaseCleanupPanelProps {
  oltId?: string;
  pollingServerUrl?: string;
  onCleanupComplete?: () => void;
}

export function DatabaseCleanupPanel({ oltId, pollingServerUrl, onCleanupComplete }: DatabaseCleanupPanelProps) {
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [scanResult, setScanResult] = useState<CleanupResult | null>(null);

  const handleScan = async () => {
    if (!pollingServerUrl) {
      toast.error('Polling server not configured');
      return;
    }

    setScanning(true);
    setScanResult(null);
    
    try {
      const response = await fetch(`${pollingServerUrl}/api/cleanup-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oltId, dryRun: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScanResult(data);
        if (data.duplicateGroupsCount === 0 && data.pppoeDuplicateCount === 0) {
          toast.success('No duplicates found - database is clean!');
        } else {
          toast.info(`Found ${data.recordsToDelete.length} duplicate records and ${data.pppoeDuplicateCount} PPPoE conflicts`);
        }
      } else {
        toast.error(`Scan failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleCleanup = async () => {
    if (!pollingServerUrl || !scanResult) {
      return;
    }

    setCleaning(true);
    
    try {
      const response = await fetch(`${pollingServerUrl}/api/cleanup-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oltId, dryRun: false }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Deleted ${data.recordsDeleted} duplicate records`);
        setScanResult(null);
        onCleanupComplete?.();
      } else {
        toast.error(`Cleanup failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const hasDuplicates = scanResult && (scanResult.recordsToDelete.length > 0 || scanResult.pppoeDuplicateCount > 0);

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Database Cleanup Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan for and remove duplicate ONU records in the database. This helps fix data issues caused by polling errors.
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={scanning || !pollingServerUrl}
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan for Duplicates
              </>
            )}
          </Button>
          
          {hasDuplicates && (
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {scanResult.recordsToDelete.length} Duplicates
                </>
              )}
            </Button>
          )}
        </div>

        {/* Scan Results */}
        {scanResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid gap-2 md:grid-cols-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Duplicate Groups</p>
                <p className="text-xl font-bold">{scanResult.duplicateGroupsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Records to Delete</p>
                <p className="text-xl font-bold text-destructive">{scanResult.recordsToDelete.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">PPPoE Conflicts</p>
                <p className="text-xl font-bold text-warning">{scanResult.pppoeDuplicateCount}</p>
              </div>
            </div>

            {/* No duplicates message */}
            {!hasDuplicates && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">Database is clean!</p>
                  <p className="text-sm text-muted-foreground">No duplicate ONU records found.</p>
                </div>
              </div>
            )}

            {/* Duplicate records list */}
            {scanResult.recordsToDelete.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Duplicate Records (will be deleted):</p>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {scanResult.recordsToDelete.map((record) => (
                      <div key={record.id} className="p-2 rounded bg-destructive/5 border border-destructive/20 text-xs font-mono flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground">PON: </span>{record.pon_port}
                          <span className="text-muted-foreground ml-2">ONU: </span>{record.onu_index}
                          <span className="text-muted-foreground ml-2">Name: </span>{record.name}
                        </div>
                        {record.pppoe_username && (
                          <Badge variant="outline" className="text-xs">{record.pppoe_username}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* PPPoE conflicts list */}
            {scanResult.pppoeDuplicates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  PPPoE Username Conflicts (same username on multiple ONUs):
                </p>
                <ScrollArea className="h-[150px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {scanResult.pppoeDuplicates.map((conflict) => (
                      <div key={conflict.username} className="p-2 rounded bg-warning/5 border border-warning/20 text-xs">
                        <div className="font-medium text-warning mb-1">{conflict.username} ({conflict.count} ONUs)</div>
                        <div className="flex flex-wrap gap-1">
                          {conflict.onus.map((onu) => (
                            <Badge key={onu.id} variant="outline" className="text-xs">
                              {onu.pon_port}:{onu.onu_index}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  PPPoE conflicts indicate the same username is matched to multiple hardware locations. 
                  Run "Full Sync" to fix these with 1:1 matching.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
