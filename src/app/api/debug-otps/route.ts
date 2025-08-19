import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/services/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId');
    const paymentId = searchParams.get('paymentId');

    console.log('🔍 DEBUG OTP REQUEST:');
    console.log('Retailer ID:', retailerId);
    console.log('Payment ID:', paymentId);

    if (paymentId) {
      // Get specific OTP by payment ID
      const otp = await otpService.getOTPByPaymentId(paymentId);
      return NextResponse.json({
        success: true,
        otp: otp ? {
          id: otp.id,
          paymentId: otp.paymentId,
          retailerId: otp.retailerId,
          code: otp.code,
          amount: otp.amount,
          lineWorkerName: otp.lineWorkerName,
          expiresAt: otp.expiresAt.toDate(),
          isUsed: otp.isUsed,
          createdAt: otp.createdAt.toDate()
        } : null,
        message: otp ? 'OTP found' : 'OTP not found'
      });
    } else if (retailerId) {
      // Get all active OTPs for retailer
      const otps = await otpService.getActiveOTPsForRetailer(retailerId);
      const formattedOTPs = otps.map(otp => ({
        id: otp.id,
        paymentId: otp.paymentId,
        retailerId: otp.retailerId,
        code: otp.code,
        amount: otp.amount,
        lineWorkerName: otp.lineWorkerName,
        expiresAt: otp.expiresAt.toDate(),
        isUsed: otp.isUsed,
        createdAt: otp.createdAt.toDate()
      }));

      return NextResponse.json({
        success: true,
        otps: formattedOTPs,
        count: formattedOTPs.length,
        message: `Found ${formattedOTPs.length} active OTPs for retailer ${retailerId}`
      });
    } else {
      return NextResponse.json({
        error: 'Please provide either retailerId or paymentId parameter'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error debugging OTPs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}