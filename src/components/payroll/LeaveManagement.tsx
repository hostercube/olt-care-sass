import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Edit, Check, X, Loader2, Calendar, TreePalm, Settings, Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { Staff, LeaveType, LeaveRequest, LeaveBalance } from '@/hooks/usePayrollSystem';

interface LeaveManagementProps {
  staff: Staff[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  loading: boolean;
  onSaveLeaveType: (data: Partial<LeaveType>, id?: string) => Promise<void>;
  onDeleteLeaveType?: (id: string) => Promise<void>;
  onSubmitLeave: (data: any) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
  onHandleRequest: (id: string, action: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onInitializeBalances: (staffId: string) => Promise<void>;
}

export function LeaveManagement({
  staff, leaveTypes, leaveRequests, leaveBalances, loading,
  onSaveLeaveType, onDeleteLeaveType, onSubmitLeave, onDeleteLeaveRequest, onHandleRequest, onInitializeBalances
}: LeaveManagementProps) {
  const [activeTab, setActiveTab] = useState('requests');
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<LeaveType | null>(null);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [typeForm, setTypeForm] = useState({
    name: '', short_name: '', max_days_per_year: '12', is_paid: true, color: '#3B82F6'
  });

  const [requestForm, setRequestForm] = useState({
    staff_id: '', leave_type_id: '', start_date: '', end_date: '', reason: ''
  });

  const resetTypeForm = () => {
    setTypeForm({ name: '', short_name: '', max_days_per_year: '12', is_paid: true, color: '#3B82F6' });
  };

  const handleEditType = (lt: LeaveType) => {
    setEditingType(lt);
    setTypeForm({
      name: lt.name,
      short_name: lt.short_name || '',
      max_days_per_year: lt.max_days_per_year.toString(),
      is_paid: lt.is_paid,
      color: lt.color
    });
    setShowTypeDialog(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name) return;
    setSaving(true);
    try {
      await onSaveLeaveType({
        name: typeForm.name,
        short_name: typeForm.short_name || null,
        max_days_per_year: parseInt(typeForm.max_days_per_year) || 0,
        is_paid: typeForm.is_paid,
        color: typeForm.color
      }, editingType?.id);
      setShowTypeDialog(false);
      setEditingType(null);
      resetTypeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.staff_id || !requestForm.leave_type_id || !requestForm.start_date || !requestForm.end_date) return;
    setSaving(true);
    try {
      await onSubmitLeave(requestForm);
      setShowRequestDialog(false);
      setRequestForm({ staff_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (request: LeaveRequest) => {
    await onHandleRequest(request.id, 'approved');
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await onHandleRequest(selectedRequest.id, 'rejected', rejectionReason);
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unknown';
  const getLeaveTypeName = (id: string | null) => leaveTypes.find(lt => lt.id === id)?.name || 'N/A';

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const processedRequests = leaveRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="requests" className="gap-2">
              <Calendar className="h-4 w-4" /> Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="balances" className="gap-2">
              <TreePalm className="h-4 w-4" /> Balances
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2">
              <Settings className="h-4 w-4" /> Leave Types
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowRequestDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>

        {/* Leave Requests */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Review and approve leave applications</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge variant="outline">Pending</Badge>
                    {pendingRequests.length} requests awaiting approval
                  </h4>
                  <div className="grid gap-3">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{getStaffName(req.staff_id)}</p>
                            <p className="text-sm text-muted-foreground">
                              {getLeaveTypeName(req.leave_type_id)} • {req.total_days} day(s)
                            </p>
                            <p className="text-sm">
                              {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                            </p>
                            {req.reason && <p className="text-sm text-muted-foreground mt-1">"{req.reason}"</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApprove(req)}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => {
                              setSelectedRequest(req);
                              setShowRejectDialog(true);
                            }}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processed Requests Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No processed requests
                        </TableCell>
                      </TableRow>
                    ) : processedRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{getStaffName(req.staff_id)}</TableCell>
                        <TableCell>{getLeaveTypeName(req.leave_type_id)}</TableCell>
                        <TableCell>
                          {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d')}
                        </TableCell>
                        <TableCell>{req.total_days}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(req.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Balances */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances</CardTitle>
              <CardDescription>Staff leave entitlements for {new Date().getFullYear()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      {leaveTypes.map(lt => (
                        <TableHead key={lt.id} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} />
                            {lt.short_name || lt.name}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.filter(s => s.is_active).map(s => {
                      const staffBalances = leaveBalances.filter(b => b.staff_id === s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          {leaveTypes.map(lt => {
                            const balance = staffBalances.find(b => b.leave_type_id === lt.id);
                            return (
                              <TableCell key={lt.id} className="text-center">
                                {balance ? (
                                  <span className={balance.remaining_days <= 0 ? 'text-red-600' : ''}>
                                    {balance.remaining_days}/{balance.total_days}
                                  </span>
                                ) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => onInitializeBalances(s.id)}>
                              Initialize
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Types */}
        <TabsContent value="types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leave Types</CardTitle>
                <CardDescription>Configure types of leave available</CardDescription>
              </div>
              <Button onClick={() => { resetTypeForm(); setEditingType(null); setShowTypeDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: lt.color }} />
                        <span className="font-medium">{lt.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEditType(lt)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Max: {lt.max_days_per_year} days/year</p>
                      <p>{lt.is_paid ? 'Paid Leave' : 'Unpaid Leave'}</p>
                    </div>
                  </div>
                ))}
                {leaveTypes.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    No leave types configured. Add one to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Leave Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit' : 'Add'} Leave Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={typeForm.name} onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))} placeholder="Annual Leave" />
              </div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input value={typeForm.short_name} onChange={(e) => setTypeForm(p => ({ ...p, short_name: e.target.value }))} placeholder="AL" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Days/Year</Label>
                <Input type="number" value={typeForm.max_days_per_year} onChange={(e) => setTypeForm(p => ({ ...p, max_days_per_year: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input type="color" value={typeForm.color} onChange={(e) => setTypeForm(p => ({ ...p, color: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={typeForm.is_paid} onCheckedChange={(c) => setTypeForm(p => ({ ...p, is_paid: c }))} />
              <Label>Paid Leave</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveType} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Leave Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff *</Label>
              <Select value={requestForm.staff_id} onValueChange={(v) => setRequestForm(p => ({ ...p, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select value={requestForm.leave_type_id} onValueChange={(v) => setRequestForm(p => ({ ...p, leave_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} />
                        {lt.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={requestForm.start_date} onChange={(e) => setRequestForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={requestForm.end_date} onChange={(e) => setRequestForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            {requestForm.start_date && requestForm.end_date && (
              <p className="text-sm text-muted-foreground">
                Total: {differenceInDays(new Date(requestForm.end_date), new Date(requestForm.start_date)) + 1} day(s)
              </p>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={requestForm.reason} onChange={(e) => setRequestForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional reason for leave" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to reject this leave request?</p>
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Optional reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
