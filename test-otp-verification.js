/**
 * OTP Verification Test Script
 * Run this in the browser console to test OTP verification
 */

(async function testOTPVerification() {
  console.log('🧪 Testing OTP verification process...');
  
  try {
    // Get the payment ID and OTP code from the user
    const paymentId = prompt('Enter the Payment ID for the OTP you want to verify:');
    const otpCode = prompt('Enter the OTP code:');
    
    if (!paymentId || !otpCode) {
      console.log('❌ Payment ID and OTP code are required');
      return;
    }
    
    console.log(`🧪 Testing verification for Payment ID: ${paymentId}, OTP: ${otpCode}`);
    
    // Import the secure OTP storage
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    
    // First, let's see if we can find the OTP
    console.log('🔍 Looking up OTP...');
    const otp = await secureOTPStorage.getOTP(paymentId);
    
    if (!otp) {
      console.log('❌ OTP not found for Payment ID:', paymentId);
      return;
    }
    
    console.log('✅ OTP found:', {
      id: otp.id,
      paymentId: otp.paymentId,
      retailerId: otp.retailerId,
      amount: otp.amount,
      lineWorkerName: otp.lineWorkerName,
      isUsed: otp.isUsed,
      expiresAt: otp.expiresAt,
      createdAt: otp.createdAt,
      attempts: otp.attempts
    });
    
    // Check if expired
    if (otp.expiresAt < new Date()) {
      console.log('❌ OTP has expired');
      return;
    }
    
    if (otp.isUsed) {
      console.log('❌ OTP has already been used');
      return;
    }
    
    // Now test the verification
    console.log('🔐 Testing OTP verification...');
    const result = await secureOTPStorage.verifyOTP(paymentId, otpCode);
    
    console.log('🧪 Verification result:', result);
    
    if (result.valid) {
      console.log('✅ OTP verification successful!');
      console.log('Payment should now be marked as complete.');
    } else {
      console.log('❌ OTP verification failed:', result.error);
      
      // Show remaining attempts
      const updatedOTP = await secureOTPStorage.getOTP(paymentId);
      if (updatedOTP) {
        console.log('Remaining attempts:', 3 - updatedOTP.attempts);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();