import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU",
  authDomain: "plkapp-8c052.firebaseapp.com",
  projectId: "plkapp-8c052",
  storageBucket: "plkapp-8c052.firebasestorage.app",
  messagingSenderId: "333526318951",
  appId: "1:333526318951:web:a8f30f497e7060e264b9c2"
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

// Firebase Functions are no longer used - OTP generation is now local
// Keeping this export for backward compatibility but it will always return null
export async function initializeFirebaseFunctions(): Promise<any> {
  console.log('📝 Firebase Functions initialization skipped - using local OTP generation');
  return null;
}

// Helper function to call Firebase Functions via HTTP with retry logic
export async function callFirebaseFunction(functionName: string, data: any, retries = 2): Promise<any> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 Calling Firebase Function via HTTP: ${functionName} (attempt ${attempt + 1}/${retries + 1})`);
      console.log(`📤 Function data:`, JSON.stringify(data, null, 2));

      // Get the Firebase project ID from the config
      const firebaseConfig = {
        projectId: "plkapp-8c052"
      };

      // Construct the function URL
      const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;

      // Firebase Functions expect the data to be sent directly for HTTP calls
      // For callable functions, we need to structure the data as { data: {...} }
      let requestData = data;

      // Check if this is already in callable function format (has 'data' property)
      if (data && typeof data === 'object' && data.data && typeof data.data === 'object') {
        console.log(`🔧 Data already has 'data' property, using as-is for callable function`);
        requestData = data;  // Keep the original structure with 'data' property
      } else {
        console.log(`🔧 Wrapping data in 'data' property for callable function format`);
        requestData = { data: data };  // Wrap in data property for callable functions
      }

      console.log(`🔧 Data processing for HTTP call:`);
      console.log(`📥 Original data structure:`, JSON.stringify(data, null, 2));
      console.log(`📤 Processed request data:`, JSON.stringify(requestData, null, 2));
      console.log(`🚨 CRITICAL DEBUG - Final HTTP request body:`, JSON.stringify(requestData, null, 2));

      console.log(`📤 Making HTTP request to: ${functionUrl}`);

      // Make the HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`📤 Response status:`, response.status);
      console.log(`📤 Response status text:`, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error! status: ${response.status}, response:`, errorText);

        // Try to parse error as JSON for more details
        let errorDetails = null;
        try {
          errorDetails = JSON.parse(errorText);
          console.error(`❌ Parsed error details:`, errorDetails);
        } catch (parseError) {
          console.error(`❌ Could not parse error as JSON:`, errorText);
        }

        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Firebase Function ${functionName} called successfully:`, result);

      return result;

    } catch (error) {
      lastError = error;
      console.error(`❌ Error calling Firebase Function ${functionName} (attempt ${attempt + 1}/${retries + 1}):`, error);

      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.error(`❌ All ${retries + 1} attempts failed for Firebase Function ${functionName}`);
  console.error(`❌ Final error details:`, {
    message: lastError instanceof Error ? lastError.message : 'Unknown error',
    stack: lastError instanceof Error ? lastError.stack : undefined,
    code: lastError && typeof lastError === 'object' && 'code' in lastError ? lastError.code : undefined
  });

  throw lastError;
}

// Firebase Functions are no longer auto-initialized since we use local OTP generation

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
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER'
} as const;

// Tenant statuses
export const TENANT_STATUSES = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
} as const;

export default app;