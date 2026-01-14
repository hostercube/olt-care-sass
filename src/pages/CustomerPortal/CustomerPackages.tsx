import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ISPPackage {
  id: string;
  name: string;
  price: number;
  download_speed: number;
  upload_speed: number;
  description: string | null;
  features?: string[] | null;
  is_popular?: boolean;
}

interface CustomerContext {
  customer: any;
  tenantBranding: any;
}

export default function CustomerPackages() {
  const context = useOutletContext<CustomerContext>();
  const navigate = useNavigate();
  const customer = context?.customer;

  const [packages, setPackages] = useState<ISPPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!customer?.tenant_id) return;

      try {
        const { data, error } = await supabase
          .from('isp_packages')
          .select('*')
          .eq('tenant_id', customer.tenant_id)
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;
        setPackages(data || []);
        setCurrentPackageId(customer.package_id);
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [customer]);

  const handleSelectPackage = (pkg: ISPPackage) => {
    if (pkg.id === currentPackageId) {
      toast.info('This is your current package');
      return;
    }

    // Store selected package for the payment page
    sessionStorage.setItem('pending_package_change', JSON.stringify({
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      downloadSpeed: pkg.download_speed,
      uploadSpeed: pkg.upload_speed
    }));

    navigate('/portal/pay');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const currentPackage = packages.find(p => p.id === currentPackageId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Internet Packages</h1>
        <p className="text-muted-foreground">
          Choose a package that suits your needs
        </p>
      </div>

      {currentPackage && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Package</CardTitle>
              <Badge variant="default">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{currentPackage.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPackage.download_speed} Mbps / {currentPackage.upload_speed} Mbps
                </p>
              </div>
              <p className="text-2xl font-bold">৳{currentPackage.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const isCurrent = pkg.id === currentPackageId;
          
          return (
            <Card 
              key={pkg.id} 
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                pkg.is_popular ? 'border-primary shadow-md' : ''
              } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
            >
              {pkg.is_popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  Popular
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {pkg.name}
                </CardTitle>
                <CardDescription>{pkg.description || 'High-speed internet package'}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <span className="text-4xl font-bold">৳{pkg.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Download: {pkg.download_speed} Mbps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Upload: {pkg.upload_speed} Mbps</span>
                  </div>
                  {Array.isArray(pkg.features) && pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {isCurrent ? (
                    'Current Package'
                  ) : (
                    <>
                      Change to this package
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {packages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No packages available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
