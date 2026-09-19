import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { authService, AuthActionResult } from '../services/auth.service';
import { AuthState, CustomerProfile, UserRole } from '../../../../packages/types/src';
import { supabase } from '../lib/supabase/client';
import { NormalizedAuthError } from '../../../../packages/utils/src';

interface AuthContextType {
  authState: AuthState;
  session: Session | null;
  user: User | null;
  profile: CustomerProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  error: NormalizedAuthError | null;
  sendOtp: (phone: string) => Promise<AuthActionResult<{ phone: string }>>;
  verifyOtp: (
    phone: string,
    token: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => Promise<AuthActionResult<{ session: Session | null; user: User | null }>>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileNames: (firstName: string, lastName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>(['CUSTOMER']);
  const [error, setError] = useState<NormalizedAuthError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isBootstrappingRef = useRef(false);

  // Bootstrap user & customer profile from PostgreSQL / Supabase
  const bootstrapCustomer = async (currentSession: Session) => {
    if (isBootstrappingRef.current) return;
    try {
      isBootstrappingRef.current = true;
      setIsLoading(true);
      const currentUser = currentSession.user;
      setUser(currentUser);

      // 1. Fetch customer profile from public.customer_profiles with safe 3s timeout
      const profilePromise = supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: any }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 3000)
      );

      const { data: dbProfile } = await Promise.race([profilePromise, timeoutPromise]);

      const resolvedFirstName =
        dbProfile?.first_name ||
        currentUser.user_metadata?.first_name ||
        currentUser.user_metadata?.full_name?.split(' ')[0] ||
        null;
      const resolvedLastName =
        dbProfile?.last_name ||
        currentUser.user_metadata?.last_name ||
        currentUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
        null;

      if (dbProfile) {
        setProfile({
          ...dbProfile,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
        });
      } else {
        // Fallback default profile model before database creation
        setProfile({
          id: currentUser.id,
          user_id: currentUser.id,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          avatar_url: currentUser.user_metadata?.avatar_url || null,
          preferred_language: 'en',
          onboarding_status: 'NEW',
          default_address_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Fetch user roles
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
      console.warn('[AuthContext] Bootstrap profile notice:', err?.message);
      // Retain authenticated session even if profile fetch has network blip
      setAuthState('AUTHENTICATED');
    } finally {
      setIsLoading(false);
      isBootstrappingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Restore persistent session on startup with max 2.5s wait to avoid getting stuck
    const initAuth = async () => {
      try {
        const sessionPromise = authService.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2500)
        );

        const initialSession = await Promise.race([sessionPromise, timeoutPromise]);

        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          await bootstrapCustomer(initialSession);
        } else {
          setAuthState('UNAUTHENTICATED');
        }
      } catch {
        if (mounted) {
          setAuthState('UNAUTHENTICATED');
        }
      } finally {
        if (mounted) {
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
      } else if (event === 'USER_UPDATED' && newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    });

    // 3. React Native AppState listener to handle auto-refresh lifecycle safely
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // 4. Handle OAuth Deep Links
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url && url.includes('access_token')) {
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
      appStateSub.remove();
      urlSub.remove();
    };
  }, []);

  const sendOtp = async (phone: string): Promise<AuthActionResult<{ phone: string }>> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.requestPhoneOtp(phone);
      if (!res.success && res.error) {
        setError(res.error);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (
    phone: string,
    token: string,
    metadata?: { firstName?: string; lastName?: string }
  ): Promise<AuthActionResult<{ session: Session | null; user: User | null }>> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.verifyPhoneOtp(phone, token);
      if (!res.success && res.error) {
        setError(res.error);
      } else if (res.data?.session) {
        // If names were provided, update user metadata and profile table
        if (metadata?.firstName || metadata?.lastName) {
          try {
            await supabase.auth.updateUser({
              data: {
                first_name: metadata.firstName?.trim() || '',
                last_name: metadata.lastName?.trim() || '',
                full_name: `${metadata.firstName?.trim() || ''} ${metadata.lastName?.trim() || ''}`.trim(),
              },
            });
            await supabase.from('customer_profiles').upsert({
              user_id: res.data.session.user.id,
              first_name: metadata.firstName?.trim() || null,
              last_name: metadata.lastName?.trim() || null,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[AuthContext] Error updating name metadata:', e);
          }
        }
        setSession(res.data.session);
        await bootstrapCustomer(res.data.session);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthState('UNAUTHENTICATED');
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session) {
      await bootstrapCustomer(session);
    }
  };

  const updateProfileNames = async (firstName: string, lastName: string): Promise<boolean> => {
    if (!user) return false;
    try {
      setIsLoading(true);
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

      // 1. Update Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: fullName,
        },
      });

      // 2. Upsert customer_profiles row keyed to user_id
      await supabase.from('customer_profiles').upsert({
        user_id: user.id,
        first_name: trimmedFirst,
        last_name: trimmedLast || null,
        onboarding_status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      });

      // 3. Update public.users display name
      await supabase.from('users').update({
        display_name: fullName || trimmedFirst,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      // 4. Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: trimmedFirst,
              last_name: trimmedLast || null,
              onboarding_status: 'ACTIVE',
            }
          : {
              id: user.id,
              user_id: user.id,
              first_name: trimmedFirst,
              last_name: trimmedLast || null,
              avatar_url: null,
              preferred_language: 'en',
              onboarding_status: 'ACTIVE',
              default_address_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
      );

      return true;
    } catch (err) {
      console.warn('[AuthContext] Failed to update profile names:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
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
        sendOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        updateProfileNames,
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
