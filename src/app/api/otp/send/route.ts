import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { otpStore, generateOTP, sendOTPToRetailer, cleanupExpiredOTPs, addActiveOTP } from '@/lib/otp-store';
import { RetailerAuthService } from '@/services/retailer-auth';

interface OTPRequest {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OTPRequest = await request.json();
    const { retailerId, paymentId, amount, lineWorkerName } = body;

    if (!retailerId || !paymentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get retailer user details from retailerUsers collection
    const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
    
    if (!retailerUser) {
      return NextResponse.json(
        { error: 'Retailer user not found' },
        { status: 404 }
      );
    }

    if (!retailerUser.phone) {
      return NextResponse.json(
        { error: 'Retailer phone number not found' },
        { status: 400 }
      );
    }

    console.log('📱 OTP SEND REQUEST:');
    console.log('Retailer ID:', retailerId);
    console.log('Payment ID:', paymentId);
    console.log('Amount:', amount);
    console.log('Line Worker Name:', lineWorkerName);
    console.log('Retailer User Data:', retailerUser);

    // Generate OTP
    const otp = generateOTP();
    console.log('🔢 Generated OTP:', otp);
    
    // Store OTP with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpStore.set(paymentId, {
      code: otp,
      expiresAt,
      attempts: 0
    });

    console.log('📝 OTP stored in otpStore with paymentId:', paymentId);

    // Add OTP to active OTPs for retailer dashboard display
    addActiveOTP({
      code: otp,
      retailerId,
      amount,
      paymentId,
      lineWorkerName: lineWorkerName || 'Line Worker'
    });

    console.log('📱 OTP added to active OTPs for retailer dashboard');

    // Send OTP to retailer (now just logs to console)
    const sent = sendOTPToRetailer(retailerUser.phone, otp, amount);
    console.log('📤 OTP send result:', sent);
    
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // Clean up expired OTPs
    cleanupExpiredOTPs();

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otpSent: true,
      expiresAt: expiresAt.toISOString(),
      retailerName: retailerUser.name,
      retailerPhone: retailerUser.phone
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}