import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, MapPin, Calendar, Package, CreditCard, Shield, Router, Wifi } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerProfile() {
  const { customer, tenantBranding } = useOutletContext<{ customer: any; tenantBranding: any }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your account information</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
                {customer?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold">{customer?.name || 'Customer'}</h2>
              <p className="text-muted-foreground">{customer?.customer_code || customer?.pppoe_username}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge variant={customer?.status === 'active' ? 'default' : 'destructive'} className="text-sm">
                  {customer?.status === 'active' ? 'Active Account' : 'Inactive Account'}
                </Badge>
                {customer?.package && (
                  <Badge variant="secondary" className="text-sm">
                    {customer.package.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{customer?.name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-medium">{customer?.phone || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{customer?.email || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">NID Number</p>
                <p className="font-medium">{customer?.nid_number || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{customer?.address || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Package</p>
                <p className="font-medium">{customer?.package?.name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly Bill</p>
                <p className="font-medium">৳{customer?.monthly_bill || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Connection Date</p>
                <p className="font-medium">
                  {customer?.connection_date ? format(new Date(customer.connection_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Expiry Date</p>
                <p className="font-medium">
                  {customer?.expiry_date ? format(new Date(customer.expiry_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Connection Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Wifi className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Connection Type</p>
                <p className="font-medium">{customer?.connection_type?.toUpperCase() || 'PPPoE'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">PPPoE Username</p>
                <p className="font-medium font-mono">{customer?.pppoe_username || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Router className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last IP Address</p>
                <p className="font-medium font-mono">{customer?.last_ip_address || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Router className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">MAC Address</p>
                <p className="font-medium font-mono text-sm">{customer?.last_caller_id || customer?.onu_mac || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ISP Info */}
      {tenantBranding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Internet Service Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {tenantBranding.logo_url ? (
                <img src={tenantBranding.logo_url} alt="ISP Logo" className="h-12 w-12 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wifi className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">{tenantBranding.company_name || 'ISP Provider'}</p>
                <p className="text-muted-foreground">{tenantBranding.subtitle || 'Internet Service Provider'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
