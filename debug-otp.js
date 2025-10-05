// Debug script to check OTP storage
const { secureOTPStorage } = require('./src/lib/secure-otp-storage.ts');

async function debugOTP() {
  try {
    console.log('🔍 Testing OTP storage...');
    
    // Test with a sample retailer ID (you'll need to replace this with an actual retailer ID)
    const retailerId = 'test-retailer-id';
    
    // Get active OTPs for retailer
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
    console.log('📊 Active OTPs found:', activeOTPs.length);
    
    if (activeOTPs.length > 0) {
      console.log('🔢 OTP Details:');
      activeOTPs.forEach((otp, index) => {
        console.log(`  ${index + 1}. Payment ID: ${otp.paymentId}`);
        console.log(`     Code: ${otp.code}`);
        console.log(`     Amount: ${otp.amount}`);
        console.log(`     Expires: ${otp.expiresAt}`);
        console.log(`     Is Expired: ${otp.isExpired}`);
      });
    } else {
      console.log('❌ No active OTPs found for retailer:', retailerId);
    }
    
  } catch (error) {
    console.error('❌ Error debugging OTP:', error);
  }
}

debugOTP();