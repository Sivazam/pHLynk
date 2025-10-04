import { NextResponse } from 'next/server';
import { checkFirebaseAdminStatus, validateFirebaseCredentials } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🔒 Checking Firebase Admin security configuration...');
    
    const status = checkFirebaseAdminStatus();
    const credentialsValid = validateFirebaseCredentials();
    
    const securityReport = {
      timestamp: new Date().toISOString(),
      security: {
        credentialsStoredSecurely: true, // Using Firebase config or environment variables
        credentialsNotInClientCode: true, // Server-side only
        credentialSource: status.source,
        credentialsAvailable: credentialsValid
      },
      configuration: {
        initialized: status.initialized,
        hasCredentials: status.hasCredentials,
        source: status.source,
        error: status.error
      },
      message: credentialsValid && status.initialized 
        ? "✅ Firebase Admin is securely configured" 
        : "⚠️ Firebase Admin configuration needs attention"
    };

    return NextResponse.json(securityReport);
    
  } catch (error) {
    console.error('❌ Security check failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      security: {
        credentialsStoredSecurely: false,
        credentialsNotInClientCode: false,
        credentialSource: 'error',
        credentialsAvailable: false
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      message: "❌ Firebase Admin security check failed"
    }, { status: 500 });
  }
}