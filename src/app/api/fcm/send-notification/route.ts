import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

interface SendNotificationRequest {
  retailerId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  tag?: string;
  clickAction?: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: SendNotificationRequest = await request.json();
    const { retailerId, title, body, data, icon, tag, clickAction } = requestBody;

    if (!retailerId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, title, body' },
        { status: 400 }
      );
    }

    console.log('📱 Sending FCM notification via cloud function:', {
      retailerId,
      title,
      body: body.substring(0, 50) + '...'
    });

    // Call the cloud function to send the notification
    const result = await callFirebaseFunction('sendFCMNotification', {
      retailerId,
      notification: {
        title,
        body,
        data: data || {},
        icon: icon || '/icon-192x192.png',
        tag,
        clickAction
      }
    });

    console.log('✅ FCM notification sent via cloud function:', result);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    
    // Fallback to local FCM service if cloud function fails
    console.log('⚠️ Cloud function failed, trying local FCM service...');
    
    try {
      const requestBody: SendNotificationRequest = await request.json();
      const { retailerId, data } = requestBody;
      
      const { sendOTPViaFCM } = await import('@/lib/fcm-service');
      const result = await sendOTPViaFCM(
        retailerId,
        data?.otp || '000000',
        data?.retailerName || 'Retailer',
        data?.paymentId,
        data?.amount ? parseFloat(data.amount) : undefined
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Notification sent via local FCM service',
          result,
          fallback: true
        });
      } else {
        return NextResponse.json(
          { error: result.message, fallback: true },
          { status: 400 }
        );
      }
    } catch (fallbackError) {
      console.error('Local FCM service also failed:', fallbackError);
      return NextResponse.json(
        { 
          error: 'Failed to send notification via both cloud function and local service',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}