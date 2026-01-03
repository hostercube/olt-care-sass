import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, Phone, Mail, MapPin, Router, Network, Package, Calendar, 
  CreditCard, Clock, Activity 
} from 'lucide-react';
import type { Customer } from '@/types/isp';
import { format } from 'date-fns';

interface CustomerDetailsSheetProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  active: 'bg-green-500',
  expired: 'bg-red-500',
  suspended: 'bg-orange-500',
  pending: 'bg-yellow-500',
  cancelled: 'bg-gray-500',
};

export function CustomerDetailsSheet({ customer, open, onOpenChange }: CustomerDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">{customer.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{customer.customer_code || 'No Code'}</Badge>
                <Badge className={statusColors[customer.status]}>
                  {customer.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email || 'No email'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{customer.address || 'No address'}</span>
              </div>
              {customer.area && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {customer.area.name}
                    {customer.area.upazila && `, ${customer.area.upazila}`}
                    {customer.area.district && `, ${customer.area.district}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Network Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">PPPoE Username</p>
                  <p className="font-mono font-medium">{customer.pppoe_username || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PON Port</p>
                  <p className="font-mono font-medium">
                    {customer.pon_port ? `${customer.pon_port}:${customer.onu_index}` : '-'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ONU MAC</p>
                  <p className="font-mono text-xs">{customer.onu_mac || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Router MAC</p>
                  <p className="font-mono text-xs">{customer.router_mac || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package & Billing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Package & Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{customer.package?.name || 'No Package'}</p>
                  {customer.package && (
                    <p className="text-sm text-muted-foreground">
                      {customer.package.download_speed}/{customer.package.upload_speed} {customer.package.speed_unit}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Monthly Bill</p>
                  <p className="font-medium text-lg">৳{customer.monthly_bill?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Amount</p>
                  <p className={`font-medium text-lg ${customer.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{customer.due_amount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Connection Date</p>
                  <p>{customer.connection_date ? format(new Date(customer.connection_date), 'dd MMM yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className={customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                    {customer.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </div>
              {customer.last_payment_date && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Last Payment</p>
                  <p>{format(new Date(customer.last_payment_date), 'dd MMM yyyy')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reseller Info */}
          {customer.reseller && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Reseller</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{customer.reseller.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.reseller.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(customer.created_at), 'dd MMM yyyy, HH:mm')}</p>
            <p>Updated: {format(new Date(customer.updated_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
