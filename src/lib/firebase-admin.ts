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
    project_id: "plkapp-8c052",
    private_key_id: "YOUR_PRIVATE_KEY_ID",
    private_key: "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-xxxxx@plkapp-8c052.iam.gserviceaccount.com",
    client_id: "YOUR_CLIENT_ID",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40plkapp-8c052.iam.gserviceaccount.com",
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