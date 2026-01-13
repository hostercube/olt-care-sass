import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  tenant_id: string;
  comment: string;
  is_internal: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface TicketCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateTicketData {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subject: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
}

export function useSupportTickets() {
  const { tenantId } = useTenantContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!tenantId) return;

    setTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          customer:customers(name, phone, email)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to handle customer relation
      const transformedData = (data || []).map(ticket => ({
        ...ticket,
        status: ticket.status as TicketStatus,
        priority: ticket.priority as TicketPriority,
      }));

      setTickets(transformedData);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      toast.error('Failed to load support tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [tenantId]);

  const fetchCategories = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([fetchTickets(), fetchCategories()]).finally(() => {
        setLoading(false);
      });
    }
  }, [tenantId, fetchTickets, fetchCategories]);

  const createTicket = async (ticketData: CreateTicketData) => {
    if (!tenantId) {
      toast.error('No tenant context');
      return null;
    }

    try {
      // Generate ticket number
      const { data: ticketNumber } = await supabase.rpc('generate_ticket_number', {
        _tenant_id: tenantId
      });

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          tenant_id: tenantId,
          ticket_number: ticketNumber,
          customer_id: ticketData.customer_id || null,
          customer_name: ticketData.customer_name || null,
          customer_phone: ticketData.customer_phone || null,
          customer_email: ticketData.customer_email || null,
          subject: ticketData.subject,
          description: ticketData.description || null,
          priority: ticketData.priority || 'medium',
          category: ticketData.category || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Ticket ${ticketNumber} created successfully`);
      await fetchTickets();
      return data;
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      toast.error(err.message || 'Failed to create ticket');
      return null;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      const updateData: any = { ...updates };
      
      // Handle status changes
      if (updates.status === 'resolved' && !updates.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }
      if (updates.status === 'closed' && !updates.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Ticket updated successfully');
      await fetchTickets();
      return true;
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      toast.error(err.message || 'Failed to update ticket');
      return false;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Ticket deleted successfully');
      await fetchTickets();
      return true;
    } catch (err: any) {
      console.error('Error deleting ticket:', err);
      toast.error(err.message || 'Failed to delete ticket');
      return false;
    }
  };

  const addComment = async (ticketId: string, comment: string, isInternal: boolean = false, createdByName?: string) => {
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          tenant_id: tenantId,
          comment,
          is_internal: isInternal,
          created_by_name: createdByName || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Comment added');
      return data;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
      return null;
    }
  };

  const getTicketComments = async (ticketId: string): Promise<TicketComment[]> => {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  };

  const createCategory = async (name: string, description?: string) => {
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from('ticket_categories')
        .insert({
          tenant_id: tenantId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Category created');
      await fetchCategories();
      return data;
    } catch (err: any) {
      console.error('Error creating category:', err);
      toast.error(err.message || 'Failed to create category');
      return null;
    }
  };

  // Stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
    high: tickets.filter(t => t.priority === 'high').length,
  };

  return {
    tickets,
    categories,
    loading,
    ticketsLoading,
    stats,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment,
    getTicketComments,
    createCategory,
    refetch: fetchTickets,
  };
}
