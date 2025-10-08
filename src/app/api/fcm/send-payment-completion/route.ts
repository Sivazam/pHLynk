import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { sendPaymentCompletionNotificationViaCloudFunction } from '@/lib/cloud-functions';

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

    const results: Array<{
      type: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];

    // Send to retailer
    try {
      console.log('📱 Sending retailer notification via cloud function...');
      console.log('📤 Retailer notification data:', {
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
      
      // ✅ 使用专门的 sendPaymentCompletionNotification 云函数
      const retailerResult = await sendPaymentCompletionNotificationViaCloudFunction({
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
      
      console.log('✅ Retailer cloud function response:', retailerResult);
      results.push({ type: 'retailer', success: retailerResult.success ?? false, result: retailerResult });
      console.log('✅ Retailer payment completion notification sent');
    } catch (retailerError) {
      console.error('❌ Failed to send retailer notification:', {
        error: retailerError instanceof Error ? retailerError.message : 'Unknown error',
        stack: retailerError instanceof Error ? retailerError.stack : undefined
      });
      results.push({ type: 'retailer', success: false, error: retailerError instanceof Error ? retailerError.message : 'Unknown error' });
    }

    // Send to wholesaler if wholesalerId is provided
    if (wholesalerId) {
      try {
        console.log('📱 Sending wholesaler notification via cloud function...');
        console.log('📤 Wholesaler notification data:', {
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
        
        // Use cloud function for wholesaler notification instead of direct FCM
        const wholesalerResult = await sendPaymentCompletionNotificationViaCloudFunction({
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
        
        console.log('✅ Wholesaler cloud function response:', wholesalerResult);
        results.push({ type: 'wholesaler', success: wholesalerResult.success ?? false, result: wholesalerResult });
        
        console.log('✅ Wholesaler notification completed');
      } catch (wholesalerError) {
        console.error('❌ Failed to send wholesaler notification:', {
          error: wholesalerError instanceof Error ? wholesalerError.message : 'Unknown error',
          stack: wholesalerError instanceof Error ? wholesalerError.stack : undefined
        });
        results.push({ type: 'wholesaler', success: false, error: wholesalerError instanceof Error ? wholesalerError.message : 'Unknown error' });
      }
    } else {
      console.log('ℹ️ No wholesalerId provided - skipping wholesaler notification');
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