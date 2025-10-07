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
import { initializeFCM } from '@/lib/fcm';

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
        
        console.log('🔍 Auth state changed. Firebase user:', firebaseUser ? firebaseUser.uid : 'null');
        
        // Small delay for auth state check
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (firebaseUser) {
          updateProgress(30, 'Loading user profile...');
          
          // Small delay before Firestore call
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // For phone-authenticated users (retailers), check retailerUsers collection first
          if (firebaseUser.phoneNumber) {
            updateProgress(40, 'Checking retailer account...');
            
            const phone = firebaseUser.phoneNumber.replace('+91', '').replace(/\D/g, '');
            const retailerUid = `retailer_${phone}`;
            const retailerUserDoc = await getDoc(doc(db, 'retailerUsers', retailerUid));
            
            if (retailerUserDoc.exists()) {
              updateProgress(70, 'Loading retailer profile...');
              
              const retailerData = retailerUserDoc.data();
              
              // Check if retailer account is active
              if (!retailerData.isActive) {
                console.error('Retailer account is inactive:', firebaseUser.uid);
                updateProgress(90, 'Account inactive...');
                await new Promise(resolve => setTimeout(resolve, 150));
                setUser(null);
                return;
              }
              
              const authUser: AuthUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || `retailer_${phone}@pharmalynk.local`,
                displayName: retailerData.name || 'Retailer',
                photoURL: firebaseUser.photoURL || undefined,
                tenantId: retailerData.tenantId,
                roles: ['RETAILER'], // Retailer users always have RETAILER role
                isRetailer: true,
                retailerId: retailerData.retailerId,
                phone: retailerData.phone
              };
              
              // Also store retailerId in localStorage for backward compatibility
              localStorage.setItem('retailerId', retailerData.retailerId);
              
              // 🔐 SECURITY: Clear any logout timestamp on successful login
              localStorage.removeItem('logged_out_at');
              console.log('✅ Cleared logout timestamp on successful login');
              
              // 🔄 Initialize FCM for returning retailer users
              try {
                updateProgress(78, 'Setting up notifications...');
                console.log('🔔 Initializing FCM for returning retailer user:', {
                  authUid: firebaseUser.uid,
                  retailerId: retailerData.retailerId,
                  retailerName: retailerData.name,
                  phone: retailerData.phone
                });
                
                // Initialize FCM in background without blocking the UI
                initializeFCM(retailerData.retailerId).then(fcmToken => {
                  if (fcmToken) {
                    console.log('✅ FCM initialized successfully for returning retailer user:', {
                      retailerId: retailerData.retailerId,
                      tokenLength: fcmToken.length,
                      tokenPrefix: fcmToken.substring(0, 20) + '...'
                    });
                  } else {
                    console.warn('⚠️ FCM initialization failed for returning retailer user:', {
                      retailerId: retailerData.retailerId
                    });
                  }
                }).catch(error => {
                  console.error('❌ FCM initialization error for returning retailer user:', {
                    retailerId: retailerData.retailerId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                });
              } catch (error) {
                console.error('❌ Failed to initialize FCM for returning retailer user:', {
                  retailerId: retailerData.retailerId,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
              
              updateProgress(85, 'Setting up retailer dashboard...');
              
              // Final delay before completing
              await new Promise(resolve => setTimeout(resolve, 150));
              
              updateProgress(95, 'Almost ready...');
              setUser(authUser);
              setLoading(false);
              return;
            }
          }
          
          // For email-authenticated users (wholesaler admins, line workers, super admins), check users collection
          updateProgress(50, 'Loading user profile...');
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
            
            // 🔐 SECURITY: Clear any logout timestamp on successful login
            localStorage.removeItem('logged_out_at');
            console.log('✅ Cleared logout timestamp on successful login');
            
            // 🔄 Initialize FCM for returning users
            try {
              updateProgress(88, 'Setting up notifications...');
              console.log('🔔 Initializing FCM for returning user:', firebaseUser.uid);
              
              // Initialize FCM in background without blocking the UI
              initializeFCM().then(fcmToken => {
                if (fcmToken) {
                  console.log('✅ FCM initialized successfully for returning user');
                } else {
                  console.warn('⚠️ FCM initialization failed for returning user');
                }
              }).catch(error => {
                console.error('❌ FCM initialization error for returning user:', error);
              });
            } catch (error) {
              console.error('❌ Failed to initialize FCM for returning user:', error);
            }
            
            updateProgress(95, 'Almost ready...');
            
            // Final delay before completing
            await new Promise(resolve => setTimeout(resolve, 150));
            
            updateProgress(100, 'Complete');
            setUser(authUser);
          } else {
            // User exists in Auth but not in users collection and not a phone retailer
            console.error('User exists in Auth but not in users collection');
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
      console.log('🚪 Starting logout process...');
      
      // 🔐 SECURITY: Unregister FCM token to prevent notifications to logged-out users
      try {
        const { deleteFCMToken } = await import('@/lib/fcm');
        const fcmResult = await deleteFCMToken();
        console.log('🔕 FCM token unregistered:', fcmResult ? 'success' : 'failed');
      } catch (fcmError) {
        console.warn('⚠️ Error unregistering FCM token:', fcmError);
        // Continue with logout even if FCM unregistration fails
      }
      
      // 🔐 SECURITY: Additional cleanup - unregister all devices for current user
      try {
        if (auth.currentUser) {
          const retailerId = localStorage.getItem('retailerId') || auth.currentUser.uid;
          console.log('🗑️ Cleaning up all devices for retailer:', retailerId);
          
          // Call cleanup API to remove all devices
          await fetch('/api/fcm/cleanup-user-devices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              retailerId: retailerId,
              userId: auth.currentUser.uid
            })
          }).catch(error => {
            console.warn('⚠️ Error calling cleanup API:', error);
          });
        }
      } catch (cleanupError) {
        console.warn('⚠️ Error during device cleanup:', cleanupError);
      }
      
      // 🔌 Disconnect socket connections
      try {
        if (typeof window !== 'undefined' && (window as any).socket) {
          console.log('🔌 Disconnecting socket connection...');
          (window as any).socket.disconnect();
          (window as any).socket = null;
        }
      } catch (socketError) {
        console.warn('⚠️ Error disconnecting socket:', socketError);
      }
      
      // Clear any retailer-specific data
      localStorage.removeItem('retailerId');
      console.log('🗑️ Cleared retailerId from localStorage');
      
      // 🔐 SECURITY: Set logout timestamp to prevent notifications to recently logged-out users
      localStorage.setItem('logged_out_at', Date.now().toString());
      console.log('🚫 Set logout timestamp for notification blocking');
      
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
      
      // Clear notification service state
      try {
        if (typeof window !== 'undefined') {
          // Clear any in-app notification state
          localStorage.removeItem('shownOTPpopups');
          localStorage.removeItem('shownCompletedPaymentPopups');
          
          // Stop any real-time listeners
          const { enhancedNotificationService } = await import('@/services/enhanced-notification-service');
          if (auth.currentUser) {
            enhancedNotificationService.stopRealtimeListening(auth.currentUser.uid);
          }
        }
      } catch (notificationError) {
        console.warn('⚠️ Error clearing notification state:', notificationError);
      }
      
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
      // Still try to redirect even if logout fails partially
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