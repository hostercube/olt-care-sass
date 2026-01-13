import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerRecharges() {
  const { customer } = useOutletContext<{ customer: any }>();
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecharges = async () => {
      if (!customer?.id) return;
      
      const { data, error } = await supabase
        .from('customer_recharges')
        .select('*')
        .eq('customer_id', customer.id)
        .order('recharge_date', { ascending: false });
      
      if (!error && data) setRecharges(data);
      setLoading(false);
    };

    fetchRecharges();
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
        <h1 className="text-2xl font-bold">Recharge History</h1>
        <p className="text-muted-foreground">View your past recharges and payments</p>
      </div>

      {recharges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Recharges Yet</h3>
            <p className="text-muted-foreground">Your recharge history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recharges.map((recharge) => (
            <Card key={recharge.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Recharge - {recharge.months || 1} Month(s)</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(recharge.recharge_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-600">+৳{recharge.amount}</p>
                    <Badge variant={recharge.status === 'completed' ? 'default' : 'secondary'}>
                      {recharge.status || 'completed'}
                    </Badge>
                  </div>
                </div>
                {recharge.new_expiry && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    New Expiry: {format(new Date(recharge.new_expiry), 'MMM dd, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
