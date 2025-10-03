// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if FCM v1 is configured by checking environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    const isConfigured = !!(projectId && clientEmail && privateKey);

    return NextResponse.json({
      configured: isConfigured,
      projectId: projectId || null,
      clientEmail: clientEmail ? `${clientEmail.substring(0, 5)}...` : null,
      privateKey: privateKey ? '***configured***' : null,
      message: isConfigured 
        ? "FCM v1 API is configured" 
        : "FCM v1 API is not configured",
      details: isConfigured
        ? "All required environment variables are set"
        : "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY"
    });

  } catch (error) {
    console.error('Error checking FCM v1 configuration:', error);
    return NextResponse.json({
      configured: false,
      error: 'Failed to check FCM v1 configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}