// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// List of deployed cloud functions to test
const DEPLOYED_FUNCTIONS = [
  {
    name: 'sendOTPNotification',
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotification'
  },
  {
    name: 'sendTestFCMNotification', 
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendTestFCMNotification'
  },
  {
    name: 'sendWholesalerPaymentSMS',
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS'
  },
  {
    name: 'sendPaymentCompletionNotification',
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendPaymentCompletionNotification'
  },
  {
    name: 'sendRetailerPaymentSMS',
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/sendRetailerPaymentSMS'
  },
  {
    name: 'processSMSResponse',
    url: 'https://us-central1-pharmalynkk.cloudfunctions.net/processSMSResponse'
  }
];

interface FunctionTestResult {
  functionName: string;
  url: string;
  status: 'reachable' | 'error' | 'unreachable';
  httpStatus?: number;
  error?: string;
  message: string;
}

export async function GET() {
  return NextResponse.json({ 
    message: "Cloud Functions Test API",
    functions: DEPLOYED_FUNCTIONS.map(f => f.name)
  });
}

export async function POST() {
  const results: FunctionTestResult[] = [];
  let reachable = 0;
  let unreachable = 0;
  let serverErrors = 0;

  console.log('🧪 Testing cloud functions connectivity...');

  for (const func of DEPLOYED_FUNCTIONS) {
    try {
      console.log(`🔗 Testing ${func.name}...`);
      
      // Test with a simple GET request first (health check)
      const response = await fetch(func.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'pHLynk-Test/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`✅ ${func.name} is reachable (${response.status})`);
        reachable++;
        results.push({
          functionName: func.name,
          url: func.url,
          status: 'reachable',
          httpStatus: response.status,
          message: `Function is reachable and responding`
        });
      } else {
        console.log(`⚠️ ${func.name} returned ${response.status}`);
        unreachable++;
        results.push({
          functionName: func.name,
          url: func.url,
          status: 'error',
          httpStatus: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      console.log(`❌ ${func.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
      unreachable++;
      results.push({
        functionName: func.name,
        url: func.url,
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Function not reachable or timeout'
      });
    }
  }

  const summary = {
    total: DEPLOYED_FUNCTIONS.length,
    reachable,
    unreachable,
    serverErrors
  };

  console.log(`📊 Cloud Functions Test Summary:`, summary);

  return NextResponse.json({
    success: true,
    message: 'Firebase Functions connectivity test completed',
    results,
    summary,
    timestamp: new Date().toISOString()
  });
}