import { useState } from 'react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy';
import { MapPin, Plus, Trash2, Loader2, Building, Map, Home, Trees } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

type DialogType = 'district' | 'upazila' | 'union' | 'village' | null;

export default function AreasManagement() {
  const {
    districts, upazilas, unions, villages, loading,
    createDistrict, createUpazila, createUnion, createVillage,
    deleteDistrict, deleteUpazila, deleteUnion, deleteVillage,
    fetchUpazilas, fetchUnions, fetchVillages
  } = useLocationHierarchy();

  const [activeTab, setActiveTab] = useState('districts');
  const [showDialog, setShowDialog] = useState<DialogType>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: DialogType; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [districtName, setDistrictName] = useState('');
  const [upazilaName, setUpazilaName] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [unionName, setUnionName] = useState('');
  const [selectedUpazilaId, setSelectedUpazilaId] = useState('');
  const [villageName, setVillageName] = useState('');
  const [selectedUnionId, setSelectedUnionId] = useState('');
  const [sectionBlock, setSectionBlock] = useState('');

  // Filtered lists based on selection
  const [filteredUpazilas, setFilteredUpazilas] = useState(upazilas);
  const [filteredUnions, setFilteredUnions] = useState(unions);
  const [filteredVillages, setFilteredVillages] = useState(villages);

  const resetForm = () => {
    setDistrictName('');
    setUpazilaName('');
    setSelectedDistrictId('');
    setUnionName('');
    setSelectedUpazilaId('');
    setVillageName('');
    setSelectedUnionId('');
    setSectionBlock('');
  };

  const handleSubmit = async (type: DialogType) => {
    if (!type) return;
    setSaving(true);

    try {
      switch (type) {
        case 'district':
          await createDistrict(districtName);
          break;
        case 'upazila':
          await createUpazila(upazilaName, selectedDistrictId);
          break;
        case 'union':
          await createUnion(unionName, selectedUpazilaId);
          break;
        case 'village':
          await createVillage(villageName, selectedUnionId, sectionBlock);
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

  // Get parent names for display
  const getDistrictName = (districtId: string) => districts.find(d => d.id === districtId)?.name || '-';
  const getUpazilaName = (upazilaId: string) => upazilas.find(u => u.id === upazilaId)?.name || '-';
  const getUnionName = (unionId: string) => unions.find(u => u.id === unionId)?.name || '-';

  return (
    <DashboardLayout
      title="Location Management"
      subtitle="Manage hierarchical locations: District → Upazila → Union → Village"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Hierarchy
          </CardTitle>
          <CardDescription>
            Create and manage locations in hierarchical order. First add Districts, then Upazilas under them, and so on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="districts" className="gap-2">
                <Building className="h-4 w-4" />
                Districts ({districts.length})
              </TabsTrigger>
              <TabsTrigger value="upazilas" className="gap-2">
                <Map className="h-4 w-4" />
                Upazilas ({upazilas.length})
              </TabsTrigger>
              <TabsTrigger value="unions" className="gap-2">
                <Home className="h-4 w-4" />
                Unions ({unions.length})
              </TabsTrigger>
              <TabsTrigger value="villages" className="gap-2">
                <Trees className="h-4 w-4" />
                Villages ({villages.length})
              </TabsTrigger>
            </TabsList>

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
                      <TableHead>Upazilas</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : districts.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No districts found. Add your first district.</TableCell></TableRow>
                    ) : (
                      districts.map((district) => (
                        <TableRow key={district.id}>
                          <TableCell className="font-medium">{district.name}</TableCell>
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
                  Add Upazila/Police Station
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Upazila Name</TableHead>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : villages.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No villages found. Add a union first, then add villages.</TableCell></TableRow>
                    ) : (
                      villages.map((village) => (
                        <TableRow key={village.id}>
                          <TableCell className="font-medium">{village.name}</TableCell>
                          <TableCell>{getUnionName(village.union_id)}</TableCell>
                          <TableCell>{village.section_block || '-'}</TableCell>
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

      {/* Add District Dialog */}
      <Dialog open={showDialog === 'district'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New District</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>District Name *</Label>
              <Input
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                placeholder="e.g., Dhaka, Chittagong"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit('district')} disabled={saving || !districtName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create District
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Upazila Dialog */}
      <Dialog open={showDialog === 'upazila'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Upazila/Police Station</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select District *</Label>
              <Select value={selectedDistrictId} onValueChange={setSelectedDistrictId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upazila/Police Station Name *</Label>
              <Input
                value={upazilaName}
                onChange={(e) => setUpazilaName(e.target.value)}
                placeholder="e.g., Dhanmondi, Gulshan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit('upazila')} disabled={saving || !upazilaName || !selectedDistrictId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Upazila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Union Dialog */}
      <Dialog open={showDialog === 'union'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Union</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Upazila *</Label>
              <Select value={selectedUpazilaId} onValueChange={setSelectedUpazilaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an upazila" />
                </SelectTrigger>
                <SelectContent>
                  {upazilas.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({getDistrictName(u.district_id)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Union Name *</Label>
              <Input
                value={unionName}
                onChange={(e) => setUnionName(e.target.value)}
                placeholder="e.g., Ward 1, Union Parishad"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit('union')} disabled={saving || !unionName || !selectedUpazilaId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Union
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Village Dialog */}
      <Dialog open={showDialog === 'village'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Village/Market</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Union *</Label>
              <Select value={selectedUnionId} onValueChange={setSelectedUnionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a union" />
                </SelectTrigger>
                <SelectContent>
                  {unions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({getUpazilaName(u.upazila_id)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Village/Market Name *</Label>
              <Input
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="e.g., Banani Market, Mohakhali"
              />
            </div>
            <div className="space-y-2">
              <Label>Section/Block (Optional)</Label>
              <Input
                value={sectionBlock}
                onChange={(e) => setSectionBlock(e.target.value)}
                placeholder="e.g., Block A, Section 2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
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
              Are you sure you want to delete "{deleteConfirm?.name}"? This will also delete all child items.
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
