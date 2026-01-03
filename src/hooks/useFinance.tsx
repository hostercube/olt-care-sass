import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin, useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import type { AccountHead, FinanceTransaction, CashBook, Investment, BankAccount } from '@/types/erp';

export function useFinance() {
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [cashBook, setCashBook] = useState<CashBook[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useSuperAdmin();
  const { tenantId } = useTenantContext();

  const fetchAccountHeads = useCallback(async () => {
    const query = (supabase.from as any)('account_heads').select('*').eq('is_active', true);
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('sort_order');
    if (!error) setAccountHeads((data || []) as AccountHead[]);
  }, [isSuperAdmin, tenantId]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const query = (supabase.from as any)('finance_transactions').select('*');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('transaction_date', { ascending: false }).limit(100);
    if (!error) setTransactions((data || []) as FinanceTransaction[]);
    setLoading(false);
  }, [isSuperAdmin, tenantId]);

  const fetchCashBook = useCallback(async () => {
    const query = (supabase.from as any)('cash_book').select('*');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('entry_date', { ascending: false }).limit(100);
    if (!error) setCashBook((data || []) as CashBook[]);
  }, [isSuperAdmin, tenantId]);

  const fetchInvestments = useCallback(async () => {
    const query = (supabase.from as any)('investments').select('*');
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('investment_date', { ascending: false });
    if (!error) setInvestments((data || []) as Investment[]);
  }, [isSuperAdmin, tenantId]);

  const fetchBankAccounts = useCallback(async () => {
    const query = (supabase.from as any)('bank_accounts').select('*').eq('is_active', true);
    if (!isSuperAdmin && tenantId) {
      query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('bank_name');
    if (!error) setBankAccounts((data || []) as BankAccount[]);
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchAccountHeads();
    fetchTransactions();
    fetchCashBook();
    fetchInvestments();
    fetchBankAccounts();
  }, [fetchAccountHeads, fetchTransactions, fetchCashBook, fetchInvestments, fetchBankAccounts]);

  const createAccountHead = async (data: Partial<AccountHead>) => {
    if (!tenantId) return false;
    const { error } = await (supabase.from as any)('account_heads').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed'); return false; }
    toast.success('Created'); fetchAccountHeads(); return true;
  };

  const createTransaction = async (type: 'income' | 'expense', amount: number, accountHeadId: string | null, description: string, paymentMethod: string) => {
    if (!tenantId) return false;
    const { error } = await (supabase.from as any)('finance_transactions').insert({
      tenant_id: tenantId, transaction_type: type, account_head_id: accountHeadId,
      amount, description, payment_method: paymentMethod, status: 'approved',
    });
    if (error) { toast.error('Failed'); return false; }
    toast.success('Transaction recorded'); fetchTransactions(); return true;
  };

  const createInvestment = async (data: Partial<Investment>) => {
    if (!tenantId) return false;
    const { error } = await (supabase.from as any)('investments').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed'); return false; }
    toast.success('Investment recorded'); fetchInvestments(); return true;
  };

  const createBankAccount = async (data: Partial<BankAccount>) => {
    if (!tenantId) return false;
    const { error } = await (supabase.from as any)('bank_accounts').insert({ ...data, tenant_id: tenantId });
    if (error) { toast.error('Failed'); return false; }
    toast.success('Bank account created'); fetchBankAccounts(); return true;
  };

  const getSummary = () => {
    const totalIncome = transactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  };

  return {
    accountHeads, transactions, cashBook, investments, bankAccounts, loading,
    refetchAccountHeads: fetchAccountHeads, refetchTransactions: fetchTransactions,
    createAccountHead, createTransaction, createInvestment, createBankAccount, getSummary,
  };
}
