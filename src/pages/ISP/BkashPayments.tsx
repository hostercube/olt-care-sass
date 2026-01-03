import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useBkashPayments } from '@/hooks/useBkashPayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { 
  Wallet, RefreshCw, Loader2, Copy, CheckCircle, Clock, XCircle, 
  Link, ExternalLink, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BkashPayments() {
  const { tenantId } = useTenantContext();
  const { payments, loading, refetch, matchPayment, markAsRefunded } = useBkashPayments();
  const { customers } = useCustomers();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [matching, setMatching] = useState(false);

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const completedPayments = payments.filter(p => p.status === 'completed');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bkash-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  const handleMatch = async () => {
    if (!selectedPayment || !selectedCustomer) return;
    setMatching(true);
    await matchPayment(selectedPayment, selectedCustomer);
    setSelectedPayment(null);
    setSelectedCustomer('');
    setMatching(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'refunded':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="bKash Payments"
      subtitle="Manage bKash webhook payments and auto-matching"
    >
      {/* Webhook Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Use this webhook URL to receive bKash payment notifications automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to use:</strong> Configure your bKash merchant account or personal payment notification 
              to send webhooks to this URL. Include <code className="bg-muted px-1 rounded">customerCode</code> in the 
              reference field for auto-matching. Format: <code className="bg-muted px-1 rounded">
                {`{"trxID": "xxx", "amount": 500, "customerCode": "C000001", "tenantId": "${tenantId || 'your-tenant-id'}"}`}
              </code>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-muted-foreground">Total Payments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
              <p className="text-sm text-muted-foreground">Pending Match</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completedPayments.length}</p>
              <p className="text-sm text-muted-foreground">Matched</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payment History
          </CardTitle>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedPayments.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({payments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending payments to match
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TrxID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.trx_id}</TableCell>
                          <TableCell className="font-medium">৳{payment.amount}</TableCell>
                          <TableCell>{payment.sender_number || '-'}</TableCell>
                          <TableCell>{payment.customer_code || payment.reference || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.created_at), 'dd MMM HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select 
                                value={selectedPayment === payment.id ? selectedCustomer : ''}
                                onValueChange={(value) => {
                                  setSelectedPayment(payment.id);
                                  setSelectedCustomer(value);
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.customer_code} - {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                size="sm"
                                disabled={selectedPayment !== payment.id || !selectedCustomer || matching}
                                onClick={handleMatch}
                              >
                                {matching && selectedPayment === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Match'
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <PaymentTable payments={completedPayments} getStatusBadge={getStatusBadge} />
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <PaymentTable payments={payments} getStatusBadge={getStatusBadge} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function PaymentTable({ payments, getStatusBadge }: { payments: any[]; getStatusBadge: (status: string) => JSX.Element }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payments found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TrxID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-mono text-sm">{payment.trx_id}</TableCell>
              <TableCell className="font-medium">৳{payment.amount}</TableCell>
              <TableCell>{payment.customer_code || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline">{payment.payment_type}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell>
                {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}