import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone, Mail, MessageSquare, HelpCircle, Clock, Send,
  CheckCircle, Ticket, Plus, Filter, RefreshCw,
  User, MessageCircle, Loader2, Copy, Eye, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

interface TicketComment {
  id: string;
  comment: string;
  is_internal: boolean;
  created_by_name: string | null;
  created_at: string;
}

interface TicketCategory {
  id: string;
  name: string;
}

// Status badge component matching ISP design
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    in_progress: { label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
    waiting: { label: 'Waiting', className: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' },
    resolved: { label: 'Resolved', className: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
    closed: { label: 'Closed', className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' },
  };
  
  const { label, className } = config[status] || config.open;
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

// Priority badge component matching ISP design
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: 'Low', className: 'bg-slate-500/20 text-slate-600 dark:text-slate-400' },
    medium: { label: 'Medium', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
    high: { label: 'High', className: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
    urgent: { label: 'Urgent', className: 'bg-red-500/20 text-red-600 dark:text-red-400' },
  };
  
  const { label, className } = config[priority] || config.medium;
  return <Badge className={className}>{label}</Badge>;
}

// Pagination Component
function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
          </SelectContent>
        </Select>
        <span>entries</span>
        <span className="ml-2">|</span>
        <span className="ml-2">{startItem} - {endItem} of {totalItems}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
            let pageNum: number;
            const tp = totalPages || 1;
            if (tp <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= tp - 2) {
              pageNum = tp - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CustomerSupport() {
  const context = useOutletContext<{ customer: any; tenantBranding: any }>();
  const customer = context?.customer;
  const tenantBranding = context?.tenantBranding;
  
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Ticket details modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // New ticket dialog
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium' as const,
  });
  const [submitting, setSubmitting] = useState(false);

  // Reply form
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatTicketNumber = (n?: string) => {
    if (!n) return '';
    if (n.length <= 14) return n;
    return `${n.slice(0, 10)}…${n.slice(-4)}`;
  };

  const copyTicketNumber = async (n?: string) => {
    if (!n) return;
    try {
      await navigator.clipboard.writeText(n);
      toast.success('Ticket number copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const fetchTickets = useCallback(async () => {
    if (!customer?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_customer_support_tickets', {
        p_customer_id: customer.id,
        p_status: 'all', // Always fetch all, filter client-side
      });

      if (error) throw error;
      setTickets((data as any[]) || []);
    } catch (err: any) {
      console.error('[CustomerSupport] fetchTickets failed:', err);
      toast.error(err?.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  const fetchCategories = useCallback(async () => {
    if (!customer?.tenant_id) return;

    try {
      const { data } = await supabase
        .from('ticket_categories')
        .select('id, name')
        .eq('tenant_id', customer.tenant_id)
        .eq('is_active', true)
        .order('sort_order');

      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [customer?.tenant_id]);

  const fetchTicketComments = async (ticketId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_customer_ticket_comments', {
        p_customer_id: customer.id,
        p_ticket_id: ticketId,
      });

      if (error) throw error;
      setTicketComments((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      toast.error('Failed to load conversation');
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCategories();
  }, [fetchTickets, fetchCategories]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = 
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  // Paginated tickets
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, pageSize]);

  // Stats
  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets]);

  const handleCreateTicket = async () => {
    if (!newTicketForm.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_customer_support_ticket', {
        p_customer_id: customer.id,
        p_subject: newTicketForm.subject,
        p_description: newTicketForm.description || null,
        p_category: newTicketForm.category || null,
        p_priority: newTicketForm.priority,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const ticketNumber = row?.ticket_number || 'Ticket';

      toast.success(`${ticketNumber} created successfully!`);
      setNewTicketForm({ subject: '', description: '', category: '', priority: 'medium' });
      setShowNewTicketDialog(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      toast.error(err?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const { error } = await supabase.rpc('add_customer_ticket_comment', {
        p_customer_id: customer.id,
        p_ticket_id: selectedTicket.id,
        p_comment: replyMessage,
        p_created_by_name: customer.name,
      });

      if (error) throw error;

      toast.success('Reply sent');
      setReplyMessage('');
      fetchTicketComments(selectedTicket.id);
    } catch (err: any) {
      console.error('Error sending reply:', err);
      toast.error(err?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchTicketComments(ticket.id);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
  ].filter(Boolean).length;

  const faqs = [
    { question: 'How do I pay my bill?', answer: 'Go to Pay Bill section and select your preferred payment method.' },
    { question: 'Why is my internet slow?', answer: 'Try restarting your router. If issue persists, open a support ticket.' },
    { question: 'How do I check my usage?', answer: 'Visit the Usage & Speed section in your dashboard.' },
    { question: 'When does my subscription expire?', answer: 'Check your Dashboard or Profile section for expiry date.' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Get help and manage your support tickets</p>
        </div>
        <Button onClick={() => setShowNewTicketDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
        </TabsList>

        {/* My Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.open}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.resolved}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets Table Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Support Tickets
                  </CardTitle>
                  <CardDescription>View and manage your support requests</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTickets} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Bar */}
              <div className="space-y-3 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="icon" onClick={clearFilters}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No tickets found</p>
                  {tickets.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first support ticket to get help
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Ticket #</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTickets.map((ticket) => (
                          <TableRow key={ticket.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-1">
                                <span>{formatTicketNumber(ticket.ticket_number)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyTicketNumber(ticket.ticket_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                            <TableCell><StatusBadge status={ticket.status} /></TableCell>
                            <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTicketDetails(ticket)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages || 1}
                    pageSize={pageSize}
                    totalItems={filteredTickets.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/30 border">
                  <h4 className="font-medium mb-2">{faq.question}</h4>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Phone className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-medium mb-1">Phone</h3>
                <p className="text-sm text-muted-foreground">
                  {tenantBranding?.phone || 'Contact your ISP'}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Mail className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">
                  {tenantBranding?.email || 'Contact your ISP'}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <MessageSquare className="h-10 w-10 mx-auto text-primary mb-3" />
                <h3 className="font-medium mb-1">Support Ticket</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a ticket for detailed help
                </p>
                <Button size="sm" onClick={() => setShowNewTicketDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Ticket
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Ticket
            </DialogTitle>
            <DialogDescription>
              Describe your issue and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newTicketForm.category || 'none'}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, category: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTicketForm.priority}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, priority: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your issue in detail..."
                rows={4}
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={submitting || !newTicketForm.subject.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">{formatTicketNumber(selectedTicket.ticket_number)}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyTicketNumber(selectedTicket.ticket_number)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <StatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                  {selectedTicket.category && <Badge variant="secondary">{selectedTicket.category}</Badge>}
                </div>
                <DialogTitle className="text-left mt-2">{selectedTicket.subject}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(selectedTicket.created_at), 'dd MMM yyyy, HH:mm')}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                {/* Original Description */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your Issue:</p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description || 'No description provided'}</p>
                </div>

                {/* Resolution Notes if resolved */}
                {selectedTicket.resolution_notes && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-600">Resolution</p>
                    </div>
                    <p className="whitespace-pre-wrap">{selectedTicket.resolution_notes}</p>
                  </div>
                )}

                {/* Comments/Replies */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Conversation
                  </h4>
                  {commentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : ticketComments.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No replies yet</p>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                      {ticketComments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className={`p-3 rounded-lg ${
                            comment.created_by_name === customer.name 
                              ? 'bg-primary/10 ml-8' 
                              : 'bg-muted mr-8'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3" />
                            <span className="text-sm font-medium">{comment.created_by_name || 'Support'}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'dd MMM, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                    />
                    <Button onClick={handleSendReply} disabled={sendingReply || !replyMessage.trim()}>
                      {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
