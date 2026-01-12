import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { format } from 'date-fns';
import type { ISPPackage } from '@/types/isp';

interface Area {
  id: string;
  name: string;
}

interface MikroTikRouter {
  id: string;
  name: string;
}

interface Reseller {
  id: string;
  name: string;
}

interface FilterState {
  status: string;
  package: string;
  area: string;
  mikrotik: string;
  reseller: string;
  expiryFilter: string;
  connectionDateFrom: Date | undefined;
  connectionDateTo: Date | undefined;
  expiryDateFrom: Date | undefined;
  expiryDateTo: Date | undefined;
}

interface CustomerFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  packages: ISPPackage[];
  areas: Area[];
  routers: MikroTikRouter[];
  resellers: Reseller[];
  activeFilterCount: number;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export const CustomerFilters = memo(function CustomerFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  packages,
  areas,
  routers,
  resellers,
  activeFilterCount,
  showFilters,
  onToggleFilters,
}: CustomerFiltersProps) {
  const { t } = useLanguageCurrency();

  const areaOptions: SearchableSelectOption[] = [
    { value: 'all', label: t('all') },
    ...areas.map(a => ({ value: a.id, label: a.name })),
  ];

  const resellerOptions: SearchableSelectOption[] = [
    { value: 'all', label: t('all') },
    ...resellers.map(r => ({ value: r.id, label: r.name })),
  ];

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <>
      <Button
        variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
        onClick={onToggleFilters}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        {t('filter')}
        {activeFilterCount > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {showFilters && (
        <div className="col-span-full bg-muted/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{t('filter')}</h4>
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  {t('clear_filters')}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filter_by_status')}</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => updateFilter('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="expired">{t('expired')}</SelectItem>
                  <SelectItem value="suspended">{t('suspended')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Package Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filter_by_package')}</Label>
              <Select
                value={filters.package}
                onValueChange={(v) => updateFilter('package', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filter_by_area')}</Label>
              <SearchableSelect
                options={areaOptions}
                value={filters.area}
                onValueChange={(v) => updateFilter('area', v)}
                placeholder={t('all')}
              />
            </div>

            {/* Router Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filter_by_router')}</Label>
              <Select
                value={filters.mikrotik}
                onValueChange={(v) => updateFilter('mikrotik', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {routers.map((router) => (
                    <SelectItem key={router.id} value={router.id}>
                      {router.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reseller Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filter_by_reseller')}</Label>
              <SearchableSelect
                options={resellerOptions}
                value={filters.reseller}
                onValueChange={(v) => updateFilter('reseller', v)}
                placeholder={t('all')}
              />
            </div>

            {/* Expiry Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('expiry_filter')}</Label>
              <Select
                value={filters.expiryFilter}
                onValueChange={(v) => updateFilter('expiryFilter', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="expiring_today">{t('expiring_today')}</SelectItem>
                  <SelectItem value="expiring_week">{t('expiring_7_days')}</SelectItem>
                  <SelectItem value="expiring_month">{t('expiring_30_days')}</SelectItem>
                  <SelectItem value="expired">{t('already_expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Connection Date Range */}
            <div className="space-y-2">
              <Label className="text-sm">{t('connection_date')}</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.connectionDateFrom
                        ? format(filters.connectionDateFrom, 'dd/MM/yy')
                        : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.connectionDateFrom}
                      onSelect={(d) => updateFilter('connectionDateFrom', d)}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.connectionDateTo
                        ? format(filters.connectionDateTo, 'dd/MM/yy')
                        : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.connectionDateTo}
                      onSelect={(d) => updateFilter('connectionDateTo', d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Expiry Date Range */}
            <div className="space-y-2">
              <Label className="text-sm">{t('expiry_date')}</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.expiryDateFrom
                        ? format(filters.expiryDateFrom, 'dd/MM/yy')
                        : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.expiryDateFrom}
                      onSelect={(d) => updateFilter('expiryDateFrom', d)}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.expiryDateTo
                        ? format(filters.expiryDateTo, 'dd/MM/yy')
                        : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.expiryDateTo}
                      onSelect={(d) => updateFilter('expiryDateTo', d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
