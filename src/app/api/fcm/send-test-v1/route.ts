import { NextRequest, NextResponse } from 'next/server';
import { fcmV1Service } from '@/lib/fcm-v1-service';

interface SendTestRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  ttl?: number;
  icon?: string;
  badge?: string;
  tag?: string;
  clickAction?: string;
  requireInteraction?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: SendTestRequest = await request.json();
    const { 
      token, 
      title, 
      body: notificationBody, 
      data,
      priority = 'normal',
      ttl,
      icon,
      badge,
      tag,
      clickAction,
      requireInteraction = false
    } = requestBody;

    if (!token || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: token, title, body' },
        { status: 400 }
      );
    }

    // Check if FCM v1 service is configured
    const configStatus = fcmV1Service.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json(
        { 
          error: 'FCM v1 service not configured',
          details: `Missing environment variables: ${configStatus.missing.join(', ')}`,
          suggestion: 'Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set'
        },
        { status: 500 }
      );
    }

    // Send notification using FCM v1 API
    const result = await fcmV1Service.sendNotification(
      token,
      title,
      notificationBody,
      data,
      {
        priority,
        ttl,
        icon,
        badge,
        tag,
        clickAction,
        requireInteraction
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully via FCM v1 API',
        messageId: result.messageId,
        apiVersion: 'v1',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('FCM v1 API Error:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test notification via FCM v1 API',
          details: result.error,
          apiVersion: 'v1'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM v1 send-test API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check configuration status
export async function GET() {
  try {
    const configStatus = fcmV1Service.getConfigStatus();
    
    return NextResponse.json({
      configured: configStatus.configured,
      missing: configStatus.missing,
      apiVersion: 'v1',
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking FCM v1 configuration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}