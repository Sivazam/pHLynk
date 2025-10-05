// Debug OTP Component - Add this to RetailerDashboard for testing
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { useState } from 'react';

export function DebugOTPPanel({ retailerId }: { retailerId: string }) {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDebugTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting Debug Test...');
      addResult(`📋 Using Retailer ID: ${retailerId}`);
      
      // Test 0: Basic Firestore connectivity
      addResult('📋 Test 0: Testing Firestore connectivity...');
      try {
        const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const testQuery = query(
          collection(db, 'secure_otps'),
          limit(1)
        );
        
        const testSnapshot = await getDocs(testQuery);
        addResult(`✅ Firestore connectivity test passed. Collection accessible.`);
      } catch (firestoreError) {
        addResult(`❌ Firestore connectivity failed: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
        throw firestoreError;
      }
      
      // Test 1: Direct query
      addResult('📋 Test 1: Querying secure_otps collection...');
      const otps = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
      addResult(`✅ Found ${otps.length} OTPs in secure storage`);
      
      if (otps.length > 0) {
        otps.forEach((otp, index) => {
          addResult(`  ${index + 1}. Payment: ${otp.paymentId}, Code: ${otp.code}, Expired: ${otp.isExpired}`);
        });
      }
      
      // Test 2: Create test OTP
      addResult('📋 Test 2: Creating test OTP...');
      const testPaymentId = `debug-test-${Date.now()}`;
      const testCode = 'DEBUG1';
      const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
      
      const otpId = await secureOTPStorage.storeOTP({
        paymentId: testPaymentId,
        code: testCode,
        retailerId: retailerId,
        amount: 50,
        lineWorkerName: 'Debug Test',
        expiresAt: expiresAt
      });
      
      addResult(`✅ Test OTP created: ${otpId}`);
      
      // Test 3: Query again
      addResult('📋 Test 3: Querying after creation...');
      const updatedOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
      addResult(`✅ Found ${updatedOTPs.length} OTPs after creation`);
      
      // Test 4: Verify test OTP
      addResult('📋 Test 4: Verifying test OTP...');
      const verification = await secureOTPStorage.verifyOTP(testPaymentId, testCode);
      
      if (verification.valid) {
        addResult('✅ Test OTP verified successfully');
      } else {
        addResult(`❌ Test OTP verification failed: ${verification.error}`);
      }
      
      // Test 5: Final check
      addResult('📋 Test 5: Final check...');
      const finalOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
      addResult(`✅ Final count: ${finalOTPs.length} active OTPs`);
      
      addResult('🎉 Debug test completed!');
      
    } catch (error) {
      addResult(`❌ Debug test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">🔍 OTP Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runDebugTest} 
              disabled={isRunning}
              variant="outline"
              size="sm"
            >
              {isRunning ? 'Running Test...' : 'Run Debug Test'}
            </Button>
            <Button 
              onClick={clearResults} 
              variant="ghost"
              size="sm"
            >
              Clear Results
            </Button>
          </div>
          
          {testResults.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md max-h-60 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {testResults.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}