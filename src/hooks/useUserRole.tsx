import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserRoleState {
  role: AppRole | null;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  loading: boolean;
}

export function useUserRole() {
  const { user } = useAuth();
  const [roleState, setRoleState] = useState<UserRoleState>({
    role: null,
    isAdmin: false,
    isOperator: false,
    isViewer: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setRoleState({
        role: null,
        isAdmin: false,
        isOperator: false,
        isViewer: false,
        loading: false,
      });
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRoleState(prev => ({ ...prev, loading: false }));
          return;
        }

        const role = data?.role as AppRole;
        setRoleState({
          role,
          isAdmin: role === 'admin',
          isOperator: role === 'operator',
          isViewer: role === 'viewer',
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRoleState(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRole();
  }, [user]);

  return roleState;
}
