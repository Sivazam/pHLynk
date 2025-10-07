import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, testMode = false } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing payment completion flow for paymentId:', paymentId);

    // Step 1: Get payment details
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      const payment = {
        id: paymentDoc.id,
        ...paymentDoc.data()
      };

      console.log('📄 Payment details:', {
        paymentId: payment.id,
        retailerId: payment.retailerId,
        tenantId: payment.tenantId,
        retailerName: payment.retailerName,
        lineWorkerName: payment.lineWorkerName,
        totalPaid: payment.totalPaid,
        state: payment.state
      });

      // Step 2: Test FCM notification sending
      if (testMode) {
        console.log('🧪 Test mode: Simulating FCM payment completion notification...');
        
        const fcmTestResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fcm/send-payment-completion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId: payment.retailerId,
            amount: payment.totalPaid,
            paymentId: paymentId,
            retailerName: payment.retailerName,
            lineWorkerName: payment.lineWorkerName,
            wholesalerId: payment.tenantId
          })
        });

        const fcmResult = await fcmTestResponse.json();
        
        console.log('🧪 FCM Test Response:', {
          status: fcmTestResponse.status,
          ok: fcmTestResponse.ok,
          result: fcmResult
        });

        return NextResponse.json({
          success: true,
          payment,
          fcmTest: {
            status: fcmTestResponse.status,
            ok: fcmTestResponse.ok,
            result: fcmResult
          },
          testMode: true
        });
      }

      return NextResponse.json({
        success: true,
        payment,
        message: 'Payment found. Use testMode: true to test FCM notification.'
      });

    } catch (paymentError) {
      console.error('❌ Error getting payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to get payment details' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Debug payment completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}