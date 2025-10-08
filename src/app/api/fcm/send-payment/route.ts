import { NextRequest, NextResponse } from 'next/server';
import { sendPaymentNotificationViaFCM } from '@/lib/fcm-service';

interface SendPaymentRequest {
  retailerId: string;
  paymentId: string;
  status: 'completed' | 'failed' | 'pending';
  amount: number;
  customerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPaymentRequest = await request.json();
    const { retailerId, paymentId, status, amount, customerName } = body;

    if (!retailerId || !paymentId || !status || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, paymentId, status, amount' },
        { status: 400 }
      );
    }

    if (!['completed', 'failed', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: completed, failed, or pending' },
        { status: 400 }
      );
    }

    const result = await sendPaymentNotificationViaFCM(
      retailerId,
      paymentId,
      status,
      amount,
      customerName
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        sentCount: 1 // Placeholder for backward compatibility
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM send-payment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}