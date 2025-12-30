import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { EditOLTDialog } from '@/components/olt/EditOLTDialog';
import { DeleteOLTDialog } from '@/components/olt/DeleteOLTDialog';
import { OLTBrandBadge } from '@/components/olt/OLTBrandBadge';
import type { Tables } from '@/integrations/supabase/types';
import type { OLTBrand } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';
import { Search, MoreHorizontal, RefreshCw, Settings, Trash2, Eye, Pencil, Router, WifiOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OLTTableProps {
  olts: Tables<'olts'>[];
  onRefresh?: () => void;
}

export function OLTTable({ olts, onRefresh }: OLTTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOLT, setEditingOLT] = useState<Tables<'olts'> | null>(null);
  const [deletingOLT, setDeletingOLT] = useState<{ id: string; name: string } | null>(null);
  const [pollingOLT, setPollingOLT] = useState<string | null>(null);

  const handlePollNow = async (oltId: string, oltName: string) => {
    setPollingOLT(oltId);
    try {
      const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${pollingServerUrl}/api/poll/${oltId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Poll failed');
      }
      
      const result = await response.json();
      toast.success(`Polled ${oltName}: Found ${result.result?.onuCount || 0} ONUs`);
      onRefresh?.();
    } catch (error: any) {
      console.error('Poll error:', error);
      toast.error(`Failed to poll ${oltName}: ${error.message || 'VPS server unreachable'}`);
    } finally {
      setPollingOLT(null);
    }
  };

  const handleViewDetails = (oltId: string) => {
    navigate(`/olts/${oltId}`);
  };

  const filteredOLTs = olts.filter(
    (olt) =>
      olt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      olt.ip_address.includes(searchTerm) ||
      olt.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card variant="glass">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">OLT Devices</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search OLTs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 bg-secondary border-border"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold">IP Address</TableHead>
                  <TableHead className="font-semibold">Port</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">MikroTik</TableHead>
                  <TableHead className="font-semibold">Port Usage</TableHead>
                  <TableHead className="font-semibold">Last Polled</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOLTs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No OLTs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOLTs.map((olt) => {
                    const portUsage = (olt.active_ports / olt.total_ports) * 100;
                    const hasMikrotik = !!(olt.mikrotik_ip && olt.mikrotik_username);
                    
                    return (
                      <TableRow 
                        key={olt.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleViewDetails(olt.id)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{olt.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {olt.username}@{olt.ip_address}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <OLTBrandBadge brand={olt.brand as OLTBrand} size="sm" />
                        </TableCell>
                        <TableCell className="font-mono">{olt.ip_address}</TableCell>
                        <TableCell className="font-mono">{olt.port}</TableCell>
                        <TableCell className="text-center">
                          <StatusIndicator status={olt.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {hasMikrotik ? (
                                  <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30">
                                    <Router className="h-3 w-3" />
                                    <span className="text-xs">Configured</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                                    <WifiOff className="h-3 w-3" />
                                    <span className="text-xs">None</span>
                                  </Badge>
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {hasMikrotik 
                                  ? `MikroTik: ${olt.mikrotik_ip}:${olt.mikrotik_port || 8728}`
                                  : 'MikroTik not configured - PPPoE data unavailable'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={portUsage} className="h-2 flex-1" />
                            <span className="text-xs font-mono text-muted-foreground">
                              {olt.active_ports}/{olt.total_ports}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {olt.last_polled
                            ? formatDistanceToNow(new Date(olt.last_polled), { addSuffix: true })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem className="gap-2" onClick={() => handleViewDetails(olt.id)}>
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); setEditingOLT(olt); }}>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={(e) => { e.stopPropagation(); handlePollNow(olt.id, olt.name); }}
                                disabled={pollingOLT === olt.id}
                              >
                                {pollingOLT === olt.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Polling...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4" />
                                    Poll Now
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={(e) => e.stopPropagation()}>
                                <Settings className="h-4 w-4" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeletingOLT({ id: olt.id, name: olt.name }); }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filteredOLTs.length} of {olts.length} OLTs</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingOLT && (
        <EditOLTDialog
          olt={editingOLT}
          open={!!editingOLT}
          onOpenChange={(open) => !open && setEditingOLT(null)}
          onOLTUpdated={onRefresh}
        />
      )}

      {/* Delete Dialog */}
      {deletingOLT && (
        <DeleteOLTDialog
          oltId={deletingOLT.id}
          oltName={deletingOLT.name}
          open={!!deletingOLT}
          onOpenChange={(open) => !open && setDeletingOLT(null)}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
}
