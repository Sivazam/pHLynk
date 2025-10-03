// Test script to validate OTP notification function logic
const admin = require('firebase-admin');

// Mock Firebase Admin initialization
admin.initializeApp({
  projectId: 'pharmalync-retailer-app'
});

// Test data
const testData = {
  retailerId: 'test-retailer-id',
  otp: '123456',
  amount: 1500,
  paymentId: 'test-payment-123',
  lineWorkerName: 'Test Line Worker'
};

async function testRetailerDataAccess() {
  try {
    console.log('🧪 Testing retailer data access...');
    
    // Test the same query as in the cloud function
    const retailerDoc = await admin.firestore()
      .collection('Retailer')
      .doc(testData.retailerId)
      .get();

    if (!retailerDoc.exists) {
      console.log('❌ Test retailer not found (expected in test environment)');
      return;
    }

    const retailerUser = retailerDoc.data();
    console.log('✅ Retailer data accessed successfully:', {
      id: retailerDoc.id,
      name: retailerUser?.name,
      phone: retailerUser?.phone,
      userId: retailerUser?.userId
    });

    // Test FCM token lookup approaches
    let fcmToken = null;
    let retailerUserId = null;
    
    // Approach 1: Document ID
    retailerUserId = retailerDoc.id;
    console.log('🔧 Trying document ID as user ID:', retailerUserId);
    fcmToken = await getFCMTokenForUser(retailerUserId);
    
    if (fcmToken) {
      console.log('✅ FCM token found using document ID');
      return;
    }
    
    // Approach 2: Phone number
    if (retailerUser.phone) {
      retailerUserId = retailerUser.phone.replace(/\D/g, '');
      console.log('🔧 Trying phone number as user ID:', retailerUserId);
      fcmToken = await getFCMTokenForUser(retailerUserId);
    }
    
    if (fcmToken) {
      console.log('✅ FCM token found using phone number');
      return;
    }
    
    // Approach 3: User ID field
    if (retailerUser.userId) {
      retailerUserId = retailerUser.userId;
      console.log('🔧 Trying retailer.userId as user ID:', retailerUserId);
      fcmToken = await getFCMTokenForUser(retailerUserId);
    }
    
    if (fcmToken) {
      console.log('✅ FCM token found using userId field');
    } else {
      console.log('⚠️ No FCM token found with any approach');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function getFCMTokenForUser(userId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.fcmToken || null;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token for user:', userId, error);
    return null;
  }
}

// Run the test
testRetailerDataAccess().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});