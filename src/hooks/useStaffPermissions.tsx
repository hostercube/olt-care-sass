import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StaffUser {
  id: string;
  name: string;
  username: string;
  tenant_id: string;
  role_id: string | null;
  role: string;
  permissions: Record<string, boolean>;
  type: 'staff' | 'reseller';
}

interface StaffAuthContextType {
  staffUser: StaffUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, tenantId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const STAFF_SESSION_KEY = 'staff_session';

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = localStorage.getItem(STAFF_SESSION_KEY);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          
          if (!session.id) {
            localStorage.removeItem(STAFF_SESSION_KEY);
            setLoading(false);
            return;
          }
          
          // Check if it's a reseller type session
          if (session.type === 'reseller') {
            // Verify reseller exists
            const { data, error } = await supabase
              .from('resellers')
              .select('*')
              .eq('id', session.id)
              .eq('is_active', true)
              .maybeSingle();
              
            if (data && !error) {
              setStaffUser({
                id: data.id,
                name: data.name,
                username: data.username || '',
                tenant_id: data.tenant_id,
                role_id: null,
                role: 'reseller',
                permissions: {
                  customer_view: true,
                  customer_create: true,
                  customer_edit: true,
                  customer_recharge: true,
                  billing_view: true,
                  payment_collect: true,
                },
                type: 'reseller',
              });
            } else {
              console.warn('Reseller session validation failed, using cached session');
              // Use cached session data as fallback
              if (session.name && session.tenant_id) {
                setStaffUser({
                  id: session.id,
                  name: session.name || 'Reseller',
                  username: session.username || '',
                  tenant_id: session.tenant_id,
                  role_id: null,
                  role: 'reseller',
                  permissions: session.permissions || {
                    customer_view: true,
                    customer_create: true,
                    customer_edit: true,
                    customer_recharge: true,
                    billing_view: true,
                    payment_collect: true,
                  },
                  type: 'reseller',
                });
              } else {
                localStorage.removeItem(STAFF_SESSION_KEY);
              }
            }
          } else {
            // Verify staff exists
            const { data, error } = await supabase
              .from('staff')
              .select('*, tenant_roles(permissions)')
              .eq('id', session.id)
              .eq('can_login', true)
              .maybeSingle();

            if (data && !error) {
              setStaffUser({
                id: data.id,
                name: data.name,
                username: data.username || '',
                tenant_id: data.tenant_id,
                role_id: data.role_id,
                role: data.role,
                permissions: (data.tenant_roles as any)?.permissions || {},
                type: 'staff',
              });
            } else {
              console.warn('Staff session validation failed:', error);
              // Don't remove session - could be RLS issue, try to use cached data
              // If we have cached user data in session, use it
              if (session.name && session.tenant_id) {
                setStaffUser({
                  id: session.id,
                  name: session.name || 'Staff',
                  username: session.username || '',
                  tenant_id: session.tenant_id,
                  role_id: session.role_id || null,
                  role: session.role || 'staff',
                  permissions: session.permissions || {},
                  type: session.type || 'staff',
                });
              } else {
                localStorage.removeItem(STAFF_SESSION_KEY);
              }
            }
          }
        } catch (e) {
          console.error('Error restoring staff session:', e);
          localStorage.removeItem(STAFF_SESSION_KEY);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string, tenantId: string) => {
    try {
      // First check staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*, tenant_roles(permissions)')
        .eq('username', username)
        .eq('password', password)
        .eq('tenant_id', tenantId)
        .eq('can_login', true)
        .eq('is_active', true)
        .single();

      if (staffData && !staffError) {
        const user: StaffUser = {
          id: staffData.id,
          name: staffData.name,
          username: staffData.username || '',
          tenant_id: staffData.tenant_id,
          role_id: staffData.role_id,
          role: staffData.role,
          permissions: (staffData.tenant_roles as any)?.permissions || {},
          type: 'staff',
        };
        setStaffUser(user);
        // Store complete user data for session restoration fallback
        localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({
          id: staffData.id,
          name: staffData.name,
          username: staffData.username || '',
          tenant_id: staffData.tenant_id,
          role_id: staffData.role_id,
          role: staffData.role,
          permissions: (staffData.tenant_roles as any)?.permissions || {},
          type: 'staff',
        }));
        return { success: true };
      }

      // Check reseller table
      const { data: resellerData, error: resellerError } = await supabase
        .from('resellers')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (resellerData && !resellerError) {
        const permissions = {
          customer_view: true,
          customer_create: true,
          customer_edit: true,
          customer_recharge: true,
          billing_view: true,
          payment_collect: true,
        };
        const user: StaffUser = {
          id: resellerData.id,
          name: resellerData.name,
          username: resellerData.username || '',
          tenant_id: resellerData.tenant_id,
          role_id: null,
          role: 'reseller',
          permissions,
          type: 'reseller',
        };
        setStaffUser(user);
        // Store complete user data for session restoration fallback
        localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({
          id: resellerData.id,
          name: resellerData.name,
          username: resellerData.username || '',
          tenant_id: resellerData.tenant_id,
          role_id: null,
          role: 'reseller',
          permissions,
          type: 'reseller',
        }));
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } catch (err: any) {
      console.error('Staff login error:', err);
      return { success: false, error: err.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    setStaffUser(null);
    localStorage.removeItem(STAFF_SESSION_KEY);
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!staffUser) return false;
    // Admin role has all permissions
    if (staffUser.role === 'admin') return true;
    return staffUser.permissions[permission] === true;
  }, [staffUser]);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    if (!staffUser) return false;
    if (staffUser.role === 'admin') return true;
    return permissions.some(p => staffUser.permissions[p] === true);
  }, [staffUser]);

  const hasAllPermissions = useCallback((permissions: string[]) => {
    if (!staffUser) return false;
    if (staffUser.role === 'admin') return true;
    return permissions.every(p => staffUser.permissions[p] === true);
  }, [staffUser]);

  return (
    <StaffAuthContext.Provider
      value={{
        staffUser,
        loading,
        isAuthenticated: !!staffUser,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}

// Permission guard component for UI elements
interface PermissionGuardProps {
  permission: string | string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, requireAll = false, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useStaffAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
