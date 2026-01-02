import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

export default function NotificationPreferences() {
  return (
    <DashboardLayout title="Notification Settings" subtitle="Configure your alert preferences">
      <NotificationSettings />
    </DashboardLayout>
  );
}
