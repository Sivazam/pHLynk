#!/usr/bin/env node

/**
 * Comprehensive test script to validate the wholesaler SMS fix
 * This simulates the exact data flow from frontend to cloud function
 */

const TEST_CASES = [
  {
    name: 'Test with lineWorkerId (NEW APPROACH)',
    data: {
      retailerId: 'AAx2VtFVmIMRG0LJYhwg',
      paymentId: 'Xhw1N8W52WNgc4DfUSdb',
      amount: 1500,
      lineWorkerName: 'Test Line Worker',
      lineWorkerId: '1npZCeZn67QQg52IDC2uCcJR86k1', // Actual line worker ID from console logs
      retailerName: 'Med Plus',
      retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
      wholesalerName: 'Test Wholesaler',
      collectionDate: new Date().toLocaleDateString('en-IN')
    }
  },
  {
    name: 'Test without lineWorkerId (FALLBACK)',
    data: {
      retailerId: 'AAx2VtFVmIMRG0LJYhwg',
      paymentId: 'Xhw1N8W52WNgc4DfUSdb',
      amount: 1500,
      lineWorkerName: 'Test Line Worker',
      retailerName: 'Med Plus',
      retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
      wholesalerName: 'Test Wholesaler',
      collectionDate: new Date().toLocaleDateString('en-IN')
    }
  }
];

async function testWholesalerSMSFunction(testCase) {
  const url = 'https://us-central1-pharmalynkk.cloudfunctions.net/sendWholesalerPaymentSMS';
  
  // Firebase Functions expect data wrapped in a 'data' property
  const requestData = {
    data: testCase.data
  };
  
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('📤 Request Data:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📥 Response Status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ SUCCESS - Wholesaler SMS should be sent');
      return { success: true, status: response.status, response: responseText };
    } else {
      console.log('❌ FAILED - Error details:', responseText);
      
      // Analyze the error
      if (responseText.includes('not found')) {
        console.log('🔍 Analysis: Line worker not found');
      } else if (responseText.includes('not assigned')) {
        console.log('🔍 Analysis: Line worker found but not assigned to wholesaler');
      } else if (responseText.includes('phone number not found')) {
        console.log('🔍 Analysis: Wholesaler found but no phone number');
      } else if (responseText.includes('Too many requests')) {
        console.log('🔍 Analysis: Rate limiting - wait and retry');
      } else {
        console.log('🔍 Analysis: Unknown error');
      }
      
      return { success: false, status: response.status, response: responseText };
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function simulateFrontendCall() {
  console.log('🎭 SIMULATING FRONTEND CALL');
  console.log('=============================\n');
  
  // This simulates exactly what the frontend would send after OTP verification
  const frontendData = {
    retailerId: 'AAx2VtFVmIMRG0LJYhwg',
    paymentId: 'Xhw1N8W52WNgc4DfUSdb',
    amount: 1500,
    lineWorkerName: 'Test Line Worker', // This would come from line worker document
    lineWorkerId: '1npZCeZn67QQg52IDC2uCcJR86k1', // This would come from payment.lineWorkerId
    retailerName: 'Med Plus',
    retailerArea: 'O3N0ZV0eEn3wrb96ZBkV',
    wholesalerName: 'Test Wholesaler',
    collectionDate: new Date().toLocaleDateString('en-IN')
  };
  
  console.log('📱 Frontend after OTP verification would send:');
  console.log(JSON.stringify({ data: frontendData }, null, 2));
  
  const result = await testWholesalerSMSFunction({
    name: 'Frontend Simulation (with lineWorkerId)',
    data: frontendData
  });
  
  return result;
}

async function main() {
  console.log('🔍 WHOLESALER SMS COMPREHENSIVE TEST');
  console.log('===================================\n');
  
  const results = [];
  
  // Test all cases
  for (const testCase of TEST_CASES) {
    const result = await testWholesalerSMSFunction(testCase);
    results.push({ ...testCase, ...result });
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Simulate the actual frontend call
  console.log('\n' + '='.repeat(50));
  const frontendResult = await simulateFrontendCall();
  results.push({ name: 'Frontend Simulation', ...frontendResult });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('================\n');
  
  let successCount = 0;
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    if (!result.success) {
      console.log(`   Error: ${result.response || result.error}`);
    }
    console.log('');
    
    if (result.success) successCount++;
  });
  
  console.log(`📈 Results: ${successCount}/${results.length} tests passed`);
  
  if (successCount > 0) {
    console.log('🎉 AT LEAST ONE TEST PASSED - The fix should work!');
    console.log('📝 Next steps:');
    console.log('   1. Deploy the updated cloud function');
    console.log('   2. Test with real OTP verification');
    console.log('   3. Check wholesaler receives SMS');
  } else {
    console.log('⚠️ ALL TESTS FAILED - Need further investigation');
    console.log('📝 Possible issues:');
    console.log('   1. Line worker ID/name mismatch');
    console.log('   2. Wholesaler assignment missing');
    console.log('   3. Wholesaler phone number missing');
    console.log('   4. Cloud function not updated yet');
  }
}

main().catch(console.error);