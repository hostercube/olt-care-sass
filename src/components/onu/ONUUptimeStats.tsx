import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, TrendingUp, Download, Calendar } from 'lucide-react';
import { format, subDays, subHours, differenceInSeconds } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface UptimeData {
  onuId: string;
  onuName: string;
  oltName: string;
  ponPort: string;
  totalUptime: number;
  totalDowntime: number;
  uptimePercentage: number;
  lastOnline: string | null;
  lastOffline: string | null;
  statusChanges: number;
}

interface ONUUptimeStatsProps {
  oltId?: string;
}

export function ONUUptimeStats({ oltId }: ONUUptimeStatsProps) {
  const [timeRange, setTimeRange] = useState('24h');
  const [uptimeData, setUptimeData] = useState<UptimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUptimeData();
  }, [timeRange, oltId]);

  const getTimeRangeDate = () => {
    switch (timeRange) {
      case '1h': return subHours(new Date(), 1);
      case '6h': return subHours(new Date(), 6);
      case '24h': return subDays(new Date(), 1);
      case '7d': return subDays(new Date(), 7);
      case '30d': return subDays(new Date(), 30);
      default: return subDays(new Date(), 1);
    }
  };

  const fetchUptimeData = async () => {
    setLoading(true);
    try {
      const startDate = getTimeRangeDate();
      
      let query = supabase
        .from('onus')
        .select(`
          id,
          name,
          pon_port,
          status,
          last_online,
          last_offline,
          olt_id,
          olts!inner(name)
        `);
      
      if (oltId) {
        query = query.eq('olt_id', oltId);
      }
      
      const { data: onus, error } = await query;
      
      if (error) throw error;
      
      // Fetch status history for each ONU
      const uptimeStats: UptimeData[] = [];
      
      for (const onu of onus || []) {
        const { data: history } = await supabase
          .from('onu_status_history')
          .select('*')
          .eq('onu_id', onu.id)
          .gte('changed_at', startDate.toISOString())
          .order('changed_at', { ascending: true });
        
        const totalSeconds = differenceInSeconds(new Date(), startDate);
        let onlineSeconds = 0;
        let offlineSeconds = 0;
        let statusChanges = history?.length || 0;
        
        if (history && history.length > 0) {
          for (let i = 0; i < history.length; i++) {
            const duration = history[i].duration_seconds || 0;
            if (history[i].status === 'online') {
              onlineSeconds += duration;
            } else {
              offlineSeconds += duration;
            }
          }
        } else {
          // If no history, estimate based on current status
          if (onu.status === 'online') {
            onlineSeconds = totalSeconds;
          } else {
            offlineSeconds = totalSeconds;
          }
        }
        
        const totalTracked = onlineSeconds + offlineSeconds;
        const uptimePercentage = totalTracked > 0 
          ? (onlineSeconds / totalTracked) * 100 
          : (onu.status === 'online' ? 100 : 0);
        
        uptimeStats.push({
          onuId: onu.id,
          onuName: onu.name,
          oltName: (onu.olts as any)?.name || 'Unknown',
          ponPort: onu.pon_port,
          totalUptime: onlineSeconds,
          totalDowntime: offlineSeconds,
          uptimePercentage,
          lastOnline: onu.last_online,
          lastOffline: onu.last_offline,
          statusChanges
        });
      }
      
      setUptimeData(uptimeStats.sort((a, b) => a.uptimePercentage - b.uptimePercentage));
    } catch (error) {
      console.error('Error fetching uptime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const getUptimeBadgeVariant = (percentage: number) => {
    if (percentage >= 99) return 'success';
    if (percentage >= 95) return 'warning';
    return 'destructive';
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text('ONU Uptime Report', pageWidth / 2, 20, { align: 'center' });
      
      // Subtitle with date range
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report Period: Last ${timeRange}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 34, { align: 'center' });
      
      // Summary stats
      const avgUptime = uptimeData.length > 0 
        ? uptimeData.reduce((sum, d) => sum + d.uptimePercentage, 0) / uptimeData.length 
        : 0;
      const onlineCount = uptimeData.filter(d => d.uptimePercentage >= 95).length;
      const criticalCount = uptimeData.filter(d => d.uptimePercentage < 90).length;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total ONUs: ${uptimeData.length}`, 14, 45);
      doc.text(`Average Uptime: ${avgUptime.toFixed(2)}%`, 14, 52);
      doc.text(`Healthy (>95%): ${onlineCount}`, 100, 45);
      doc.text(`Critical (<90%): ${criticalCount}`, 100, 52);
      
      // Table
      autoTable(doc, {
        startY: 60,
        head: [['ONU Name', 'OLT', 'PON Port', 'Uptime %', 'Online Time', 'Downtime', 'Status Changes']],
        body: uptimeData.map(d => [
          d.onuName,
          d.oltName,
          d.ponPort,
          `${d.uptimePercentage.toFixed(2)}%`,
          formatDuration(d.totalUptime),
          formatDuration(d.totalDowntime),
          d.statusChanges.toString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 }
        }
      });
      
      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      
      doc.save(`onu-uptime-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const avgUptime = uptimeData.length > 0 
    ? uptimeData.reduce((sum, d) => sum + d.uptimePercentage, 0) / uptimeData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-secondary border-border">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={exportToPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF Report
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total ONUs</p>
                <p className="text-2xl font-bold">{uptimeData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Uptime</p>
                <p className="text-2xl font-bold">{avgUptime.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Healthy (&gt;95%)</p>
                <p className="text-2xl font-bold">{uptimeData.filter(d => d.uptimePercentage >= 95).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Activity className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical (&lt;90%)</p>
                <p className="text-2xl font-bold">{uptimeData.filter(d => d.uptimePercentage < 90).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Uptime Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">ONU Uptime Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : uptimeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ONU data found for the selected time range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium">ONU Name</th>
                    <th className="text-left p-3 font-medium">OLT</th>
                    <th className="text-left p-3 font-medium">PON Port</th>
                    <th className="text-center p-3 font-medium">Uptime</th>
                    <th className="text-left p-3 font-medium">Online Time</th>
                    <th className="text-left p-3 font-medium">Downtime</th>
                    <th className="text-center p-3 font-medium">Status Changes</th>
                    <th className="text-left p-3 font-medium">Last Online</th>
                  </tr>
                </thead>
                <tbody>
                  {uptimeData.map((data) => (
                    <tr key={data.onuId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium">{data.onuName}</td>
                      <td className="p-3 text-muted-foreground">{data.oltName}</td>
                      <td className="p-3 font-mono">{data.ponPort}</td>
                      <td className="p-3 text-center">
                        <Badge variant={getUptimeBadgeVariant(data.uptimePercentage) as any}>
                          {data.uptimePercentage.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-success">{formatDuration(data.totalUptime)}</td>
                      <td className="p-3 text-destructive">{formatDuration(data.totalDowntime)}</td>
                      <td className="p-3 text-center">{data.statusChanges}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {data.lastOnline ? format(new Date(data.lastOnline), 'PPp') : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
