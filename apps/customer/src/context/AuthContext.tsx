import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';
import { AuthState, CustomerProfile, UserRole } from '../../../../packages/types/src';
import { supabase } from '../lib/supabase/client';

interface AuthContextType {
  authState: AuthState;
  session: Session | null;
  user: User | null;
  profile: CustomerProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginAsTestUser: (phone?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('UNAUTHENTICATED');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>(['CUSTOMER']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Bootstrap user & customer profile from PostgreSQL / Supabase
  const bootstrapCustomer = async (currentSession: Session) => {
    try {
      setIsLoading(true);
      const currentUser = currentSession.user;
      setUser(currentUser);

      // 1. Fetch user record from public.users
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      // 2. Fetch customer profile from public.customer_profiles
      const { data: dbProfile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (dbProfile) {
        setProfile(dbProfile);
      } else {
        // Fallback default profile model before database creation
        setProfile({
          id: currentUser.id,
          user_id: currentUser.id,
          first_name: currentUser.user_metadata?.first_name || currentUser.user_metadata?.full_name?.split(' ')[0] || null,
          last_name: currentUser.user_metadata?.last_name || currentUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
          avatar_url: currentUser.user_metadata?.avatar_url || null,
          preferred_language: 'en',
          onboarding_status: 'NEW',
          default_address_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 3. Fetch user roles
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id);

      if (dbRoles && dbRoles.length > 0) {
        setRoles(dbRoles.map((r: any) => r.role as UserRole));
      } else {
        setRoles(['CUSTOMER']);
      }

      setAuthState('AUTHENTICATED');
      setError(null);
    } catch (err: any) {
      console.warn('[AuthContext] Bootstrap profile notice:', err.message);
      // Still authenticated at session level
      setAuthState('AUTHENTICATED');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Restore persistent session on startup
    const initAuth = async () => {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));

      try {
        const initialSession = await Promise.race([
          authService.getSession(),
          timeoutPromise,
        ]) as Session | null;

        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          await bootstrapCustomer(initialSession);
        } else {
          setAuthState('UNAUTHENTICATED');
          setIsLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Authentication initialization error');
          setAuthState('UNAUTHENTICATED');
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // 2. Listen to Supabase Auth State Changes
    const { data: authListener } = authService.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        await bootstrapCustomer(newSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles(['CUSTOMER']);
        setAuthState('UNAUTHENTICATED');
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
      }
    });

    // 3. Handle OAuth Deep Links
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url && url.includes('access_token')) {
        // Extract parameters and set session
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    };

    const urlSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthState('UNAUTHENTICATED');
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (session) {
      await bootstrapCustomer(session);
    }
  };

  const loginAsTestUser = async (phone: string = '9999999999') => {
    setIsLoading(true);
    const mockUser: any = {
      id: '00000000-0000-0000-0000-000000000001',
      app_metadata: { provider: 'phone' },
      user_metadata: { first_name: 'Test', last_name: 'User', phone },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      phone: `+91${phone.replace(/[^0-9]/g, '')}`,
    };

    const mockProfile: CustomerProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      first_name: 'Test',
      last_name: 'User',
      avatar_url: null,
      preferred_language: 'en',
      onboarding_status: 'ACTIVE',
      default_address_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUser(mockUser);
    setProfile(mockProfile);
    setRoles(['CUSTOMER']);
    setAuthState('AUTHENTICATED');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        session,
        user,
        profile,
        roles,
        isLoading,
        error,
        signOut,
        refreshProfile,
        loginAsTestUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
