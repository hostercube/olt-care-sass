import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  RefreshCw, 
  Terminal, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DebugLog {
  id: string;
  olt_id: string | null;
  olt_name: string;
  raw_output: string | null;
  error_message: string | null;
  connection_method: string | null;
  commands_sent: string[] | null;
  parsed_count: number | null;
  duration_ms: number | null;
  created_at: string;
}

interface OLT {
  id: string;
  name: string;
  status: string;
}

export default function DebugLogs() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [olts, setOlts] = useState<OLT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOLT, setSelectedOLT] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOLTs();
    fetchLogs();
  }, [selectedOLT]);

  const fetchOLTs = async () => {
    const { data } = await supabase
      .from('olts')
      .select('id, name, status')
      .order('name');
    
    if (data) setOlts(data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('olt_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedOLT !== 'all') {
        query = query.eq('olt_id', selectedOLT);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching debug logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate stats
  const successLogs = logs.filter(l => !l.error_message);
  const errorLogs = logs.filter(l => l.error_message);
  const totalParsed = logs.reduce((acc, l) => acc + (l.parsed_count || 0), 0);
  const avgDuration = logs.length > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.duration_ms || 0), 0) / logs.length)
    : 0;

  return (
    <DashboardLayout title="Debug Logs" subtitle="Backend polling logs and CLI output">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Terminal className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Polls</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-success">{successLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-destructive">{errorLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Database className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ONUs Parsed</p>
                  <p className="text-2xl font-bold">{totalParsed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg">CLI Debug Logs</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedOLT} onValueChange={setSelectedOLT}>
                  <SelectTrigger className="w-48 bg-secondary border-border">
                    <SelectValue placeholder="All OLTs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All OLTs</SelectItem>
                    {olts.map(olt => (
                      <SelectItem key={olt.id} value={olt.id}>{olt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No debug logs available</p>
                <p className="text-sm mt-1">Logs will appear after OLT polling</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <Collapsible 
                    key={log.id} 
                    open={expandedLogs.has(log.id)}
                    onOpenChange={() => toggleExpand(log.id)}
                  >
                    <div className={cn(
                      "border rounded-lg overflow-hidden",
                      log.error_message ? "border-destructive/50" : "border-border"
                    )}>
                      <CollapsibleTrigger asChild>
                        <div className={cn(
                          "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                          log.error_message ? "bg-destructive/10" : "bg-muted/30"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2 rounded-lg",
                              log.error_message ? "bg-destructive/20" : "bg-success/20"
                            )}>
                              {log.error_message ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{log.olt_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {log.connection_method || 'Unknown'}
                                </Badge>
                                {log.parsed_count !== null && (
                                  <Badge variant="secondary" className="text-xs">
                                    {log.parsed_count} ONUs
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </span>
                                {log.duration_ms && (
                                  <span>{log.duration_ms}ms</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.error_message && (
                              <span className="text-xs text-destructive max-w-xs truncate">
                                {log.error_message}
                              </span>
                            )}
                            {expandedLogs.has(log.id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 space-y-4 bg-background">
                          {/* Commands Sent */}
                          {log.commands_sent && log.commands_sent.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Commands Sent:</h4>
                              <div className="bg-muted p-3 rounded-lg font-mono text-xs space-y-1">
                                {log.commands_sent.map((cmd, idx) => (
                                  <div key={idx} className="text-primary">{cmd}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {log.error_message && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-destructive">Error:</h4>
                              <div className="bg-destructive/10 p-3 rounded-lg text-sm text-destructive">
                                {log.error_message}
                              </div>
                            </div>
                          )}

                          {/* Raw Output */}
                          {log.raw_output && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Raw CLI Output:</h4>
                              <div className="bg-muted p-3 rounded-lg overflow-x-auto max-h-96">
                                <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">
                                  {log.raw_output}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                            <span>Created: {format(new Date(log.created_at), 'PPpp')}</span>
                            {log.duration_ms && <span>Duration: {log.duration_ms}ms</span>}
                            {log.parsed_count !== null && <span>Parsed: {log.parsed_count} ONUs</span>}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
