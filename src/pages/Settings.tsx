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
import { Settings as SettingsIcon, Bell, Clock, Shield, Database, Loader2, Mail, UserPlus, Network, Webhook } from 'lucide-react';
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
                    <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                  </div>
                  <Switch 
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Offline Devices First</Label>
                    <p className="text-sm text-muted-foreground">Prioritize offline devices in lists</p>
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
                    <Label>OLT Poll Interval</Label>
                    <Select 
                      value={String(settings.oltPollInterval)}
                      onValueChange={(value) => updateSetting('oltPollInterval', parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ONU Poll Interval</Label>
                    <Select 
                      value={String(settings.onuPollInterval)}
                      onValueChange={(value) => updateSetting('onuPollInterval', parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Background Polling</Label>
                    <p className="text-sm text-muted-foreground">Poll devices in the background via VPS</p>
                  </div>
                  <Switch checked={settings.backgroundPolling} onCheckedChange={(checked) => updateSetting('backgroundPolling', checked)} />
                </div>
                <div className="space-y-2">
                  <Label>Polling Server URL</Label>
                  <Input value={settings.apiServerUrl} onChange={(e) => updateSetting('apiServerUrl', e.target.value)} className="bg-secondary" placeholder="https://olt.yourdomain.com/api" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Settings */}
          <TabsContent value="alerts" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Alert Configuration</CardTitle>
                <CardDescription>Configure alert thresholds and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Low RX Power Threshold (dBm)</Label>
                    <Input type="number" value={settings.rxPowerThreshold} onChange={(e) => updateSetting('rxPowerThreshold', parseInt(e.target.value) || -25)} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Offline Alert Delay (minutes)</Label>
                    <Input type="number" value={settings.offlineThreshold} onChange={(e) => updateSetting('offlineThreshold', parseInt(e.target.value) || 5)} className="bg-secondary" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>ONU Offline Alerts</Label><p className="text-sm text-muted-foreground">Alert when ONU goes offline</p></div>
                  <Switch checked={settings.onuOfflineAlerts} onCheckedChange={(checked) => updateSetting('onuOfflineAlerts', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Power Drop Alerts</Label><p className="text-sm text-muted-foreground">Alert when RX power drops below threshold</p></div>
                  <Switch checked={settings.powerDropAlerts} onCheckedChange={(checked) => updateSetting('powerDropAlerts', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>OLT Unreachable Alerts</Label><p className="text-sm text-muted-foreground">Alert when OLT becomes unreachable</p></div>
                  <Switch checked={settings.oltUnreachableAlerts} onCheckedChange={(checked) => updateSetting('oltUnreachableAlerts', checked)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email Notifications</Label><p className="text-sm text-muted-foreground">Send critical alerts via email</p></div>
                  <Switch checked={settings.emailNotifications} onCheckedChange={(checked) => updateSetting('emailNotifications', checked)} />
                </div>
                {settings.emailNotifications && (
                  <div className="space-y-2">
                    <Label>Notification Email</Label>
                    <Input type="email" placeholder="admin@yourisp.com" value={settings.notificationEmail} onChange={(e) => updateSetting('notificationEmail', e.target.value)} className="bg-secondary" />
                    <p className="text-xs text-muted-foreground">Requires RESEND_API_KEY to be configured in backend secrets</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><Webhook className="h-4 w-4" />Webhook Notifications</Label><p className="text-sm text-muted-foreground">Send alerts to your own webhook endpoint</p></div>
                  <Switch checked={settings.webhookNotifications} onCheckedChange={(checked) => updateSetting('webhookNotifications', checked)} />
                </div>
                {settings.webhookNotifications && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input placeholder="https://your-server.com/webhook" value={settings.webhookUrl} onChange={(e) => updateSetting('webhookUrl', e.target.value)} className="bg-secondary" />
                    <p className="text-xs text-muted-foreground">We will POST JSON for each offline / low-power alert.</p>
                  </div>
                )}
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
                {isAdmin && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Allow User Registration</Label>
                      <p className="text-sm text-muted-foreground">Enable/disable new user signups</p>
                    </div>
                    <Switch checked={settings.allowUserRegistration} onCheckedChange={(checked) => updateSetting('allowUserRegistration', checked)} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Two-Factor Authentication</Label><p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p></div>
                  <Switch checked={settings.twoFactorAuth} onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Session Timeout</Label><p className="text-sm text-muted-foreground">Auto-logout after inactivity</p></div>
                  <Select value={String(settings.sessionTimeout)} onValueChange={(value) => updateSetting('sessionTimeout', parseInt(value))}>
                    <SelectTrigger className="w-[150px] bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">MikroTik PPPoE Matching Rules</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exact MAC match</Label>
                      <p className="text-sm text-muted-foreground">Match ONU MAC with PPP Active caller-id exactly</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchExactMac} onCheckedChange={(checked) => updateSetting('mikrotikMatchExactMac', checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Last-6 MAC match</Label>
                      <p className="text-sm text-muted-foreground">Fallback match using last 6 hex of MAC</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchLast6Mac} onCheckedChange={(checked) => updateSetting('mikrotikMatchLast6Mac', checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Serial / Comment match</Label>
                      <p className="text-sm text-muted-foreground">Match ONU serial with PPP secret comment/username</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchSerialOrComment} onCheckedChange={(checked) => updateSetting('mikrotikMatchSerialOrComment', checked)} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <Database className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Database Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetSettings}>Reset to Defaults</Button>
          <Button variant="glow" onClick={saveSettings} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
