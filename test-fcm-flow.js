// Test the current FCM registration flow
async function testFCMFlow() {
  console.log('🧪 Testing FCM Registration Flow...\n');

  try {
    // 1. Test the FCM service configuration
    console.log('1️⃣ Testing FCM service configuration...');
    const response = await fetch('/api/fcm/register-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        retailerId: 'test-retailer-id',
        deviceToken: 'test-token',
        userAgent: navigator.userAgent,
        isNewUser: false,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();
    console.log('Response:', result);

    if (response.ok) {
      console.log('✅ FCM service is configured correctly');
    } else {
      console.log('❌ FCM service configuration issue:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing FCM flow:', error);
  }
}

// Run this in the browser console
console.log('🔧 To test FCM flow, run: testFCMFlow()');
window.testFCMFlow = testFCMFlow;