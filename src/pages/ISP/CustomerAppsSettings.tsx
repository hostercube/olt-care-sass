import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCustomerApps } from '@/hooks/useCustomerApps';
import { LINK_CATEGORIES, type CustomerAppsLink } from '@/types/customerApps';
import { ImageUploader } from '@/components/landing/ImageUploader';
import {
  Smartphone, Settings, Link as LinkIcon, Tv, Server, Newspaper, Plus, Pencil, Trash2,
  Loader2, Save, Image, Palette, Bell, Shield, ExternalLink, Upload
} from 'lucide-react';

export default function CustomerAppsSettings() {
  const { config, links, loading, saveConfig, createLink, updateLink, deleteLink } = useCustomerApps();
  const [activeTab, setActiveTab] = useState('branding');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CustomerAppsLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<CustomerAppsLink | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    app_name: '',
    app_icon_url: '',
    splash_screen_url: '',
    dashboard_banner_url: '',
    dashboard_banner_link: '',
    dashboard_announcement: '',
    dashboard_announcement_enabled: false,
    live_tv_enabled: false,
    ftp_enabled: false,
    news_enabled: false,
    referral_enabled: false,
    speed_test_enabled: true,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    android_app_url: '',
    ios_app_url: '',
    force_update_enabled: false,
    min_app_version: '',
    maintenance_mode: false,
    maintenance_message: '',
  });

  const [linkForm, setLinkForm] = useState<{
    category: 'live_tv' | 'ftp' | 'news' | 'custom';
    title: string;
    url: string;
    icon_url: string;
    description: string;
    is_active: boolean;
    sort_order: number;
    requires_login: boolean;
    open_in_browser: boolean;
  }>({
    category: 'custom',
    title: '',
    url: '',
    icon_url: '',
    description: '',
    is_active: true,
    sort_order: 0,
    requires_login: false,
    open_in_browser: false,
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        app_name: config.app_name || '',
        app_icon_url: config.app_icon_url || '',
        splash_screen_url: config.splash_screen_url || '',
        dashboard_banner_url: config.dashboard_banner_url || '',
        dashboard_banner_link: config.dashboard_banner_link || '',
        dashboard_announcement: config.dashboard_announcement || '',
        dashboard_announcement_enabled: config.dashboard_announcement_enabled || false,
        live_tv_enabled: config.live_tv_enabled || false,
        ftp_enabled: config.ftp_enabled || false,
        news_enabled: config.news_enabled || false,
        referral_enabled: config.referral_enabled || false,
        speed_test_enabled: config.speed_test_enabled ?? true,
        primary_color: config.primary_color || '#3B82F6',
        secondary_color: config.secondary_color || '#10B981',
        android_app_url: config.android_app_url || '',
        ios_app_url: config.ios_app_url || '',
        force_update_enabled: config.force_update_enabled || false,
        min_app_version: config.min_app_version || '',
        maintenance_mode: config.maintenance_mode || false,
        maintenance_message: config.maintenance_message || '',
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await saveConfig(formData);
    setSaving(false);
  };

  const handleOpenLinkDialog = (link?: CustomerAppsLink) => {
    if (link) {
      setEditingLink(link);
      setLinkForm({
        category: link.category as 'live_tv' | 'ftp' | 'news' | 'custom',
        title: link.title,
        url: link.url,
        icon_url: link.icon_url || '',
        description: link.description || '',
        is_active: link.is_active,
        sort_order: link.sort_order,
        requires_login: link.requires_login,
        open_in_browser: link.open_in_browser,
      });
    } else {
      setEditingLink(null);
      setLinkForm({
        category: 'custom',
        title: '',
        url: '',
        icon_url: '',
        description: '',
        is_active: true,
        sort_order: 0,
        requires_login: false,
        open_in_browser: false,
      });
    }
    setLinkDialogOpen(true);
  };

  const handleSaveLink = async () => {
    if (editingLink) {
      await updateLink(editingLink.id, linkForm);
    } else {
      await createLink(linkForm);
    }
    setLinkDialogOpen(false);
  };

  const handleDeleteLink = async () => {
    if (deletingLink) {
      await deleteLink(deletingLink.id);
      setDeleteDialogOpen(false);
      setDeletingLink(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'live_tv': return <Tv className="h-4 w-4" />;
      case 'ftp': return <Server className="h-4 w-4" />;
      case 'news': return <Newspaper className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Apps" subtitle="Configure mobile app settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customer Apps" subtitle="Configure mobile app and portal settings">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Image className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Features
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Links ({links.length})
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> App Store
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>App Branding</CardTitle>
              <CardDescription>Customize how your app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>App Name</Label>
                  <Input
                    value={formData.app_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, app_name: e.target.value }))}
                    placeholder="My ISP App"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUploader
                    label="App Icon"
                    value={formData.app_icon_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, app_icon_url: url }))}
                    folderPath="customer-apps/icons"
                    placeholder="Upload app icon (512x512 recommended)"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUploader
                    label="Splash Screen"
                    value={formData.splash_screen_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, splash_screen_url: url }))}
                    folderPath="customer-apps/splash"
                    placeholder="Upload splash screen image"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Primary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Secondary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
              <CardDescription>Configure dashboard banners and announcements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <ImageUploader
                    label="Dashboard Banner Image"
                    value={formData.dashboard_banner_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, dashboard_banner_url: url }))}
                    folderPath="customer-apps/banners"
                    placeholder="Upload dashboard banner (1200x400 recommended)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banner Click Link (Optional)</Label>
                  <Input
                    value={formData.dashboard_banner_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, dashboard_banner_link: e.target.value }))}
                    placeholder="https://example.com/promo"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Enable Announcement</Label>
                  <p className="text-sm text-muted-foreground">Show announcement on dashboard</p>
                </div>
                <Switch
                  checked={formData.dashboard_announcement_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dashboard_announcement_enabled: checked }))}
                />
              </div>

              {formData.dashboard_announcement_enabled && (
                <div className="space-y-2">
                  <Label>Announcement Message</Label>
                  <Textarea
                    value={formData.dashboard_announcement}
                    onChange={(e) => setFormData(prev => ({ ...prev, dashboard_announcement: e.target.value }))}
                    placeholder="Enter your announcement message..."
                    rows={3}
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Dashboard Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>App Features</CardTitle>
              <CardDescription>Enable or disable app features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'live_tv_enabled', label: 'Live TV', desc: 'Enable Live TV links section', icon: Tv },
                  { key: 'ftp_enabled', label: 'FTP Server', desc: 'Enable FTP server links', icon: Server },
                  { key: 'news_enabled', label: 'News', desc: 'Enable news section', icon: Newspaper },
                  { key: 'referral_enabled', label: 'Referral Program', desc: 'Enable customer referrals', icon: Settings },
                  { key: 'speed_test_enabled', label: 'Speed Test', desc: 'Enable speed test feature', icon: Settings },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Label className="text-base font-medium">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={(formData as any)[key]}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Features
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>App Links</CardTitle>
                <CardDescription>Manage Live TV, FTP, News and custom links</CardDescription>
              </div>
              <Button onClick={() => handleOpenLinkDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Add Link
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No links added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      links.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(link.category)}
                              <span className="capitalize">{link.category.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{link.title}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {link.url}
                          </TableCell>
                          <TableCell>
                            <Badge variant={link.is_active ? 'default' : 'secondary'}>
                              {link.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{link.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenLinkDialog(link)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => { setDeletingLink(link); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* App Store Tab */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>App Store Links</CardTitle>
              <CardDescription>Configure Play Store and App Store links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Android App URL (Play Store)</Label>
                  <Input
                    value={formData.android_app_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, android_app_url: e.target.value }))}
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>iOS App URL (App Store)</Label>
                  <Input
                    value={formData.ios_app_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, ios_app_url: e.target.value }))}
                    placeholder="https://apps.apple.com/app/..."
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Store Links
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>App Maintenance</CardTitle>
              <CardDescription>Manage app updates and maintenance mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <Label className="text-base font-medium">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Show maintenance message to all users</p>
                </div>
                <Switch
                  checked={formData.maintenance_mode}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, maintenance_mode: checked }))}
                />
              </div>

              {formData.maintenance_mode && (
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={formData.maintenance_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, maintenance_message: e.target.value }))}
                    placeholder="We are currently performing maintenance. Please try again later."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Force Update</Label>
                  <p className="text-sm text-muted-foreground">Force users to update to minimum version</p>
                </div>
                <Switch
                  checked={formData.force_update_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, force_update_enabled: checked }))}
                />
              </div>

              {formData.force_update_enabled && (
                <div className="space-y-2">
                  <Label>Minimum App Version</Label>
                  <Input
                    value={formData.min_app_version}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_app_version: e.target.value }))}
                    placeholder="1.0.0"
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Maintenance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Link' : 'Add New Link'}</DialogTitle>
            <DialogDescription>Configure the link details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={linkForm.category}
                onValueChange={(value: any) => setLinkForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={linkForm.title}
                onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Link title"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={linkForm.url}
                onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <ImageUploader
              label="Link Icon"
              value={linkForm.icon_url}
              onChange={(url) => setLinkForm(prev => ({ ...prev, icon_url: url }))}
              folderPath="customer-apps/link-icons"
              placeholder="Upload or enter icon URL"
            />
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={linkForm.description}
                onChange={(e) => setLinkForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={linkForm.sort_order}
                  onChange={(e) => setLinkForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={linkForm.is_active}
                  onCheckedChange={(checked) => setLinkForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={linkForm.requires_login}
                  onCheckedChange={(checked) => setLinkForm(prev => ({ ...prev, requires_login: checked }))}
                />
                <Label>Requires Login</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={linkForm.open_in_browser}
                  onCheckedChange={(checked) => setLinkForm(prev => ({ ...prev, open_in_browser: checked }))}
                />
                <Label>Open in Browser</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLink}>{editingLink ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLink?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
