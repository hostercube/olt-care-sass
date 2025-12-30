import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OLTTable } from '@/components/olt/OLTTable';
import { AddOLTDialog } from '@/components/olt/AddOLTDialog';
import { useOLTs } from '@/hooks/useOLTData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Server, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

export default function OLTManagement() {
  const { olts, loading, refetch } = useOLTs();

  const totalOLTs = olts.length;
  const onlineOLTs = olts.filter((o) => o.status === 'online').length;
  const offlineOLTs = olts.filter((o) => o.status === 'offline').length;
  const warningOLTs = olts.filter((o) => o.status === 'warning').length;

  if (loading) {
    return (
      <DashboardLayout title="OLT Management" subtitle="Manage and monitor OLT devices">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
          <AddOLTDialog onOLTAdded={refetch} />
        </div>

        {/* OLT Table */}
        <OLTTable olts={olts} />
      </div>
    </DashboardLayout>
  );
}
