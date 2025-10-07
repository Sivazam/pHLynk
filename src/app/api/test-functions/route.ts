// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Firebase Functions integration...');
    
    // Test calling the sendRetailerPaymentSMS function
    console.log('🚀 Testing sendRetailerPaymentSMS function...');
    
    const testData = {
      retailerId: 'test-retailer-id',
      paymentId: 'test-payment-id',
      amount: 100,
      lineWorkerName: 'Test Line Worker',
      retailerName: 'Test Retailer',
      retailerArea: 'Test Area',
      wholesalerName: 'Test Wholesaler',
      collectionDate: '2025-09-30'
    };
    
    try {
      const result = await callFirebaseFunction('sendRetailerPaymentSMS', testData);
      console.log('✅ Firebase Function test result:', result);
      
      return NextResponse.json({
        success: true,
        message: 'Firebase Function test completed successfully',
        result: result
      });
    } catch (functionError) {
      console.error('❌ Firebase Function test failed:', functionError);
      
      return NextResponse.json({
        success: false,
        message: 'Firebase Function test failed',
        error: functionError instanceof Error ? functionError.message : 'Unknown error',
        details: functionError
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}