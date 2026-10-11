import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { clearUnlocked, markUnlocked } from '@/lib/deviceLock';
import { auth } from '@/lib/firebase';

// Mock user for development bypass
const DEV_MOCK_USER = {
  uid: 'dev-user',
  email: 'dev@inktonermoore.com',
  displayName: 'Development User'
} as User;

// Each caller uses its own hook instance, so share bypass sign-out across them.
let devUser: User | null = DEV_MOCK_USER;
const DEV_AUTH_EVENT = 'staff-dev-auth-change';
const setDevUser = (user: User | null) => {
  devUser = user;
  window.dispatchEvent(new Event(DEV_AUTH_EVENT));
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  useEffect(() => {
    // In development with bypass enabled, automatically set mock user
    if (isDev && bypassAuth) {
      const update = () => { setUser(devUser); setLoading(false); };
      update();
      window.addEventListener(DEV_AUTH_EVENT, update);
      return () => window.removeEventListener(DEV_AUTH_EVENT, update);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [isDev, bypassAuth]);

  const login = async (email: string, password: string) => {
    // In development with bypass, simulate successful login
    if (isDev && bypassAuth) {
      markUnlocked(DEV_MOCK_USER.uid);
      setDevUser(DEV_MOCK_USER);
      return { success: true };
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      markUnlocked(result.user.uid);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed.' };
    }
  };

  const logout = async () => {
    // In development with bypass, clear mock user
    if (isDev && bypassAuth) {
      clearUnlocked();
      setDevUser(null);
      return { success: true };
    }

    try {
      await signOut(auth);
      clearUnlocked();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed.' };
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
};