import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fcmService } from '@/lib/fcm-service';

interface WholesalerNotificationRequest {
  tenantId: string;
  amount: number;
  paymentId: string;
  retailerName: string;
  lineWorkerName: string;
  title: string;
  body: string;
  clickAction: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WholesalerNotificationRequest = await request.json();
    const { tenantId, amount, paymentId, retailerName, lineWorkerName, title, body, clickAction } = body;

    console.log('🏪 Sending wholesaler notification via tenant collection:', {
      tenantId,
      amount,
      paymentId,
      retailerName,
      lineWorkerName
    });

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required field: tenantId' },
        { status: 400 }
      );
    }

    // Step 1: Find the tenant document
    console.log('🔍 Looking for tenant document:', tenantId);
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      console.error('❌ Tenant not found:', tenantId);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantData = tenantDoc.data();
    console.log('✅ Found tenant:', {
      id: tenantDoc.id,
      name: tenantData.name,
      status: tenantData.status,
      fcmDevices: tenantData.fcmDevices || []
    });

    // Step 2: Check if tenant has FCM devices
    const fcmDevices = tenantData.fcmDevices || [];
    if (fcmDevices.length === 0) {
      console.log('⚠️ No FCM devices found for tenant:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'No FCM devices registered for this tenant',
        devicesFound: 0
      });
    }

    console.log(`📱 Found ${fcmDevices.length} FCM devices for tenant`);

    // Step 3: Send notification to all tenant devices
    const notificationData = {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `payment-${paymentId}`,
      data: {
        type: 'payment_completion',
        paymentId,
        amount: amount.toString(),
        retailerName,
        lineWorkerName,
        tenantId,
        clickAction
      }
    };

    let successCount = 0;
    let failureCount = 0;

    for (const device of fcmDevices) {
      try {
        console.log(`📤 Sending to device: ${device.token.substring(0, 20)}...`);
        const result = await fcmService.sendToDevice(device.token, notificationData);
        
        if (result.success) {
          successCount++;
          console.log(`✅ Success sending to device: ${device.token.substring(0, 20)}...`);
        } else {
          failureCount++;
          console.warn(`⚠️ Failed to send to device: ${device.token.substring(0, 20)}...`, result.error);
          
          // If device token is invalid, remove it
          if (result.error === 'UNREGISTERED' || result.error === 'INVALID_ARGUMENT') {
            console.log(`🗑️ Removing invalid device token: ${device.token.substring(0, 20)}...`);
            await fcmService.unregisterDevice(tenantId, device.token);
          }
        }
      } catch (error) {
        failureCount++;
        console.error(`❌ Error sending to device ${device.token.substring(0, 20)}...:`, error);
      }
    }

    console.log(`📊 Wholesaler notification results: ${successCount} success, ${failureCount} failed`);

    return NextResponse.json({
      success: successCount > 0,
      message: `Notification sent to ${successCount} device(s), ${failureCount} failed`,
      tenantId,
      tenantName: tenantData.name,
      devicesFound: fcmDevices.length,
      successCount,
      failureCount
    });

  } catch (error) {
    console.error('❌ Error sending wholesaler notification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send wholesaler notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}