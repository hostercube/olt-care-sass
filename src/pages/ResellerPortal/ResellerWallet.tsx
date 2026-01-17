import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Wallet, Plus, History, Loader2, 
  Banknote, CheckCircle, XCircle, Clock,
  AlertCircle, Send, CreditCard, Smartphone, Filter, Search, RefreshCcw
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
  processed_by: string | null;
  processed_by_name?: string | null;
  created_at: string;
}

interface PaymentGateway {
  id: string;
  gateway: string;
  display_name: string;
  is_enabled: boolean;
  instructions: string | null;
}

const TOP_UP_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function ResellerWallet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  
  // Form state
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('manual');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<'online' | 'manual'>('online');

  // Filters for history
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Handle payment status from URL
  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    
    if (status === 'success' && paymentId) {
      toast.success('Payment successful! Your balance has been updated.');
      refetch?.();
      // Clear the URL params
      navigate('/reseller/wallet', { replace: true });
    } else if (status === 'failed') {
      toast.error('Payment failed. Please try again.');
      navigate('/reseller/wallet', { replace: true });
    }
  }, [searchParams, navigate, refetch]);

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

  const fetchPaymentGateways = useCallback(async () => {
    try {
      setLoadingGateways(true);
      const result = await resellerApi.fetchPaymentGateways();
      if (result.success && result.gateways) {
        setPaymentGateways(result.gateways);
        
        // Categorize gateways
        const autoGateways = result.gateways.filter((g: PaymentGateway) => 
          g.is_enabled && 
          g.gateway !== 'manual' && 
          g.gateway !== 'rocket' &&
          g.gateway !== 'bank_transfer' &&
          g.gateway !== 'cash'
        );
        const hasManual = result.gateways.some((g: PaymentGateway) => 
          g.gateway === 'manual' && g.is_enabled
        );
        
        // Set default mode based on what's available
        if (autoGateways.length > 0) {
          setPaymentMethod(autoGateways[0].gateway);
          setPaymentMode('online');
        } else if (hasManual) {
          setPaymentMode('manual');
          setPaymentMethod('manual');
        }
      }
    } catch (err) {
      console.error('Error fetching payment gateways:', err);
    } finally {
      setLoadingGateways(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTopupRequests();
      fetchPaymentGateways();
    }
  }, [session, fetchTopupRequests, fetchPaymentGateways]);

  // Filter topup requests
  const filteredRequests = useMemo(() => {
    let result = [...topupRequests];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.transaction_id?.toLowerCase().includes(query) ||
        r.payment_method?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Gateway filter
    if (gatewayFilter !== 'all') {
      result = result.filter(r => 
        r.payment_method?.toLowerCase() === gatewayFilter.toLowerCase()
      );
    }

    return result;
  }, [topupRequests, searchQuery, statusFilter, gatewayFilter]);

  // Paginated requests
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, gatewayFilter]);

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

    setIsSubmitting(true);

    try {
      if (paymentMode === 'online') {
        // Initiate online payment
        const baseUrl = window.location.origin;
        const result = await resellerApi.initiateTopupPayment({
          amount,
          gateway: paymentMethod,
          return_url: `${baseUrl}/reseller/wallet`,
          cancel_url: `${baseUrl}/reseller/wallet`,
        });

        if (!result.success) {
          toast.error(result.error || 'Failed to initiate payment');
          return;
        }

        // Redirect to payment gateway
        if (result.checkout_url) {
          toast.success('Redirecting to payment gateway...');
          window.location.href = result.checkout_url;
        } else {
          toast.error('No checkout URL received');
        }
      } else {
        // Manual payment with TxID
        if (!transactionId.trim()) {
          toast.error('Please enter a transaction ID');
          return;
        }

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
      }
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
        return <Badge variant="outline" className="text-amber-600 border-amber-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getGatewayIcon = (gateway: string) => {
    switch (gateway) {
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getGatewayLabel = (gateway: string | null) => {
    if (!gateway) return 'Manual';
    const labels: Record<string, string> = {
      bkash: 'bKash',
      nagad: 'Nagad',
      rocket: 'Rocket',
      sslcommerz: 'SSLCommerz',
      manual: 'Manual',
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
    };
    return labels[gateway.toLowerCase()] || gateway;
  };

  // Categorize gateways: online (auto) vs manual
  const onlineGateways = useMemo(() => {
    return paymentGateways.filter(g => 
      g.is_enabled && 
      g.gateway !== 'manual' && 
      g.gateway !== 'rocket' &&
      g.gateway !== 'bank_transfer' &&
      g.gateway !== 'cash'
    );
  }, [paymentGateways]);

  // Check if manual payment gateway is enabled by tenant
  const manualGatewayEnabled = useMemo(() => {
    return paymentGateways.some(g => g.gateway === 'manual' && g.is_enabled);
  }, [paymentGateways]);

  const hasOnlineGateways = onlineGateways.length > 0;

  // Get available manual payment methods - ONLY truly manual gateways (not API-based like bKash/Nagad/SSLCommerz)
  const manualPaymentMethods = useMemo(() => {
    // Only the "manual" gateway from tenant - this is the one where tenant puts account numbers/instructions
    const manualGateway = paymentGateways.find(g => g.gateway === 'manual' && g.is_enabled);
    
    if (manualGateway) {
      // Return just the manual gateway - tenant's configured manual payment option
      return [{ value: 'manual', label: manualGateway.display_name || 'Manual Payment' }];
    }
    
    return [];
  }, [paymentGateways]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = topupRequests.filter(r => r.status === 'pending').length;
  const approvedCount = topupRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = topupRequests.filter(r => r.status === 'rejected').length;

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground">Manage your balance and request top-ups</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { fetchTopupRequests(); refetch?.(); }}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowTopupDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Top Up Balance
            </Button>
          </div>
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
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top-up History with Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Top-up Request History ({filteredRequests.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by TxID, amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                <SelectTrigger>
                  <CreditCard className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Gateways" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Request List */}
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {topupRequests.length === 0 
                    ? 'No top-up requests yet' 
                    : 'No matching requests found'}
                </p>
                {topupRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground">Request a top-up to add balance to your wallet</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Banknote className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">৳{request.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {getGatewayLabel(request.payment_method)} • TxID: {request.transaction_id || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:flex-row-reverse">
                          {getStatusBadge(request.status)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'dd MMM yyyy, hh:mm a')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Show processed info for approved/rejected */}
                      {request.status !== 'pending' && request.processed_at && (
                        <div className={`text-xs px-3 py-2 rounded ${
                          request.status === 'approved' 
                            ? 'bg-green-500/10 text-green-600' 
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                          <span className="font-medium">
                            {request.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                          {request.processed_by_name && (
                            <span> by {request.processed_by_name}</span>
                          )}
                          <span> on {format(new Date(request.processed_at), 'dd MMM yyyy, hh:mm a')}</span>
                          {request.status === 'rejected' && request.rejection_reason && (
                            <span className="block mt-1">Reason: {request.rejection_reason}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <TablePagination
                  totalItems={filteredRequests.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Top-up Request Dialog */}
        <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Top Up Balance
              </DialogTitle>
              <DialogDescription>
                Add balance to your wallet using online payment or manual transfer.
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

              {/* Payment Mode Selection - Only show enabled modes */}
              {!hasOnlineGateways && !manualGatewayEnabled ? (
                <div className="text-center py-4 border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No payment methods enabled</p>
                  <p className="text-sm text-muted-foreground">Please contact your ISP admin</p>
                </div>
              ) : (
              <Tabs value={paymentMode} onValueChange={(v) => {
                setPaymentMode(v as 'online' | 'manual');
                // Set payment method based on mode
                if (v === 'manual') {
                  setPaymentMethod('manual');
                } else if (onlineGateways.length > 0) {
                  setPaymentMethod(onlineGateways[0].gateway);
                }
              }}>
                <TabsList className={`grid w-full ${hasOnlineGateways && manualGatewayEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {hasOnlineGateways && (
                    <TabsTrigger value="online">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Online
                    </TabsTrigger>
                  )}
                  {manualGatewayEnabled && (
                    <TabsTrigger value="manual">
                      <Banknote className="h-4 w-4 mr-2" />
                      Manual Payment
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="online" className="space-y-4 mt-4">
                  {loadingGateways ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : onlineGateways.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No online payment gateways available. Please use manual payment.
                    </div>
                  ) : (
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="grid gap-2">
                        {onlineGateways.map((gateway) => (
                          <Label
                            key={gateway.id}
                            htmlFor={gateway.gateway}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              paymentMethod === gateway.gateway
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <RadioGroupItem value={gateway.gateway} id={gateway.gateway} />
                            {getGatewayIcon(gateway.gateway)}
                            <span className="font-medium">{gateway.display_name}</span>
                          </Label>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  {/* Gateway Instructions - Show payment instructions from tenant */}
                  {(() => {
                    const manualGateway = paymentGateways.find(g => g.gateway === 'manual' && g.is_enabled);
                    if (manualGateway?.instructions) {
                      return (
                        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="space-y-2">
                              <p className="font-semibold text-primary">Payment Instructions</p>
                              <div className="text-sm text-foreground whitespace-pre-wrap">
                                {manualGateway.instructions}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-4 rounded-lg border bg-muted/50 text-center">
                        <p className="text-muted-foreground">
                          Please contact your ISP admin for payment instructions
                        </p>
                      </div>
                    );
                  })()}

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
                </TabsContent>
              </Tabs>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitTopup} 
                disabled={isSubmitting || (paymentMode === 'online' && !hasOnlineGateways)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : paymentMode === 'online' ? (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ৳{getFinalAmount().toLocaleString()}
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
