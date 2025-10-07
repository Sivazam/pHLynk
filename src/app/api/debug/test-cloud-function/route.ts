import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { retailerId, amount = 100, paymentId = 'test-payment-' + Date.now() } = body;

    if (!retailerId) {
      return NextResponse.json(
        { error: 'Missing retailerId' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing cloud function directly...');
    console.log('📤 Test data:', { retailerId, amount, paymentId });

    // Test retailer notification using the dedicated payment completion function
    try {
      const retailerResult = await callFirebaseFunction('sendPaymentCompletionNotification', {
        retailerId,
        amount,
        paymentId,
        recipientType: 'retailer',
        title: '🧪 Test Payment Successful',
        body: `This is a test payment completion notification for ₹${amount.toLocaleString()}.`,
        clickAction: '/retailer/payment-history'
      });

      console.log('✅ Cloud function test successful:', retailerResult);

      return NextResponse.json({
        success: true,
        message: 'Cloud function test successful',
        result: retailerResult,
        testData: { retailerId, amount, paymentId }
      });

    } catch (cloudFunctionError) {
      console.error('❌ Cloud function test failed:', {
        error: cloudFunctionError instanceof Error ? cloudFunctionError.message : 'Unknown error',
        stack: cloudFunctionError instanceof Error ? cloudFunctionError.stack : undefined
      });

      return NextResponse.json({
        success: false,
        error: 'Cloud function test failed',
        details: cloudFunctionError instanceof Error ? cloudFunctionError.message : 'Unknown error',
        testData: { retailerId, amount, paymentId }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Test cloud function error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}