import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { retailerId, otp, amount, paymentId, lineWorkerName } = body;

    if (!retailerId || !otp || !amount || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🔔 Sending direct FCM OTP notification:', {
      retailerId,
      paymentId,
      amount,
      otp: otp.substring(0, 1) + '***'
    });

    // Get retailer document
    const retailerDoc = await getDoc(doc(db, 'retailers', retailerId));
    
    if (!retailerDoc.exists()) {
      console.log('❌ Retailer not found:', retailerId);
      return NextResponse.json({
        success: false,
        error: 'Retailer not found',
        fallbackToSMS: true
      });
    }

    const retailerData = retailerDoc.data();
    const fcmDevices = retailerData.fcmDevices || [];
    
    console.log('📱 Found FCM devices:', fcmDevices.length);

    // Find active devices
    const activeDevices = fcmDevices.filter(device => device.isActive);
    
    if (activeDevices.length === 0) {
      console.log('⚠️ No active FCM devices found');
      return NextResponse.json({
        success: false,
        error: 'No active devices found',
        fallbackToSMS: true
      });
    }

    console.log(`📱 Found ${activeDevices.length} active FCM devices`);
    console.log('📱 Device tokens:', activeDevices.map(d => d.token.substring(0, 20) + '...'));

    // For now, just return the device info to verify we can find tokens
    // In a real implementation, you would use Firebase Admin SDK to send FCM
    return NextResponse.json({
      success: true,
      foundDevices: activeDevices.length,
      devices: activeDevices.map(d => ({
        deviceId: d.deviceId,
        tokenPrefix: d.token.substring(0, 20) + '...',
        isActive: d.isActive,
        lastActive: d.lastActive
      })),
      retailerName: retailerData.name,
      message: 'FCM tokens found - ready to send notifications'
    });

  } catch (error) {
    console.error('❌ Error in direct FCM debug:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}