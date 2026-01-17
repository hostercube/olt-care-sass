import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Wallet, CheckCircle, XCircle, Clock, Loader2, Search, RefreshCw,
  Users, Banknote, AlertCircle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  reseller?: {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
  };
}

export default function ResellerTopupRequests() {
  const { user, tenantId } = useAuth();
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reseller_topup_requests')
        .select(`
          *,
          reseller:resellers(id, name, phone, balance)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests((data as TopupRequest[]) || []);
    } catch (err) {
      console.error('Error fetching topup requests:', err);
      toast.error('Failed to load top-up requests');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      // Get current reseller balance
      const { data: reseller, error: resellerError } = await supabase
        .from('resellers')
        .select('balance')
        .eq('id', selectedRequest.reseller_id)
        .single();
      
      if (resellerError) throw resellerError;
      
      const oldBalance = reseller?.balance || 0;
      const newBalance = oldBalance + selectedRequest.amount;
      
      // Update reseller balance
      const { error: updateError } = await supabase
        .from('resellers')
        .update({ balance: newBalance })
        .eq('id', selectedRequest.reseller_id);
      
      if (updateError) throw updateError;
      
      // Create transaction record
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();
      
      await supabase.from('reseller_transactions').insert({
        tenant_id: userData?.tenant_id,
        reseller_id: selectedRequest.reseller_id,
        type: 'topup',
        amount: selectedRequest.amount,
        balance_before: oldBalance,
        balance_after: newBalance,
        description: `Manual wallet top-up approved - TxID: ${selectedRequest.transaction_id || 'N/A'}`,
      });
      
      // Update request status
      const { error: statusError } = await supabase
        .from('reseller_topup_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      
      if (statusError) throw statusError;
      
      toast.success(`৳${selectedRequest.amount.toLocaleString()} added to ${selectedRequest.reseller?.name}'s wallet`);
      setShowApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('reseller_topup_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      
      if (error) throw error;
      
      toast.success('Request rejected');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessing(false);
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

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.reseller?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.payment_method?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || r.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalApprovedAmount = requests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reseller Top-up Requests</h1>
            <p className="text-muted-foreground">Manage reseller balance top-up requests</p>
          </div>
          <Button variant="outline" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-bold">৳{totalApprovedAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Top-up Requests
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reseller, TxID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No requests found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reseller</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>TxID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{request.reseller?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{request.reseller?.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">৳{request.amount.toLocaleString()}</TableCell>
                            <TableCell className="capitalize">{request.payment_method || 'N/A'}</TableCell>
                            <TableCell className="font-mono text-sm">{request.transaction_id || 'N/A'}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(request.created_at), 'dd MMM yyyy, hh:mm a')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {request.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setShowApproveDialog(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setShowRejectDialog(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Reseller</Label>
                    <p className="font-medium">{selectedRequest.reseller?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Balance</Label>
                    <p className="font-medium">৳{(selectedRequest.reseller?.balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-lg">৳{selectedRequest.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <p className="capitalize">{selectedRequest.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono">{selectedRequest.transaction_id || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Requested At</Label>
                    <p>{format(new Date(selectedRequest.created_at), 'dd MMM yyyy, hh:mm:ss a')}</p>
                  </div>
                  {selectedRequest.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Notes</Label>
                      <p>{selectedRequest.notes}</p>
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Rejection Reason</Label>
                      <p className="text-red-600">{selectedRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Top-up Request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add ৳{selectedRequest?.amount.toLocaleString()} to {selectedRequest?.reseller?.name}'s wallet.
                <br /><br />
                <strong>Current Balance:</strong> ৳{(selectedRequest?.reseller?.balance || 0).toLocaleString()}
                <br />
                <strong>New Balance:</strong> ৳{((selectedRequest?.reseller?.balance || 0) + (selectedRequest?.amount || 0)).toLocaleString()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Top-up Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request from {selectedRequest?.reseller?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}