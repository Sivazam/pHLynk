import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

interface NotificationResult {
  type: 'retailer' | 'wholesaler';
  success: boolean;
  result?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Input validation
    const { retailerId, amount, paymentId, retailerName, lineWorkerName, wholesalerId } = body;
    
    if (!retailerId || !amount || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, amount, paymentId' },
        { status: 400 }
      );
    }

    console.log('🚀 API Route - Sending FCM payment completion notification:', {
      retailerId,
      wholesalerId,
      paymentId,
      amount,
      retailerName,
      lineWorkerName
    });

    const results: NotificationResult[] = [];

    // Send to retailer
    try {
      const retailerResult = await callFirebaseFunction('sendPaymentCompletionNotification', {
        retailerId,
        amount,
        paymentId,
        recipientType: 'retailer',
        retailerName,
        lineWorkerName,
        wholesalerId,
        title: '🎉 Payment Successful',
        body: `Congratulations - you successfully paid ₹${amount.toLocaleString()} to ${retailerName || 'your wholesaler'} via Line Man ${lineWorkerName || 'Line Worker'}.`,
        clickAction: '/retailer/payment-history'
      });
      
      results.push({ type: 'retailer', success: true, result: retailerResult });
      console.log('✅ Retailer payment completion notification sent');
    } catch (retailerError) {
      console.warn('⚠️ Failed to send retailer notification:', retailerError);
      results.push({ type: 'retailer', success: false, error: retailerError instanceof Error ? retailerError.message : 'Unknown error' });
    }

    // Send to wholesaler if wholesalerId is provided
    if (wholesalerId) {
      try {
        const wholesalerResult = await callFirebaseFunction('sendPaymentCompletionNotification', {
          retailerId: wholesalerId, // Use wholesalerId as the recipient
          amount,
          paymentId,
          recipientType: 'wholesaler',
          retailerName,
          lineWorkerName,
          wholesalerId,
          title: '💰 Collection Update',
          body: `Line Man ${lineWorkerName || 'Line Worker'} collected ₹${amount.toLocaleString()} from ${retailerName || 'Retailer'} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`,
          clickAction: '/wholesaler/dashboard'
        });
        
        results.push({ type: 'wholesaler', success: true, result: wholesalerResult });
        console.log('✅ Wholesaler payment completion notification sent');
      } catch (wholesalerError) {
        console.warn('⚠️ Failed to send wholesaler notification:', wholesalerError);
        results.push({ type: 'wholesaler', success: false, error: wholesalerError instanceof Error ? wholesalerError.message : 'Unknown error' });
      }
    }

    console.log('✅ API Route - Payment completion notifications completed:', results);

    return NextResponse.json({
      success: true,
      results,
      type: 'payment_completion_notifications'
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