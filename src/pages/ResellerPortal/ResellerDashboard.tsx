import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { 
  Users, Wallet, LogOut, User, ArrowRightLeft, Settings, 
  Loader2, AlertCircle, KeyRound, Phone, Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';

interface ResellerSession {
  id: string;
  name: string;
  username: string;
  tenant_id: string;
  level: number;
  role: string;
  balance: number;
  is_impersonation: boolean;
  logged_in_at: string;
}

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ResellerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [reseller, setReseller] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem('reseller_session');
    if (!storedSession) {
      navigate('/reseller/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchData(parsed.id);
    } catch (e) {
      localStorage.removeItem('reseller_session');
      navigate('/reseller/login');
    }
  }, [navigate]);

  const fetchData = async (resellerId: string) => {
    setLoading(true);
    try {
      // Fetch fresh reseller data
      const { data: resellerData } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .single();
      
      if (resellerData) {
        setReseller(resellerData);
        // Update session with fresh balance
        setSession(prev => prev ? { ...prev, balance: resellerData.balance } : null);
      }

      // Fetch customers assigned to this reseller
      const { data: customersData } = await supabase
        .from('customers')
        .select('*, package:isp_packages(name, price)')
        .eq('reseller_id', resellerId)
        .order('name');
      
      setCustomers(customersData || []);

      // Fetch transactions
      const { data: txData } = await supabase
        .from('reseller_transactions' as any)
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setTransactions(txData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reseller_session');
    toast.success('Logged out successfully');
    navigate('/reseller/login');
  };

  const handlePasswordChange = async () => {
    if (!session || !reseller) return;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    // Verify current password
    if ((reseller as any).password !== currentPassword) {
      toast.error('Current password is incorrect');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ password: newPassword })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Refresh reseller data
      fetchData(session.id);
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Reseller Portal</h1>
              <p className="text-sm text-muted-foreground">
                {session.name} {session.is_impersonation && (
                  <Badge variant="outline" className="ml-2 text-xs">Admin View</Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="font-semibold text-green-600">৳{session.balance.toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold">৳{reseller?.balance?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-lg font-bold">
                    {RESELLER_ROLE_LABELS[session.role as keyof typeof RESELLER_ROLE_LABELS] || `Level ${session.level}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <ArrowRightLeft className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-2" />
              My Customers
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>My Customers ({customers.length})</CardTitle>
                <CardDescription>Customers assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No customers assigned yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-mono text-sm">
                              {customer.customer_code || '-'}
                            </TableCell>
                            <TableCell>{customer.name}</TableCell>
                            <TableCell>{customer.phone || '-'}</TableCell>
                            <TableCell>{customer.package?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                                {customer.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {customer.expiry_date 
                                ? new Date(customer.expiry_date).toLocaleDateString()
                                : '-'
                              }
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

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Your wallet transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tx.type}</Badge>
                            </TableCell>
                            <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {tx.amount >= 0 ? '+' : ''}৳{tx.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>৳{tx.balance_after?.toLocaleString() || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {tx.description || '-'}
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

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Your reseller account details</CardDescription>
              </CardHeader>
              <CardContent>
                {reseller && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{reseller.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Username</Label>
                        <p className="font-medium">@{reseller.username}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {reseller.phone || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {reseller.email || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Level</Label>
                        <p className="font-medium">
                          {RESELLER_ROLE_LABELS[reseller.role as keyof typeof RESELLER_ROLE_LABELS] || `Level ${reseller.level}`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Commission</Label>
                        <p className="font-medium">
                          {reseller.commission_value}{reseller.commission_type === 'percentage' ? '%' : '৳'}
                          {reseller.customer_rate > 0 && ` + ৳${reseller.customer_rate}/customer`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p className="font-medium">{reseller.address || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">NID</Label>
                        <p className="font-medium">{reseller.nid_number || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Password *</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordChange}
                disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 4}
              >
                {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
