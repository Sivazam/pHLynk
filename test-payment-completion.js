// Test script to check payment completion notification flow
const testPaymentCompletion = async () => {
  try {
    console.log('🧪 Testing Payment Completion Notification...');
    
    const testData = {
      retailerId: 'test-retailer-id',
      amount: 1000,
      paymentId: 'test-payment-id',
      retailerName: 'Test Retailer',
      lineWorkerName: 'Test Line Worker',
      wholesalerId: 'test-wholesaler-id'
    };
    
    // Test the API route
    const response = await fetch('http://localhost:3000/api/fcm/send-payment-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Payment completion API test successful:', result);
    } else {
      const error = await response.text();
      console.error('❌ Payment completion API test failed:', response.status, error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test the Cloud Function directly
const testCloudFunction = async () => {
  try {
    console.log('🧪 Testing Cloud Function directly...');
    
    const testData = {
      retailerId: 'test-retailer-id',
      amount: 1000,
      paymentId: 'test-payment-id',
      recipientType: 'retailer',
      retailerName: 'Test Retailer',
      lineWorkerName: 'Test Line Worker',
      wholesalerId: 'test-wholesaler-id',
      title: '🎉 Payment Successful',
      body: 'Test payment completion notification',
      clickAction: '/retailer/payment-history'
    };
    
    const response = await fetch('https://us-central1-plkapp-8c052.cloudfunctions.net/sendPaymentCompletionNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: testData })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cloud Function test successful:', result);
    } else {
      const error = await response.text();
      console.error('❌ Cloud Function test failed:', response.status, error);
    }
    
  } catch (error) {
    console.error('❌ Cloud Function test failed:', error);
  }
};

// Run tests
testPaymentCompletion();
testCloudFunction();