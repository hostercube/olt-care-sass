import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ColumnFilterProps {
  label: string;
  values: string[];
  selectedValues: Set<string>;
  onSelectionChange: (values: Set<string>) => void;
}

export function ColumnFilter({ label, values, selectedValues, onSelectionChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  
  const uniqueValues = useMemo(() => {
    return [...new Set(values.filter(v => v && v.trim() !== ''))].sort();
  }, [values]);

  const handleToggle = (value: string) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    onSelectionChange(newSet);
  };

  const handleClear = () => {
    onSelectionChange(new Set());
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(uniqueValues));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 gap-1 font-semibold"
        >
          {label}
          {selectedValues.size > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {selectedValues.size}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              {uniqueValues.length} options
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleSelectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-1 pr-3">
              {uniqueValues.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No values available</p>
              ) : (
                uniqueValues.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedValues.has(value)}
                      onCheckedChange={() => handleToggle(value)}
                    />
                    <span className="text-xs font-mono truncate" title={value}>
                      {value}
                    </span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ONUColumnFiltersProps {
  onus: any[];
  filters: {
    routerMac: Set<string>;
    routerName: Set<string>;
    onuMac: Set<string>;
    pppoeUsername: Set<string>;
  };
  onFiltersChange: (filters: {
    routerMac: Set<string>;
    routerName: Set<string>;
    onuMac: Set<string>;
    pppoeUsername: Set<string>;
  }) => void;
}

export function ONUColumnFilters({ onus, filters, onFiltersChange }: ONUColumnFiltersProps) {
  const routerMacs = useMemo(() => onus.map(o => (o as any).router_mac || ''), [onus]);
  const routerNames = useMemo(() => onus.map(o => o.router_name || ''), [onus]);
  const onuMacs = useMemo(() => onus.map(o => o.mac_address || ''), [onus]);
  const pppoeUsernames = useMemo(() => onus.map(o => o.pppoe_username || ''), [onus]);

  const activeCount = 
    (filters.routerMac.size > 0 ? 1 : 0) +
    (filters.routerName.size > 0 ? 1 : 0) +
    (filters.onuMac.size > 0 ? 1 : 0) +
    (filters.pppoeUsername.size > 0 ? 1 : 0);

  const handleClearAll = () => {
    onFiltersChange({
      routerMac: new Set(),
      routerName: new Set(),
      onuMac: new Set(),
      pppoeUsername: new Set(),
    });
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Column Filters:</span>
      
      <ColumnFilter
        label="Router Name"
        values={routerNames}
        selectedValues={filters.routerName}
        onSelectionChange={(values) => onFiltersChange({ ...filters, routerName: values })}
      />
      
      <ColumnFilter
        label="Router MAC"
        values={routerMacs}
        selectedValues={filters.routerMac}
        onSelectionChange={(values) => onFiltersChange({ ...filters, routerMac: values })}
      />
      
      <ColumnFilter
        label="ONU MAC"
        values={onuMacs}
        selectedValues={filters.onuMac}
        onSelectionChange={(values) => onFiltersChange({ ...filters, onuMac: values })}
      />
      
      <ColumnFilter
        label="PPPoE"
        values={pppoeUsernames}
        selectedValues={filters.pppoeUsername}
        onSelectionChange={(values) => onFiltersChange({ ...filters, pppoeUsername: values })}
      />

      {activeCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={handleClearAll}
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
