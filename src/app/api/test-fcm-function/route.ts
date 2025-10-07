import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Firebase Function call...');
    
    // Test the sendFCMNotification function with minimal data
    const result = await callFirebaseFunction('sendFCMNotification', {
      retailerId: 'test-retailer-id',
      notification: {
        title: '🧪 Test Notification',
        body: 'This is a test notification from the API',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Test result:', result);

    return NextResponse.json({
      success: true,
      message: 'Test completed',
      result
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}