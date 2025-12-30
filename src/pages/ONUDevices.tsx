import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { mockONUs } from '@/lib/mock-data';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Router, Wifi, WifiOff, Zap } from 'lucide-react';

export default function ONUDevices() {
  const totalONUs = mockONUs.length;
  const onlineONUs = mockONUs.filter((o) => o.status === 'online').length;
  const offlineONUs = mockONUs.filter((o) => o.status === 'offline').length;
  const avgPower = (mockONUs.reduce((acc, o) => acc + o.rxPower, 0) / mockONUs.length).toFixed(2);

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
            subtitle={`${((onlineONUs / totalONUs) * 100).toFixed(1)}% uptime`}
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
        <ONUTable onus={mockONUs} />
      </div>
    </DashboardLayout>
  );
}
