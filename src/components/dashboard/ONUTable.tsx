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
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from './StatusIndicator';
import { ONU } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter, Download, MoreHorizontal, Signal, SignalLow, SignalZero } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ONUTableProps {
  onus: ONU[];
  title?: string;
  showFilters?: boolean;
}

function getPowerIcon(power: number) {
  if (power >= -20) return Signal;
  if (power >= -25) return SignalLow;
  return SignalZero;
}

function getPowerColor(power: number) {
  if (power >= -20) return 'text-success';
  if (power >= -25) return 'text-warning';
  return 'text-destructive';
}

export function ONUTable({ onus, title = 'ONU Devices', showFilters = true }: ONUTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredONUs = onus.filter(
    (onu) =>
      onu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      onu.routerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      onu.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      onu.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card variant="glass">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {showFilters && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 bg-secondary border-border"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">OLT</TableHead>
                <TableHead className="font-semibold">PON Port</TableHead>
                <TableHead className="font-semibold">ONU Name</TableHead>
                <TableHead className="font-semibold">Router</TableHead>
                <TableHead className="font-semibold">PPPoE</TableHead>
                <TableHead className="font-semibold text-center">RX Power</TableHead>
                <TableHead className="font-semibold text-center">TX Power</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold">Last Online</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredONUs.map((onu) => {
                const PowerIcon = getPowerIcon(onu.rxPower);
                const powerColor = getPowerColor(onu.rxPower);
                
                return (
                  <TableRow key={onu.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{onu.oltName}</TableCell>
                    <TableCell className="font-mono text-xs">{onu.ponPort}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{onu.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {onu.macAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{onu.routerName}</TableCell>
                    <TableCell className="font-mono text-xs">{onu.pppoeUsername}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <PowerIcon className={cn('h-4 w-4', powerColor)} />
                        <span className={cn('font-mono text-sm', powerColor)}>
                          {onu.rxPower} dBm
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm text-muted-foreground">
                        {onu.txPower} dBm
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIndicator status={onu.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {onu.lastOnline
                        ? formatDistanceToNow(onu.lastOnline, { addSuffix: true })
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
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Reboot ONU</DropdownMenuItem>
                          <DropdownMenuItem>Power History</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Deauthorize
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
          <span>Showing {filteredONUs.length} of {onus.length} devices</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
