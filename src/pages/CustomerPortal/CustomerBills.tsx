import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Download, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerBills() {
  const { customer } = useOutletContext<{ customer: any }>();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      if (!customer?.id) return;
      
      const { data, error } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', customer.id)
        .order('bill_date', { ascending: false });
      
      if (!error && data) setBills(data);
      setLoading(false);
    };

    fetchBills();
  }, [customer?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bills</h1>
        <p className="text-muted-foreground">View and download your billing history</p>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Bills Yet</h3>
            <p className="text-muted-foreground">Your billing history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <Card key={bill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{bill.bill_number}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">৳{bill.total_amount || bill.amount}</p>
                      <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'}>
                        {bill.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
