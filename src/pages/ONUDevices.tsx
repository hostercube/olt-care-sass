import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { PowerHistoryChart } from '@/components/onu/PowerHistoryChart';
import { ONUUptimeStats } from '@/components/onu/ONUUptimeStats';
import { useONUs, useOLTs } from '@/hooks/useOLTData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Router, Wifi, WifiOff, Zap, Loader2, Clock, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ONUDevices() {
  const { onus, loading, refetch } = useONUs();
  const { olts } = useOLTs();

  // Create a map of OLT IDs to names
  const oltNameMap = olts.reduce((acc, olt) => {
    acc[olt.id] = olt.name;
    return acc;
  }, {} as Record<string, string>);

  // Add OLT name to each ONU
  const onusWithOltName = onus.map(onu => ({
    ...onu,
    oltName: oltNameMap[onu.olt_id] || 'Unknown OLT'
  }));

  const totalONUs = onus.length;
  const onlineONUs = onus.filter((o) => o.status === 'online').length;
  const offlineONUs = onus.filter((o) => o.status === 'offline').length;
  
  // Calculate average power only from ONUs that have power readings
  const onusWithPower = onus.filter(o => o.rx_power !== null && o.rx_power !== undefined);
  const avgPower = onusWithPower.length > 0 
    ? (onusWithPower.reduce((acc, o) => acc + (o.rx_power ?? 0), 0) / onusWithPower.length).toFixed(2)
    : 'N/A';

  if (loading) {
    return (
      <DashboardLayout title="ONU Devices" subtitle="Monitor and manage ONU/Router devices">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="ONU Devices" subtitle="Monitor and manage ONU/Router devices">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatsCard
            title="Total ONUs"
            value={totalONUs}
            icon={Router}
            variant="default"
          />
          <StatsCard
            title="Online"
            value={onlineONUs}
            subtitle={totalONUs > 0 ? `${((onlineONUs / totalONUs) * 100).toFixed(1)}% uptime` : undefined}
            icon={Wifi}
            variant="success"
          />
          <StatsCard
            title="Offline"
            value={offlineONUs}
            icon={WifiOff}
            variant="danger"
          />
          <StatsCard
            title="Avg RX Power"
            value={avgPower === 'N/A' ? 'N/A' : `${avgPower} dBm`}
            subtitle={onusWithPower.length > 0 ? `${onusWithPower.length} with data` : 'No power data'}
            icon={Zap}
            variant="default"
          />
        </div>

        {/* Tabs for Devices, Power History, and Uptime Stats */}
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-muted">
            <TabsTrigger value="devices" className="gap-2">
              <Router className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="power" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Power History
            </TabsTrigger>
            <TabsTrigger value="uptime" className="gap-2">
              <Clock className="h-4 w-4" />
              Uptime Stats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="devices" className="mt-4">
            <ONUTable onus={onusWithOltName} onRefresh={refetch} />
          </TabsContent>
          
          <TabsContent value="power" className="mt-4">
            <PowerHistoryChart />
          </TabsContent>
          
          <TabsContent value="uptime" className="mt-4">
            <ONUUptimeStats />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
