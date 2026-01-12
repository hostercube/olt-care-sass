import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CurrentUserInfo {
  name: string;
  role: string;
  collectorType: 'tenant_admin' | 'staff' | 'super_admin';
  loading: boolean;
}

export function useCurrentUserName(): CurrentUserInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<CurrentUserInfo>({
    name: '',
    role: '',
    collectorType: 'tenant_admin',
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setInfo({ name: '', role: '', collectorType: 'tenant_admin', loading: false });
      return;
    }

    const fetchUserInfo = async () => {
      try {
        // Get role from user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        let collectorType: 'tenant_admin' | 'staff' | 'super_admin' = 'tenant_admin';
        let displayRole = 'Admin';

        if (roleData) {
          const roleStr = roleData.role as string;
          if (roleStr === 'super_admin') {
            collectorType = 'super_admin';
            displayRole = 'Super Admin';
          } else if (roleStr === 'staff') {
            collectorType = 'staff';
            displayRole = 'Staff';
          } else if (roleStr === 'admin' || roleStr === 'tenant_admin') {
            collectorType = 'tenant_admin';
            displayRole = 'Admin';
          }
        }

        // Get name from tenant (owner name) or tenant_users role
        let name = '';

        // Check if user is a tenant owner
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (tenant?.name) {
          name = tenant.name;
        }

        // If not found, try tenant_users for staff role info
        if (!name) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (tenantUser) {
            const tuRole = tenantUser.role as string;
            collectorType = tuRole === 'staff' ? 'staff' : 'tenant_admin';
            displayRole = tuRole === 'staff' ? 'Staff' : 'Admin';
          }
        }

        // Fallback to user metadata or email
        if (!name) {
          name = user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email?.split('@')[0] || 
                 'User';
        }

        setInfo({
          name,
          role: displayRole,
          collectorType,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
        setInfo({
          name: user.email?.split('@')[0] || 'User',
          role: 'User',
          collectorType: 'tenant_admin',
          loading: false,
        });
      }
    };

    fetchUserInfo();
  }, [user]);

  return info;
}
