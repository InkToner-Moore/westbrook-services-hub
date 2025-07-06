import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Mock user for development bypass
const DEV_MOCK_USER = {
  uid: 'dev-user',
  email: 'dev@inktonermoore.com',
  displayName: 'Development User'
} as User;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  useEffect(() => {
    // In development with bypass enabled, automatically set mock user
    if (isDev && bypassAuth) {
      setUser(DEV_MOCK_USER);
      setLoading(false);
      return;
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
      setUser(DEV_MOCK_USER);
      return { success: true };
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // In development with bypass, clear mock user
    if (isDev && bypassAuth) {
      setUser(null);
      return { success: true };
    }

    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
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