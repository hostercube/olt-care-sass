import { useState } from 'react';
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
import { useReferralSystem } from '@/hooks/useReferralSystem';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { Gift, Users, DollarSign, TrendingUp, Settings, List, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function ReferralManagement() {
  const { config, referrals, loading, saveConfig, updateReferralStatus } = useReferralSystem();
  const { formatCurrency } = useLanguageCurrency();
  const [formData, setFormData] = useState({
    is_enabled: config?.is_enabled || false,
    bonus_type: config?.bonus_type || 'fixed',
    bonus_amount: config?.bonus_amount || 0,
    bonus_percentage: config?.bonus_percentage || 0,
    min_referrals_for_bonus: config?.min_referrals_for_bonus || 1,
    bonus_validity_days: config?.bonus_validity_days || 30,
    terms_and_conditions: config?.terms_and_conditions || '',
  });
  const [saving, setSaving] = useState(false);

  // Update form when config loads
  useState(() => {
    if (config) {
      setFormData({
        is_enabled: config.is_enabled,
        bonus_type: config.bonus_type,
        bonus_amount: config.bonus_amount,
        bonus_percentage: config.bonus_percentage,
        min_referrals_for_bonus: config.min_referrals_for_bonus,
        bonus_validity_days: config.bonus_validity_days,
        terms_and_conditions: config.terms_and_conditions || '',
      });
    }
  });

  const handleSaveConfig = async () => {
    setSaving(true);
    await saveConfig(formData);
    setSaving(false);
  };

  // Stats
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalBonusPaid = referrals.filter(r => r.status === 'bonus_paid').reduce((sum, r) => sum + r.bonus_amount, 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      signed_up: 'outline',
      active: 'default',
      bonus_paid: 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout title="Referral Management" subtitle="Manage customer referral program">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Referral Management" subtitle="Manage customer referral program">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Gift className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bonus Paid</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBonusPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <List className="h-4 w-4" /> Referrals ({referrals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Referral Program Settings</CardTitle>
              <CardDescription>Configure your customer referral program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Enable Referral Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to refer friends and earn bonuses
                  </p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                />
              </div>

              {/* Bonus Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonus Type</Label>
                  <Select
                    value={formData.bonus_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, bonus_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage of Bill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.bonus_type === 'fixed' ? (
                  <div className="space-y-2">
                    <Label>Bonus Amount</Label>
                    <Input
                      type="number"
                      value={formData.bonus_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, bonus_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g., 100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Bonus Percentage (%)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, bonus_percentage: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g., 10"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Minimum Referrals for Bonus</Label>
                  <Input
                    type="number"
                    value={formData.min_referrals_for_bonus}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_referrals_for_bonus: parseInt(e.target.value) || 1 }))}
                    placeholder="e.g., 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bonus Validity (Days)</Label>
                  <Input
                    type="number"
                    value={formData.bonus_validity_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonus_validity_days: parseInt(e.target.value) || 30 }))}
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                  placeholder="Enter terms and conditions for the referral program..."
                  rows={4}
                />
              </div>

              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>All Referrals</CardTitle>
              <CardDescription>Track and manage customer referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No referrals yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      referrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.referrer?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{referral.referrer?.customer_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.referred?.name || referral.referred_name || '-'}</p>
                              <p className="text-xs text-muted-foreground">
                                {referral.referred?.customer_code || referral.referred_phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{referral.referral_code}</code>
                          </TableCell>
                          <TableCell>{getStatusBadge(referral.status)}</TableCell>
                          <TableCell>{formatCurrency(referral.bonus_amount)}</TableCell>
                          <TableCell>{format(new Date(referral.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            {referral.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReferralStatus(referral.id, 'bonus_paid', true)}
                              >
                                Mark Paid
                              </Button>
                            )}
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
      </Tabs>
    </DashboardLayout>
  );
}
