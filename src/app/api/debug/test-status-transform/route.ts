// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

// Function to transform status for retailer perspective
function getRetailerStatus(originalState: string): string {
  switch (originalState) {
    case 'OTP_SENT':
      return 'OTP_Received';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'INITIATED':
      return 'Initiated';
    case 'OTP_VERIFIED':
      return 'OTP_Verified';
    default:
      return originalState;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test status transformations
    const testCases = [
      'OTP_SENT',
      'COMPLETED', 
      'CANCELLED',
      'INITIATED',
      'OTP_VERIFIED',
      'UNKNOWN_STATE'
    ];

    const results = testCases.map(originalState => ({
      original: originalState,
      transformed: getRetailerStatus(originalState)
    }));

    return NextResponse.json({
      message: 'Status transformation test results',
      testCases: results,
      explanation: 'From retailer perspective: OTP_SENT becomes OTP_Received because retailers receive OTPs, not send them'
    });

  } catch (error) {
    console.error('Error testing status transformation:', error);
    return NextResponse.json(
      { error: 'Failed to test status transformation', details: error.message },
      { status: 500 }
    );
  }
}
