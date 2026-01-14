import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Phone, Mail, MapPin, Calendar, Clock, User, Package, FileText,
  MoreVertical, Eye, Check, X, UserPlus, Loader2, Search,
  Filter, Download, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  MessageSquare, CreditCard, Gift
} from 'lucide-react';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ElementType }> = {
  pending: { variant: 'outline', label: 'অপেক্ষমাণ', icon: Clock },
  approved: { variant: 'default', label: 'অনুমোদিত', icon: CheckCircle2 },
  rejected: { variant: 'destructive', label: 'বাতিল', icon: XCircle },
  completed: { variant: 'secondary', label: 'সম্পন্ন', icon: Check },
};

export default function ConnectionRequests() {
  const { requests, loading, refetch, approveRequest, rejectRequest, completeRequest, updateRequest } = useConnectionRequests();
  const { tenantId } = useTenantContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone?.includes(searchQuery) ||
      req.request_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate
  const paginatedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    const success = await approveRequest(selectedRequest.id);
    if (success) {
      setApproveDialogOpen(false);
      setSelectedRequest(null);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('বাতিলের কারণ লিখুন');
      return;
    }
    setProcessing(true);
    const success = await rejectRequest(selectedRequest.id, rejectReason);
    if (success) {
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRequest(null);
    }
    setProcessing(false);
  };

  const handleCreateCustomer = async () => {
    if (!selectedRequest || !tenantId) return;
    setProcessing(true);
    
    try {
      // Generate customer code
      const { data: countData } = await supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId);
      
      const customerCode = `C${String((countData?.length || 0) + 1).padStart(6, '0')}`;
      
      // Create customer
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          customer_code: customerCode,
          name: selectedRequest.customer_name,
          phone: selectedRequest.phone,
          email: selectedRequest.email,
          address: selectedRequest.address,
          nid_number: selectedRequest.nid_number,
          area_id: selectedRequest.area_id,
          package_id: selectedRequest.package_id,
          connection_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Complete the request
      await completeRequest(selectedRequest.id, customer.id);
      
      toast.success('গ্রাহক সফলভাবে তৈরি হয়েছে');
      setCreateCustomerDialogOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error creating customer:', err);
      toast.error('গ্রাহক তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <DashboardLayout title="সংযোগ অনুরোধ" subtitle="ল্যান্ডিং পেজ থেকে আসা নতুন সংযোগ আবেদন">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">সংযোগ অনুরোধ</h1>
            <p className="text-muted-foreground">ল্যান্ডিং পেজ থেকে আসা নতুন সংযোগ আবেদন</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            রিফ্রেশ
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">মোট আবেদন</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">অপেক্ষমাণ</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">অনুমোদিত</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">সম্পন্ন</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">বাতিল</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="নাম, ফোন, রেফারেন্স নম্বর দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="স্ট্যাটাস" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                  <SelectItem value="pending">অপেক্ষমাণ</SelectItem>
                  <SelectItem value="approved">অনুমোদিত</SelectItem>
                  <SelectItem value="completed">সম্পন্ন</SelectItem>
                  <SelectItem value="rejected">বাতিল</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">কোন আবেদন পাওয়া যায়নি</h3>
                <p className="text-muted-foreground text-sm">
                  ল্যান্ডিং পেজ থেকে নতুন সংযোগ আবেদন আসলে এখানে দেখা যাবে
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>রেফারেন্স</TableHead>
                      <TableHead>নাম</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>প্যাকেজ</TableHead>
                      <TableHead>এলাকা</TableHead>
                      <TableHead>রেফারেল কোড</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead className="w-[100px]">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.request_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.customer_name}</div>
                            {request.email && (
                              <div className="text-xs text-muted-foreground">{request.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{request.phone}</TableCell>
                        <TableCell>
                          {(request as any).isp_packages?.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(request as any).areas?.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(request as any).referral_code ? (
                            <Badge variant="outline" className="font-mono text-xs bg-purple-500/10 text-purple-600">
                              <Gift className="h-3 w-3 mr-1" />
                              {(request as any).referral_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(request.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedRequest(request);
                                setDetailsOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                বিস্তারিত দেখুন
                              </DropdownMenuItem>
                              {request.status === 'pending' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedRequest(request);
                                    setApproveDialogOpen(true);
                                  }} className="text-green-600">
                                    <Check className="h-4 w-4 mr-2" />
                                    অনুমোদন করুন
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectDialogOpen(true);
                                  }} className="text-red-600">
                                    <X className="h-4 w-4 mr-2" />
                                    বাতিল করুন
                                  </DropdownMenuItem>
                                </>
                              )}
                              {request.status === 'approved' && !request.customer_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedRequest(request);
                                    setCreateCustomerDialogOpen(true);
                                  }} className="text-blue-600">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    গ্রাহক তৈরি করুন
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <TablePagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalItems={filteredRequests.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>আবেদনের বিস্তারিত</SheetTitle>
            <SheetDescription>
              রেফারেন্স: {selectedRequest?.request_number}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">স্ট্যাটাস</span>
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">নাম</div>
                    <div className="font-medium">{selectedRequest.customer_name}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">ফোন</div>
                    <div className="font-medium">{selectedRequest.phone}</div>
                  </div>
                </div>
                
                {selectedRequest.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">ইমেইল</div>
                      <div className="font-medium">{selectedRequest.email}</div>
                    </div>
                  </div>
                )}
                
                {selectedRequest.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">ঠিকানা</div>
                      <div className="font-medium">{selectedRequest.address}</div>
                    </div>
                  </div>
                )}
                
                {selectedRequest.nid_number && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">NID নম্বর</div>
                      <div className="font-medium">{selectedRequest.nid_number}</div>
                    </div>
                  </div>
                )}
                
                {selectedRequest.isp_packages && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">প্যাকেজ</div>
                      <div className="font-medium">{selectedRequest.isp_packages.name}</div>
                    </div>
                  </div>
                )}
                
                {selectedRequest.areas && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">এলাকা</div>
                      <div className="font-medium">{selectedRequest.areas.name}</div>
                    </div>
                  </div>
                )}
                
                {selectedRequest.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">মন্তব্য/বার্তা</div>
                      <div className="font-medium">{selectedRequest.notes}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">আবেদনের তারিখ</div>
                    <div className="font-medium">
                      {format(new Date(selectedRequest.created_at), 'dd MMMM yyyy, hh:mm a')}
                    </div>
                  </div>
                </div>
                
                {selectedRequest.rejection_reason && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-sm font-medium text-red-600 mb-1">বাতিলের কারণ:</div>
                    <div className="text-sm">{selectedRequest.rejection_reason}</div>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setDetailsOpen(false);
                      setApproveDialogOpen(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    অনুমোদন
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setDetailsOpen(false);
                      setRejectDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    বাতিল
                  </Button>
                </div>
              )}
              
              {selectedRequest.status === 'approved' && !selectedRequest.customer_id && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setDetailsOpen(false);
                      setCreateCustomerDialogOpen(true);
                    }}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    গ্রাহক অ্যাকাউন্ট তৈরি করুন
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>আবেদন অনুমোদন করুন</DialogTitle>
            <DialogDescription>
              এই সংযোগ আবেদন অনুমোদন করতে চান?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="font-medium">{selectedRequest?.customer_name}</div>
              <div className="text-sm text-muted-foreground">{selectedRequest?.phone}</div>
              {selectedRequest?.isp_packages && (
                <div className="text-sm text-muted-foreground mt-1">
                  প্যাকেজ: {selectedRequest.isp_packages.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={processing}>
              বাতিল
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              অনুমোদন করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>আবেদন বাতিল করুন</DialogTitle>
            <DialogDescription>
              বাতিলের কারণ লিখুন
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted mb-4">
              <div className="font-medium">{selectedRequest?.customer_name}</div>
              <div className="text-sm text-muted-foreground">{selectedRequest?.phone}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">বাতিলের কারণ *</Label>
              <Textarea
                id="reason"
                placeholder="কেন এই আবেদন বাতিল হচ্ছে..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason('');
            }} disabled={processing}>
              বাতিল
            </Button>
            <Button onClick={handleReject} disabled={processing} variant="destructive">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              বাতিল করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createCustomerDialogOpen} onOpenChange={setCreateCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>গ্রাহক অ্যাকাউন্ট তৈরি করুন</DialogTitle>
            <DialogDescription>
              এই আবেদনের তথ্য দিয়ে একটি নতুন গ্রাহক অ্যাকাউন্ট তৈরি হবে
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">নাম</span>
                <span className="font-medium">{selectedRequest?.customer_name}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">ফোন</span>
                <span className="font-medium">{selectedRequest?.phone}</span>
              </div>
              {selectedRequest?.email && (
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">ইমেইল</span>
                  <span className="font-medium">{selectedRequest?.email}</span>
                </div>
              )}
              {selectedRequest?.isp_packages && (
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">প্যাকেজ</span>
                  <span className="font-medium">{selectedRequest?.isp_packages.name}</span>
                </div>
              )}
              {selectedRequest?.areas && (
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">এলাকা</span>
                  <span className="font-medium">{selectedRequest?.areas.name}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCustomerDialogOpen(false)} disabled={processing}>
              বাতিল
            </Button>
            <Button onClick={handleCreateCustomer} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              গ্রাহক তৈরি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
