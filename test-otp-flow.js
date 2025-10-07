// Comprehensive OTP Flow Test
// This script helps identify where the OTP flow is breaking

const { secureOTPStorage } = require('./src/lib/secure-otp-storage.ts');
const { db } = require('./src/lib/firebase');

async function testOTPFlow() {
  console.log('🧪 Starting Comprehensive OTP Flow Test...\n');
  
  try {
    // Test 1: Check if we can query Firestore directly
    console.log('📋 Test 1: Direct Firestore Query');
    const testRetailerId = 'test-retailer-id'; // Replace with actual retailer ID
    
    try {
      const query = require('firebase/firestore').query;
      const collection = require('firebase/firestore').collection;
      const where = require('firebase/firestore').where;
      const getDocs = require('firebase/firestore').getDocs;
      const orderBy = require('firebase/firestore').orderBy;
      const limit = require('firebase/firestore').limit;
      
      const q = query(
        collection(db, 'secure_otps'),
        where('retailerId', '==', testRetailerId),
        where('isUsed', '==', false),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      console.log(`✅ Direct query successful. Found ${snapshot.size} documents`);
      
      if (snapshot.size > 0) {
        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. Document ID: ${doc.id}`);
          console.log(`     Payment ID: ${data.paymentId}`);
          console.log(`     Retailer ID: ${data.retailerId}`);
          console.log(`     Is Used: ${data.isUsed}`);
          console.log(`     Created: ${data.createdAt}`);
          console.log(`     Expires: ${data.expiresAt}`);
        });
      }
    } catch (error) {
      console.log('❌ Direct query failed:', error.message);
    }
    
    console.log('\n');
    
    // Test 2: Test secureOTPStorage directly
    console.log('📋 Test 2: SecureOTPStorage.getActiveOTPsForRetailer()');
    try {
      const otps = await secureOTPStorage.getActiveOTPsForRetailer(testRetailerId);
      console.log(`✅ SecureOTPStorage query successful. Found ${otps.length} OTPs`);
      
      if (otps.length > 0) {
        otps.forEach((otp, index) => {
          console.log(`  ${index + 1}. Payment ID: ${otp.paymentId}`);
          console.log(`     Code: ${otp.code}`);
          console.log(`     Amount: ${otp.amount}`);
          console.log(`     Is Expired: ${otp.isExpired}`);
          console.log(`     Expires: ${otp.expiresAt}`);
        });
      }
    } catch (error) {
      console.log('❌ SecureOTPStorage query failed:', error.message);
    }
    
    console.log('\n');
    
    // Test 3: Create a test OTP
    console.log('📋 Test 3: Create Test OTP');
    const testPaymentId = `test-payment-${Date.now()}`;
    const testOTPCode = 'TEST123';
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from now
    
    try {
      const otpId = await secureOTPStorage.storeOTP({
        paymentId: testPaymentId,
        code: testOTPCode,
        retailerId: testRetailerId,
        amount: 100,
        lineWorkerName: 'Test Line Worker',
        expiresAt: expiresAt
      });
      
      console.log(`✅ Test OTP created successfully. ID: ${otpId}`);
      
      // Test 4: Retrieve the test OTP
      console.log('\n📋 Test 4: Retrieve Test OTP');
      const retrievedOTP = await secureOTPStorage.getOTP(testPaymentId);
      
      if (retrievedOTP) {
        console.log('✅ Test OTP retrieved successfully');
        console.log(`  Payment ID: ${retrievedOTP.paymentId}`);
        console.log(`  Retailer ID: ${retrievedOTP.retailerId}`);
        console.log(`  Is Used: ${retrievedOTP.isUsed}`);
        console.log(`  Expires: ${retrievedOTP.expiresAt}`);
      } else {
        console.log('❌ Test OTP not found');
      }
      
      // Test 5: Query active OTPs again after creating test OTP
      console.log('\n📋 Test 5: Query Active OTPs After Creation');
      const updatedOTPs = await secureOTPStorage.getActiveOTPsForRetailer(testRetailerId);
      console.log(`✅ Found ${updatedOTPs.length} OTPs after creation`);
      
      // Test 6: Verify the test OTP
      console.log('\n📋 Test 6: Verify Test OTP');
      const verification = await secureOTPStorage.verifyOTP(testPaymentId, testOTPCode);
      
      if (verification.valid) {
        console.log('✅ Test OTP verified successfully');
      } else {
        console.log(`❌ Test OTP verification failed: ${verification.error}`);
      }
      
      // Test 7: Check if OTP is marked as used
      console.log('\n📋 Test 7: Check OTP Status After Verification');
      const finalOTP = await secureOTPStorage.getOTP(testPaymentId);
      
      if (finalOTP) {
        console.log(`✅ Final OTP status - Is Used: ${finalOTP.isUsed}`);
      } else {
        console.log('❌ Final OTP not found (should be marked as used)');
      }
      
    } catch (error) {
      console.log('❌ Test OTP creation failed:', error.message);
    }
    
    console.log('\n🎉 Comprehensive OTP Flow Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Helper function to get actual retailer data
async function getActualRetailerData() {
  try {
    const query = require('firebase/firestore').query;
    const collection = require('firebase/firestore').collection;
    const getDocs = require('firebase/firestore').getDocs;
    const limit = require('firebase/firestore').limit;
    
    const retailersQuery = query(
      collection(db, 'retailers'),
      limit(5)
    );
    
    const snapshot = await getDocs(retailersQuery);
    console.log('📋 Available Retailers:');
    
    if (snapshot.size > 0) {
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Name: ${data.name}`);
        console.log(`     Phone: ${data.phone}`);
      });
      
      return snapshot.docs[0].id; // Return first retailer ID
    } else {
      console.log('❌ No retailers found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching retailers:', error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🔍 Getting actual retailer data for testing...\n');
  const actualRetailerId = await getActualRetailerData();
  
  if (actualRetailerId) {
    console.log(`\n🧪 Using retailer ID: ${actualRetailerId}\n`);
    // Update the test to use actual retailer ID
    // You can modify the testOTPFlow function to accept this parameter
  }
  
  await testOTPFlow();
}

// Uncomment to run the test
// main();

module.exports = { testOTPFlow, getActualRetailerData };