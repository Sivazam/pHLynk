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
    const requestBody: WholesalerNotificationRequest = await request.json();
    const { tenantId, amount, paymentId, retailerName, lineWorkerName, title, body, clickAction } = requestBody;

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

    // Use cloud function for wholesaler notification instead of direct FCM
    // Since FCMService.sendToDevice is disabled, we'll use the cloud function approach
    console.log('📤 Using cloud function for wholesaler notification...');
    
    try {
      const { callFirebaseFunction } = await import('@/lib/firebase');
      const result = await callFirebaseFunction('sendPaymentCompletionNotification', {
        retailerId: tenantId, // Use tenantId as the recipient
        amount,
        paymentId,
        recipientType: 'wholesaler',
        retailerName,
        lineWorkerName,
        wholesalerId: tenantId,
        title,
        body,
        clickAction
      });
      
      console.log('✅ Wholesaler cloud function response:', result);
      
      return NextResponse.json({
        success: true,
        message: 'Notification sent via cloud function',
        tenantId,
        tenantName: tenantData.name,
        devicesFound: fcmDevices.length,
        cloudFunctionResult: result
      });
    } catch (cloudFunctionError) {
      console.error('❌ Cloud function failed:', cloudFunctionError);
      
      // Fallback: return success but note that cloud function failed
      return NextResponse.json({
        success: false,
        message: 'Cloud function failed',
        tenantId,
        tenantName: tenantData.name,
        devicesFound: fcmDevices.length,
        error: cloudFunctionError instanceof Error ? cloudFunctionError.message : 'Unknown error'
      });
    }

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