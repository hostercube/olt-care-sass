import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OLTTable } from '@/components/olt/OLTTable';
import { AddOLTDialog } from '@/components/olt/AddOLTDialog';
import { mockOLTs } from '@/lib/mock-data';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Server, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export default function OLTManagement() {
  const totalOLTs = mockOLTs.length;
  const onlineOLTs = mockOLTs.filter((o) => o.status === 'online').length;
  const offlineOLTs = mockOLTs.filter((o) => o.status === 'offline').length;
  const warningOLTs = mockOLTs.filter((o) => o.status === 'warning').length;

  return (
    <DashboardLayout title="OLT Management" subtitle="Manage and monitor OLT devices">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 flex-1 mr-4">
            <StatsCard
              title="Total OLTs"
              value={totalOLTs}
              icon={Server}
              variant="default"
            />
            <StatsCard
              title="Online"
              value={onlineOLTs}
              icon={Wifi}
              variant="success"
            />
            <StatsCard
              title="Offline"
              value={offlineOLTs}
              icon={WifiOff}
              variant="danger"
            />
            <StatsCard
              title="Warning"
              value={warningOLTs}
              icon={AlertCircle}
              variant="warning"
            />
          </div>
          <AddOLTDialog />
        </div>

        {/* OLT Table */}
        <OLTTable olts={mockOLTs} />
      </div>
    </DashboardLayout>
  );
}
