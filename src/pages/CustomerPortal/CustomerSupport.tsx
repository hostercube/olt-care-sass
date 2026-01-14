import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, Mail, MessageSquare, HelpCircle, Clock, Globe, Send, FileQuestion, 
  CheckCircle, Ticket, Plus, Filter, ChevronRight, RefreshCw,
  User, MessageCircle, Loader2
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

export default function CustomerSupport() {
  const context = useOutletContext<{ customer: any; tenantBranding: any }>();
  const customer = context?.customer;
  const tenantBranding = context?.tenantBranding;
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // New ticket form
  const [showNewTicket, setShowNewTicket] = useState(false);
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTickets = useCallback(async () => {
    if (!customer?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_customer_support_tickets', {
        p_customer_id: customer.id,
        p_status: statusFilter,
      });

      if (error) throw error;
      setTickets((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, statusFilter]);

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
      setShowNewTicket(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'waiting': return 'bg-orange-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredTickets = tickets;
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const faqs = [
    { question: 'How do I pay my bill?', answer: 'Go to Pay Bill section and select your preferred payment method.' },
    { question: 'Why is my internet slow?', answer: 'Try restarting your router. If issue persists, open a support ticket.' },
    { question: 'How do I check my usage?', answer: 'Visit the Usage & Speed section in your dashboard.' },
    { question: 'When does my subscription expire?', answer: 'Check your Dashboard or Profile section for expiry date.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Get help and manage your support tickets</p>
        </div>
        <Button onClick={() => setShowNewTicket(true)} className="gap-2">
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
          {/* New Ticket Form */}
          {showNewTicket && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" />
                  Create New Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      placeholder="Brief description of your issue"
                      value={newTicketForm.subject}
                      onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTicketForm.category}
                      onValueChange={(v) => setNewTicketForm({ ...newTicketForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    value={newTicketForm.description}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTicket} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit Ticket
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
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
            </div>
            <Button variant="ghost" size="icon" onClick={fetchTickets}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Ticket List or Detail View */}
          {selectedTicket ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="mb-2">
                      ← Back to tickets
                    </Button>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</Badge>
                      {selectedTicket.ticket_number}
                    </CardTitle>
                    <p className="text-lg font-medium mt-1">{selectedTicket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(selectedTicket.created_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(selectedTicket.priority) as any}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Original Description */}
                <div className="p-4 border-b bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your Issue:</p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description || 'No description provided'}</p>
                </div>

                {/* Resolution Notes if resolved */}
                {selectedTicket.resolution_notes && (
                  <div className="p-4 border-b bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-600">Resolution</p>
                    </div>
                    <p className="whitespace-pre-wrap">{selectedTicket.resolution_notes}</p>
                  </div>
                )}

                {/* Comments/Replies */}
                <div className="p-4 border-b">
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
                    <div className="space-y-4">
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
                  <div className="p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={handleSendReply} disabled={sendingReply || !replyMessage.trim()}>
                        {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paginatedTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Tickets Found</h3>
                    <p className="text-muted-foreground mb-4">You haven't created any support tickets yet</p>
                    <Button onClick={() => setShowNewTicket(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {paginatedTickets.map((ticket) => (
                    <Card 
                      key={ticket.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchTicketComments(ticket.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`h-3 w-3 rounded-full ${getStatusColor(ticket.status)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                                <Badge variant={getPriorityColor(ticket.priority) as any} className="text-[10px]">
                                  {ticket.priority}
                                </Badge>
                                {ticket.category && (
                                  <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>
                                )}
                              </div>
                              <p className="font-medium truncate">{ticket.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
                <div key={index} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <FileQuestion className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">{faq.question}</p>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-1">Call Support</h3>
                <p className="text-muted-foreground text-sm mb-3">Talk to our team</p>
                <Badge variant="secondary">24/7 Available</Badge>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-1">Live Chat</h3>
                <p className="text-muted-foreground text-sm mb-3">Chat with us now</p>
                <Badge variant="default">Online</Badge>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-1">Email Us</h3>
                <p className="text-muted-foreground text-sm mb-3">Get a response</p>
                <Badge variant="secondary">Within 24hrs</Badge>
              </CardContent>
            </Card>
          </div>

          {/* ISP Contact Info */}
          {tenantBranding && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your ISP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  {tenantBranding.logo_url ? (
                    <img src={tenantBranding.logo_url} alt="ISP Logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{tenantBranding.company_name || 'ISP Provider'}</p>
                    <p className="text-muted-foreground">{tenantBranding.subtitle || 'Internet Service Provider'}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Support: 24/7</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Status: All Systems Operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
