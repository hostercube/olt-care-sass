import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { 
  Wallet, Plus, History, Loader2, 
  Banknote, CheckCircle, XCircle, Clock,
  AlertCircle, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import * as resellerApi from '@/lib/reseller-api';

interface TopupRequest {
  id: string;
  reseller_id: string;
  tenant_id: string;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  processed_at: string | null;
  created_at: string;
}

const TOP_UP_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function ResellerWallet() {
  const navigate = useNavigate();
  const {
    session,
    reseller,
    loading,
    logout,
    hasPermission,
    refetch,
  } = useResellerPortal();

  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!loading && !session) {
      navigate('/reseller/login');
    }
  }, [loading, session, navigate]);

  const fetchTopupRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const result = await resellerApi.fetchTopupRequests();
      if (result.success && result.topupRequests) {
        setTopupRequests(result.topupRequests);
      }
    } catch (err) {
      console.error('Error fetching topup requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTopupRequests();
    }
  }, [session, fetchTopupRequests]);

  const getFinalAmount = () => {
    if (customAmount && parseFloat(customAmount) > 0) {
      return parseFloat(customAmount);
    }
    return topUpAmount;
  };

  const handleSubmitTopup = async () => {
    const amount = getFinalAmount();
    
    if (!amount || amount < 100) {
      toast.error('Minimum top up amount is ৳100');
      return;
    }

    if (!transactionId.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resellerApi.createTopupRequest({
        amount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to submit top up request');
        return;
      }

      toast.success('Top up request submitted successfully! Awaiting approval.');
      setShowTopupDialog(false);
      setTransactionId('');
      setNotes('');
      setCustomAmount('');
      fetchTopupRequests();
    } catch (error: any) {
      console.error('Top up request error:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = topupRequests.filter(r => r.status === 'pending').length;

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground">Manage your balance and request top-ups</p>
          </div>
          <Button onClick={() => setShowTopupDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Top Up
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-4xl font-bold text-green-600">৳{(reseller?.balance || 0).toLocaleString()}</p>
                </div>
              </div>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingCount} Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Requests</p>
                <p className="text-2xl font-bold">{topupRequests.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-600">{topupRequests.filter(r => r.status === 'approved').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{topupRequests.filter(r => r.status === 'rejected').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top-up History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Top-up Request History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : topupRequests.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No top-up requests yet</p>
                <p className="text-sm text-muted-foreground">Request a top-up to add balance to your wallet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topupRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">৳{request.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.payment_method || 'Manual'} • TxID: {request.transaction_id || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-row-reverse">
                      {getStatusBadge(request.status)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="w-full mt-2 p-2 rounded bg-red-500/10 text-sm text-red-600">
                        Reason: {request.rejection_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top-up Request Dialog */}
        <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Request Balance Top Up
              </DialogTitle>
              <DialogDescription>
                Submit a top-up request with your payment details. Your balance will be updated after approval.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Quick Amounts */}
              <div>
                <Label className="mb-2 block">Select Amount</Label>
                <div className="flex flex-wrap gap-2">
                  {TOP_UP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => { setTopUpAmount(amount); setCustomAmount(''); }}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        topUpAmount === amount && !customAmount
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      ৳{amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <Label>Or Enter Custom Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    min={100}
                    placeholder="Enter amount (min ৳100)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label>Payment Method</Label>
                <select 
                  className="w-full mt-1 p-2 rounded-lg border bg-background"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Transaction ID */}
              <div>
                <Label>Transaction ID / Reference *</Label>
                <Input
                  placeholder="Enter TxID or payment reference"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTopup} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request (৳{getFinalAmount().toLocaleString()})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResellerPortalLayout>
  );
}
