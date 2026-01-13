import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ModuleAccessGuard } from '@/components/layout/ModuleAccessGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  Plus, 
  Search, 
  Loader2, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useSupportTickets, SupportTicket, TicketStatus, TicketPriority, CreateTicketData } from '@/hooks/useSupportTickets';
import { useCustomers } from '@/hooks/useCustomers';
import { format } from 'date-fns';

// Status badge component
function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    open: { label: 'Open', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    waiting: { label: 'Waiting', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    resolved: { label: 'Resolved', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    closed: { label: 'Closed', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };
  
  const { label, className } = config[status] || config.open;
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

// Priority badge component
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = {
    low: { label: 'Low', className: 'bg-slate-500/20 text-slate-400' },
    medium: { label: 'Medium', className: 'bg-blue-500/20 text-blue-400' },
    high: { label: 'High', className: 'bg-orange-500/20 text-orange-400' },
    urgent: { label: 'Urgent', className: 'bg-red-500/20 text-red-400' },
  };
  
  const { label, className } = config[priority] || config.medium;
  return <Badge className={className}>{label}</Badge>;
}

// Create Ticket Dialog
function CreateTicketDialog({ 
  onTicketCreated 
}: { 
  onTicketCreated: () => void;
}) {
  const { createTicket, categories } = useSupportTickets();
  const { customers } = useCustomers();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTicketData>({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      return;
    }

    setLoading(true);
    
    // Get customer details if selected
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    const ticketData: CreateTicketData = {
      ...formData,
      customer_id: selectedCustomerId || undefined,
      customer_name: selectedCustomer?.name,
      customer_phone: selectedCustomer?.phone || undefined,
      customer_email: selectedCustomer?.email || undefined,
    };

    const result = await createTicket(ticketData);
    setLoading(false);

    if (result) {
      setFormData({ subject: '', description: '', priority: 'medium', category: '' });
      setSelectedCustomerId('');
      setOpen(false);
      onTicketCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Create a new support ticket for a customer issue
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No customer</SelectItem>
                {customers.slice(0, 50).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.customer_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of the issue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v as TicketPriority })}
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
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category || ''} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="connection">Connection Issue</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="speed">Speed Issue</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.subject.trim()}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Ticket Details Dialog
function TicketDetailsDialog({ 
  ticket, 
  onClose,
  onUpdate
}: { 
  ticket: SupportTicket;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { updateTicket, addComment, getTicketComments } = useSupportTickets();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [updating, setUpdating] = useState(false);

  useState(() => {
    loadComments();
  });

  const loadComments = async () => {
    setLoadingComments(true);
    const data = await getTicketComments(ticket.id);
    setComments(data);
    setLoadingComments(false);
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setUpdating(true);
    const success = await updateTicket(ticket.id, { status: newStatus });
    if (success) {
      setStatus(newStatus);
      onUpdate();
    }
    setUpdating(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    await addComment(ticket.id, newComment, false);
    setNewComment('');
    await loadComments();
    setAddingComment(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ticket.ticket_number}</Badge>
            <StatusBadge status={status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <DialogTitle className="text-left mt-2">{ticket.subject}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Customer Info */}
          {(ticket.customer_name || ticket.customer?.name) && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{ticket.customer?.name || ticket.customer_name}</span>
              </div>
              {(ticket.customer_phone || ticket.customer?.phone) && (
                <p className="text-xs text-muted-foreground ml-6">
                  {ticket.customer?.phone || ticket.customer_phone}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {ticket.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {/* Status Update */}
          <div className="flex items-center gap-3">
            <Label>Status:</Label>
            <Select value={status} onValueChange={(v) => handleStatusChange(v as TicketStatus)} disabled={updating}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </Label>
            
            {loadingComments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-2 rounded bg-muted/30 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{comment.created_by_name || 'Staff'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p>{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}

            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment} disabled={addingComment || !newComment.trim()}>
                {addingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>

          {/* Meta Info */}
          <div className="pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Created: {format(new Date(ticket.created_at), 'PPp')}</span>
              {ticket.category && <span>Category: {ticket.category}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportTickets() {
  const { tickets, stats, loading, ticketsLoading, updateTicket, deleteTicket, refetch } = useSupportTickets();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleDelete = async (ticketId: string) => {
    if (confirm('Are you sure you want to delete this ticket?')) {
      await deleteTicket(ticketId);
    }
  };

  return (
    <ModuleAccessGuard module="isp_tickets" moduleName="Support Tickets">
      <DashboardLayout 
        title="Support Tickets" 
        subtitle="Manage customer support requests"
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.open}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.resolved}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.urgent}</p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets Table */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Support Tickets
                  </CardTitle>
                  <CardDescription>View and manage all support tickets</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refetch} disabled={ticketsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${ticketsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <CreateTicketDialog onTicketCreated={refetch} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-secondary"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-secondary">
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
                  <SelectTrigger className="w-[140px] bg-secondary">
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
                      Create your first support ticket to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="hover:bg-muted/20">
                          <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{ticket.customer?.name || ticket.customer_name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{ticket.customer?.phone || ticket.customer_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={ticket.status} /></TableCell>
                          <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(ticket.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <TicketDetailsDialog
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdate={refetch}
          />
        )}
      </DashboardLayout>
    </ModuleAccessGuard>
  );
}
