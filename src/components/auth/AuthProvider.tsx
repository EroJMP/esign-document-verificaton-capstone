'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'admin' | 'student' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

interface UserData {
  role: UserRole;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Create supabase client for signOut only
  const supabase = createClient();

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized) return;

    let isMounted = true;

    // Get the initial user via API route
    const getInitialSession = async () => {
      try {
        // Fetch user data via API route
        const response = await fetch('/api/auth/user');
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          
          // Convert API response to User format
          const authUser: User = {
            id: data.user.id,
            email: data.user.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '',
            updated_at: '',
            app_metadata: {},
            user_metadata: {}
          };
          
          setUser(authUser);
          setUserRole(data.user.role as UserRole);
          setSession(data.session);
        } else {
          // No valid user - clear state
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setInitialized(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes - use getSession() for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);
        
        // When session changes, update state accordingly
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Fetch role via API
          try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
              const data = await response.json();
              setUserRole(data.user.role as UserRole);
            }
          } catch (error) {
            console.error('Error fetching user role on auth change:', error);
          }
        } else {
          // No session
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialized, supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      router.push('/auth/login?signedOut=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [supabase, router]);

  const value = {
    user,
    session,
    userRole,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 