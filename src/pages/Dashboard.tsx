import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { OLTOverviewCard } from '@/components/dashboard/OLTOverviewCard';
import { AlertsWidget } from '@/components/dashboard/AlertsWidget';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { ONUStatsWidget } from '@/components/dashboard/ONUStatsWidget';
import { LiveStatusWidget } from '@/components/dashboard/LiveStatusWidget';
import { DataQualityWidget } from '@/components/dashboard/DataQualityWidget';
import { DeviceHealthWidget } from '@/components/dashboard/DeviceHealthWidget';
import { DeviceHealthChart } from '@/components/dashboard/DeviceHealthChart';
import { useOLTs, useONUs, useAlerts, useDashboardStats } from '@/hooks/useOLTData';
import { Server, Router, AlertTriangle, Zap, Wifi, Loader2, Activity, Cpu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const stats = useDashboardStats();
  const { olts, loading: oltsLoading } = useOLTs();
  const { onus, loading: onusLoading } = useONUs();
  const { alerts, loading: alertsLoading } = useAlerts();

  // Create a map of OLT IDs to names
  const oltNameMap = olts.reduce((acc, olt) => {
    acc[olt.id] = olt.name;
    return acc;
  }, {} as Record<string, string>);

  // Add OLT name to each ONU and deduplicate by olt_id + pon_port + onu_index
  const onusWithOltName = (() => {
    const withName = onus.map(onu => ({
      ...onu,
      oltName: oltNameMap[onu.olt_id] || 'Unknown OLT'
    }));
    
    // Deduplicate by hardware identity: olt_id + pon_port + onu_index
    const byKey = new Map<string, typeof withName[number]>();
    for (const onu of withName) {
      const key = `${onu.olt_id}|${onu.pon_port}|${onu.onu_index}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, onu);
        continue;
      }
      // Keep the more recently updated one
      const prevTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const curTime = onu.updated_at ? new Date(onu.updated_at).getTime() : 0;
      if (curTime >= prevTime) byKey.set(key, onu);
    }
    
    return Array.from(byKey.values());
  })();

  const loading = oltsLoading || onusLoading || alertsLoading;

  // Calculate low signal ONUs
  const lowSignalONUs = onus.filter(o => o.rx_power !== null && o.rx_power < -25).length;
  const avgRxPower = onus.length > 0 
    ? onus.reduce((acc, o) => acc + (o.rx_power || 0), 0) / onus.length
    : 0;

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Network Operations Overview">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Network Operations Overview">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total OLTs"
            value={stats.totalOLTs}
            subtitle={`${stats.onlineOLTs} online, ${stats.offlineOLTs} offline`}
            icon={Server}
            variant="default"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Total ONUs"
            value={stats.totalONUs}
            subtitle={`${stats.onlineONUs} online, ${stats.offlineONUs} offline`}
            icon={Router}
            variant="success"
          />
          <StatsCard
            title="Active Alerts"
            value={stats.activeAlerts}
            subtitle="Requires attention"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatsCard
            title="Avg RX Power"
            value={`${stats.avgRxPower} dBm`}
            subtitle="Network wide average"
            icon={Zap}
            variant="default"
          />
        </div>

        {/* Tabs for Overview, Live Status, and Device Health */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-muted">
            <TabsTrigger value="overview" className="gap-2">
              <Server className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Activity className="h-4 w-4" />
              Live Status
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Cpu className="h-4 w-4" />
              Device Health
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* OLT Overview */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                OLT Status Overview
              </h2>
              {olts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {olts.map((olt) => (
                    <OLTOverviewCard key={olt.id} olt={olt} />
                  ))}
                </div>
              ) : (
                <Card variant="glass">
                  <CardContent className="p-8 text-center">
                    <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No OLTs configured</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first OLT to start monitoring your network.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Alerts, ONU Stats, Data Quality and Activity */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <ONUTable onus={onusWithOltName.slice(0, 10)} title="Recent ONU Activity" showFilters={false} />
              </div>
              <div>
                <ONUStatsWidget
                  totalONUs={stats.totalONUs}
                  onlineONUs={stats.onlineONUs}
                  offlineONUs={stats.offlineONUs}
                  lowSignalONUs={lowSignalONUs}
                  avgRxPower={avgRxPower}
                />
              </div>
              <div>
                <DataQualityWidget onus={onus} />
              </div>
              <div>
                <AlertsWidget alerts={alerts} maxItems={4} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="live" className="mt-4">
            <LiveStatusWidget />
          </TabsContent>
          
          <TabsContent value="health" className="mt-4 space-y-6">
            {/* Device Health Chart */}
            <DeviceHealthChart />
            
            {/* Device Status and Info */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DeviceHealthWidget olts={olts} />
              </div>
              <div className="space-y-6">
                <Card variant="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Cpu className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Resource Impact</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Connection Type</span>
                        <span className="font-medium">Read-only CLI</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Session Duration</span>
                        <span className="font-medium">&lt; 10 seconds</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CPU Impact</span>
                        <span className="font-medium text-success">Minimal</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">RAM Impact</span>
                        <span className="font-medium text-success">Minimal</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Polling uses lightweight, read-only CLI commands and disconnects immediately after data collection.
                    </p>
                  </CardContent>
                </Card>
                <ONUStatsWidget
                  totalONUs={stats.totalONUs}
                  onlineONUs={stats.onlineONUs}
                  offlineONUs={stats.offlineONUs}
                  lowSignalONUs={lowSignalONUs}
                  avgRxPower={avgRxPower}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
