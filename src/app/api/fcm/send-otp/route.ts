import { NextRequest, NextResponse } from 'next/server';
import { sendOTPViaFCM } from '@/lib/fcm-service';

interface SendOTPRequest {
  retailerId: string;
  otp: string;
  amount: number;
  paymentId: string;
  lineWorkerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendOTPRequest = await request.json();
    const { retailerId, otp, amount, paymentId, lineWorkerName } = body;

    if (!retailerId || !otp || !amount || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, otp, amount, paymentId' },
        { status: 400 }
      );
    }

    // Get retailer name for better notification
    let retailerName = 'Retailer';
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        retailerName = retailerDoc.data()?.name || retailerDoc.data()?.businessName || retailerName;
      }
    } catch (error) {
      console.warn('Error fetching retailer name:', error);
    }

    const result = await sendOTPViaFCM(
      retailerId,
      otp,
      retailerName,
      paymentId,
      amount
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        sentCount: result.sentCount
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM send-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}