import { NextRequest, NextResponse } from 'next/server';

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

    const serverKey = process.env.FCM_SERVER_KEY;
    
    if (!serverKey) {
      return NextResponse.json(
        { error: 'FCM server key not configured' },
        { status: 500 }
      );
    }

    const message = {
      to: token,
      notification: {
        title,
        body: notificationBody,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification',
        requireInteraction: false
      },
      data: data || {
        type: 'test',
        timestamp: Date.now().toString()
      },
      priority: 'high',
      timeToLive: 2419200 // 28 days
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    // Handle response - check if it's JSON or HTML
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      console.error('FCM API returned non-JSON response:', textResponse);
      
      // Check if it's the legacy API issue
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'FCM legacy API not available. The provided key may be for FCM v1 API.',
            details: 'Consider using Firebase Admin SDK or check your FCM configuration.',
            status: response.status,
            keyProvided: serverKey ? serverKey.substring(0, 20) + '...' : 'none'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'FCM API returned invalid response',
          details: textResponse.substring(0, 200),
          status: response.status
        },
        { status: 400 }
      );
    }

    if (response.ok && responseData.success === 1) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        messageId: responseData.results?.[0]?.message_id
      });
    } else {
      console.error('FCM Test API Error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to send test notification',
          details: responseData 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM send-test API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}