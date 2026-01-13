import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  MapPin, 
  Copy, 
  RefreshCw, 
  Settings, 
  Eye, 
  CheckCircle, 
  Search,
  Link,
  Smartphone,
  Globe,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { useCustomerLocation, LocationVisit, LocationFilters } from '@/hooks/useCustomerLocation';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function CustomerLocation() {
  const { toast } = useToast();
  const { tenantId, tenant } = useTenantContext() as any;
  
  const {
    visits,
    settings,
    visitsLoading,
    settingsLoading,
    saveSettings,
    regenerateToken,
    verifyVisit,
    filterVisits,
    uniqueAreas,
    uniqueDistricts,
    isSaving,
    isRegenerating,
    isVerifying,
  } = useCustomerLocation(tenantId);

  const [activeTab, setActiveTab] = useState('visits');
  const [filters, setFilters] = useState<LocationFilters>({});
  const [selectedVisit, setSelectedVisit] = useState<LocationVisit | null>(null);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    is_active: settings?.is_active ?? true,
    popup_title: settings?.popup_title ?? 'Please provide your details',
    popup_description: settings?.popup_description ?? 'Enter your name and phone number for verification',
    require_name: settings?.require_name ?? false,
    require_phone: settings?.require_phone ?? false,
  });

  // Update form when settings load
  useMemo(() => {
    if (settings) {
      setSettingsForm({
        is_active: settings.is_active,
        popup_title: settings.popup_title,
        popup_description: settings.popup_description,
        require_name: settings.require_name,
        require_phone: settings.require_phone,
      });
    }
  }, [settings]);

  // Filter and paginate visits
  const filteredVisits = useMemo(() => filterVisits(filters), [filterVisits, filters]);
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVisits.slice(start, start + pageSize);
  }, [filteredVisits, currentPage, pageSize]);

  // Generate full location link
  const locationLink = useMemo(() => {
    if (!settings?.unique_token) return '';
    const baseUrl = tenant?.custom_domain 
      ? `https://${tenant.custom_domain}`
      : window.location.origin;
    return `${baseUrl}/l/${settings.unique_token}`;
  }, [settings?.unique_token, tenant?.custom_domain]);

  const copyLink = () => {
    navigator.clipboard.writeText(locationLink);
    toast({
      title: 'Link copied!',
      description: 'Location capture link copied to clipboard.',
    });
  };

  const handleSaveSettings = () => {
    saveSettings(settingsForm);
  };

  const handleVerify = (visitId: string, status: 'verified' | 'completed') => {
    verifyVisit({ visitId, status });
  };

  const openMapDialog = (visit: LocationVisit) => {
    setSelectedVisit(visit);
    setShowMapDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'verified':
        return <Badge className="bg-blue-500">Verified</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Customer Location">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Location</h1>
              <p className="text-muted-foreground">
                Capture and verify customer locations via unique shareable links
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="visits" className="gap-2">
                <MapPin className="h-4 w-4" />
                Location Visits
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings & Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Name, phone, IP..."
                          value={filters.search || ''}
                          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="w-[150px]">
                      <Label>Status</Label>
                      <Select
                        value={filters.status || 'all'}
                        onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[150px]">
                      <Label>District</Label>
                      <Select
                        value={filters.district || 'all'}
                        onValueChange={(v) => setFilters(f => ({ ...f, district: v === 'all' ? undefined : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Districts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Districts</SelectItem>
                          {uniqueDistricts.map(d => (
                            <SelectItem key={d} value={d!}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[150px]">
                      <Label>Date From</Label>
                      <Input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                      />
                    </div>

                    <div className="w-[150px]">
                      <Label>Date To</Label>
                      <Input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                      />
                    </div>

                    {Object.values(filters).some(Boolean) && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Visits Table */}
              <Card>
                <CardContent className="pt-4">
                  {visitsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredVisits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No location visits found</p>
                      <p className="text-sm">Share your unique link to start capturing locations</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>IP / ISP</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVisits.map((visit) => (
                            <TableRow key={visit.id}>
                              <TableCell>
                                {visit.name || <span className="text-muted-foreground">Not provided</span>}
                              </TableCell>
                              <TableCell>
                                {visit.phone || <span className="text-muted-foreground">Not provided</span>}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {visit.full_address || `${visit.area || ''} ${visit.district || ''}`.trim() || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{visit.ip_address || 'Unknown'}</div>
                                  <div className="text-muted-foreground text-xs">{visit.isp_name || ''}</div>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(visit.verified_status)}</TableCell>
                              <TableCell>
                                {format(new Date(visit.visited_at), 'dd MMM yyyy, hh:mm a')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openMapDialog(visit)}
                                    disabled={!visit.latitude || !visit.longitude}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {visit.verified_status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleVerify(visit.id, 'verified')}
                                      disabled={isVerifying}
                                    >
                                      Verify
                                    </Button>
                                  )}
                                  {visit.verified_status === 'verified' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleVerify(visit.id, 'completed')}
                                      disabled={isVerifying}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Complete
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <TablePagination
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={filteredVisits.length}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {/* Link Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Unique Location Link
                  </CardTitle>
                  <CardDescription>
                    Share this link with customers via SMS, WhatsApp, or Messenger
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings?.unique_token ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input value={locationLink} readOnly className="font-mono text-sm" />
                        <Button variant="outline" onClick={copyLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => regenerateToken()}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ⚠️ Regenerating the token will invalidate the old link
                      </p>
                    </>
                  ) : (
                    <Button onClick={() => saveSettings({ is_active: true })} disabled={isSaving}>
                      Generate Location Link
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Capture Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how location capture works for your customers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Location Capture</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to submit their location
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.is_active}
                      onCheckedChange={(checked) => setSettingsForm(f => ({ ...f, is_active: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Popup Title</Label>
                    <Input
                      value={settingsForm.popup_title}
                      onChange={(e) => setSettingsForm(f => ({ ...f, popup_title: e.target.value }))}
                      placeholder="Please provide your details"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Popup Description</Label>
                    <Input
                      value={settingsForm.popup_description}
                      onChange={(e) => setSettingsForm(f => ({ ...f, popup_description: e.target.value }))}
                      placeholder="Enter your name and phone number"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Name</Label>
                      <p className="text-sm text-muted-foreground">
                        Make name field mandatory
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.require_name}
                      onCheckedChange={(checked) => setSettingsForm(f => ({ ...f, require_name: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Phone</Label>
                      <p className="text-sm text-muted-foreground">
                        Make phone field mandatory
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.require_phone}
                      onCheckedChange={(checked) => setSettingsForm(f => ({ ...f, require_phone: checked }))}
                    />
                  </div>

                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">1. Share Link</h4>
                        <p className="text-sm text-muted-foreground">
                          Send the unique link to customers via SMS or messaging apps
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">2. Auto Capture</h4>
                        <p className="text-sm text-muted-foreground">
                          Customer opens on mobile, GPS location captured automatically
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">3. Verify</h4>
                        <p className="text-sm text-muted-foreground">
                          Review locations on map and verify customer addresses
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Map Dialog */}
          <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Customer Location</DialogTitle>
                <DialogDescription>
                  {selectedVisit?.name || 'Unknown'} - {selectedVisit?.phone || 'No phone'}
                </DialogDescription>
              </DialogHeader>
              {selectedVisit?.latitude && selectedVisit?.longitude ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden border">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedVisit.latitude},${selectedVisit.longitude}&zoom=15`}
                      allowFullScreen
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coordinates:</span>
                      <p className="font-mono">{selectedVisit.latitude}, {selectedVisit.longitude}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <p>{selectedVisit.full_address || 'Not available'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP Address:</span>
                      <p>{selectedVisit.ip_address || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ISP:</span>
                      <p>{selectedVisit.isp_name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://www.google.com/maps?q=${selectedVisit.latitude},${selectedVisit.longitude}`, '_blank')}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Open in Google Maps
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Location coordinates not available</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
  );
}
