import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  User, 
  Server, 
  Router, 
  Settings, 
  LogIn, 
  LogOut,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  create: Plus,
  update: Edit,
  delete: Trash2,
  olt_added: Server,
  olt_updated: Server,
  olt_deleted: Server,
  onu_updated: Router,
  settings_changed: Settings,
  user_created: User,
  user_updated: User,
  user_deleted: User,
};

const actionColors: Record<string, string> = {
  login: 'bg-green-500/10 text-green-500 border-green-500/20',
  logout: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  create: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  update: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  delete: 'bg-red-500/10 text-red-500 border-red-500/20',
  olt_added: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  olt_updated: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  olt_deleted: 'bg-red-500/10 text-red-500 border-red-500/20',
  onu_updated: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  settings_changed: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  user_created: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  user_updated: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  user_deleted: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function ActivityLogs() {
  const { tenantId } = useTenantContext();
  const { logs, loading, fetchLogs } = useActivityLogs(tenantId || undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  // Get unique actions and entity types for filters
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntityTypes = [...new Set(logs.map(log => log.entity_type).filter(Boolean))];

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || ClipboardList;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || 'bg-muted text-muted-foreground border-border';
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return '-';
    
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([key, value]) => (
      <span key={key} className="block text-xs">
        <span className="text-muted-foreground">{key}:</span>{' '}
        <span className="text-foreground">{String(value).substring(0, 50)}</span>
      </span>
    ));
  };

  return (
    <DashboardLayout title="Activity Logs" subtitle="Audit trail for tenant actions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
            <p className="text-muted-foreground mt-1">
              View login history, OLT changes, and user actions for audit purposes
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntityTypes.map(entity => (
                    <SelectItem key={entity} value={entity!}>
                      {entity!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Activity History
            </CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {logs.length} log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No activity logs found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || actionFilter !== 'all' || entityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Activity will appear here as actions are performed'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const ActionIcon = getActionIcon(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`gap-1.5 ${getActionColor(log.action)}`}
                            >
                              <ActionIcon className="h-3.5 w-3.5" />
                              {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.entity_type ? (
                              <div>
                                <span className="font-medium">
                                  {log.entity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                {log.entity_id && (
                                  <span className="text-xs text-muted-foreground block truncate max-w-[150px]">
                                    {log.entity_id}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {formatDetails(log.details)}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">
                              {log.ip_address || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(log.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'h:mm:ss a')}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
