import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { TrendingUp, TrendingDown, Plus, Loader2, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExpenseCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category_id: string | null;
  amount: number;
  date: string;
  description: string | null;
  payment_method: string | null;
}

export default function Transactions() {
  const { tenantId } = useTenantContext();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category_id: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    payment_method: 'cash',
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' as 'income' | 'expense' });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [catRes, txRes] = await Promise.all([
        supabase.from('expense_categories').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }).limit(200),
      ]);
      setCategories((catRes.data as any[]) || []);
      setTransactions((txRes.data as any[]) || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTransaction = async () => {
    if (!tenantId || !form.amount) return;
    setSaving(true);
    try {
      await supabase.from('transactions').insert({
        tenant_id: tenantId,
        type: form.type,
        category_id: form.category_id || null,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description || null,
        payment_method: form.payment_method || null,
      });
      toast.success('Transaction added');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!tenantId || !categoryForm.name) return;
    setSaving(true);
    try {
      await supabase.from('expense_categories').insert({
        tenant_id: tenantId,
        name: categoryForm.name,
        type: categoryForm.type,
      });
      toast.success('Category added');
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', type: 'expense' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      type: 'expense',
      category_id: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      payment_method: 'cash',
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    return categories.find(c => c.id === categoryId)?.name || '-';
  };

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === activeTab);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <DashboardLayout
      title="Income & Expense"
      subtitle="Track your business transactions"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">৳{totalExpense.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{netProfit.toLocaleString()}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Record income and expenses</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'income' ? 'default' : 'destructive'}>
                          {tx.type === 'income' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryName(tx.category_id)}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell className="capitalize">{tx.payment_method || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: 'income' | 'expense') => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (৳) *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.filter(c => c.type === form.type).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Transaction details" />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction} disabled={saving || !form.amount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Office Supplies" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={categoryForm.type} onValueChange={(v: 'income' | 'expense') => setCategoryForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
