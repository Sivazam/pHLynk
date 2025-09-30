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
  // For server-side environments, we'll use HTTP calls instead of Firebase Functions SDK
  if (typeof window === 'undefined') {
    console.log('🖥️ Server environment detected - using HTTP calls for Firebase Functions');
    return null; // We'll handle this differently in the API routes
  }
  
  if (functionsInitialized && functions) {
    return functions;
  }
  
  if (!functionsInitPromise) {
    functionsInitPromise = (async () => {
      try {
        console.log('🌐 Browser environment - using Firebase Functions SDK');
        const functionsModule = await import('firebase/functions');
        console.log('📦 Firebase Functions module loaded:', Object.keys(functionsModule));
        
        if (functionsModule.getFunctions) {
          functions = functionsModule.getFunctions(undefined, 'us-central1');
          functionsInitialized = true;
          console.log('✅ Firebase Functions initialized successfully');
          return functions;
        } else {
          console.error('❌ getFunctions not available in browser');
          return null;
        }
      } catch (error) {
        console.error('❌ Error importing Firebase Functions:', error);
        return null;
      }
    })();
  }
  
  return functionsInitPromise;
}

// Helper function to call Firebase Functions via HTTP
export async function callFirebaseFunction(functionName: string, data: any): Promise<any> {
  try {
    console.log(`🌐 Calling Firebase Function via HTTP: ${functionName}`);
    console.log(`📤 Function data:`, JSON.stringify(data, null, 2));
    
    // Get the Firebase project ID from the config
    const firebaseConfig = {
      projectId: "pharmalynkk"
    };
    
    // Construct the function URL
    const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
    
    // Firebase Functions expect the data to be directly in the body, not wrapped in a 'data' property
    // If the data has a 'data' property, unwrap it for HTTP calls
    const requestData = data.data || data;
    
    console.log(`🔧 Data unwrapping for HTTP call:`);
    console.log(`📥 Original data structure:`, JSON.stringify(data, null, 2));
    console.log(`📤 Unwrapped request data:`, JSON.stringify(requestData, null, 2));
    console.log(`📤 Has 'data' property:`, !!data.data);
    
    console.log(`📤 Making HTTP request to: ${functionUrl}`);
    console.log(`📤 Request headers:`, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    console.log(`📤 Request body:`, JSON.stringify(requestData, null, 2));
    
    // Make the HTTP request
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify(requestData),
    });
    
    console.log(`📤 Response status:`, response.status);
    console.log(`📤 Response status text:`, response.statusText);
    console.log(`📤 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP error! status: ${response.status}, response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Firebase Function ${functionName} called successfully:`, result);
    
    return result;
  } catch (error) {
    console.error(`❌ Error calling Firebase Function ${functionName}:`, error);
    console.error(`❌ Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined
    });
    throw error;
  }
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