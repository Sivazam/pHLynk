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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initializing...');

  const updateProgress = (progress: number, stage: string) => {
    setLoadingProgress(Math.min(progress, 100));
    setLoadingStage(stage);
  };

  useEffect(() => {
    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing loading state to false');
        setLoading(false);
        updateProgress(100, 'Complete');
      }
    }, 10000); // 10 second timeout

    // Initialize progress immediately
    updateProgress(5, 'Initializing application...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(timeoutId); // Clear timeout once auth state changes
      
      try {
        updateProgress(15, 'Checking authentication status...');
        
        // Small delay for auth state check
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (firebaseUser) {
          updateProgress(30, 'Loading user profile...');
          
          // Small delay before Firestore call
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          
          updateProgress(50, 'Validating user permissions...');
          
          // Small delay for validation
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (userDoc.exists()) {
            updateProgress(70, 'Preparing user interface...');
            
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
            
            updateProgress(85, 'Setting up dashboard...');
            
            // Final delay before completing
            await new Promise(resolve => setTimeout(resolve, 150));
            
            updateProgress(95, 'Almost ready...');
            setUser(authUser);
          } else {
            // User exists in Auth but not in Firestore - this shouldn't happen in our flow
            console.error('User exists in Auth but not in Firestore');
            updateProgress(90, 'Setting up guest access...');
            setUser(null);
          }
        } else {
          updateProgress(40, 'Preparing guest interface...');
          
          // Delay for non-authenticated user setup
          await new Promise(resolve => setTimeout(resolve, 200));
          
          updateProgress(70, 'Loading welcome screen...');
          await new Promise(resolve => setTimeout(resolve, 150));
          
          updateProgress(90, 'Finalizing setup...');
          setUser(null);
        }
        
        // Final completion
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(100, 'Complete');
      } catch (error) {
        console.error('Error fetching user data:', error);
        updateProgress(90, 'Recovering from error...');
        await new Promise(resolve => setTimeout(resolve, 200));
        setUser(null);
        updateProgress(100, 'Complete');
      }
      
      setLoading(false);
    });

    // Set up a fallback progress mechanism in case Firebase doesn't respond
    const fallbackProgress = setInterval(() => {
      if (loading && loadingProgress < 50) {
        updateProgress(Math.min(loadingProgress + 10, 50), 'Connecting to services...');
      }
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(fallbackProgress);
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
    try {
      // Clear any retailer-specific data
      localStorage.removeItem('retailerId');
      
      // Clear any role selection state
      sessionStorage.removeItem('auth_view');
      sessionStorage.removeItem('selected_role');
      
      // Clear any notification states
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('notifications_') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Replace current history entry to prevent back navigation
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
        // Force a redirect to home to ensure clean state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback - still attempt to redirect even if there's an error
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
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
    loadingProgress,
    loadingStage,
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