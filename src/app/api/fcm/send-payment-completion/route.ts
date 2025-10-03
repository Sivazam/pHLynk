import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Input validation
    const { retailerId, amount, paymentId } = body;
    
    if (!retailerId || !amount || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, amount, paymentId' },
        { status: 400 }
      );
    }

    console.log('🚀 API Route - Sending FCM payment completion notification:', {
      retailerId,
      paymentId,
      amount
    });

    // Call the FCM cloud function
    const result = await callFirebaseFunction('sendPaymentCompletionNotification', {
      retailerId,
      amount,
      paymentId
    });

    console.log('✅ API Route - FCM payment completion notification result:', result);

    return NextResponse.json({
      success: true,
      result,
      type: 'fcm_notification'
    });

  } catch (error) {
    console.error('❌ API Route - Error sending FCM payment completion notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send FCM payment completion notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}