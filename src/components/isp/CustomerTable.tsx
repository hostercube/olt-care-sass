import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Edit, Trash2, MoreHorizontal, UserCheck, Clock, Ban, UserX, Store } from 'lucide-react';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import type { Customer, CustomerStatus } from '@/types/isp';
import { format, parseISO } from 'date-fns';

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewProfile: (customerId: string) => void;
  formatCurrency: (amount: number) => string;
}

const statusConfig: Record<CustomerStatus, { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  active: { labelKey: 'active', variant: 'default', icon: UserCheck },
  expired: { labelKey: 'expired', variant: 'destructive', icon: Clock },
  suspended: { labelKey: 'suspended', variant: 'destructive', icon: Ban },
  pending: { labelKey: 'pending', variant: 'secondary', icon: Clock },
  cancelled: { labelKey: 'cancelled', variant: 'outline', icon: UserX },
};

export const CustomerTable = memo(function CustomerTable({
  customers,
  loading,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onViewProfile,
  formatCurrency,
}: CustomerTableProps) {
  const { t } = useLanguageCurrency();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selectedIds.size === customers.length && customers.length > 0}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead>{t('customer_code')}</TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('phone')}</TableHead>
            <TableHead>{t('pppoe_username')}</TableHead>
            <TableHead>{t('package')}</TableHead>
            <TableHead>{t('area')}</TableHead>
            <TableHead>{t('reseller')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('expiry_date')}</TableHead>
            <TableHead>{t('due_amount')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                {t('no_data')}
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => {
              const StatusIcon = statusConfig[customer.status]?.icon || Clock;
              const statusLabelKey = statusConfig[customer.status]?.labelKey || customer.status;
              
              return (
                <TableRow key={customer.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(customer.id)}
                      onCheckedChange={() => onToggleSelection(customer.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {customer.customer_code || '-'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onViewProfile(customer.id)}
                      className="font-medium text-primary hover:underline text-left"
                    >
                      {customer.name}
                    </button>
                  </TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {customer.pppoe_username || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.package?.name || '-'}</Badge>
                  </TableCell>
                  <TableCell>{customer.area?.name || '-'}</TableCell>
                  <TableCell>
                    {customer.reseller ? (
                      <Badge variant="secondary" className="gap-1">
                        <Store className="h-3 w-3" />
                        {customer.reseller.name}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[customer.status]?.variant || 'outline'} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {t(statusLabelKey)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.expiry_date
                      ? format(parseISO(customer.expiry_date), 'dd MMM yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(customer.due_amount || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => onViewProfile(customer.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(customer)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
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
  );
});
