import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { retailerId, amount = 1000, lineWorkerName = 'Test Worker' } = body;

    if (!retailerId) {
      return NextResponse.json(
        { error: 'Retailer ID is required' },
        { status: 400 }
      );
    }

    // Call the OTP send API
    const otpResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        retailerId,
        paymentId: `test_payment_${Date.now()}`,
        amount,
        lineWorkerName
      }),
    });

    const otpData = await otpResponse.json();

    if (!otpResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to generate OTP', details: otpData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test OTP generated successfully',
      otpData
    });

  } catch (error) {
    console.error('Error generating test OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}