import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Loader2, Check, X, Banknote, CreditCard, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Staff, StaffLoan } from '@/hooks/usePayrollSystem';

interface LoanManagementProps {
  staff: Staff[];
  loans: StaffLoan[];
  loading: boolean;
  onCreateLoan: (data: any) => Promise<void>;
  onApproveLoan: (id: string, approve: boolean) => Promise<void>;
  onDeleteLoan?: (id: string) => Promise<void>;
}

export function LoanManagement({ staff, loans, loading, onCreateLoan, onApproveLoan, onDeleteLoan }: LoanManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffLoan | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staff_id: '',
    loan_type: 'advance' as 'advance' | 'loan',
    amount: '',
    monthly_deduction: '',
    reason: ''
  });

  const resetForm = () => {
    setForm({ staff_id: '', loan_type: 'advance', amount: '', monthly_deduction: '', reason: '' });
  };

  const handleCreate = async () => {
    if (!form.staff_id || !form.amount) return;
    setSaving(true);
    try {
      await onCreateLoan({
        staff_id: form.staff_id,
        loan_type: form.loan_type,
        amount: parseFloat(form.amount),
        monthly_deduction: parseFloat(form.monthly_deduction) || 0,
        reason: form.reason || null
      });
      setShowDialog(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !onDeleteLoan) return;
    await onDeleteLoan(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unknown';

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const activeLoans = loans.filter(l => l.status === 'approved');
  const completedLoans = loans.filter(l => l.status === 'completed' || l.status === 'rejected');

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remaining_amount, 0);
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingLoans.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
              </div>
              <Banknote className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Disbursed</p>
                <p className="text-xl font-bold">৳{totalDisbursed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-red-600">৳{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Loans & Advances</CardTitle>
            <CardDescription>Manage staff loans and salary advances</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending {pendingLoans.length > 0 && <Badge variant="destructive" className="ml-1">{pendingLoans.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="active">Active ({activeLoans.length})</TabsTrigger>
              <TabsTrigger value="history">History ({completedLoans.length})</TabsTrigger>
            </TabsList>

            {/* Pending Requests */}
            <TabsContent value="pending">
              {pendingLoans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingLoans.map(loan => (
                    <div key={loan.id} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{getStaffName(loan.staff_id)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{loan.loan_type === 'advance' ? 'Salary Advance' : 'Loan'}</Badge>
                            <span className="text-lg font-bold">৳{loan.amount.toLocaleString()}</span>
                          </div>
                          {loan.monthly_deduction > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Monthly deduction: ৳{loan.monthly_deduction.toLocaleString()}
                            </p>
                          )}
                          {loan.reason && (
                            <p className="text-sm text-muted-foreground mt-1">"{loan.reason}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Requested on {format(new Date(loan.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => onApproveLoan(loan.id, true)}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => onApproveLoan(loan.id, false)}>
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                          {onDeleteLoan && (
                            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(loan)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Active Loans */}
            <TabsContent value="active">
              {activeLoans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active loans</p>
              ) : (
                <div className="space-y-4">
                  {activeLoans.map(loan => {
                    const paidPercent = ((loan.amount - loan.remaining_amount) / loan.amount) * 100;
                    return (
                      <div key={loan.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{getStaffName(loan.staff_id)}</p>
                            <Badge variant="outline" className="mt-1">
                              {loan.loan_type === 'advance' ? 'Salary Advance' : 'Loan'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">৳{loan.remaining_amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">remaining of ৳{loan.amount.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Progress value={paidPercent} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Paid: ৳{(loan.amount - loan.remaining_amount).toLocaleString()}</span>
                            <span>{paidPercent.toFixed(0)}% complete</span>
                          </div>
                        </div>
                        {loan.monthly_deduction > 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Monthly deduction: ৳{loan.monthly_deduction.toLocaleString()}
                            {loan.remaining_amount > 0 && ` (~${Math.ceil(loan.remaining_amount / loan.monthly_deduction)} months left)`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedLoans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No history
                        </TableCell>
                      </TableRow>
                    ) : completedLoans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{getStaffName(loan.staff_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {loan.loan_type === 'advance' ? 'Advance' : 'Loan'}
                          </Badge>
                        </TableCell>
                        <TableCell>৳{loan.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'completed' ? 'default' : 'destructive'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(loan.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {onDeleteLoan && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(loan)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Loan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Loan / Advance Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff *</Label>
              <Select value={form.staff_id} onValueChange={(v) => setForm(p => ({ ...p, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.loan_type} onValueChange={(v: any) => setForm(p => ({ ...p, loan_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">Salary Advance</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (৳) *</Label>
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} 
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Deduction (৳)</Label>
                <Input 
                  type="number" 
                  value={form.monthly_deduction} 
                  onChange={(e) => setForm(p => ({ ...p, monthly_deduction: e.target.value }))} 
                  placeholder="2000"
                />
              </div>
            </div>
            {form.amount && form.monthly_deduction && parseFloat(form.monthly_deduction) > 0 && (
              <p className="text-sm text-muted-foreground">
                Will be paid off in ~{Math.ceil(parseFloat(form.amount) / parseFloat(form.monthly_deduction))} months
              </p>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea 
                value={form.reason} 
                onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} 
                placeholder="Purpose of loan/advance..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan record for {deleteConfirm && getStaffName(deleteConfirm.staff_id)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
