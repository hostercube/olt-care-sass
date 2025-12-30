import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { OLTOverviewCard } from '@/components/dashboard/OLTOverviewCard';
import { AlertsWidget } from '@/components/dashboard/AlertsWidget';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { mockOLTs, mockONUs, mockAlerts, mockDashboardStats } from '@/lib/mock-data';
import { Server, Router, AlertTriangle, Activity, Zap, Wifi } from 'lucide-react';

export default function Dashboard() {
  const stats = mockDashboardStats;

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

        {/* OLT Overview */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            OLT Status Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mockOLTs.map((olt) => (
              <OLTOverviewCard key={olt.id} olt={olt} />
            ))}
          </div>
        </div>

        {/* Alerts and Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ONUTable onus={mockONUs.slice(0, 10)} title="Recent ONU Activity" showFilters={false} />
          </div>
          <div>
            <AlertsWidget alerts={mockAlerts} maxItems={4} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
