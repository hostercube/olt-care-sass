import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Clock, Shield, Database, Server, Loader2 } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useUserRole } from '@/hooks/useUserRole';

export default function Settings() {
  const { settings, loading, saving, updateSetting, saveSettings, resetSettings } = useSystemSettings();
  const { isAdmin } = useUserRole();

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="System configuration and preferences">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="System configuration and preferences">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="polling" className="gap-2">
              <Clock className="h-4 w-4" />
              Polling
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">General Settings</CardTitle>
                <CardDescription>Configure basic system preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      value={settings.systemName}
                      onChange={(e) => updateSetting('systemName', e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.timezone} 
                      onValueChange={(value) => updateSetting('timezone', value)}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="asia_dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="gmt">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-refresh Dashboard</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh dashboard data
                    </p>
                  </div>
                  <Switch 
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Offline Devices First</Label>
                    <p className="text-sm text-muted-foreground">
                      Prioritize offline devices in lists
                    </p>
                  </div>
                  <Switch 
                    checked={settings.showOfflineFirst}
                    onCheckedChange={(checked) => updateSetting('showOfflineFirst', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polling Settings */}
          <TabsContent value="polling" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Polling Configuration</CardTitle>
                <CardDescription>Configure how often devices are polled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="oltPollInterval">OLT Poll Interval</Label>
                    <Select 
                      value={String(settings.oltPollInterval)}
                      onValueChange={(value) => updateSetting('oltPollInterval', parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onuPollInterval">ONU Poll Interval</Label>
                    <Select 
                      value={String(settings.onuPollInterval)}
                      onValueChange={(value) => updateSetting('onuPollInterval', parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Background Polling</Label>
                    <p className="text-sm text-muted-foreground">
                      Poll devices in the background via VPS server
                    </p>
                  </div>
                  <Switch 
                    checked={settings.backgroundPolling}
                    onCheckedChange={(checked) => updateSetting('backgroundPolling', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Store Power History</Label>
                    <p className="text-sm text-muted-foreground">
                      Save RX/TX power readings for historical analysis
                    </p>
                  </div>
                  <Switch 
                    checked={settings.storePowerHistory}
                    onCheckedChange={(checked) => updateSetting('storePowerHistory', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="historyRetention">History Retention (days)</Label>
                  <Input
                    id="historyRetention"
                    type="number"
                    value={settings.historyRetention}
                    onChange={(e) => updateSetting('historyRetention', parseInt(e.target.value) || 30)}
                    className="bg-secondary max-w-[200px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Backend API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your VPS polling server URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">Polling Server URL</Label>
                  <Input
                    id="apiUrl"
                    placeholder="http://olt.isppoint.com/olt-polling-server"
                    value={settings.apiServerUrl}
                    onChange={(e) => updateSetting('apiServerUrl', e.target.value)}
                    className="bg-secondary"
                  />
                  <p className="text-xs text-muted-foreground">
                    This URL is configured in .env as VITE_POLLING_SERVER_URL for production
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Settings */}
          <TabsContent value="alerts" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Alert Configuration</CardTitle>
                <CardDescription>Configure alert thresholds and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rxPowerThreshold">Low RX Power Threshold (dBm)</Label>
                    <Input
                      id="rxPowerThreshold"
                      type="number"
                      value={settings.rxPowerThreshold}
                      onChange={(e) => updateSetting('rxPowerThreshold', parseInt(e.target.value) || -25)}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offlineThreshold">Offline Alert Delay (minutes)</Label>
                    <Input
                      id="offlineThreshold"
                      type="number"
                      value={settings.offlineThreshold}
                      onChange={(e) => updateSetting('offlineThreshold', parseInt(e.target.value) || 5)}
                      className="bg-secondary"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ONU Offline Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when ONU goes offline
                    </p>
                  </div>
                  <Switch 
                    checked={settings.onuOfflineAlerts}
                    onCheckedChange={(checked) => updateSetting('onuOfflineAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Power Drop Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when RX power drops below threshold
                    </p>
                  </div>
                  <Switch 
                    checked={settings.powerDropAlerts}
                    onCheckedChange={(checked) => updateSetting('powerDropAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>OLT Unreachable Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when OLT becomes unreachable
                    </p>
                  </div>
                  <Switch 
                    checked={settings.oltUnreachableAlerts}
                    onCheckedChange={(checked) => updateSetting('oltUnreachableAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send critical alerts via email
                    </p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Security Settings</CardTitle>
                <CardDescription>Manage authentication and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all admin accounts
                    </p>
                  </div>
                  <Switch 
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after inactivity
                    </p>
                  </div>
                  <Select 
                    value={String(settings.sessionTimeout)}
                    onValueChange={(value) => updateSetting('sessionTimeout', parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px] bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Credential Encryption</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    OLT credentials are encrypted using AES-256 before storage
                  </p>
                  {isAdmin && (
                    <Button variant="outline">Rotate Encryption Keys</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Database
                </CardTitle>
                <CardDescription>Database connection and backup settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium text-success">Connected to PostgreSQL</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline">Test Connection</Button>
                    <Button variant="outline">Backup Now</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetSettings}>
            Reset to Defaults
          </Button>
          <Button variant="glow" onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
