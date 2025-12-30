import { useState } from 'react';
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
import { OLT } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';
import { Search, MoreHorizontal, RefreshCw, Settings, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OLTTableProps {
  olts: OLT[];
}

export function OLTTable({ olts }: OLTTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOLTs = olts.filter(
    (olt) =>
      olt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      olt.ipAddress.includes(searchTerm) ||
      olt.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
                <TableHead className="font-semibold">Port Usage</TableHead>
                <TableHead className="font-semibold">Last Polled</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOLTs.map((olt) => {
                const portUsage = (olt.activePorts / olt.totalPorts) * 100;
                
                return (
                  <TableRow key={olt.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{olt.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {olt.username}@{olt.ipAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                        {olt.brand}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{olt.ipAddress}</TableCell>
                    <TableCell className="font-mono">{olt.port}</TableCell>
                    <TableCell className="text-center">
                      <StatusIndicator status={olt.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={portUsage} className="h-2 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground">
                          {olt.activePorts}/{olt.totalPorts}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {olt.lastPolled
                        ? formatDistanceToNow(olt.lastPolled, { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Poll Now
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Settings className="h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Showing {filteredOLTs.length} of {olts.length} OLTs</span>
        </div>
      </CardContent>
    </Card>
  );
}
