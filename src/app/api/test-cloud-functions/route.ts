// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

/**
 * Test API route to verify Firebase Functions connectivity
 * This helps diagnose cloud function triggering issues
 */
export async function POST(request: NextRequest) {
  try {
    const firebaseConfig = {
      projectId: "pharmalynkk"
    };

    const testUrls = [
      'sendWholesalerPaymentSMS',
      'sendRetailerPaymentSMS',
      'processSMSResponse'
    ];

    console.log('🧪 Testing Firebase Functions connectivity...\n');
    
    const results: Array<{
      functionName: string;
      url: string;
      status: string;
      message: string;
      details: {
        httpStatus: number;
        httpStatusText: string;
        response: any;
        error: string | null;
      };
    }> = [];

    for (const functionName of testUrls) {
      const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
      
      console.log(`🌐 Testing: ${functionName}`);
      console.log(`📡 URL: ${functionUrl}`);
      
      const result = {
        functionName,
        url: functionUrl,
        status: 'unknown',
        message: '',
        details: {
          httpStatus: 0,
          httpStatusText: '',
          response: null as any,
          error: null as string | null
        }
      };
      
      try {
        // Test with actual POST request (this will likely fail due to auth/data, but should reach the function)
        const testData = {
          retailerId: "test-retailer-id",
          paymentId: "test-payment-id", 
          amount: 100,
          lineWorkerName: "Test Worker",
          retailerName: "Test Retailer",
          retailerArea: "Test Area",
          wholesalerName: "Test Wholesaler",
          collectionDate: new Date().toISOString().split('T')[0]
        };

        const postResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          },
          body: JSON.stringify(testData)
        });

        result.status = postResponse.ok ? 'success' : 'error';
        result.details.httpStatus = postResponse.status;
        result.details.httpStatusText = postResponse.statusText;
        
        if (postResponse.ok) {
          const responseData = await postResponse.json();
          result.details.response = responseData;
          result.message = 'Function is reachable and responding';
          console.log(`✅ ${functionName}: Function is reachable and responding`);
        } else {
          const errorText = await postResponse.text();
          result.details.error = errorText;
          
          if (postResponse.status === 401 || postResponse.status === 403) {
            result.message = 'Function is reachable but requires authentication (expected)';
            console.log(`🔐 ${functionName}: Function is reachable but requires authentication (expected)`);
          } else if (postResponse.status >= 400 && postResponse.status < 500) {
            result.message = 'Function is reachable but request format is invalid';
            console.log(`📋 ${functionName}: Function is reachable but request format is invalid`);
          } else {
            result.message = 'Function is reachable but server error occurred';
            console.log(`🚨 ${functionName}: Function is reachable but server error occurred`);
          }
        }
        
      } catch (error: any) {
        result.status = 'network_error';
        result.message = error.message || 'Unknown network error';
        result.details.error = error.message;
        
        console.error(`❌ Network error calling ${functionName}:`, error.message);
        
        if (error.message.includes('fetch')) {
          result.message = 'Function may not exist or be reachable';
          console.log(`🌐 ${functionName}: Function may not exist or be reachable`);
        } else if (error.message.includes('timeout')) {
          result.message = 'Function may be slow or unresponsive';
          console.log(`⏱️ ${functionName}: Function may be slow or unresponsive`);
        }
      }
      
      results.push(result);
      console.log('---\n');
    }

    console.log('🏁 Firebase Functions connectivity test completed');

    return NextResponse.json({
      success: true,
      message: 'Firebase Functions connectivity test completed',
      results,
      summary: {
        total: results.length,
        reachable: results.filter(r => r.status === 'success' || (r.status === 'error' && r.details.httpStatus >= 400 && r.details.httpStatus < 500)).length,
        unreachable: results.filter(r => r.status === 'network_error').length,
        serverErrors: results.filter(r => r.status === 'error' && r.details.httpStatus >= 500).length
      }
    });

  } catch (error: any) {
    console.error('❌ Test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error occurred during testing' 
      },
      { status: 500 }
    );
  }
}