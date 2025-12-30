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
import { Settings as SettingsIcon, Bell, Clock, Shield, Database, Server } from 'lucide-react';

export default function Settings() {
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
                      defaultValue="OLT Manager Pro"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time</SelectItem>
                        <SelectItem value="pst">Pacific Time</SelectItem>
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
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Offline Devices First</Label>
                    <p className="text-sm text-muted-foreground">
                      Prioritize offline devices in lists
                    </p>
                  </div>
                  <Switch defaultChecked />
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
                    <Select defaultValue="5">
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
                    <Select defaultValue="5">
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
                      Poll devices in the background via cron jobs
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Store Power History</Label>
                    <p className="text-sm text-muted-foreground">
                      Save RX/TX power readings for historical analysis
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="historyRetention">History Retention (days)</Label>
                  <Input
                    id="historyRetention"
                    type="number"
                    defaultValue="30"
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
                  Configure your backend server for OLT communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API Server URL</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://your-api-server.com"
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="••••••••••••••••"
                    className="bg-secondary"
                  />
                </div>
                <Button variant="outline">Test Connection</Button>
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
                      defaultValue="-25"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offlineThreshold">Offline Alert Delay (minutes)</Label>
                    <Input
                      id="offlineThreshold"
                      type="number"
                      defaultValue="5"
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
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Power Drop Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when RX power drops below threshold
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>OLT Unreachable Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when OLT becomes unreachable
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send critical alerts via email
                    </p>
                  </div>
                  <Switch />
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
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after inactivity
                    </p>
                  </div>
                  <Select defaultValue="30">
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
                  <Button variant="outline">Rotate Encryption Keys</Button>
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
                <div className="flex gap-2">
                  <Button variant="outline">Test Connection</Button>
                  <Button variant="outline">Backup Now</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button variant="glow">Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
