import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, UserPlus, Plus, Wallet } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';
import { toast } from 'sonner';

export default function ResellerSubResellers() {
  const navigate = useNavigate();
  const { session, reseller, loading, subResellers, logout, createSubReseller, fundSubReseller, refetch } = useResellerPortal();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', username: '', password: '', can_add_customers: true, can_recharge_customers: true });
  const [fundAmount, setFundAmount] = useState('');

  useEffect(() => { if (!loading && !session) navigate('/reseller/login'); }, [loading, session, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) { toast.error('Name, username and password required'); return; }
    setSaving(true);
    const success = await createSubReseller({ name: formData.name, phone: formData.phone, username: formData.username, password: formData.password, can_add_customers: formData.can_add_customers, can_recharge_customers: formData.can_recharge_customers } as any);
    setSaving(false);
    if (success) { setShowAddDialog(false); setFormData({ name: '', phone: '', username: '', password: '', can_add_customers: true, can_recharge_customers: true }); }
  };

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !fundAmount) return;
    setSaving(true);
    const success = await fundSubReseller(selectedSub.id, parseFloat(fundAmount), `Balance transfer to ${selectedSub.name}`);
    setSaving(false);
    if (success) { setShowFundDialog(false); setSelectedSub(null); setFundAmount(''); }
  };

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const canCreate = reseller?.can_create_sub_reseller && (reseller.max_sub_resellers === 0 || subResellers.length < reseller.max_sub_resellers);

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sub-Resellers</h1>
          {canCreate && <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-2" />Add</Button>}
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Sub-Resellers ({subResellers.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Balance</TableHead><TableHead>Role</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {subResellers.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sub-resellers</TableCell></TableRow> : subResellers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>@{sub.username}</TableCell>
                      <TableCell>৳{sub.balance.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary">{RESELLER_ROLE_LABELS[sub.role]}</Badge></TableCell>
                      <TableCell>{reseller?.can_transfer_balance && <Button size="sm" variant="outline" onClick={() => { setSelectedSub(sub); setShowFundDialog(true); }}><Wallet className="h-4 w-4 mr-1" />Fund</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sub-Reseller</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Username *</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Password *</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required /></div>
            <div className="flex items-center justify-between"><Label>Can Add Customers</Label><Switch checked={formData.can_add_customers} onCheckedChange={(c) => setFormData({...formData, can_add_customers: c})} /></div>
            <div className="flex items-center justify-between"><Label>Can Recharge</Label><Switch checked={formData.can_recharge_customers} onCheckedChange={(c) => setFormData({...formData, can_recharge_customers: c})} /></div>
            <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showFundDialog} onOpenChange={(o) => { setShowFundDialog(o); if (!o) setSelectedSub(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fund {selectedSub?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleFund} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">Your balance: ৳{(reseller?.balance || 0).toLocaleString()}</div>
            <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required /></div>
            <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Transfer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ResellerPortalLayout>
  );
}
