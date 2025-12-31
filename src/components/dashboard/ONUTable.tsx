import { useState, useMemo } from 'react';
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
import { StatusIndicator } from './StatusIndicator';
import type { Tables } from '@/integrations/supabase/types';
import { formatDistanceToNow, isAfter, subDays, subHours } from 'date-fns';
import { Search, Filter, Download, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ONUDetailsModal } from '@/components/onu/ONUDetailsModal';
import { PowerBadge } from '@/components/onu/PowerBadge';
import { TablePagination } from '@/components/ui/table-pagination';

type ONUWithOLTName = Tables<'onus'> & { oltName?: string };

interface ONUTableProps {
  onus: ONUWithOLTName[];
  title?: string;
  showFilters?: boolean;
  onRefresh?: () => void;
}

type StatusFilter = 'all' | 'online' | 'offline' | 'warning';
type DateFilter = 'all' | '1h' | '24h' | '7d' | '30d';

export function ONUTable({ onus, title = 'ONU Devices', showFilters = true, onRefresh }: ONUTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedONU, setSelectedONU] = useState<ONUWithOLTName | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filters
  const [selectedOLT, setSelectedOLT] = useState<string>('all');
  const [selectedPON, setSelectedPON] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Get unique OLTs and PON ports for filter dropdowns
  const uniqueOLTs = useMemo(() => {
    const olts = [...new Set(onus.map(onu => onu.oltName || 'Unknown'))];
    return olts.sort();
  }, [onus]);

  const uniquePONs = useMemo(() => {
    let filteredONUs = onus;
    if (selectedOLT !== 'all') {
      filteredONUs = onus.filter(onu => (onu.oltName || 'Unknown') === selectedOLT);
    }
    const pons = [...new Set(filteredONUs.map(onu => onu.pon_port))];
    return pons.sort();
  }, [onus, selectedOLT]);

  // Apply all filters
  const filteredONUs = useMemo(() => {
    return onus.filter((onu) => {
      // Search filter (MAC, PPPoE, Router Name, ONU Name)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        onu.name.toLowerCase().includes(searchLower) ||
        (onu.router_name?.toLowerCase().includes(searchLower)) ||
        (onu.pppoe_username?.toLowerCase().includes(searchLower)) ||
        (onu.mac_address?.toLowerCase().includes(searchLower)) ||
        (onu.serial_number?.toLowerCase().includes(searchLower));

      // OLT filter
      const matchesOLT = selectedOLT === 'all' || (onu.oltName || 'Unknown') === selectedOLT;

      // PON filter
      const matchesPON = selectedPON === 'all' || onu.pon_port === selectedPON;

      // Status filter
      const matchesStatus = statusFilter === 'all' || onu.status === statusFilter;

      // Date filter (last online within timeframe)
      let matchesDate = true;
      if (dateFilter !== 'all' && onu.last_online) {
        const lastOnline = new Date(onu.last_online);
        const now = new Date();
        switch (dateFilter) {
          case '1h':
            matchesDate = isAfter(lastOnline, subHours(now, 1));
            break;
          case '24h':
            matchesDate = isAfter(lastOnline, subDays(now, 1));
            break;
          case '7d':
            matchesDate = isAfter(lastOnline, subDays(now, 7));
            break;
          case '30d':
            matchesDate = isAfter(lastOnline, subDays(now, 30));
            break;
        }
      }

      return matchesSearch && matchesOLT && matchesPON && matchesStatus && matchesDate;
    });
  }, [onus, searchTerm, selectedOLT, selectedPON, statusFilter, dateFilter]);

  // Paginated data
  const paginatedONUs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredONUs.slice(startIndex, startIndex + pageSize);
  }, [filteredONUs, currentPage, pageSize]);

  const handleViewDetails = (onu: ONUWithOLTName) => {
    setSelectedONU(onu);
    setDetailsOpen(true);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedOLT('all');
    setSelectedPON('all');
    setStatusFilter('all');
    setDateFilter('all');
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedOLT !== 'all',
    selectedPON !== 'all',
    statusFilter !== 'all',
    dateFilter !== 'all',
  ].filter(Boolean).length;

  const handleExportCSV = () => {
    const headers = ['OLT', 'PON Port', 'ONU Name', 'Router Name', 'PPPoE Username', 'MAC Address', 'Serial Number', 'RX Power', 'TX Power', 'Status', 'Last Online'];
    const rows = filteredONUs.map(onu => [
      onu.oltName || 'Unknown',
      onu.pon_port,
      onu.name,
      onu.router_name || '',
      onu.pppoe_username || '',
      onu.mac_address || '',
      onu.serial_number || '',
      onu.rx_power?.toString() || '',
      onu.tx_power?.toString() || '',
      onu.status,
      onu.last_online || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onu-devices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      <Card variant="glass">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {showFilters && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search MAC, PPPoE, Router..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-72 pl-9 bg-secondary border-border"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Popover open={showFilterPanel} onOpenChange={setShowFilterPanel}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="relative">
                        <Filter className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-popover border-border" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filters</h4>
                          {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                              Clear all
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">OLT</label>
                            <Select value={selectedOLT} onValueChange={(v) => { setSelectedOLT(v); setSelectedPON('all'); }}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="All OLTs" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All OLTs</SelectItem>
                                {uniqueOLTs.map(olt => (
                                  <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">PON Port</label>
                            <Select value={selectedPON} onValueChange={setSelectedPON}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="All PON Ports" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All PON Ports</SelectItem>
                                {uniquePONs.map(pon => (
                                  <SelectItem key={pon} value={pon}>{pon}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Status</label>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Last Online</label>
                            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Any Time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Time</SelectItem>
                                <SelectItem value="1h">Last 1 Hour</SelectItem>
                                <SelectItem value="24h">Last 24 Hours</SelectItem>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export to CSV">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {selectedOLT !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    OLT: {selectedOLT}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setSelectedOLT('all'); setSelectedPON('all'); }} />
                  </Badge>
                )}
                {selectedPON !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    PON: {selectedPON}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedPON('all')} />
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
                  </Badge>
                )}
                {dateFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Last Online: {dateFilter === '1h' ? '1 Hour' : dateFilter === '24h' ? '24 Hours' : dateFilter === '7d' ? '7 Days' : '30 Days'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFilter('all')} />
                  </Badge>
                )}
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
                  <TableHead className="font-semibold">MAC Address</TableHead>
                  <TableHead className="font-semibold text-center">RX Power</TableHead>
                  <TableHead className="font-semibold text-center">TX Power</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">Last Online</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedONUs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No ONU devices found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedONUs.map((onu) => {
                    return (
                      <TableRow 
                        key={onu.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleViewDetails(onu)}
                      >
                        <TableCell className="font-medium">{onu.oltName || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-xs">{onu.pon_port}</TableCell>
                        <TableCell>
                          <span className="font-medium">{onu.name}</span>
                        </TableCell>
                        <TableCell className="text-sm">{onu.router_name || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{onu.pppoe_username || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{onu.mac_address || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <PowerBadge power={onu.rx_power} type="rx" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <PowerBadge power={onu.tx_power} type="tx" showIcon={false} />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusIndicator status={onu.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {onu.last_online
                            ? formatDistanceToNow(new Date(onu.last_online), { addSuffix: true })
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
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(onu); }}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                Reboot ONU
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                Power History
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                Deauthorize
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
          <TablePagination
            totalItems={filteredONUs.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <ONUDetailsModal 
        onu={selectedONU} 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen}
        onUpdate={() => {
          setDetailsOpen(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
