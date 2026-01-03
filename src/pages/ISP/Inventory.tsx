import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Package, Plus, Edit, Trash2, Loader2, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  sale_price: number;
  location: string | null;
}

export default function Inventory() {
  const { tenantId } = useTenantContext();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    quantity: '0',
    min_quantity: '0',
    unit_price: '0',
    sale_price: '0',
    location: '',
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        supabase.from('inventory_categories').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('inventory_items').select('*').eq('tenant_id', tenantId).order('name'),
      ]);
      setCategories((catRes.data as any[]) || []);
      setItems((itemRes.data as any[]) || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveItem = async () => {
    if (!tenantId || !itemForm.name) return;
    setSaving(true);
    try {
      const data = {
        tenant_id: tenantId,
        name: itemForm.name,
        sku: itemForm.sku || null,
        category_id: itemForm.category_id || null,
        quantity: parseInt(itemForm.quantity) || 0,
        min_quantity: parseInt(itemForm.min_quantity) || 0,
        unit_price: parseFloat(itemForm.unit_price) || 0,
        sale_price: parseFloat(itemForm.sale_price) || 0,
        location: itemForm.location || null,
      };

      if (editingItem) {
        await supabase.from('inventory_items').update(data).eq('id', editingItem.id);
        toast.success('Item updated');
      } else {
        await supabase.from('inventory_items').insert(data);
        toast.success('Item added');
      }
      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!tenantId || !categoryForm.name) return;
    setSaving(true);
    try {
      await supabase.from('inventory_categories').insert({
        tenant_id: tenantId,
        name: categoryForm.name,
        description: categoryForm.description || null,
      });
      toast.success('Category added');
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      sku: '',
      category_id: '',
      quantity: '0',
      min_quantity: '0',
      unit_price: '0',
      sale_price: '0',
      location: '',
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || '',
      category_id: item.category_id || '',
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      unit_price: item.unit_price.toString(),
      sale_price: item.sale_price.toString(),
      location: item.location || '',
    });
    setShowItemDialog(true);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    return categories.find(c => c.id === categoryId)?.name || '-';
  };

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);

  return (
    <DashboardLayout
      title="Inventory Management"
      subtitle="Track ONU devices, cables, and equipment"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems.length}</p>
              </div>
              <ArrowDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">৳{totalValue.toLocaleString()}</p>
              </div>
              <ArrowUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>Manage your equipment and stock</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={() => { resetItemForm(); setEditingItem(null); setShowItemDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku || '-'}</TableCell>
                      <TableCell>{getCategoryName(item.category_id)}</TableCell>
                      <TableCell>
                        <Badge variant={item.quantity <= item.min_quantity ? 'destructive' : 'secondary'}>
                          {item.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>৳{item.unit_price}</TableCell>
                      <TableCell>৳{item.sale_price}</TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="ONU Device" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={itemForm.sku} onChange={(e) => setItemForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={itemForm.category_id} onValueChange={(v) => setItemForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Quantity (Alert)</Label>
                <Input type="number" value={itemForm.min_quantity} onChange={(e) => setItemForm(p => ({ ...p, min_quantity: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price (৳)</Label>
                <Input type="number" value={itemForm.unit_price} onChange={(e) => setItemForm(p => ({ ...p, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sale Price (৳)</Label>
                <Input type="number" value={itemForm.sale_price} onChange={(e) => setItemForm(p => ({ ...p, sale_price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={itemForm.location} onChange={(e) => setItemForm(p => ({ ...p, location: e.target.value }))} placeholder="Warehouse A" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={saving || !itemForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="ONU Devices" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={categoryForm.description} onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))} placeholder="All ONU/ONT devices" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
