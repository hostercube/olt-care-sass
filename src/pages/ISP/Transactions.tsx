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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { 
  TrendingUp, TrendingDown, Plus, Loader2, DollarSign, Receipt, Trash2, Edit,
  FileSpreadsheet, Printer, Calendar, Filter, BarChart3, PieChart, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface ExpenseCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  created_at?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category_id: string | null;
  amount: number;
  date: string;
  description: string | null;
  payment_method: string | null;
  created_at?: string;
}

export default function Transactions() {
  const { tenantId } = useTenantContext();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

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
        supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }).limit(500),
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
      const data = {
        tenant_id: tenantId,
        type: form.type,
        category_id: form.category_id && form.category_id !== 'none' ? form.category_id : null,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description || null,
        payment_method: form.payment_method || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(data)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success('Transaction updated');
      } else {
        const { error } = await supabase.from('transactions').insert(data);
        if (error) throw error;
        toast.success('Transaction added');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deletingTransaction.id);
      if (error) throw error;
      toast.success('Transaction deleted');
      setDeletingTransaction(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction');
    }
  };

  const handleSaveCategory = async () => {
    if (!tenantId || !categoryForm.name) return;
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('expense_categories')
          .update({ name: categoryForm.name, type: categoryForm.type })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase.from('expense_categories').insert({
          tenant_id: tenantId,
          name: categoryForm.name,
          type: categoryForm.type,
        });
        if (error) throw error;
        toast.success('Category added');
      }
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', type: 'expense' });
      setEditingCategory(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      // Check if category is in use
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', deletingCategory.id);
      
      if (count && count > 0) {
        toast.error(`Cannot delete: ${count} transactions use this category`);
        setDeletingCategory(null);
        return;
      }

      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', deletingCategory.id);
      if (error) throw error;
      toast.success('Category deleted');
      setDeletingCategory(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
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
    setEditingTransaction(null);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setForm({
      type: tx.type,
      category_id: tx.category_id || '',
      amount: tx.amount.toString(),
      date: tx.date,
      description: tx.description || '',
      payment_method: tx.payment_method || 'cash',
    });
    setShowDialog(true);
  };

  const openEditCategory = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, type: cat.type });
    setShowCategoryDialog(true);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    return categories.find(c => c.id === categoryId)?.name || '-';
  };

  const generateMonths = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return months;
  };

  // Filter transactions by type and month
  const filteredTransactions = transactions.filter(t => {
    const matchesType = transactionFilter === 'all' || t.type === transactionFilter;
    const matchesMonth = t.date.startsWith(selectedMonth);
    return matchesType && matchesMonth;
  });

  // Calculate totals for selected month
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Category-wise summary
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const getCategorySummary = (type: 'income' | 'expense') => {
    const typeTxs = monthlyTransactions.filter(t => t.type === type);
    const summary: Record<string, number> = {};
    typeTxs.forEach(tx => {
      const key = tx.category_id || 'uncategorized';
      summary[key] = (summary[key] || 0) + tx.amount;
    });
    return summary;
  };

  const incomeSummary = getCategorySummary('income');
  const expenseSummary = getCategorySummary('expense');

  // Export function
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Payment Method', 'Amount'];
    const rows = filteredTransactions.map(tx => [
      tx.date,
      tx.type,
      getCategoryName(tx.category_id),
      tx.description || '',
      tx.payment_method || '',
      tx.type === 'income' ? tx.amount : -tx.amount
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${selectedMonth}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };

  // Print Report Function
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const monthName = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
    
    const incomeRows = Object.entries(incomeSummary).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return `<tr class="income-row"><td>${cat?.name || 'Uncategorized'}</td><td class="amount income">+৳${amount.toLocaleString()}</td></tr>`;
    }).join('');

    const expenseRows = Object.entries(expenseSummary).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return `<tr class="expense-row"><td>${cat?.name || 'Uncategorized'}</td><td class="amount expense">-৳${amount.toLocaleString()}</td></tr>`;
    }).join('');

    const transactionRows = filteredTransactions.map(tx => `
      <tr>
        <td>${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
        <td><span class="badge ${tx.type}">${tx.type === 'income' ? 'Income' : 'Expense'}</span></td>
        <td>${getCategoryName(tx.category_id)}</td>
        <td>${tx.description || '-'}</td>
        <td>${tx.payment_method || '-'}</td>
        <td class="amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}৳${tx.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income & Expense Report - ${monthName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #fff; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
          .header h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { padding: 20px; border-radius: 12px; text-align: center; }
          .summary-card.income { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
          .summary-card.expense { background: linear-gradient(135deg, #fee2e2, #fecaca); }
          .summary-card.profit { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .summary-card .value { font-size: 28px; font-weight: bold; margin-top: 5px; }
          .summary-card.income .value { color: #059669; }
          .summary-card.expense .value { color: #dc2626; }
          .summary-card.profit .value { color: #2563eb; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 8px; }
          .section-title::before { content: ''; width: 4px; height: 20px; border-radius: 2px; }
          .section-title.income::before { background: #10b981; }
          .section-title.expense::before { background: #ef4444; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f8fafc; padding: 12px 15px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 15px; border-bottom: 1px solid #f1f5f9; }
          tr:hover { background: #f8fafc; }
          .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
          .amount.income { color: #059669; }
          .amount.expense { color: #dc2626; }
          .income-row td:first-child { padding-left: 30px; }
          .expense-row td:first-child { padding-left: 30px; }
          .total-row { background: #f1f5f9; font-weight: bold; }
          .total-row td { border-top: 2px solid #e2e8f0; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .badge.income { background: #d1fae5; color: #059669; }
          .badge.expense { background: #fee2e2; color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
          @media print { 
            body { padding: 0; } 
            .summary-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Income & Expense Report</h1>
          <p>Period: ${monthName}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card income">
            <div class="label">Total Income</div>
            <div class="value">৳${totalIncome.toLocaleString()}</div>
          </div>
          <div class="summary-card expense">
            <div class="label">Total Expense</div>
            <div class="value">৳${totalExpense.toLocaleString()}</div>
          </div>
          <div class="summary-card profit">
            <div class="label">Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</div>
            <div class="value">${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title income">Category-wise Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #f0fdf4;"><td><strong>📈 Income Categories</strong></td><td></td></tr>
              ${incomeRows || '<tr><td colspan="2" style="text-align: center; color: #999;">No income this month</td></tr>'}
              <tr style="background: #f0fdf4;" class="total-row"><td>Total Income</td><td class="amount income">৳${totalIncome.toLocaleString()}</td></tr>
              <tr style="background: #fef2f2;"><td><strong>📉 Expense Categories</strong></td><td></td></tr>
              ${expenseRows || '<tr><td colspan="2" style="text-align: center; color: #999;">No expenses this month</td></tr>'}
              <tr style="background: #fef2f2;" class="total-row"><td>Total Expense</td><td class="amount expense">৳${totalExpense.toLocaleString()}</td></tr>
              <tr class="total-row" style="background: #eff6ff;"><td><strong>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</strong></td><td class="amount" style="color: ${netProfit >= 0 ? '#059669' : '#dc2626'};">${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3 class="section-title">All Transactions (${filteredTransactions.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Method</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows || '<tr><td colspan="6" style="text-align: center; color: #999;">No transactions found</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <DashboardLayout
      title="Income & Expense"
      subtitle="Track your business transactions and categories"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">৳{totalExpense.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                <p className={`text-xl sm:text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{netProfit.toLocaleString()}
                </p>
              </div>
              <DollarSign className={`h-6 w-6 sm:h-8 sm:w-8 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl sm:text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">
                  {incomeCategories.length} income, {expenseCategories.length} expense
                </p>
              </div>
              <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="transactions" className="flex-1 sm:flex-none">
              <Wallet className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 sm:flex-none">
              <Receipt className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 sm:flex-none">
              <BarChart3 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Record and manage income and expenses</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </div>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMonths().map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expense">Expense Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] sm:h-[500px]">
                <div className="rounded-md border min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        <TableHead className="hidden md:table-cell">Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found for this period</TableCell></TableRow>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="whitespace-nowrap">{format(new Date(tx.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={tx.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                                {tx.type === 'income' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">{getCategoryName(tx.category_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell max-w-[150px] truncate">{tx.description || '-'}</TableCell>
                            <TableCell className="hidden md:table-cell capitalize">{tx.payment_method || '-'}</TableCell>
                            <TableCell className={`text-right font-medium whitespace-nowrap ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTransaction(tx)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingTransaction(tx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Categories */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Income Categories
                  </CardTitle>
                  <CardDescription>{incomeCategories.length} categories</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => { 
                  setEditingCategory(null);
                  setCategoryForm({ name: '', type: 'income' }); 
                  setShowCategoryDialog(true); 
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {incomeCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No income categories yet</p>
                    <p className="text-xs">Add categories to organize your income</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomeCategories.map(cat => {
                      const catTotal = incomeSummary[cat.id] || 0;
                      return (
                        <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-xs text-green-600">৳{catTotal.toLocaleString()} this month</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCategory(cat)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Expense Categories
                  </CardTitle>
                  <CardDescription>{expenseCategories.length} categories</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => { 
                  setEditingCategory(null);
                  setCategoryForm({ name: '', type: 'expense' }); 
                  setShowCategoryDialog(true); 
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {expenseCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No expense categories yet</p>
                    <p className="text-xs">Add categories to organize your expenses</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenseCategories.map(cat => {
                      const catTotal = expenseSummary[cat.id] || 0;
                      return (
                        <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-xs text-red-600">৳{catTotal.toLocaleString()} this month</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCategory(cat)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Summary/Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Month Selector */}
            <div className="flex items-center gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={printReport}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyTransactions.filter(t => t.type === 'income').length} transactions
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Expense</p>
                  <p className="text-2xl font-bold text-red-600">৳{totalExpense.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyTransactions.filter(t => t.type === 'expense').length} transactions
                  </p>
                </CardContent>
              </Card>
              <Card className={`${netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'}`}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netProfit >= 0 ? '+' : ''}৳{netProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {netProfit >= 0 ? 'Profit' : 'Loss'} for this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category-wise Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Income by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(incomeSummary).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No income this month</p>
                    ) : (
                      Object.entries(incomeSummary).map(([catId, amount]) => {
                        const cat = categories.find(c => c.id === catId);
                        const percentage = totalIncome > 0 ? (amount / totalIncome * 100).toFixed(1) : 0;
                        return (
                          <div key={catId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span>{cat?.name || 'Uncategorized'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-green-600">৳{amount.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground ml-2">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Expense by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(expenseSummary).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No expenses this month</p>
                    ) : (
                      Object.entries(expenseSummary).map(([catId, amount]) => {
                        const cat = categories.find(c => c.id === catId);
                        const percentage = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
                        return (
                          <div key={catId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span>{cat?.name || 'Uncategorized'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-red-600">৳{amount.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground ml-2">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: 'income' | 'expense') => setForm(p => ({ ...p, type: v, category_id: '' }))}>
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
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction} disabled={saving || !form.amount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
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
            <Button variant="outline" onClick={() => { setShowCategoryDialog(false); setEditingCategory(null); }}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
              Categories with transactions cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
