import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { fcmService } from '@/lib/fcm-service';

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
      
      console.log('✅ Retailer cloud function response:', retailerResult);
      results.push({ type: 'retailer', success: true, result: retailerResult });
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
        
        // Direct tenant notification instead of cloud function
        const { doc, getDoc } = await import('firebase/firestore');
        const tenantRef = doc(db, 'tenants', wholesalerId);
        const tenantDoc = await getDoc(tenantRef);
        
        if (!tenantDoc.exists()) {
          console.warn('⚠️ Tenant not found for wholesaler notification:', wholesalerId);
          results.push({ type: 'wholesaler', success: false, error: 'Tenant not found' });
        } else {
          const tenantData = tenantDoc.data();
          const fcmDevices = tenantData.fcmDevices || [];
          
          if (fcmDevices.length === 0) {
            console.log('ℹ️ No FCM devices for tenant:', wholesalerId);
            results.push({ type: 'wholesaler', success: true, result: { message: 'No FCM devices registered' } });
          } else {
            const notificationData = {
              title: '💰 Collection Update',
              body: `Line Man ${lineWorkerName || 'Line Worker'} collected ₹${amount.toLocaleString()} from ${retailerName || 'Retailer'} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`,
              data: {
                type: 'payment_completion',
                paymentId,
                amount: amount.toString(),
                retailerName,
                lineWorkerName,
                tenantId: wholesalerId,
                clickAction: '/wholesaler/dashboard'
              }
            };
            
            let successCount = 0;
            for (const device of fcmDevices) {
              try {
                const result = await fcmService.sendToDevice(device.token, notificationData);
                if (result.success) {
                  successCount++;
                }
              } catch (error) {
                console.error('Error sending to device:', error);
              }
            }
            
            console.log(`✅ Wholesaler notification sent to ${successCount}/${fcmDevices.length} devices`);
            results.push({ 
              type: 'wholesaler', 
              success: successCount > 0, 
              result: { 
                message: `Sent to ${successCount} device(s)`,
                tenantName: tenantData.name
              } 
            });
          }
        }
        
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