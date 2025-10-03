import { NextRequest, NextResponse } from 'next/server';
import { fcmV1Service } from '@/lib/fcm-v1-service';

interface SendTestRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: SendTestRequest = await request.json();
    const { token, title, body: notificationBody, data } = requestBody;

    if (!token || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: token, title, body' },
        { status: 400 }
      );
    }

    // Check FCM v1 configuration
    const configStatus = fcmV1Service.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json(
        { 
          error: 'FCM v1 service is not properly configured',
          missing: configStatus.missing,
          suggestion: 'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables'
        },
        { status: 500 }
      );
    }

    // Use FCM v1 service
    const result = await fcmV1Service.sendNotification(token, title, notificationBody, data, {
      priority: 'high',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'test-notification',
      requireInteraction: false
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully via FCM v1',
        messageId: result.messageId
      });
    } else {
      console.error('FCM v1 Test API Error:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test notification via FCM v1',
          details: result.error
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM v1 send-test API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}