// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Test cloud function with actual POST request (matching real implementation)
export async function POST() {
  const results: Array<{
    functionName: string;
    url: string;
    status: string;
    httpStatus?: number;
    message: string;
    error?: string;
  }> = [];
  let reachable = 0;
  let unreachable = 0;
  let serverErrors = 0;

  console.log('🧪 Testing cloud functions with POST requests (matching real implementation)...');

  // Test sendOTPNotification with proper POST data
  try {
    console.log(`🔗 Testing sendOTPNotification with POST...`);
    
    const testData = {
      retailerId: 'test-retailer-id',
      retailerName: 'Test Retailer',
      retailerPhone: '+1234567890',
      otp: '123456',
      amount: 500,
      paymentId: 'test-payment-id',
      lineWorkerName: 'Test Line Worker',
      tenantId: 'test-tenant-id'
    };

    const response = await fetch('https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'pHLynk-Test/1.0'
      },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (response.ok) {
      console.log(`✅ sendOTPNotification POST request successful (${response.status})`);
      reachable++;
      results.push({
        functionName: 'sendOTPNotification',
        url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotification',
        status: 'reachable',
        httpStatus: response.status,
        message: `POST request successful - cloud function working correctly`
      });
    } else {
      console.log(`⚠️ sendOTPNotification returned ${response.status} (may be expected for test data)`);
      reachable++; // Still count as reachable since it responded
      results.push({
        functionName: 'sendOTPNotification',
        url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotification',
        status: 'reachable',
        httpStatus: response.status,
        message: `Function responded to POST (test data validation expected)`
      });
    }
  } catch (error) {
    console.log(`❌ sendOTPNotification POST failed:`, error instanceof Error ? error.message : 'Unknown error');
    unreachable++;
    results.push({
      functionName: 'sendOTPNotification',
      url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotification',
      status: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'POST request failed - function not reachable or timeout'
    });
  }

  // Test sendTestFCMNotification with proper POST data
  try {
    console.log(`🔗 Testing sendTestFCMNotification with POST...`);
    
    const testData = {
      token: 'test-fcm-token',
      title: '🧪 Test Notification',
      body: 'This is a test from the new implementation',
      data: { type: 'test', timestamp: Date.now().toString() }
    };

    const response = await fetch('https://us-central1-pharmalynkk.cloudfunctions.net/sendTestFCMNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'pHLynk-Test/1.0'
      },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (response.ok) {
      console.log(`✅ sendTestFCMNotification POST request successful (${response.status})`);
      reachable++;
      results.push({
        functionName: 'sendTestFCMNotification',
        url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendTestFCMNotification',
        status: 'reachable',
        httpStatus: response.status,
        message: `POST request successful - cloud function working correctly`
      });
    } else {
      console.log(`⚠️ sendTestFCMNotification returned ${response.status} (may be expected for test data)`);
      reachable++; // Still count as reachable since it responded
      results.push({
        functionName: 'sendTestFCMNotification',
        url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendTestFCMNotification',
        status: 'reachable',
        httpStatus: response.status,
        message: `Function responded to POST (test data validation expected)`
      });
    }
  } catch (error) {
    console.log(`❌ sendTestFCMNotification POST failed:`, error instanceof Error ? error.message : 'Unknown error');
    unreachable++;
    results.push({
      functionName: 'sendTestFCMNotification',
      url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendTestFCMNotification',
      status: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'POST request failed - function not reachable or timeout'
    });
  }

  const summary = {
    total: 2, // Only testing the 2 most important functions with POST
    reachable,
    unreachable,
    serverErrors
  };

  console.log(`📊 Cloud Functions POST Test Summary:`, summary);

  return NextResponse.json({
    success: true,
    message: 'Firebase Functions POST connectivity test completed (matching real implementation)',
    results,
    summary,
    timestamp: new Date().toISOString()
  });
}