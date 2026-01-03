import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Wallet, MapPin, Phone, Mail, Building2, 
  Calendar, Shield, ChevronDown, ChevronRight, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Reseller } from '@/types/reseller';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';
import { format } from 'date-fns';

interface ResellerDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reseller: Reseller;
}

export default function ResellerDetailsSheet({ 
  open, 
  onOpenChange, 
  reseller 
}: ResellerDetailsSheetProps) {
  const [subResellers, setSubResellers] = useState<Reseller[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubResellers, setShowSubResellers] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);

  useEffect(() => {
    if (open && reseller) {
      fetchData();
    }
  }, [open, reseller]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sub-resellers
      const { data: subData } = await supabase
        .from('resellers')
        .select('*')
        .eq('parent_id', reseller.id)
        .eq('is_active', true);
      
      setSubResellers((subData as any[]) || []);

      // Fetch customers
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name, customer_code, phone, status, expiry_date')
        .eq('reseller_id', reseller.id)
        .order('name');
      
      setCustomers(custData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'suspended': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {reseller.name}
            <Badge className={reseller.level === 1 ? 'bg-blue-500' : reseller.level === 2 ? 'bg-purple-500' : 'bg-orange-500'}>
              {RESELLER_ROLE_LABELS[reseller.role]}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Wallet Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">৳{reseller.balance.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-medium">৳{reseller.total_collections?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Collections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
            <div className="grid gap-2">
              {reseller.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {reseller.phone}
                </div>
              )}
              {reseller.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {reseller.email}
                </div>
              )}
              {reseller.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {reseller.address}
                </div>
              )}
              {reseller.area?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Area: {reseller.area.name}
                </div>
              )}
              {reseller.nid_number && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  NID: {reseller.nid_number}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Commission Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Commission Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-lg font-medium">
                  {reseller.commission_value}{reseller.commission_type === 'percentage' ? '%' : '৳'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reseller.commission_type === 'percentage' ? 'Percentage' : 'Flat'} Commission
                </p>
              </div>
              {reseller.customer_rate > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-lg font-medium">৳{reseller.customer_rate}</p>
                  <p className="text-xs text-muted-foreground">Per Customer Rate</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" /> Permissions
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_create_sub_reseller ? 'bg-green-500' : 'bg-red-500'}`} />
                Create Sub-Reseller
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_add_customers ? 'bg-green-500' : 'bg-red-500'}`} />
                Add Customers
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_edit_customers ? 'bg-green-500' : 'bg-red-500'}`} />
                Edit Customers
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_delete_customers ? 'bg-green-500' : 'bg-red-500'}`} />
                Delete Customers
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_recharge_customers ? 'bg-green-500' : 'bg-red-500'}`} />
                Recharge Customers
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${reseller.can_view_sub_customers ? 'bg-green-500' : 'bg-red-500'}`} />
                View Sub-Customers
              </div>
            </div>
            {reseller.max_sub_resellers > 0 && (
              <p className="text-sm text-muted-foreground">
                Max Sub-Resellers: {reseller.max_sub_resellers}
              </p>
            )}
            {reseller.max_customers && (
              <p className="text-sm text-muted-foreground">
                Max Customers: {reseller.max_customers}
              </p>
            )}
          </div>

          <Separator />

          {/* Sub-Resellers */}
          {reseller.can_create_sub_reseller && (
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                onClick={() => setShowSubResellers(!showSubResellers)}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sub-Resellers ({subResellers.length})
                </span>
                {showSubResellers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              {showSubResellers && (
                <div className="space-y-2 pl-4">
                  {subResellers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sub-resellers</p>
                  ) : (
                    subResellers.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.phone}</p>
                        </div>
                        <Badge variant="outline">৳{sub.balance.toLocaleString()}</Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customers */}
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => setShowCustomers(!showCustomers)}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customers ({customers.length})
              </span>
              {showCustomers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            {showCustomers && (
              <div className="space-y-2 pl-4 max-h-60 overflow-y-auto">
                {customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No customers</p>
                ) : (
                  customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.customer_code}</p>
                      </div>
                      <Badge className={getStatusColor(customer.status)}>{customer.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created: {format(new Date(reseller.created_at), 'dd MMM yyyy')}
            </div>
            {reseller.last_login && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Login: {format(new Date(reseller.last_login), 'dd MMM yyyy HH:mm')}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
