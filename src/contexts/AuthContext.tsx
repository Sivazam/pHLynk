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
import { auth, db, COLLECTIONS, ROLES } from '@/lib/firebase';
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
    }, 15000); // Increased to 15 seconds to allow for retailer user lookup

    // Initialize progress immediately
    updateProgress(5, 'Initializing application...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(timeoutId); // Clear timeout once auth state changes
      
      try {
        updateProgress(15, 'Checking authentication status...');
        
        console.log('🔍 Auth state changed. Firebase user:', firebaseUser ? firebaseUser.uid : 'null');
        
        // Small delay for auth state check
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (firebaseUser) {
          updateProgress(30, 'Loading user profile...');
          
          console.log('🔍 Firebase user details:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            phoneNumber: firebaseUser.phoneNumber,
            displayName: firebaseUser.displayName
          });
          
          // Check if this is a retailer user by phone number first
          if (firebaseUser.phoneNumber) {
            console.log('🔍 Checking for retailer user with phone number');
            updateProgress(40, 'Checking retailer account...');
            
            const phone = firebaseUser.phoneNumber.replace('+91', '').replace(/\D/g, '');
            
            try {
              // Check the Retailer collection directly (new approach)
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              const retailersRef = collection(db, COLLECTIONS.RETAILERS);
              const q = query(retailersRef, where('phone', '==', phone));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                console.log('✅ Found retailer in Retailer collection');
                updateProgress(70, 'Loading retailer profile...');
                
                const retailerDoc = querySnapshot.docs[0];
                const retailerData = retailerDoc.data();
                console.log('📋 Retailer data:', retailerData);
                
                // Check if retailer is active
                if (retailerData.hasOwnProperty('isActive') && !retailerData.isActive) {
                  console.error('Retailer account is inactive:', firebaseUser.uid);
                  updateProgress(90, 'Retailer account inactive...');
                  await new Promise(resolve => setTimeout(resolve, 150));
                  setUser(null);
                  return;
                }
                
                console.log('🎯 Creating AuthUser for retailer...');
                const authUser: AuthUser = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || `retailer_${phone}@pharmalynk.local`,
                  displayName: retailerData.name || retailerData.businessName || 'Retailer',
                  photoURL: firebaseUser.photoURL || undefined,
                  tenantId: retailerData.tenantId,
                  tenantStatus: 'ACTIVE',
                  roles: ['RETAILER'], // Retailer users always have RETAILER role
                  isRetailer: true,
                  retailerId: retailerDoc.id, // Use document ID
                  phone: retailerData.phone
                };
                
                console.log('🎯 Created AuthUser:', authUser);
                
                // Also store retailerId in localStorage for backward compatibility
                localStorage.setItem('retailerId', retailerDoc.id);
                console.log('✅ Stored retailerId in localStorage');
                
                updateProgress(85, 'Setting up retailer dashboard...');
                console.log('📊 Progress updated to 85%');
                
                // Final delay before completing
                await new Promise(resolve => setTimeout(resolve, 150));
                console.log('⏱️ Final delay completed');
                
                updateProgress(95, 'Almost ready...');
                updateProgress(100, 'Complete');
                console.log('🎯 About to call setUser for retailer');
                setUser(authUser);
                console.log('✅ setUser called successfully for retailer');
                console.log('🔄 Retailer auth complete, should skip to setLoading(false)');
                return;
              } else {
                console.log('❌ No retailer found in Retailer collection');
              }
            } catch (error) {
              console.error('❌ Error checking retailer collection:', error);
              console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                phone: phone,
                firebaseUid: firebaseUser.uid
              });
            }
          }
          
          // Small delay before Firestore call
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // Try to fetch user data from users collection (for email/password users)
          console.log('🔍 Looking up user in users collection');
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          
          updateProgress(50, 'Validating user permissions...');
          
          // Small delay for validation
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (userDoc.exists()) {
            updateProgress(70, 'Validating user permissions...');
            
            const userData = userDoc.data() as User;
            
            // Check if user is active
            if (!userData.active) {
              console.error('User account is inactive:', firebaseUser.uid);
              updateProgress(90, 'Account inactive...');
              await new Promise(resolve => setTimeout(resolve, 150));
              setUser(null);
              return;
            }
            
            // For wholesaler admins and line workers, check tenant status
            if (userData.roles.includes('WHOLESALER_ADMIN') || userData.roles.includes('LINE_WORKER')) {
              if (!userData.tenantId) {
                console.error('User missing tenantId:', firebaseUser.uid);
                updateProgress(90, 'Account configuration error...');
                await new Promise(resolve => setTimeout(resolve, 150));
                setUser(null);
                return;
              }
              
              // Fetch tenant document to check status
              const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, userData.tenantId));
              if (!tenantDoc.exists()) {
                console.error('Tenant not found:', userData.tenantId);
                updateProgress(90, 'Account configuration error...');
                await new Promise(resolve => setTimeout(resolve, 150));
                setUser(null);
                return;
              }
              
              const tenantData = tenantDoc.data();
              if (tenantData.status !== 'ACTIVE') {
                console.error('Tenant account is not active:', userData.tenantId, 'Status:', tenantData.status);
                updateProgress(90, 'Account pending approval...');
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Create user object with tenant status instead of setting to null
                const authUser: AuthUser = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  displayName: firebaseUser.displayName || userData.displayName,
                  photoURL: firebaseUser.photoURL || undefined,
                  tenantId: userData.tenantId,
                  tenantStatus: tenantData.status,
                  roles: userData.roles,
                  assignedAreas: userData.assignedAreas,
                  assignedZips: userData.assignedZips
                };
                
                updateProgress(95, 'Almost ready...');
                await new Promise(resolve => setTimeout(resolve, 150));
                updateProgress(100, 'Complete');
                setUser(authUser);
                return;
              }
            }
            
            updateProgress(85, 'Setting up dashboard...');
            
            const authUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || undefined,
              tenantId: userData.tenantId,
              tenantStatus: 'ACTIVE',
              roles: userData.roles,
              assignedAreas: userData.assignedAreas,
              assignedZips: userData.assignedZips
            };
            
            updateProgress(95, 'Almost ready...');
            
            // Final delay before completing
            await new Promise(resolve => setTimeout(resolve, 150));
            
            updateProgress(100, 'Complete');
            setUser(authUser);
          } else {
            // User exists in Auth but not in either collection
            console.error('User exists in Auth but not in users or retailer collection');
            updateProgress(90, 'Setting up guest access...');
            setUser(null);
          }
        } else {
          console.log('👋 No Firebase user - setting user to null');
          updateProgress(40, 'Preparing guest interface...');
          
          // Delay for non-authenticated user setup
          await new Promise(resolve => setTimeout(resolve, 200));
          
          updateProgress(70, 'Loading welcome screen...');
          await new Promise(resolve => setTimeout(resolve, 150));
          
          updateProgress(90, 'Finalizing setup...');
          setUser(null);
          console.log('✅ User state set to null');
        }
        
        // Final completion
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(100, 'Complete');
      } catch (error) {
        console.error('❌ Error in authentication flow:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          firebaseUser: firebaseUser ? { 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            phone: firebaseUser.phoneNumber 
          } : null
        });
        updateProgress(90, 'Recovering from error...');
        await new Promise(resolve => setTimeout(resolve, 200));
        setUser(null);
        updateProgress(100, 'Complete');
      }
      
      console.log('🔄 About to call setLoading(false) - main flow');
      setLoading(false);
      console.log('✅ setLoading(false) called successfully - main flow');
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
      console.log('🚪 Starting logout process...');
      
      // Clear any retailer-specific data
      localStorage.removeItem('retailerId');
      console.log('🗑️ Cleared retailerId from localStorage');
      
      // Clear any role selection state
      sessionStorage.removeItem('auth_view');
      sessionStorage.removeItem('selected_role');
      console.log('🗑️ Cleared session storage');
      
      // Clear any notification states
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('notifications_') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Sign out from Firebase - this will clear the Firebase Auth session
      // for both email/password users and retailer phone auth users
      console.log('🔥 Signing out from Firebase...');
      await signOut(auth);
      console.log('✅ Firebase sign out successful');
      
      // The onAuthStateChanged listener will automatically detect the signout
      // and set the user state to null, so we don't need to manually setUser(null)
      
      // Replace current history entry to prevent back navigation
      if (typeof window !== 'undefined') {
        console.log('🔄 Waiting for auth state to clear before redirect...');
        
        // Wait a moment for the auth state to update before redirecting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔄 Redirecting to home page...');
        window.history.replaceState({}, '', '/');
        // Force a redirect to home to ensure clean state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Fallback - still attempt to redirect even if there's an error
      if (typeof window !== 'undefined') {
        console.log('🔄 Fallback redirect to home page...');
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