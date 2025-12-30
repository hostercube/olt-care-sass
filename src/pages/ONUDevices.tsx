import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { useONUs, useOLTs } from '@/hooks/useOLTData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Router, Wifi, WifiOff, Zap, Loader2 } from 'lucide-react';

export default function ONUDevices() {
  const { onus, loading } = useONUs();
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
  const avgPower = totalONUs > 0 
    ? (onus.reduce((acc, o) => acc + (o.rx_power || 0), 0) / totalONUs).toFixed(2)
    : '0.00';

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
            value={`${avgPower} dBm`}
            icon={Zap}
            variant="default"
          />
        </div>

        {/* ONU Table */}
        <ONUTable onus={onusWithOltName} />
      </div>
    </DashboardLayout>
  );
}
