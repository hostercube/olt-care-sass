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
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
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

  const { t } = useLanguageCurrency();

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

  // Filtered lists for cascading selects
  const filteredDistrictsForUpazila = useMemo(() => {
    if (!upazilaDivisionId) return districts;
    return districts.filter(d => d.division_id === upazilaDivisionId);
  }, [districts, upazilaDivisionId]);

  const filteredDistrictsForUnion = useMemo(() => {
    if (!unionDivisionId) return districts;
    return districts.filter(d => d.division_id === unionDivisionId);
  }, [districts, unionDivisionId]);

  const filteredUpazilasForUnion = useMemo(() => {
    if (!unionDistrictId) return upazilas;
    return upazilas.filter(u => u.district_id === unionDistrictId);
  }, [upazilas, unionDistrictId]);

  const filteredDistrictsForVillage = useMemo(() => {
    if (!villageDivisionId) return districts;
    return districts.filter(d => d.division_id === villageDivisionId);
  }, [districts, villageDivisionId]);

  const filteredUpazilasForVillage = useMemo(() => {
    if (!villageDistrictId) return upazilas;
    return upazilas.filter(u => u.district_id === villageDistrictId);
  }, [upazilas, villageDistrictId]);

  const filteredUnionsForVillage = useMemo(() => {
    if (!villageUpazilaId) return unions;
    return unions.filter(u => u.upazila_id === villageUpazilaId);
  }, [unions, villageUpazilaId]);

  return (
    <DashboardLayout
      title={t('location_management')}
      subtitle={t('manage_hierarchical_locations')}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('location_hierarchy')}
          </CardTitle>
          <CardDescription>
            {t('create_manage_locations')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="divisions" className="gap-1 text-xs sm:text-sm">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{t('divisions')}</span> ({divisions.length})
              </TabsTrigger>
              <TabsTrigger value="districts" className="gap-1 text-xs sm:text-sm">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">{t('districts')}</span> ({districts.length})
              </TabsTrigger>
              <TabsTrigger value="upazilas" className="gap-1 text-xs sm:text-sm">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">{t('upazilas')}</span> ({upazilas.length})
              </TabsTrigger>
              <TabsTrigger value="unions" className="gap-1 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">{t('unions')}</span> ({unions.length})
              </TabsTrigger>
              <TabsTrigger value="villages" className="gap-1 text-xs sm:text-sm">
                <Trees className="h-4 w-4" />
                <span className="hidden sm:inline">{t('villages')}</span> ({villages.length})
              </TabsTrigger>
            </TabsList>

            {/* Divisions Tab */}
            <TabsContent value="divisions" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowDialog('division')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_division')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('division_name')}</TableHead>
                      <TableHead>{t('districts')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : divisions.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t('no_divisions_found')}</TableCell></TableRow>
                    ) : (
                      divisions.map((division) => (
                        <TableRow key={division.id}>
                          <TableCell className="font-medium">{division.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{districts.filter(d => d.division_id === division.id).length} {t('districts')}</Badge>
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
                  {t('add_district')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('district_name')}</TableHead>
                      <TableHead>{t('division')}</TableHead>
                      <TableHead>{t('upazilas')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : districts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('no_districts_found')}</TableCell></TableRow>
                    ) : (
                      districts.map((district) => (
                        <TableRow key={district.id}>
                          <TableCell className="font-medium">{district.name}</TableCell>
                          <TableCell>{district.division_id ? getDivisionName(district.division_id) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{upazilas.filter(u => u.district_id === district.id).length} {t('upazilas')}</Badge>
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
                  {t('add_upazila')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('upazila_name')}</TableHead>
                      <TableHead>{t('district')}</TableHead>
                      <TableHead>{t('unions')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : upazilas.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('no_upazilas_found')}</TableCell></TableRow>
                    ) : (
                      upazilas.map((upazila) => (
                        <TableRow key={upazila.id}>
                          <TableCell className="font-medium">{upazila.name}</TableCell>
                          <TableCell>{getDistrictName(upazila.district_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{unions.filter(u => u.upazila_id === upazila.id).length} {t('unions')}</Badge>
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
                  {t('add_union')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('union_name')}</TableHead>
                      <TableHead>{t('upazila')}</TableHead>
                      <TableHead>{t('villages')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : unions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('no_unions_found')}</TableCell></TableRow>
                    ) : (
                      unions.map((union) => (
                        <TableRow key={union.id}>
                          <TableCell className="font-medium">{union.name}</TableCell>
                          <TableCell>{getUpazilaName(union.upazila_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{villages.filter(v => v.union_id === union.id).length} {t('villages')}</Badge>
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
                  {t('add_village')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('village_name')}</TableHead>
                      <TableHead>{t('union')}</TableHead>
                      <TableHead>{t('section_block')}</TableHead>
                      <TableHead>{t('road_house')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : villages.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('no_villages_found')}</TableCell></TableRow>
                    ) : (
                      villages.map((village) => (
                        <TableRow key={village.id}>
                          <TableCell className="font-medium">{village.name}</TableCell>
                          <TableCell>{getUnionName(village.union_id)}</TableCell>
                          <TableCell>{village.section_block || '-'}</TableCell>
                          <TableCell>
                            {village.road_no || village.house_no 
                              ? `${village.road_no ? `Road ${village.road_no}` : ''}${village.road_no && village.house_no ? ', ' : ''}${village.house_no ? `House ${village.house_no}` : ''}`
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
            <DialogTitle>{t('add_division')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('division_name')} *</Label>
              <Input
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                placeholder={t('division_name')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>{t('cancel')}</Button>
            <Button onClick={() => handleSubmit('division')} disabled={saving || !divisionName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add District Dialog */}
      <Dialog open={showDialog === 'district'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_district')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('division')} ({t('optional')})</Label>
              <SearchableSelect
                options={divisions.map(d => ({ value: d.id, label: d.name }))}
                value={selectedDivisionId}
                onChange={setSelectedDivisionId}
                placeholder={t('select_division')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('district_name')} *</Label>
              <Input
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                placeholder={t('district_name')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>{t('cancel')}</Button>
            <Button onClick={() => handleSubmit('district')} disabled={saving || !districtName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Upazila Dialog */}
      <Dialog open={showDialog === 'upazila'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_upazila')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('division')} ({t('optional')})</Label>
              <SearchableSelect
                options={divisions.map(d => ({ value: d.id, label: d.name }))}
                value={upazilaDivisionId}
                onChange={(v) => { setUpazilaDivisionId(v); setSelectedDistrictId(''); }}
                placeholder={t('select_division')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('district')} *</Label>
              <SearchableSelect
                options={filteredDistrictsForUpazila.map(d => ({ value: d.id, label: d.name }))}
                value={selectedDistrictId}
                onChange={setSelectedDistrictId}
                placeholder={t('select_district')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('upazila_name')} *</Label>
              <Input
                value={upazilaName}
                onChange={(e) => setUpazilaName(e.target.value)}
                placeholder={t('upazila_name')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>{t('cancel')}</Button>
            <Button onClick={() => handleSubmit('upazila')} disabled={saving || !upazilaName || !selectedDistrictId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Union Dialog */}
      <Dialog open={showDialog === 'union'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_union')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('division')}</Label>
                <SearchableSelect
                  options={divisions.map(d => ({ value: d.id, label: d.name }))}
                  value={unionDivisionId}
                  onChange={(v) => { setUnionDivisionId(v); setUnionDistrictId(''); setSelectedUpazilaId(''); }}
                  placeholder={t('select_division')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('district')}</Label>
                <SearchableSelect
                  options={filteredDistrictsForUnion.map(d => ({ value: d.id, label: d.name }))}
                  value={unionDistrictId}
                  onChange={(v) => { setUnionDistrictId(v); setSelectedUpazilaId(''); }}
                  placeholder={t('select_district')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('upazila')} *</Label>
              <SearchableSelect
                options={filteredUpazilasForUnion.map(u => ({ value: u.id, label: u.name }))}
                value={selectedUpazilaId}
                onChange={setSelectedUpazilaId}
                placeholder={t('select_upazila')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('union_name')} *</Label>
              <Input
                value={unionName}
                onChange={(e) => setUnionName(e.target.value)}
                placeholder={t('union_name')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>{t('cancel')}</Button>
            <Button onClick={() => handleSubmit('union')} disabled={saving || !unionName || !selectedUpazilaId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Village Dialog */}
      <Dialog open={showDialog === 'village'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('add_village')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('division')}</Label>
                <SearchableSelect
                  options={divisions.map(d => ({ value: d.id, label: d.name }))}
                  value={villageDivisionId}
                  onChange={(v) => { setVillageDivisionId(v); setVillageDistrictId(''); setVillageUpazilaId(''); setSelectedUnionId(''); }}
                  placeholder={t('select_division')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('district')}</Label>
                <SearchableSelect
                  options={filteredDistrictsForVillage.map(d => ({ value: d.id, label: d.name }))}
                  value={villageDistrictId}
                  onChange={(v) => { setVillageDistrictId(v); setVillageUpazilaId(''); setSelectedUnionId(''); }}
                  placeholder={t('select_district')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('upazila')}</Label>
                <SearchableSelect
                  options={filteredUpazilasForVillage.map(u => ({ value: u.id, label: u.name }))}
                  value={villageUpazilaId}
                  onChange={(v) => { setVillageUpazilaId(v); setSelectedUnionId(''); }}
                  placeholder={t('select_upazila')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('union')} *</Label>
                <SearchableSelect
                  options={filteredUnionsForVillage.map(u => ({ value: u.id, label: u.name }))}
                  value={selectedUnionId}
                  onChange={setSelectedUnionId}
                  placeholder={t('select_union')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('village_name')} *</Label>
              <Input
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder={t('village_name')}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('section_block')}</Label>
                <Input
                  value={sectionBlock}
                  onChange={(e) => setSectionBlock(e.target.value)}
                  placeholder="A, B, C..."
                />
              </div>
              <div className="space-y-2">
                <Label>Road No</Label>
                <Input
                  value={roadNo}
                  onChange={(e) => setRoadNo(e.target.value)}
                  placeholder="1, 2, 3..."
                />
              </div>
              <div className="space-y-2">
                <Label>House No</Label>
                <Input
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  placeholder="1, 2, 3..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>{t('cancel')}</Button>
            <Button onClick={() => handleSubmit('village')} disabled={saving || !villageName || !selectedUnionId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete')} {deleteConfirm?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('are_you_sure')} "{deleteConfirm?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}