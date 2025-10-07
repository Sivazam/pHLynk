import { NextResponse } from 'next/server';
import { checkFirebaseAdminStatus } from '@/lib/firebase-admin';

export async function GET() {
  const status = checkFirebaseAdminStatus();
  
  return NextResponse.json({
    success: true,
    firebase: status,
    environment: {
      hasClientConfig: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasServerConfig: !!process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    }
  });
}