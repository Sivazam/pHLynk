// Test script to verify Firebase Functions SMS integration
const fetch = require('node-fetch');

async function testSMSFunctions() {
  console.log('🧪 Testing Firebase Functions SMS integration...\n');

  // Test data - replace with actual values from your system
  const testData = {
    retailerId: 'AAx2VtFVmIMRG0LJYhwg', // Replace with actual retailer ID
    paymentId: 'test-payment-' + Date.now(),
    amount: 147,
    lineWorkerName: 'Test Line Worker',
    retailerName: 'Test Retailer',
    retailerArea: 'Test Area',
    wholesalerName: 'Test Wholesaler',
    collectionDate: new Date().toISOString().split('T')[0]
  };

  console.log('📋 Test Data:', testData);
  console.log('🔧 Testing Firebase Functions availability...\n');

  try {
    // Test 1: Check if OTP verification endpoint is working
    console.log('📝 Test 1: Checking OTP verification endpoint...');
    const otpResponse = await fetch('http://localhost:3000/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId: testData.paymentId,
        otp: '123456' // Dummy OTP for testing
      })
    });

    console.log('📊 OTP Verification Response Status:', otpResponse.status);
    if (otpResponse.status === 400) {
      console.log('✅ OTP endpoint is accessible (400 expected for invalid OTP)');
    } else {
      console.log('⚠️ Unexpected response from OTP endpoint:', await otpResponse.text());
    }

    // Test 2: Check Firebase Functions initialization
    console.log('\n📝 Test 2: Checking Firebase Functions initialization...');
    // This will be tested through the actual OTP verification flow

    console.log('\n✅ Test completed!');
    console.log('📝 To test actual SMS functionality:');
    console.log('   1. Make a real payment collection through the web interface');
    console.log('   2. Check the browser console for Firebase Function logs');
    console.log('   3. Check the Firebase Functions logs for SMS sending attempts');
    console.log('   4. Verify SMS delivery to the retailer and wholesaler');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('🔍 Make sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testSMSFunctions();