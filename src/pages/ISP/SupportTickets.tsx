import { useState, useEffect, useMemo } from 'react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Ticket, 
  Plus, 
  Search, 
  Loader2, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  Calendar,
  Filter,
  X,
} from 'lucide-react';
import { useSupportTickets, SupportTicket, TicketStatus, TicketPriority, CreateTicketData } from '@/hooks/useSupportTickets';
import { useCustomers } from '@/hooks/useCustomers';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { SearchableSelect } from '@/components/ui/searchable-select';

// Staff member interface
interface StaffMember {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  is_active: boolean;
}

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
  onTicketCreated,
  staffList
}: { 
  onTicketCreated: () => void;
  staffList: StaffMember[];
}) {
  const { createTicket, categories } = useSupportTickets();
  const { customers } = useCustomers();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTicketData & { assigned_to?: string; assigned_name?: string }>({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const customerOptions = useMemo(() => 
    customers.slice(0, 100).map((customer) => ({
      value: customer.id,
      label: `${customer.name} (${customer.customer_code || customer.phone || 'N/A'})`,
    }))
  , [customers]);

  const staffOptions = useMemo(() => 
    staffList.map((staff) => ({
      value: staff.id,
      label: `${staff.name}${staff.designation ? ` - ${staff.designation}` : ''}`,
    }))
  , [staffList]);

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      return;
    }

    setLoading(true);
    
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const selectedStaff = staffList.find(s => s.id === formData.assigned_to);
    
    const ticketData: CreateTicketData = {
      ...formData,
      customer_id: selectedCustomerId || undefined,
      customer_name: selectedCustomer?.name,
      customer_phone: selectedCustomer?.phone || undefined,
      customer_email: selectedCustomer?.email || undefined,
      assigned_to: formData.assigned_to || undefined,
      assigned_name: selectedStaff?.name || undefined,
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Create a new support ticket for a customer issue
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Customer (Optional)</Label>
            <SearchableSelect
              options={customerOptions}
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              placeholder="Search and select customer..."
            />
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
              <Label>Priority</Label>
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
              <Label>Category</Label>
              <Select 
                value={formData.category || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, category: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
            <Label>Assign to Staff</Label>
            <SearchableSelect
              options={staffOptions}
              value={formData.assigned_to || ''}
              onValueChange={(v) => setFormData({ ...formData, assigned_to: v || undefined })}
              placeholder="Select staff to assign..."
            />
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

// Ticket Details Dialog with Staff Assignment
function TicketDetailsDialog({ 
  ticket, 
  staffList,
  onClose,
  onUpdate
}: { 
  ticket: SupportTicket;
  staffList: StaffMember[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { updateTicket, addComment, getTicketComments } = useSupportTickets();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string>(ticket.assigned_to || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadComments();
  }, []);

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

  const handleAssignmentChange = async (staffId: string) => {
    setUpdating(true);
    const selectedStaff = staffList.find(s => s.id === staffId);
    const success = await updateTicket(ticket.id, { 
      assigned_to: staffId || null, 
      assigned_name: selectedStaff?.name || null 
    } as any);
    if (success) {
      setAssignedTo(staffId);
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

  const staffOptions = useMemo(() => 
    staffList.map((staff) => ({
      value: staff.id,
      label: `${staff.name}${staff.designation ? ` - ${staff.designation}` : ''}`,
    }))
  , [staffList]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{ticket.ticket_number}</Badge>
            <StatusBadge status={status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.category && <Badge variant="secondary">{ticket.category}</Badge>}
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

          {/* Status and Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as TicketStatus)} disabled={updating}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <SearchableSelect
                options={staffOptions}
                value={assignedTo}
                onValueChange={handleAssignmentChange}
                placeholder="Assign to staff..."
              />
            </div>
          </div>
          {updating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment} disabled={addingComment || !newComment.trim()}>
                {addingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>

          {/* Meta Info */}
          <div className="pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Created: {format(new Date(ticket.created_at), 'PPp')}</span>
              {ticket.assigned_name && <span>Assigned: {ticket.assigned_name}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const startItem = (currentPage - 1) * pageSize + 1;
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
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
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
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
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
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function SupportTickets() {
  const { tickets, stats, loading, ticketsLoading, updateTicket, deleteTicket, refetch } = useSupportTickets();
  const { tenantId } = useTenantContext();
  
  // Staff list for assignment
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Fetch staff for assignment
  useEffect(() => {
    const fetchStaff = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('staff')
        .select('id, name, role, designation, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      setStaffList((data as StaffMember[]) || []);
    };
    fetchStaff();
  }, [tenantId]);

  // Get unique categories from tickets
  const uniqueCategories = useMemo(() => {
    const cats = new Set(tickets.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [tickets]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = 
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assigned_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const matchesAssigned = assignedFilter === 'all' || 
        (assignedFilter === 'unassigned' && !ticket.assigned_to) ||
        ticket.assigned_to === assignedFilter;
      
      // Date filters
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(ticket.created_at) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(ticket.created_at) <= new Date(dateTo + 'T23:59:59');
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssigned && matchesDate;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter, assignedFilter, dateFrom, dateTo]);

  // Paginated tickets
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, assignedFilter, dateFrom, dateTo, pageSize]);

  const handleDelete = async (ticketId: string) => {
    if (confirm('Are you sure you want to delete this ticket?')) {
      await deleteTicket(ticketId);
    }
  };

  const handleQuickAssign = async (ticketId: string, staffId: string) => {
    const selectedStaff = staffList.find(s => s.id === staffId);
    await updateTicket(ticketId, { 
      assigned_to: staffId, 
      assigned_name: selectedStaff?.name 
    } as any);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setAssignedFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    categoryFilter !== 'all',
    assignedFilter !== 'all',
    !!dateFrom,
    !!dateTo
  ].filter(Boolean).length;

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
                  <CreateTicketDialog onTicketCreated={refetch} staffList={staffList} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Bar */}
              <div className="space-y-3 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets, customer, assignee..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-secondary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] bg-secondary">
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
                      <SelectTrigger className="w-[130px] bg-secondary">
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
                    <Button 
                      variant={showFilters ? 'secondary' : 'outline'} 
                      size="icon"
                      onClick={() => setShowFilters(!showFilters)}
                      className="relative"
                    >
                      <Filter className="h-4 w-4" />
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Advanced Filters</Label>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Assigned To</Label>
                        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="All Staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {staffList.map(staff => (
                              <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date From</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="bg-secondary"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date To</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="bg-secondary"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                <>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Ticket #</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTickets.map((ticket) => (
                          <TableRow key={ticket.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{ticket.subject}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm truncate max-w-[120px]">
                                  {ticket.customer?.name || ticket.customer_name || '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ticket.customer?.phone || ticket.customer_phone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell><StatusBadge status={ticket.status} /></TableCell>
                            <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                            <TableCell>
                              {ticket.assigned_name ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <UserCheck className="h-3 w-3 text-green-500" />
                                  <span className="truncate max-w-[80px]">{ticket.assigned_name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Unassigned</span>
                              )}
                            </TableCell>
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
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Assign to:</p>
                                    {staffList.slice(0, 5).map(staff => (
                                      <DropdownMenuItem 
                                        key={staff.id}
                                        onClick={() => handleQuickAssign(ticket.id, staff.id)}
                                        className="text-sm"
                                      >
                                        <UserCheck className="h-3 w-3 mr-2" />
                                        {staff.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                  <DropdownMenuSeparator />
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
        </div>

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <TicketDetailsDialog
            ticket={selectedTicket}
            staffList={staffList}
            onClose={() => setSelectedTicket(null)}
            onUpdate={refetch}
          />
        )}
      </DashboardLayout>
    </ModuleAccessGuard>
  );
}
