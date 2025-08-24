'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ROLES, COLLECTIONS } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AuthUser, AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing loading state to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(timeoutId); // Clear timeout once auth state changes
      
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const authUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || undefined,
              tenantId: userData.tenantId,
              roles: userData.roles,
              assignedAreas: userData.assignedAreas,
              assignedZips: userData.assignedZips
            };
            setUser(authUser);
          } else {
            // User exists in Auth but not in Firestore - this shouldn't happen in our flow
            console.error('User exists in Auth but not in Firestore');
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, displayName?: string, superAdminCode?: string) => {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Check if this is a super admin signup with valid code
    if (superAdminCode === '1376') {
      // This is a super admin signup - we need to create the Firestore document
      // Note: The calling code will handle creating the Firestore document
      return { user: firebaseUser, isSuperAdmin: true };
    }
    
    // For non-super admin signups, the Firestore document should be created by the appropriate admin
    return { user: firebaseUser, isSuperAdmin: false };
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const hasRole = (role: keyof typeof ROLES): boolean => {
    return user?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: (keyof typeof ROLES)[]): boolean => {
    return user?.roles.some(role => roles.includes(role)) || false;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    resetPassword,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based hooks for easier access
export function useSuperAdmin() {
  const { hasRole } = useAuth();
  return hasRole(ROLES.SUPER_ADMIN);
}

export function useWholesalerAdmin() {
  const { hasRole } = useAuth();
  return hasRole(ROLES.WHOLESALER_ADMIN);
}

export function useLineWorker() {
  const { hasRole } = useAuth();
  return hasRole(ROLES.LINE_WORKER);
}