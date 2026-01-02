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
import { Checkbox } from '@/components/ui/checkbox';
import { StatusIndicator } from './StatusIndicator';
import type { Tables } from '@/integrations/supabase/types';
import { formatDistanceToNow, isAfter, subDays, subHours, differenceInMinutes } from 'date-fns';
import { Search, Filter, Download, MoreHorizontal, X, RefreshCw, Power, Trash2, Clock, AlertTriangle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { ONUColumnFilters } from '@/components/onu/ONUColumnFilters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ONUWithOLTName = Tables<'onus'> & { oltName?: string };

interface ONUTableProps {
  onus: ONUWithOLTName[];
  title?: string;
  showFilters?: boolean;
  onRefresh?: () => void;
  staleThresholdMinutes?: number; // Highlight rows not updated in X minutes
}

type StatusFilter = 'all' | 'online' | 'offline' | 'warning';
type DateFilter = 'all' | '1h' | '24h' | '7d' | '30d';
type PowerFilter = 'all' | 'below_5' | 'below_10' | 'below_15' | 'below_20' | 'below_24' | 'below_25';

interface ColumnFilters {
  routerMac: Set<string>;
  routerName: Set<string>;
  onuMac: Set<string>;
  pppoeUsername: Set<string>;
}

export function ONUTable({ onus, title = 'ONU Devices', showFilters = true, onRefresh, staleThresholdMinutes = 15 }: ONUTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedONU, setSelectedONU] = useState<ONUWithOLTName | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Bulk selection state
  const [selectedONUs, setSelectedONUs] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filters
  const [selectedOLT, setSelectedOLT] = useState<string>('all');
  const [selectedPON, setSelectedPON] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [powerFilter, setPowerFilter] = useState<PowerFilter>('all');
  
  // Column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    routerMac: new Set(),
    routerName: new Set(),
    onuMac: new Set(),
    pppoeUsername: new Set(),
  });

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
      // Search filter (MAC, PPPoE, Router Name, ONU Name, Router MAC)
      const searchLower = searchTerm.toLowerCase();
      const routerMac = onu.router_mac || undefined;
      const matchesSearch = !searchTerm || 
        onu.name.toLowerCase().includes(searchLower) ||
        (onu.router_name?.toLowerCase().includes(searchLower)) ||
        (onu.pppoe_username?.toLowerCase().includes(searchLower)) ||
        (onu.mac_address?.toLowerCase().includes(searchLower)) ||
        (routerMac?.toLowerCase().includes(searchLower)) ||
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

      // Column filters
      const matchesRouterMac = columnFilters.routerMac.size === 0 || 
        columnFilters.routerMac.has(routerMac || '');
      const matchesRouterName = columnFilters.routerName.size === 0 || 
        columnFilters.routerName.has(onu.router_name || '');
      const matchesOnuMac = columnFilters.onuMac.size === 0 || 
        columnFilters.onuMac.has(onu.mac_address || '');
      const matchesPppoe = columnFilters.pppoeUsername.size === 0 || 
        columnFilters.pppoeUsername.has(onu.pppoe_username || '');

      // Power (dBm) filter
      let matchesPower = true;
      const rxPower = onu.rx_power;
      if (powerFilter !== 'all' && rxPower !== null && rxPower !== undefined) {
        switch (powerFilter) {
          case 'below_5':
            matchesPower = rxPower < -5;
            break;
          case 'below_10':
            matchesPower = rxPower < -10;
            break;
          case 'below_15':
            matchesPower = rxPower < -15;
            break;
          case 'below_20':
            matchesPower = rxPower < -20;
            break;
          case 'below_24':
            matchesPower = rxPower < -24;
            break;
          case 'below_25':
            matchesPower = rxPower <= -25;
            break;
        }
      } else if (powerFilter !== 'all' && (rxPower === null || rxPower === undefined)) {
        matchesPower = false; // Exclude ONUs with no power reading when filtering by power
      }

      return matchesSearch && matchesOLT && matchesPON && matchesStatus && matchesDate &&
        matchesRouterMac && matchesRouterName && matchesOnuMac && matchesPppoe && matchesPower;
    });
  }, [onus, searchTerm, selectedOLT, selectedPON, statusFilter, dateFilter, columnFilters, powerFilter]);

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
    setPowerFilter('all');
    setColumnFilters({
      routerMac: new Set(),
      routerName: new Set(),
      onuMac: new Set(),
      pppoeUsername: new Set(),
    });
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedOLT !== 'all',
    selectedPON !== 'all',
    statusFilter !== 'all',
    dateFilter !== 'all',
    powerFilter !== 'all',
    columnFilters.routerMac.size > 0,
    columnFilters.routerName.size > 0,
    columnFilters.onuMac.size > 0,
    columnFilters.pppoeUsername.size > 0,
  ].filter(Boolean).length;
  
  // Calculate stale ONUs count
  const staleONUsCount = useMemo(() => {
    const now = new Date();
    return onus.filter(onu => {
      if (!onu.updated_at) return true;
      const updatedAt = new Date(onu.updated_at);
      return differenceInMinutes(now, updatedAt) > staleThresholdMinutes;
    }).length;
  }, [onus, staleThresholdMinutes]);

  // Check if a row is stale
  const isStaleRow = (onu: ONUWithOLTName) => {
    if (!onu.updated_at) return true;
    const now = new Date();
    const updatedAt = new Date(onu.updated_at);
    return differenceInMinutes(now, updatedAt) > staleThresholdMinutes;
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(paginatedONUs.map(onu => onu.id));
      setSelectedONUs(newSelected);
    } else {
      setSelectedONUs(new Set());
    }
  };

  const handleSelectONU = (onuId: string, checked: boolean) => {
    const newSelected = new Set(selectedONUs);
    if (checked) {
      newSelected.add(onuId);
    } else {
      newSelected.delete(onuId);
    }
    setSelectedONUs(newSelected);
  };

  const isAllSelected = paginatedONUs.length > 0 && paginatedONUs.every(onu => selectedONUs.has(onu.id));
  const isSomeSelected = paginatedONUs.some(onu => selectedONUs.has(onu.id));

  // Bulk actions - call actual API endpoints
  const handleBulkReboot = async () => {
    const onuIds = Array.from(selectedONUs);
    toast({ title: 'Sending Reboot Commands...', description: `Rebooting ${onuIds.length} ONU(s)...` });
    
    try {
      const response = await fetch('/olt-polling-server/api/onu/bulk-reboot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onu_ids: onuIds }),
      });
      const data = await response.json();
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      toast({ title: 'Reboot Complete', description: `${successCount}/${onuIds.length} ONU(s) rebooted successfully.` });
    } catch (error) {
      toast({ title: 'Reboot Failed', description: 'Failed to send reboot commands.', variant: 'destructive' });
    }
    setSelectedONUs(new Set());
  };

  const handleBulkDeauthorize = async () => {
    const onuIds = Array.from(selectedONUs);
    toast({ title: 'Sending Deauthorize Commands...', description: `Deauthorizing ${onuIds.length} ONU(s)...` });
    
    try {
      const response = await fetch('/olt-polling-server/api/onu/bulk-deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onu_ids: onuIds }),
      });
      const data = await response.json();
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      toast({ title: 'Deauthorize Complete', description: `${successCount}/${onuIds.length} ONU(s) deauthorized.`, variant: 'destructive' });
      onRefresh?.();
    } catch (error) {
      toast({ title: 'Deauthorize Failed', description: 'Failed to send deauthorize commands.', variant: 'destructive' });
    }
    setSelectedONUs(new Set());
  };

  const handleBulkExport = () => {
    const selectedOnuData = filteredONUs.filter(onu => selectedONUs.has(onu.id));
    const headers = ['OLT', 'PON Port', 'ONU Name', 'Router Name', 'PPPoE Username', 'ONU MAC', 'Router MAC', 'Serial Number', 'RX Power', 'TX Power', 'Status', 'Last Online'];
    const rows = selectedOnuData.map(onu => [
      onu.oltName || 'Unknown',
      onu.pon_port,
      onu.name,
      onu.router_name || '',
      onu.pppoe_username || '',
      onu.mac_address || '',
      onu.router_mac || '',
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
    a.download = `onu-devices-selected-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: 'Export Complete',
      description: `Exported ${selectedONUs.size} ONU(s) to CSV.`,
    });
    setSelectedONUs(new Set());
  };

  const handleExportCSV = () => {
    const headers = ['OLT', 'PON Port', 'ONU Name', 'Router Name', 'PPPoE Username', 'ONU MAC', 'Router MAC', 'Serial Number', 'RX Power', 'TX Power', 'Status', 'Last Online'];
    const rows = filteredONUs.map(onu => [
      onu.oltName || 'Unknown',
      onu.pon_port,
      onu.name,
      onu.router_name || '',
      onu.pppoe_username || '',
      onu.mac_address || '',
      onu.router_mac || '',
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
                      placeholder="Search ONU MAC, Router MAC, PPPoE, Router..."
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

                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">RX Power (dBm)</label>
                            <Select value={powerFilter} onValueChange={(v) => setPowerFilter(v as PowerFilter)}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="All Power Levels" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Power Levels</SelectItem>
                                <SelectItem value="below_5">🔴 Below -5 dBm</SelectItem>
                                <SelectItem value="below_10">🔴 Below -10 dBm</SelectItem>
                                <SelectItem value="below_15">🟡 Below -15 dBm</SelectItem>
                                <SelectItem value="below_20">🟡 Below -20 dBm</SelectItem>
                                <SelectItem value="below_24">🟠 Below -24 dBm</SelectItem>
                                <SelectItem value="below_25">🔴 Critical (≤ -25 dBm)</SelectItem>
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

            {/* Bulk Actions Bar */}
            {selectedONUs.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">
                  {selectedONUs.size} ONU(s) selected
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={handleBulkReboot}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reboot
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkExport}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDeauthorize}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deauthorize
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedONUs(new Set())}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

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
                {powerFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    RX Power: {
                      powerFilter === 'below_25' ? '≤ -25 dBm' :
                      powerFilter === 'below_5' ? '< -5 dBm' :
                      powerFilter === 'below_10' ? '< -10 dBm' :
                      powerFilter === 'below_15' ? '< -15 dBm' :
                      powerFilter === 'below_20' ? '< -20 dBm' :
                      '< -24 dBm'
                    }
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setPowerFilter('all')} />
                  </Badge>
                )}
              </div>
            )}
            
            {/* Column Filters */}
            <ONUColumnFilters 
              onus={onus} 
              filters={columnFilters} 
              onFiltersChange={setColumnFilters} 
            />
            
            {/* Stale Data Indicator */}
            {staleONUsCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <Clock className="h-3 w-3" />
                <span>{staleONUsCount} ONU(s) not updated in {staleThresholdMinutes}+ min</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">OLT</TableHead>
                  <TableHead className="font-semibold">PON Port</TableHead>
                  <TableHead className="font-semibold text-center">Index</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Model</TableHead>
                  <TableHead className="font-semibold">ONU Name</TableHead>
                  <TableHead className="font-semibold">Router</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      PPPoE
                      {onus.length > 0 && (() => {
                        const matched = onus.filter(o => o.pppoe_username && o.pppoe_username.trim() !== '').length;
                        const notMatched = onus.length - matched;
                        return (
                          <Badge 
                            variant={matched === onus.length ? 'success' : matched > 0 ? 'warning' : 'destructive'} 
                            className="text-[10px] px-1 py-0 h-4"
                            title={`${matched} matched, ${notMatched} not matched`}
                          >
                            {matched}/{onus.length}
                          </Badge>
                        );
                      })()}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">ONU MAC</TableHead>
                  <TableHead className="font-semibold">Router MAC</TableHead>
                  <TableHead className="font-semibold text-center">RX Power</TableHead>
                  <TableHead className="font-semibold text-center">TX Power</TableHead>
                  <TableHead className="font-semibold text-center">Temp</TableHead>
                  <TableHead className="font-semibold text-center">Distance</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">Offline Reason</TableHead>
                  <TableHead className="font-semibold">Last Register</TableHead>
                  <TableHead className="font-semibold">Last Deregister</TableHead>
                  <TableHead className="font-semibold">Alive Time</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedONUs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={23} className="text-center py-8 text-muted-foreground">
                      No ONU devices found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedONUs.map((onu) => {
                    const isSelected = selectedONUs.has(onu.id);
                    const temp = (onu as any).temperature;
                    const distance = (onu as any).distance;
                    const stale = isStaleRow(onu);
                    const updatedAt = onu.updated_at ? new Date(onu.updated_at) : null;
                    return (
                      <TableRow 
                        key={onu.id} 
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer",
                          isSelected && "bg-primary/5",
                          stale && "bg-warning/5 border-l-2 border-l-warning"
                        )}
                        onClick={() => handleViewDetails(onu)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectONU(onu.id, !!checked)}
                            aria-label={`Select ${onu.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{onu.oltName || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-xs">{onu.pon_port}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{onu.onu_index}</TableCell>
                        <TableCell className="text-xs">
                          {(onu as any).vendor_id ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {(onu as any).vendor_id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(onu as any).model_id ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {(onu as any).model_id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{onu.name}</span>
                        </TableCell>
                        <TableCell className="text-sm">{onu.router_name || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className={`font-mono text-xs ${onu.pppoe_username ? 'text-success' : 'text-muted-foreground'}`}>
                          {onu.pppoe_username || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{onu.mac_address || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="font-mono text-xs">{(onu as any).router_mac || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <PowerBadge power={onu.rx_power} type="rx" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <PowerBadge power={onu.tx_power} type="tx" showIcon={false} />
                        </TableCell>
                        <TableCell className="text-center">
                          {temp !== null && temp !== undefined ? (
                            <Badge variant={temp > 60 ? 'destructive' : temp > 50 ? 'warning' : 'outline'} className="font-mono text-xs">
                              {temp.toFixed(1)}°C
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {distance !== null && distance !== undefined ? (
                            distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusIndicator status={onu.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-xs">
                          {onu.offline_reason ? (
                            <Badge 
                              variant={
                                onu.offline_reason.toLowerCase().includes('power off') ? 'destructive' :
                                onu.offline_reason.toLowerCase().includes('los') ? 'warning' :
                                onu.offline_reason.toLowerCase().includes('wire') ? 'warning' :
                                'secondary'
                              } 
                              className="text-xs"
                            >
                              {onu.offline_reason}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={onu.last_online ? "text-foreground cursor-help" : "text-muted-foreground"}>
                                  {onu.last_online 
                                    ? formatDistanceToNow(new Date(onu.last_online), { addSuffix: true })
                                    : '-'}
                                </span>
                              </TooltipTrigger>
                              {onu.last_online && (
                                <TooltipContent>
                                  <p className="text-xs">{new Date(onu.last_online).toLocaleString()}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={onu.last_offline ? "text-foreground cursor-help" : "text-muted-foreground"}>
                                  {onu.last_offline 
                                    ? formatDistanceToNow(new Date(onu.last_offline), { addSuffix: true })
                                    : '-'}
                                </span>
                              </TooltipTrigger>
                              {onu.last_offline && (
                                <TooltipContent>
                                  <p className="text-xs">{new Date(onu.last_offline).toLocaleString()}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {(onu as any).alive_time || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "flex items-center gap-1",
                                  stale ? "text-warning" : "text-muted-foreground"
                                )}>
                                  {stale && <AlertTriangle className="h-3 w-3" />}
                                  {updatedAt
                                    ? formatDistanceToNow(updatedAt, { addSuffix: true })
                                    : 'Never'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p>Last updated: {updatedAt ? updatedAt.toLocaleString() : 'Never'}</p>
                                  <p>Last online: {onu.last_online ? new Date(onu.last_online).toLocaleString() : 'Never'}</p>
                                  {stale && <p className="text-warning">Data may be stale</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
