import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MapPin, Plus, Trash2, Loader2, Globe, Building, Map, Home, Trees } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';


type DialogType = 'division' | 'district' | 'upazila' | 'union' | 'village' | null;

export default function AreasManagement() {
  const {
    divisions, districts, upazilas, unions, villages, loading,
    createDivision, deleteDivision,
    createDistrict, deleteDistrict,
    createUpazila, deleteUpazila,
    createUnion, deleteUnion,
    createVillage, deleteVillage,
    getDivisionName, getDistrictName, getUpazilaName, getUnionName
  } = useLocationHierarchy();

  const [activeTab, setActiveTab] = useState('divisions');
  const [showDialog, setShowDialog] = useState<DialogType>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: DialogType; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [divisionName, setDivisionName] = useState('');

  // District
  const [districtName, setDistrictName] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');

  // Upazila
  const [upazilaName, setUpazilaName] = useState('');
  const [upazilaDivisionId, setUpazilaDivisionId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  // Union
  const [unionName, setUnionName] = useState('');
  const [unionDivisionId, setUnionDivisionId] = useState('');
  const [unionDistrictId, setUnionDistrictId] = useState('');
  const [selectedUpazilaId, setSelectedUpazilaId] = useState('');

  // Village
  const [villageName, setVillageName] = useState('');
  const [villageDivisionId, setVillageDivisionId] = useState('');
  const [villageDistrictId, setVillageDistrictId] = useState('');
  const [villageUpazilaId, setVillageUpazilaId] = useState('');
  const [selectedUnionId, setSelectedUnionId] = useState('');
  const [sectionBlock, setSectionBlock] = useState('');
  const [roadNo, setRoadNo] = useState('');
  const [houseNo, setHouseNo] = useState('');

  const resetForm = () => {
    setDivisionName('');

    setDistrictName('');
    setSelectedDivisionId('');

    setUpazilaName('');
    setUpazilaDivisionId('');
    setSelectedDistrictId('');

    setUnionName('');
    setUnionDivisionId('');
    setUnionDistrictId('');
    setSelectedUpazilaId('');

    setVillageName('');
    setVillageDivisionId('');
    setVillageDistrictId('');
    setVillageUpazilaId('');
    setSelectedUnionId('');

    setSectionBlock('');
    setRoadNo('');
    setHouseNo('');
  };

  const handleSubmit = async (type: DialogType) => {
    if (!type) return;
    setSaving(true);

    try {
      switch (type) {
        case 'division':
          await createDivision(divisionName);
          break;
        case 'district':
          await createDistrict(districtName, selectedDivisionId || undefined);
          break;
        case 'upazila':
          await createUpazila(upazilaName, selectedDistrictId);
          break;
        case 'union':
          await createUnion(unionName, selectedUpazilaId);
          break;
        case 'village':
          await createVillage(villageName, selectedUnionId, sectionBlock, roadNo, houseNo);
          break;
      }
      setShowDialog(null);
      resetForm();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    switch (deleteConfirm.type) {
      case 'division':
        await deleteDivision(deleteConfirm.id);
        break;
      case 'district':
        await deleteDistrict(deleteConfirm.id);
        break;
      case 'upazila':
        await deleteUpazila(deleteConfirm.id);
        break;
      case 'union':
        await deleteUnion(deleteConfirm.id);
        break;
      case 'village':
        await deleteVillage(deleteConfirm.id);
        break;
    }
    setDeleteConfirm(null);
  };

  return (
    <DashboardLayout
      title="Location Management"
      subtitle="Manage hierarchical locations: Division → District → Upazila → Union → Village"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Hierarchy
          </CardTitle>
          <CardDescription>
            Create and manage locations in hierarchical order. First add Divisions, then Districts under them, and so on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="divisions" className="gap-1 text-xs sm:text-sm">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Divisions</span> ({divisions.length})
              </TabsTrigger>
              <TabsTrigger value="districts" className="gap-1 text-xs sm:text-sm">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Districts</span> ({districts.length})
              </TabsTrigger>
              <TabsTrigger value="upazilas" className="gap-1 text-xs sm:text-sm">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Upazilas</span> ({upazilas.length})
              </TabsTrigger>
              <TabsTrigger value="unions" className="gap-1 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Unions</span> ({unions.length})
              </TabsTrigger>
              <TabsTrigger value="villages" className="gap-1 text-xs sm:text-sm">
                <Trees className="h-4 w-4" />
                <span className="hidden sm:inline">Villages</span> ({villages.length})
              </TabsTrigger>
            </TabsList>

            {/* Divisions Tab */}
            <TabsContent value="divisions" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('division')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Division
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Division Name</TableHead>
                      <TableHead>Districts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : divisions.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No divisions found. Add your first division (e.g., Dhaka, Chittagong).</TableCell></TableRow>
                    ) : (
                      divisions.map((division) => (
                        <TableRow key={division.id}>
                          <TableCell className="font-medium">{division.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{districts.filter(d => d.division_id === division.id).length} Districts</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'division', id: division.id, name: division.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Districts Tab */}
            <TabsContent value="districts" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('district')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add District
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>District Name</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Upazilas</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : districts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No districts found. Add a division first, then add districts.</TableCell></TableRow>
                    ) : (
                      districts.map((district) => (
                        <TableRow key={district.id}>
                          <TableCell className="font-medium">{district.name}</TableCell>
                          <TableCell>{district.division_id ? getDivisionName(district.division_id) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{upazilas.filter(u => u.district_id === district.id).length} Upazilas</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'district', id: district.id, name: district.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Upazilas Tab */}
            <TabsContent value="upazilas" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('upazila')} disabled={districts.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Upazila/Thana
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Upazila/Thana Name</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Unions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : upazilas.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No upazilas found. Add a district first, then add upazilas.</TableCell></TableRow>
                    ) : (
                      upazilas.map((upazila) => (
                        <TableRow key={upazila.id}>
                          <TableCell className="font-medium">{upazila.name}</TableCell>
                          <TableCell>{getDistrictName(upazila.district_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{unions.filter(u => u.upazila_id === upazila.id).length} Unions</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'upazila', id: upazila.id, name: upazila.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Unions Tab */}
            <TabsContent value="unions" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('union')} disabled={upazilas.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Union
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Union Name</TableHead>
                      <TableHead>Upazila</TableHead>
                      <TableHead>Villages</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : unions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No unions found. Add an upazila first, then add unions.</TableCell></TableRow>
                    ) : (
                      unions.map((union) => (
                        <TableRow key={union.id}>
                          <TableCell className="font-medium">{union.name}</TableCell>
                          <TableCell>{getUpazilaName(union.upazila_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{villages.filter(v => v.union_id === union.id).length} Villages</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'union', id: union.id, name: union.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Villages Tab */}
            <TabsContent value="villages" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('village')} disabled={unions.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Village/Market
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Village/Market Name</TableHead>
                      <TableHead>Union</TableHead>
                      <TableHead>Section/Block</TableHead>
                      <TableHead>Road/House</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : villages.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No villages found. Add a union first, then add villages.</TableCell></TableRow>
                    ) : (
                      villages.map((village) => (
                        <TableRow key={village.id}>
                          <TableCell className="font-medium">{village.name}</TableCell>
                          <TableCell>{getUnionName(village.union_id)}</TableCell>
                          <TableCell>{village.section_block || '-'}</TableCell>
                          <TableCell>
                            {village.road_no || village.house_no 
                              ? `${village.road_no || ''}${village.road_no && village.house_no ? '/' : ''}${village.house_no || ''}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'village', id: village.id, name: village.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Division Dialog */}
      <Dialog open={showDialog === 'division'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Division</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Division Name *</Label>
              <Input
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                placeholder="e.g., Dhaka, Chittagong, Rajshahi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit('division')} disabled={saving || !divisionName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Division
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add District Dialog */}
      <Dialog open={showDialog === 'district'} onOpenChange={(open) => { if (!open) { setShowDialog(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New District</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Division (Optional)</Label>
              <SearchableSelect
                value={selectedDivisionId}
                onValueChange={(v) => setSelectedDivisionId(v)}
                options={divisions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Select a division"
                allowClear
                clearLabel="None"
              />
            </div>
            <div className="space-y-2">
              <Label>District Name *</Label>
              <Input
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                placeholder="e.g., Gazipur, Narayanganj"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => handleSubmit('district')} disabled={saving || !districtName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create District
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Upazila Dialog */}
      <Dialog open={showDialog === 'upazila'} onOpenChange={(open) => { if (!open) { setShowDialog(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Upazila/Thana</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Division *</Label>
              <SearchableSelect
                value={upazilaDivisionId}
                onValueChange={(v) => {
                  setUpazilaDivisionId(v);
                  setSelectedDistrictId('');
                }}
                options={divisions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Select a division"
              />
            </div>

            <div className="space-y-2">
              <Label>Select District *</Label>
              <SearchableSelect
                value={selectedDistrictId}
                onValueChange={(v) => setSelectedDistrictId(v)}
                options={districts
                  .filter((d) => !upazilaDivisionId || d.division_id === upazilaDivisionId)
                  .map((d) => ({ value: d.id, label: d.name }))}
                placeholder={upazilaDivisionId ? 'Select a district' : 'Select a division first'}
                disabled={!upazilaDivisionId}
              />
            </div>

            <div className="space-y-2">
              <Label>Upazila/Thana Name *</Label>
              <Input
                value={upazilaName}
                onChange={(e) => setUpazilaName(e.target.value)}
                placeholder="e.g., Dhanmondi, Gulshan"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => handleSubmit('upazila')} disabled={saving || !upazilaName || !selectedDistrictId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Upazila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Union Dialog */}
      <Dialog open={showDialog === 'union'} onOpenChange={(open) => { if (!open) { setShowDialog(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Union</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Division *</Label>
                <SearchableSelect
                  value={unionDivisionId}
                  onValueChange={(v) => {
                    setUnionDivisionId(v);
                    setUnionDistrictId('');
                    setSelectedUpazilaId('');
                  }}
                  options={divisions.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select a division"
                />
              </div>
              <div className="space-y-2">
                <Label>Select District *</Label>
                <SearchableSelect
                  value={unionDistrictId}
                  onValueChange={(v) => {
                    setUnionDistrictId(v);
                    setSelectedUpazilaId('');
                  }}
                  options={districts
                    .filter((d) => !unionDivisionId || d.division_id === unionDivisionId)
                    .map((d) => ({ value: d.id, label: d.name }))}
                  placeholder={unionDivisionId ? 'Select a district' : 'Select a division first'}
                  disabled={!unionDivisionId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Upazila *</Label>
              <SearchableSelect
                value={selectedUpazilaId}
                onValueChange={(v) => setSelectedUpazilaId(v)}
                options={upazilas
                  .filter((u) => !unionDistrictId || u.district_id === unionDistrictId)
                  .map((u) => ({ value: u.id, label: u.name }))}
                placeholder={unionDistrictId ? 'Select an upazila' : 'Select a district first'}
                disabled={!unionDistrictId}
              />
            </div>

            <div className="space-y-2">
              <Label>Union Name *</Label>
              <Input
                value={unionName}
                onChange={(e) => setUnionName(e.target.value)}
                placeholder="e.g., Rupganj, Araihazar"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => handleSubmit('union')} disabled={saving || !unionName || !selectedUpazilaId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Union
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Village Dialog */}
      <Dialog open={showDialog === 'village'} onOpenChange={(open) => { if (!open) { setShowDialog(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Village/Market</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Division *</Label>
                <SearchableSelect
                  value={villageDivisionId}
                  onValueChange={(v) => {
                    setVillageDivisionId(v);
                    setVillageDistrictId('');
                    setVillageUpazilaId('');
                    setSelectedUnionId('');
                  }}
                  options={divisions.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select a division"
                />
              </div>
              <div className="space-y-2">
                <Label>Select District *</Label>
                <SearchableSelect
                  value={villageDistrictId}
                  onValueChange={(v) => {
                    setVillageDistrictId(v);
                    setVillageUpazilaId('');
                    setSelectedUnionId('');
                  }}
                  options={districts
                    .filter((d) => !villageDivisionId || d.division_id === villageDivisionId)
                    .map((d) => ({ value: d.id, label: d.name }))}
                  placeholder={villageDivisionId ? 'Select a district' : 'Select a division first'}
                  disabled={!villageDivisionId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Upazila *</Label>
                <SearchableSelect
                  value={villageUpazilaId}
                  onValueChange={(v) => {
                    setVillageUpazilaId(v);
                    setSelectedUnionId('');
                  }}
                  options={upazilas
                    .filter((u) => !villageDistrictId || u.district_id === villageDistrictId)
                    .map((u) => ({ value: u.id, label: u.name }))}
                  placeholder={villageDistrictId ? 'Select an upazila' : 'Select a district first'}
                  disabled={!villageDistrictId}
                />
              </div>
              <div className="space-y-2">
                <Label>Select Union *</Label>
                <SearchableSelect
                  value={selectedUnionId}
                  onValueChange={(v) => setSelectedUnionId(v)}
                  options={unions
                    .filter((u) => !villageUpazilaId || u.upazila_id === villageUpazilaId)
                    .map((u) => ({ value: u.id, label: u.name }))}
                  placeholder={villageUpazilaId ? 'Select a union' : 'Select an upazila first'}
                  disabled={!villageUpazilaId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Village/Market Name *</Label>
              <Input
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="e.g., Bazar, Para"
              />
            </div>

            <div className="space-y-2">
              <Label>Section/Block (Optional)</Label>
              <Input
                value={sectionBlock}
                onChange={(e) => setSectionBlock(e.target.value)}
                placeholder="e.g., Block A, Section 10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Road No (Optional)</Label>
                <Input value={roadNo} onChange={(e) => setRoadNo(e.target.value)} placeholder="e.g., Road 5" />
              </div>
              <div className="space-y-2">
                <Label>House No (Optional)</Label>
                <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="e.g., 123" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(null); resetForm(); }}>Cancel</Button>
            <Button onClick={() => handleSubmit('village')} disabled={saving || !villageName || !selectedUnionId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Village
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will also delete all child locations and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
