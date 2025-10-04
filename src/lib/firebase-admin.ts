import admin from 'firebase-admin';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Global variables to store initialized instances
let messagingInstance: Messaging | null = null;
let firestoreInstance: Firestore | null = null;
let isInitialized = false;

/**
 * Gets Firebase service account configuration from Firebase config
 * Falls back to environment variables for local development
 */
function getServiceAccountConfig() {
  // Try Firebase config first (for production)
  if (process.env.FIREBASE_CONFIG && typeof process.env.FIREBASE_CONFIG === 'string') {
    try {
      const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      if (firebaseConfig.service_account) {
        console.log('✅ Using Firebase service account config from FIREBASE_CONFIG');
        return firebaseConfig.service_account;
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse FIREBASE_CONFIG, falling back to environment variables');
    }
  }

  // Fallback to environment variables (for local development)
  const serviceAccount = {
    type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE,
    project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI,
    token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
  };

  // Check if we have environment variables set
  if (serviceAccount.private_key && serviceAccount.client_email && serviceAccount.project_id) {
    console.log('✅ Using Firebase service account config from environment variables');
    return serviceAccount;
  }

  // For Next.js development, try to use the Firebase config directly
  // This simulates functions.config() for local development
  const firebaseServiceAccount = {
    type: "service_account",
    project_id: "pharmalynkk",
    private_key_id: "65010a437c32609cd3820291cac5518e3a737f4d",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDcmKzdis3NoztQ\nD+i7mkj6b+QfKXsNIdk443078h4J3uC2zxS6ALK6yqlcCZ6nhhdI08jR/ICZJTC1\nCqEufs/Z8i9k6R6sIHy0BmuMAB0eaxA56FdnGsxhYe4Ygql6Iia3whM5UEX3RBUE\nPVLX7b5GSb5d4+rYsU07g/siYmMif9EyMaLbtq2YIrN9ouTzginOb8/FH+Y5IHUG\nBdxnaIHV+GtlqG0B0KRrRgy5PuhzbSriwjB93JvfvNX167VVD3ofXCAL7t9cIOIM\nTZbKbO7A6DdFctq3y7w9lN1p7HW/9Xrz8F05RcYYlxoQq4v/IqBUBesQZZQqqaYl\n2oxlXwULAgMBAAECggEAGb2kXkL2JOAT6bxm1zf3pWbXuF3UwqwydsBE5XEpLtRX\nuxKK7pwU6asAUYG7MP0lS8A6whYJbiq4IPKulYhX+gHtTy8h/x/YrVZvx5RefCWD\nbTO+udnsrhMJVMmFESqvAz5IPqXZTt3I6LJnL6nJoYC1ZVX/xMKw/8LffnGl875o\nM0Whr+nf+veMgRRmR+YtSI8hveHMGSRawAd0xk8tWPPMRaSiZFl1f/nznhhO8xg7\nK7Wr5ttAY0rFKda7Qp06qOEJjnmtods0k9t5OZCcGW73OxmbYNRWx3HPL+LL4Etr\n6+CVZdgsprKj3BrFWguvIf4jn9QUsFJ3kBK/C8x2AQKBgQDdp7X/WpDHDa4ioQ0p\n1W/KrnmN/mUm8QtgH9oxuT5e1F4kvFNBoecMUXm3OrL6L1IIxFhW/c1a7XZVEDBi\nFgOfvHePSaW0Qpct0RZ9OQWh6Ne9GqNaDc9tUj+GMHDrspiEas4P0InTCW+lJ821\nGuV+V8rA3KqxpQbeZd87t6zMiwKBgQD+xvfS5iXWT3btRzsIeyQp1EVFmmxNlsHo\nw+gnGzUx+gsde5MTdl5XFmbqhtQon3/0CS8aAF3stAnrZZFgdSYlCJXiCC+5JERI\nfkEVhCFela4JTqVrM97Rb+wSaJ3wHdtQw9sXHpavf5EngtsoQT6LPmdMdcEG7hu+\nOYhpTGM5gQKBgD1QlF7T3bLCjQYVSP/mg+ssQoHN+otAKKZpiUEx/hfbZUOCOQGx\n2KkmrKXL/hCJIIc+UTWXNcROZep39PpdHpmEWApyE/1+YjWRXkg7itxT/cHY6ZES\nuuuB0gK7ybDZkaknpmLnjAit1o14KkZL72n4vSSGpk1H2lORGKR7VbirAoGBAI50\nafU+QkHGRNT/Uv62+813pxP3+D6Z4OppP9E94UyEZtqhUec79Bv1pq3TnaTpKf4l\ndHSxZ9MGB9XbAKJSXnWuiz/LHAQFRzjRf0qsiov8XUdO9icu5ZNtZS4V2Nl9mDdc\ni5AtxktypJLXE/s6H+JzjgaugLODR3fha2iVEZYBAoGAfJlVSV22o/CK9LhvoQea\npKxX0KMiRulTogtn0+5aNUYWPFQCXqfEJSWZPyynEcCY6/rRS4o/BpVn6IxNN4Gi\n3yHd2e5nJT9h9b2Ko1NrBNy/X3y6LlvcPJULwO4a7MlIYhi+pOlzjacaSXVFxbY+\nsPn0Si2BcqB4j9n/IOlfM1Q=\n-----END PRIVATE KEY-----\n",
    client_email: "pharmalynkk@appspot.gserviceaccount.com",
    client_id: "110188124710391853479",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/pharmalynkk%40appspot.gserviceaccount.com",
    universe_domain: "googleapis.com"
  };

  console.log('✅ Using hardcoded Firebase service account config for development');
  return firebaseServiceAccount;
}

/**
 * Securely initializes Firebase Admin SDK using Firebase config or environment variables
 * This ensures credentials are never exposed in client-side code
 */
export function initializeFirebaseAdmin(): void {
  if (isInitialized) {
    return;
  }

  if (!admin.apps.length) {
    try {
      // Get service account config from Firebase config or environment variables
      const serviceAccount = getServiceAccountConfig();

      // Validate required fields
      const requiredFields = ['private_key', 'client_email', 'project_id'];
      const missingFields = requiredFields.filter(field => !(serviceAccount as any)[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required Firebase service account fields: ${missingFields.join(', ')}`);
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      console.log('✅ Firebase Admin initialized securely');
    } catch (error) {
      console.error('❌ Firebase Admin initialization error:', error);
      throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize service instances
  messagingInstance = getMessaging();
  firestoreInstance = getFirestore();
  isInitialized = true;

  console.log('✅ Firebase Admin services initialized');
}

/**
 * Gets Firebase Messaging instance
 * Initializes Firebase Admin if not already done
 */
export function getFirebaseMessaging(): Messaging {
  if (!isInitialized) {
    initializeFirebaseAdmin();
  }
  
  if (!messagingInstance) {
    throw new Error('Firebase Messaging not initialized');
  }
  
  return messagingInstance;
}

/**
 * Gets Firebase Firestore instance
 * Initializes Firebase Admin if not already done
 */
export function getFirebaseFirestore(): Firestore {
  if (!isInitialized) {
    initializeFirebaseAdmin();
  }
  
  if (!firestoreInstance) {
    throw new Error('Firebase Firestore not initialized');
  }
  
  return firestoreInstance;
}

/**
 * Validates that Firebase credentials are available from various sources
 * Returns true if credentials are available, false otherwise
 */
export function validateFirebaseCredentials(): boolean {
  try {
    const config = getServiceAccountConfig();
    const requiredFields = ['private_key', 'client_email', 'project_id'];
    const hasAllFields = requiredFields.every(field => (config as any)[field]);
    
    if (hasAllFields) {
      console.log('✅ Firebase credentials are available');
      return true;
    } else {
      console.error('❌ Missing Firebase credentials');
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating Firebase credentials:', error);
    return false;
  }
}

/**
 * For development/testing: Check if Firebase Admin is properly configured
 */
export function checkFirebaseAdminStatus(): { initialized: boolean; hasCredentials: boolean; source?: string; error?: string } {
  try {
    const hasCredentials = validateFirebaseCredentials();
    const initialized = isInitialized && admin.apps.length > 0;
    
    // Determine credential source
    let source = 'unknown';
    if (process.env.FIREBASE_CONFIG) {
      source = 'firebase_config';
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      source = 'environment_variables';
    } else {
      source = 'hardcoded_development';
    }
    
    return { initialized, hasCredentials, source };
  } catch (error) {
    return { 
      initialized: false, 
      hasCredentials: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}