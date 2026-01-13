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

  // State for tenant info
  const [tenantInfo, setTenantInfo] = useState<{ company_name: string; logo_url: string } | null>(null);

  // Fetch tenant info for print
  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('tenants')
        .select('company_name, logo_url')
        .eq('id', tenantId)
        .single();
      if (data) setTenantInfo(data);
    };
    fetchTenantInfo();
  }, [tenantId]);

  // Print Report Function - Only table data with company name and logo
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const monthName = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
    const companyName = tenantInfo?.company_name || 'ISP Company';
    const logoUrl = tenantInfo?.logo_url || '';

    const transactionRows = filteredTransactions.map(tx => `
      <tr>
        <td>${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
        <td><span class="badge ${tx.type}">${tx.type === 'income' ? 'আয়' : 'ব্যয়'}</span></td>
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
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff; color: #333; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #1f2937; }
          .header .logo { max-height: 60px; max-width: 180px; margin-bottom: 10px; object-fit: contain; }
          .header h1 { font-size: 20px; color: #1f2937; margin-bottom: 4px; font-weight: 700; }
          .header p { color: #666; font-size: 12px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; }
          .summary-item { text-align: center; flex: 1; }
          .summary-item .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-item .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
          .summary-item.income .value { color: #059669; }
          .summary-item.expense .value { color: #dc2626; }
          .summary-item.profit .value { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1f2937; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #f3f4f6; }
          .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
          .amount.income { color: #059669; }
          .amount.expense { color: #dc2626; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
          .badge.income { background: #d1fae5; color: #059669; }
          .badge.expense { background: #fee2e2; color: #dc2626; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 10px; }
          .total-row { background: #1f2937 !important; color: white; font-weight: bold; }
          .total-row td { color: white; border: none; }
          @media print { 
            body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .badge, .summary-row, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
          <h1>${companyName}</h1>
          <p>আয়-ব্যয় রিপোর্ট | ${monthName}</p>
        </div>

        <div class="summary-row">
          <div class="summary-item income">
            <div class="label">মোট আয়</div>
            <div class="value">৳${totalIncome.toLocaleString()}</div>
          </div>
          <div class="summary-item expense">
            <div class="label">মোট ব্যয়</div>
            <div class="value">৳${totalExpense.toLocaleString()}</div>
          </div>
          <div class="summary-item profit">
            <div class="label">${netProfit >= 0 ? 'লাভ' : 'ক্ষতি'}</div>
            <div class="value">${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>তারিখ</th>
              <th>ধরন</th>
              <th>ক্যাটাগরি</th>
              <th>বিবরণ</th>
              <th>পেমেন্ট</th>
              <th style="text-align: right;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">কোন লেনদেন পাওয়া যায়নি</td></tr>'}
            <tr class="total-row">
              <td colspan="5"><strong>মোট ${filteredTransactions.length}টি লেনদেন</strong></td>
              <td class="amount" style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'};">
                <strong>${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${format(new Date(), 'dd/MM/yyyy hh:mm a')} | ${companyName}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Print Summary Report Function
  const printSummaryReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const monthName = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy');
    const companyName = tenantInfo?.company_name || 'ISP Company';
    const logoUrl = tenantInfo?.logo_url || '';

    const incomeRows = Object.entries(incomeSummary).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return `<tr><td style="padding-left: 20px;">📈 ${cat?.name || 'Uncategorized'}</td><td class="amount income">+৳${amount.toLocaleString()}</td></tr>`;
    }).join('');

    const expenseRows = Object.entries(expenseSummary).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return `<tr><td style="padding-left: 20px;">📉 ${cat?.name || 'Uncategorized'}</td><td class="amount expense">-৳${amount.toLocaleString()}</td></tr>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Summary Report - ${monthName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff; color: #333; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #1f2937; }
          .header .logo { max-height: 60px; max-width: 180px; margin-bottom: 10px; object-fit: contain; }
          .header h1 { font-size: 20px; color: #1f2937; margin-bottom: 4px; font-weight: 700; }
          .header p { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1f2937; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; }
          td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
          .amount.income { color: #059669; }
          .amount.expense { color: #dc2626; }
          .section-header { background: #f3f4f6; font-weight: bold; }
          .section-header.income { background: #d1fae5; }
          .section-header.expense { background: #fee2e2; }
          .total-row { background: #1f2937 !important; color: white; font-weight: bold; }
          .total-row td { color: white; }
          .grand-total { background: #059669 !important; }
          .grand-total td { color: white; font-size: 14px; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 10px; }
          @media print { 
            body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .section-header, .total-row, .grand-total, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
          <h1>${companyName}</h1>
          <p>ক্যাটাগরি ভিত্তিক সারাংশ | ${monthName}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>ক্যাটাগরি</th>
              <th style="text-align: right;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-header income"><td colspan="2"><strong>💰 আয় ক্যাটাগরিসমূহ</strong></td></tr>
            ${incomeRows || '<tr><td colspan="2" style="text-align: center; color: #999;">এই মাসে কোন আয় নেই</td></tr>'}
            <tr class="total-row"><td>মোট আয়</td><td class="amount" style="color: #10b981;">৳${totalIncome.toLocaleString()}</td></tr>
            
            <tr class="section-header expense"><td colspan="2"><strong>💸 ব্যয় ক্যাটাগরিসমূহ</strong></td></tr>
            ${expenseRows || '<tr><td colspan="2" style="text-align: center; color: #999;">এই মাসে কোন ব্যয় নেই</td></tr>'}
            <tr class="total-row"><td>মোট ব্যয়</td><td class="amount" style="color: #ef4444;">৳${totalExpense.toLocaleString()}</td></tr>
            
            <tr class="grand-total">
              <td><strong>নিট ${netProfit >= 0 ? 'লাভ' : 'ক্ষতি'}</strong></td>
              <td class="amount"><strong>${netProfit >= 0 ? '+' : ''}৳${netProfit.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${format(new Date(), 'dd/MM/yyyy hh:mm a')} | ${companyName}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <DashboardLayout
      title="Income & Expense"
      subtitle="Track your business transactions and categories"
    >
      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Income</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate">৳{totalIncome.toLocaleString()}</p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Expense</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 truncate">৳{totalExpense.toLocaleString()}</p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50' : 'from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                <p className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {netProfit >= 0 ? '+' : ''}৳{netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                <DollarSign className={`h-5 w-5 sm:h-6 sm:w-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Categories</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{categories.length}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {incomeCategories.length} in, {expenseCategories.length} exp
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
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
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Transactions</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Record and manage income and expenses</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs sm:text-sm">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                      <span className="hidden xs:inline">Export</span>
                      <span className="xs:hidden">CSV</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="h-8 text-xs sm:text-sm">
                      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                      <span className="hidden xs:inline">Print</span>
                    </Button>
                    <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }} className="h-8 text-xs sm:text-sm">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                      <span className="hidden xs:inline">Add Transaction</span>
                      <span className="xs:hidden">Add</span>
                    </Button>
                  </div>
                </div>
                
                {/* Filters - Responsive */}
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs sm:text-sm">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMonths().map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-[120px] sm:w-[130px] h-8 text-xs sm:text-sm">
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <ScrollArea className="h-[350px] sm:h-[450px]">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="py-2 px-2 sm:px-3 whitespace-nowrap">Date</TableHead>
                        <TableHead className="py-2 px-2 sm:px-3">Type</TableHead>
                        <TableHead className="py-2 px-2 sm:px-3 hidden xs:table-cell">Category</TableHead>
                        <TableHead className="hidden md:table-cell py-2 px-3">Description</TableHead>
                        <TableHead className="hidden lg:table-cell py-2 px-3">Method</TableHead>
                        <TableHead className="text-right py-2 px-2 sm:px-3 whitespace-nowrap">Amount</TableHead>
                        <TableHead className="w-[60px] sm:w-[80px] py-2 px-1 sm:px-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No transactions found</TableCell></TableRow>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <TableRow key={tx.id} className="text-xs sm:text-sm">
                            <TableCell className="py-2 px-2 sm:px-3 whitespace-nowrap font-medium">{format(new Date(tx.date), 'dd MMM')}</TableCell>
                            <TableCell className="py-2 px-2 sm:px-3">
                              <Badge 
                                variant={tx.type === 'income' ? 'default' : 'destructive'} 
                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5"
                              >
                                {tx.type === 'income' ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                                <span className="hidden sm:inline">{tx.type}</span>
                                <span className="sm:hidden">{tx.type === 'income' ? 'In' : 'Ex'}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden xs:table-cell py-2 px-2 sm:px-3 max-w-[80px] sm:max-w-[120px] truncate">{getCategoryName(tx.category_id)}</TableCell>
                            <TableCell className="hidden md:table-cell py-2 px-3 max-w-[150px] truncate text-muted-foreground">{tx.description || '-'}</TableCell>
                            <TableCell className="hidden lg:table-cell py-2 px-3 capitalize text-muted-foreground">{tx.payment_method || '-'}</TableCell>
                            <TableCell className={`text-right py-2 px-2 sm:px-3 font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="hidden sm:inline">{tx.type === 'income' ? '+' : '-'}</span>৳{tx.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2 px-1 sm:px-2">
                              <div className="flex gap-0.5 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openEditTransaction(tx)}>
                                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive" onClick={() => setDeletingTransaction(tx)}>
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
          <div className="space-y-4 sm:space-y-6">
            {/* Month Selector - Responsive */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 sm:h-9 text-xs sm:text-sm">
                <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="hidden xs:inline">Export CSV</span>
                <span className="xs:hidden">CSV</span>
              </Button>
              <Button variant="outline" size="sm" onClick={printReport} className="h-8 sm:h-9 text-xs sm:text-sm">
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="hidden xs:inline">লেনদেন প্রিন্ট</span>
                <span className="xs:hidden">Print</span>
              </Button>
              <Button variant="outline" size="sm" onClick={printSummaryReport} className="h-8 sm:h-9 text-xs sm:text-sm bg-primary/5 hover:bg-primary/10">
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="hidden xs:inline">সারাংশ প্রিন্ট</span>
                <span className="xs:hidden">Summary</span>
              </Button>
            </div>

            {/* Summary Cards - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Income</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {monthlyTransactions.filter(t => t.type === 'income').length} transactions
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-green-500/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Expense</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-600">৳{totalExpense.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {monthlyTransactions.filter(t => t.type === 'expense').length} transactions
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 sm:h-10 sm:w-10 text-red-500/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50' : 'from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50'}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {netProfit >= 0 ? '+' : ''}৳{netProfit.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        For this month
                      </p>
                    </div>
                    <DollarSign className={`h-8 w-8 sm:h-10 sm:w-10 ${netProfit >= 0 ? 'text-blue-500/30' : 'text-orange-500/30'}`} />
                  </div>
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
