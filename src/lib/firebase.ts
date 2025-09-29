import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Note: Firebase Functions are optional and only used if available
let functions: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyAiuROMuOXyBTQ2tAn_7lCk8qBsKLcKBds",
  authDomain: "pharmalynkk.firebaseapp.com",
  projectId: "pharmalynkk",
  storageBucket: "pharmalynkk.firebasestorage.app",
  messagingSenderId: "877118992574",
  appId: "1:877118992574:web:ca55290c721d1c4b18eeef"
};

import { logger } from '@/lib/logger';

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  logger.success('Firebase initialized successfully');
} catch (error: any) {
  logger.error('Firebase initialization error', error);
  // If app already exists, use the existing one
  if (error?.code === 'app/duplicate-app') {
    app = initializeApp(firebaseConfig, 'secondary');
  } else {
    throw error;
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Firebase Functions and get a reference to the service (optional)
// Only initialize if the functions module is available
let functionsInitialized = false;
let functionsInitPromise: Promise<any> | null = null;

export async function initializeFirebaseFunctions(): Promise<any> {
  if (functionsInitialized && functions) {
    return functions;
  }
  
  if (!functionsInitPromise) {
    functionsInitPromise = import('firebase/functions').then(async functionsModule => {
      if (functionsModule.getFunctions) {
        try {
          // Initialize Firebase Functions with proper configuration
          // For production deployment, don't use emulator
          if (process.env.NODE_ENV === 'development' && process.env.FUNCTIONS_EMULATOR === 'true') {
            // Only connect to emulator if explicitly enabled
            functions = functionsModule.getFunctions(undefined, 'us-central1');
            if (functionsModule.connectFunctionsEmulator) {
              try {
                functionsModule.connectFunctionsEmulator(functions, 'localhost', 5001);
                console.log('🔧 Connected to Firebase Functions emulator');
              } catch (error) {
                console.log('⚠️ Could not connect to Functions emulator, using production functions:', error);
              }
            }
          } else {
            // For production or when emulator is not explicitly enabled
            functions = functionsModule.getFunctions(undefined, 'us-central1');
            console.log('🚀 Using production Firebase Functions');
          }
          
          functionsInitialized = true;
          console.log('✅ Firebase Functions initialized successfully with region: us-central1');
          return functions;
        } catch (error) {
          console.error('❌ Error initializing Firebase Functions:', error);
          functions = null;
          return null;
        }
      } else {
        console.error('❌ Firebase Functions module not available - getFunctions function missing');
        functions = null;
        return null;
      }
    }).catch(error => {
      console.error('❌ Failed to import Firebase Functions module:', error);
      functions = null;
      return null;
    });
  }
  
  return functionsInitPromise;
}

// Auto-initialize functions in the background with retry mechanism
const initializeWithRetry = async (retryCount = 0, maxRetries = 3) => {
  try {
    await initializeFirebaseFunctions();
    console.log('✅ Background Firebase Functions initialization successful');
  } catch (error) {
    console.error('❌ Background Firebase Functions initialization failed:', error);
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying Firebase Functions initialization (${retryCount + 1}/${maxRetries})...`);
      setTimeout(() => initializeWithRetry(retryCount + 1, maxRetries), 2000 * (retryCount + 1));
    }
  }
};

initializeWithRetry();

export { functions };

// Collection names
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  AREAS: 'areas',
  RETAILERS: 'retailers',
  PAYMENTS: 'payments',
  PAYMENT_EVENTS: 'paymentEvents',
  SUBSCRIPTIONS: 'subscriptions',
  CONFIG: 'config',
  OTPS: 'otps',
  MONTHLY_TARGETS: 'monthlyTargets'
} as const;

// User roles
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  WHOLESALER_ADMIN: 'WHOLESALER_ADMIN',
  LINE_WORKER: 'LINE_WORKER',
  RETAILER: 'RETAILER'
} as const;

// Payment states
export const PAYMENT_STATES = {
  INITIATED: 'INITIATED',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  UPI: 'UPI'
} as const;

// Tenant statuses
export const TENANT_STATUSES = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
} as const;

export default app;