import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Phone, Mail, MapPin, Shield, Key, Save } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { RESELLER_ROLE_LABELS } from '@/types/reseller';
import { toast } from 'sonner';

export default function ResellerProfile() {
  const navigate = useNavigate();
  const {
    session,
    reseller,
    loading,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
  } = useResellerPortal();

  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!loading && !session) {
      navigate('/reseller/login');
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (reseller) {
      setProfileData({
        name: reseller.name || '',
        phone: reseller.phone || '',
        email: reseller.email || '',
        address: reseller.address || '',
      });
    }
  }, [reseller]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    const success = await updateProfile(profileData);
    setSaving(false);
    
    if (success) {
      toast.success('Profile updated successfully');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    setSaving(false);
    
    if (success) {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
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
    <ResellerPortalLayout reseller={reseller} onLogout={logout} hasPermission={hasPermission}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>View your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="text-sm">
                  {RESELLER_ROLE_LABELS[reseller?.role || 'reseller']}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  Level {reseller?.level || 1}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-medium">{reseller?.username || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reseller Code</p>
                  <p className="font-medium font-mono">{reseller?.reseller_code || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Balance</p>
                  <p className="font-bold text-lg text-green-600">৳{(reseller?.balance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Collections</p>
                  <p className="font-medium">৳{(reseller?.total_collections || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions
                </p>
                <div className="flex flex-wrap gap-2">
                  {reseller?.can_add_customers && (
                    <Badge variant="outline" className="text-xs">Add Customers</Badge>
                  )}
                  {reseller?.can_edit_customers && (
                    <Badge variant="outline" className="text-xs">Edit Customers</Badge>
                  )}
                  {reseller?.can_recharge_customers && (
                    <Badge variant="outline" className="text-xs">Recharge</Badge>
                  )}
                  {reseller?.can_create_sub_reseller && (
                    <Badge variant="outline" className="text-xs">Create Sub-Resellers</Badge>
                  )}
                  {reseller?.can_view_sub_customers && (
                    <Badge variant="outline" className="text-xs">View Sub-Customers</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Edit Profile
              </CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-9"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-9"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-9"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      className="pl-9"
                      placeholder="Full address"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" disabled={saving} variant="outline">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResellerPortalLayout>
  );
}
