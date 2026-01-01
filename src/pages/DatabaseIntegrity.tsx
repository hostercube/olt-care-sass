import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2,
  Server,
  Router,
  Users
} from 'lucide-react';

interface OLTIntegrityData {
  olt_id: string;
  olt_name: string;
  total_onus: number;
  duplicate_count: number;
  with_pppoe: number;
  with_router_name: number;
  with_router_mac: number;
  with_onu_mac: number;
  with_onu_name: number;
  pppoe_conflicts: number;
  data_quality_score: number;
}

interface GlobalStats {
  total_olts: number;
  total_onus: number;
  total_duplicates: number;
  total_pppoe_conflicts: number;
  average_quality_score: number;
}

export default function DatabaseIntegrity() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [integrityData, setIntegrityData] = useState<OLTIntegrityData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const scanAllOLTs = async () => {
    setScanning(true);
    try {
      // Fetch all OLTs
      const { data: olts, error: oltError } = await supabase
        .from('olts')
        .select('id, name');
      
      if (oltError) throw oltError;

      // Fetch all ONUs
      const { data: allOnus, error: onuError } = await supabase
        .from('onus')
        .select('id, olt_id, pon_port, onu_index, pppoe_username, router_name, router_mac, mac_address, name, updated_at');
      
      if (onuError) throw onuError;

      const integrityResults: OLTIntegrityData[] = [];
      let totalDuplicates = 0;
      let totalPppoeConflicts = 0;

      for (const olt of olts || []) {
        const oltOnus = allOnus?.filter(o => o.olt_id === olt.id) || [];
        
        // Find duplicates (same pon_port + onu_index)
        const keyMap = new Map<string, typeof oltOnus>();
        for (const onu of oltOnus) {
          const key = `${onu.pon_port}:${onu.onu_index}`;
          if (!keyMap.has(key)) {
            keyMap.set(key, []);
          }
          keyMap.get(key)!.push(onu);
        }
        
        let duplicateCount = 0;
        for (const [, group] of keyMap) {
          if (group.length > 1) {
            duplicateCount += group.length - 1; // All except one are duplicates
          }
        }
        totalDuplicates += duplicateCount;

        // Find PPPoE conflicts (same username on multiple ONUs)
        const pppoeMap = new Map<string, string[]>();
        for (const onu of oltOnus) {
          if (onu.pppoe_username) {
            const username = onu.pppoe_username.toLowerCase();
            if (!pppoeMap.has(username)) {
              pppoeMap.set(username, []);
            }
            pppoeMap.get(username)!.push(onu.id);
          }
        }
        
        let pppoeConflicts = 0;
        for (const [, ids] of pppoeMap) {
          if (ids.length > 1) {
            pppoeConflicts++;
          }
        }
        totalPppoeConflicts += pppoeConflicts;

        // Calculate data quality metrics
        const total = oltOnus.length;
        const withPppoe = oltOnus.filter(o => o.pppoe_username).length;
        const withRouterName = oltOnus.filter(o => o.router_name).length;
        const withRouterMac = oltOnus.filter(o => o.router_mac).length;
        const withOnuMac = oltOnus.filter(o => o.mac_address).length;
        const withOnuName = oltOnus.filter(o => o.name && !o.name.startsWith('ONU-')).length;

        // Calculate quality score (weighted average)
        const qualityScore = total > 0 ? Math.round(
          (withPppoe / total * 30) +
          (withRouterName / total * 25) +
          (withRouterMac / total * 20) +
          (withOnuMac / total * 15) +
          (withOnuName / total * 10) -
          (duplicateCount > 0 ? 10 : 0) -
          (pppoeConflicts > 0 ? 5 : 0)
        ) : 0;

        integrityResults.push({
          olt_id: olt.id,
          olt_name: olt.name,
          total_onus: total,
          duplicate_count: duplicateCount,
          with_pppoe: withPppoe,
          with_router_name: withRouterName,
          with_router_mac: withRouterMac,
          with_onu_mac: withOnuMac,
          with_onu_name: withOnuName,
          pppoe_conflicts: pppoeConflicts,
          data_quality_score: Math.max(0, Math.min(100, qualityScore))
        });
      }

      // Calculate global stats
      const totalOnus = allOnus?.length || 0;
      const avgScore = integrityResults.length > 0
        ? Math.round(integrityResults.reduce((sum, r) => sum + r.data_quality_score, 0) / integrityResults.length)
        : 0;

      setGlobalStats({
        total_olts: olts?.length || 0,
        total_onus: totalOnus,
        total_duplicates: totalDuplicates,
        total_pppoe_conflicts: totalPppoeConflicts,
        average_quality_score: avgScore
      });

      setIntegrityData(integrityResults);
      setLastScan(new Date().toLocaleString());
      toast.success('Scan completed successfully');
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  const cleanAllDuplicates = async () => {
    if (!confirm('This will delete all duplicate ONU records across all OLTs. Continue?')) {
      return;
    }

    setCleaning(true);
    try {
      // Fetch all ONUs
      const { data: allOnus, error: onuError } = await supabase
        .from('onus')
        .select('id, olt_id, pon_port, onu_index, updated_at');
      
      if (onuError) throw onuError;

      // Group by olt_id + pon_port + onu_index
      const keyMap = new Map<string, typeof allOnus>();
      for (const onu of allOnus || []) {
        const key = `${onu.olt_id}:${onu.pon_port}:${onu.onu_index}`;
        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }
        keyMap.get(key)!.push(onu);
      }

      const idsToDelete: string[] = [];
      for (const [, group] of keyMap) {
        if (group.length > 1) {
          // Sort by updated_at descending, keep the newest
          group.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          // Mark all except the first (newest) for deletion
          for (let i = 1; i < group.length; i++) {
            idsToDelete.push(group[i].id);
          }
        }
      }

      if (idsToDelete.length === 0) {
        toast.info('No duplicates found to delete');
        setCleaning(false);
        return;
      }

      // Delete in batches of 100
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        const { error } = await supabase
          .from('onus')
          .delete()
          .in('id', batch);
        
        if (error) throw error;
      }

      toast.success(`Deleted ${idsToDelete.length} duplicate records`);
      
      // Re-scan after cleanup
      await scanAllOLTs();
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/20 text-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-500">Good</Badge>;
    if (score >= 40) return <Badge className="bg-orange-500/20 text-orange-500">Fair</Badge>;
    return <Badge className="bg-red-500/20 text-red-500">Poor</Badge>;
  };

  return (
    <DashboardLayout title="Database Integrity" subtitle="Scan all OLTs for data quality issues">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Database Integrity
            </h1>
            <p className="text-muted-foreground">
              Scan all OLTs for data quality issues, duplicates, and conflicts
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={scanAllOLTs} 
              disabled={scanning}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Scan All OLTs'}
            </Button>
            {globalStats && globalStats.total_duplicates > 0 && (
              <Button 
                onClick={cleanAllDuplicates} 
                disabled={cleaning}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cleaning ? 'Cleaning...' : `Clean ${globalStats.total_duplicates} Duplicates`}
              </Button>
            )}
          </div>
        </div>

        {/* Global Stats */}
        {globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Server className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{globalStats.total_olts}</p>
                    <p className="text-sm text-muted-foreground">Total OLTs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Router className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{globalStats.total_onus}</p>
                    <p className="text-sm text-muted-foreground">Total ONUs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-8 w-8 ${globalStats.total_duplicates > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <div>
                    <p className="text-2xl font-bold">{globalStats.total_duplicates}</p>
                    <p className="text-sm text-muted-foreground">Duplicates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className={`h-8 w-8 ${globalStats.total_pppoe_conflicts > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                  <div>
                    <p className="text-2xl font-bold">{globalStats.total_pppoe_conflicts}</p>
                    <p className="text-sm text-muted-foreground">PPPoE Conflicts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`h-8 w-8 ${getScoreColor(globalStats.average_quality_score)}`} />
                  <div>
                    <p className={`text-2xl font-bold ${getScoreColor(globalStats.average_quality_score)}`}>
                      {globalStats.average_quality_score}%
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Last Scan Info */}
        {lastScan && (
          <p className="text-sm text-muted-foreground">Last scanned: {lastScan}</p>
        )}

        {/* Per-OLT Integrity Data */}
        {integrityData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {integrityData.map((data) => (
              <Card key={data.olt_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      {data.olt_name}
                    </CardTitle>
                    {getScoreBadge(data.data_quality_score)}
                  </div>
                  <CardDescription>
                    {data.total_onus} ONUs • Quality Score: {data.data_quality_score}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Issues */}
                  {(data.duplicate_count > 0 || data.pppoe_conflicts > 0) && (
                    <div className="flex gap-2 flex-wrap">
                      {data.duplicate_count > 0 && (
                        <Badge variant="destructive">
                          {data.duplicate_count} Duplicates
                        </Badge>
                      )}
                      {data.pppoe_conflicts > 0 && (
                        <Badge className="bg-orange-500/20 text-orange-500">
                          {data.pppoe_conflicts} PPPoE Conflicts
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Data Quality Metrics */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>PPPoE Username</span>
                      <span className="text-muted-foreground">
                        {data.with_pppoe}/{data.total_onus} ({data.total_onus > 0 ? Math.round(data.with_pppoe / data.total_onus * 100) : 0}%)
                      </span>
                    </div>
                    <Progress value={data.total_onus > 0 ? (data.with_pppoe / data.total_onus * 100) : 0} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Router Name</span>
                      <span className="text-muted-foreground">
                        {data.with_router_name}/{data.total_onus} ({data.total_onus > 0 ? Math.round(data.with_router_name / data.total_onus * 100) : 0}%)
                      </span>
                    </div>
                    <Progress value={data.total_onus > 0 ? (data.with_router_name / data.total_onus * 100) : 0} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Router MAC</span>
                      <span className="text-muted-foreground">
                        {data.with_router_mac}/{data.total_onus} ({data.total_onus > 0 ? Math.round(data.with_router_mac / data.total_onus * 100) : 0}%)
                      </span>
                    </div>
                    <Progress value={data.total_onus > 0 ? (data.with_router_mac / data.total_onus * 100) : 0} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>ONU MAC</span>
                      <span className="text-muted-foreground">
                        {data.with_onu_mac}/{data.total_onus} ({data.total_onus > 0 ? Math.round(data.with_onu_mac / data.total_onus * 100) : 0}%)
                      </span>
                    </div>
                    <Progress value={data.total_onus > 0 ? (data.with_onu_mac / data.total_onus * 100) : 0} className="h-2" />
                  </div>

                  {/* Status */}
                  {data.duplicate_count === 0 && data.pppoe_conflicts === 0 && (
                    <div className="flex items-center gap-2 text-green-500 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      No integrity issues found
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click "Scan All OLTs" to check database integrity
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
