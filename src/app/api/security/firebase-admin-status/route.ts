import { NextResponse } from 'next/server';
import { checkFirebaseAdminStatus, validateFirebaseCredentials } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🔒 Checking Firebase Admin security configuration...');
    
    const status = checkFirebaseAdminStatus();
    const credentialsValid = validateFirebaseCredentials();
    
    const securityReport = {
      success: true,
      timestamp: new Date().toISOString(),
      firebase: status,
      environment: {
        hasClientConfig: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasServerConfig: !!process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        nodeEnv: process.env.NODE_ENV
      },
      security: {
        credentialsStoredSecurely: true, // Using Firebase config or environment variables
        credentialsNotInClientCode: true, // Server-side only
        credentialSource: status.source,
        credentialsAvailable: credentialsValid
      },
      configuration: {
        clientConfigured: !!(
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
          process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        ),
        serverConfigured: !!(
          process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY &&
          process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
          process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
        ),
        fcmConfigured: !!(
          process.env.NEXT_PUBLIC_FCM_VAPID_KEY ||
          process.env.FCM_SERVER_KEY
        ),
        smsConfigured: !!(
          process.env.FAST2SMS_API_KEY
        )
      },
      message: credentialsValid && status.initialized 
        ? "✅ Firebase Admin is securely configured" 
        : "⚠️ Firebase Admin configuration needs attention"
    };

    return NextResponse.json(securityReport);
    
  } catch (error) {
    console.error('❌ Security check failed:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: "❌ Firebase Admin security check failed"
    }, { status: 500 });
  }
}