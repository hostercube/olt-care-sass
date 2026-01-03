import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Loader2, ArrowDownLeft, ArrowUpRight, RefreshCcw, Users, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Reseller, ResellerTransaction } from '@/types/reseller';
import { TRANSACTION_TYPE_LABELS } from '@/types/reseller';
import { format } from 'date-fns';

interface ResellerTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reseller: Reseller;
}

export default function ResellerTransactionsDialog({ 
  open, 
  onOpenChange, 
  reseller 
}: ResellerTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && reseller) {
      fetchTransactions();
    }
  }, [open, reseller]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reseller_transactions')
        .select(`
          *,
          from_reseller:resellers!reseller_transactions_from_reseller_id_fkey(id, name),
          to_reseller:resellers!reseller_transactions_to_reseller_id_fkey(id, name),
          customer:customers(id, name, customer_code)
        `)
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'transfer_in':
      case 'commission':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'deduction':
      case 'transfer_out':
      case 'customer_payment':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'refund':
        return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'transfer_in':
      case 'commission':
      case 'refund':
        return 'text-green-600';
      case 'deduction':
      case 'transfer_out':
      case 'customer_payment':
        return 'text-red-600';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Wallet Transactions - {reseller.name}
            <Badge variant="outline">Balance: ৳{reseller.balance.toLocaleString()}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <Badge variant="outline">
                          {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={getAmountColor(tx.type)}>
                      {tx.type === 'recharge' || tx.type === 'transfer_in' || tx.type === 'commission' || tx.type === 'refund' ? '+' : '-'}
                      ৳{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">৳{tx.balance_before.toLocaleString()}</span>
                      {' → '}
                      <span className="font-medium">৳{tx.balance_after.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tx.description && <p>{tx.description}</p>}
                        {tx.from_reseller && tx.type === 'transfer_in' && (
                          <p className="text-muted-foreground">From: {tx.from_reseller.name}</p>
                        )}
                        {tx.to_reseller && tx.type === 'transfer_out' && (
                          <p className="text-muted-foreground">To: {tx.to_reseller.name}</p>
                        )}
                        {tx.customer && (
                          <p className="text-muted-foreground">
                            Customer: {tx.customer.name} ({tx.customer.customer_code})
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
