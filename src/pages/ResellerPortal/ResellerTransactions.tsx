import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { TRANSACTION_TYPE_LABELS } from '@/types/reseller';

export default function ResellerTransactions() {
  const navigate = useNavigate();
  const { session, reseller, loading, transactions, logout } = useResellerPortal();

  useEffect(() => {
    if (!loading && !session) navigate('/reseller/login');
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Transaction History</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Balance</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{TRANSACTION_TYPE_LABELS[tx.type] || tx.type}</Badge></TableCell>
                      <TableCell className={tx.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {tx.amount >= 0 ? '+' : ''}৳{Math.abs(tx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">৳{tx.balance_after?.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{tx.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResellerPortalLayout>
  );
}
