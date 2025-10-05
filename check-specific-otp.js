/**
 * Check Specific OTP Script
 * Run this to check the specific OTP with paymentId: jyoxlztGX7FEZBNSzFeh
 */

(async function checkSpecificOTP() {
  console.log('🔍 Checking specific OTP for paymentId: jyoxlztGX7FEZBNSzFeh');
  
  try {
    const paymentId = 'jyoxlztGX7FEZBNSzFeh';
    
    // Import required modules
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    const { doc, getDoc, getFirestore } = await import('firebase/firestore');
    const { useAuth } = await import('@/contexts/AuthContext');
    
    // Get current user
    const { user } = useAuth();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }
    
    console.log('✅ Current user:', user.uid);
    
    // Check Firestore directly
    console.log('\n🔥 Checking Firestore directly...');
    const db = getFirestore();
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    // Query for the specific OTP
    const otpQuery = query(
      collection(db, 'secure_otps'),
      where('paymentId', '==', paymentId)
    );
    
    const querySnapshot = await getDocs(otpQuery);
    console.log('📥 Firestore query results:', querySnapshot.size, 'documents found');
    
    if (querySnapshot.size > 0) {
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 OTP Document:', {
          id: doc.id,
          paymentId: data.paymentId,
          retailerId: data.retailerId,
          code: data.code, // This is encrypted
          amount: data.amount,
          lineWorkerName: data.lineWorkerName,
          isUsed: data.isUsed,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        });
        
        // Check if this OTP belongs to current retailer
        if (data.retailerId === user.uid) {
          console.log('✅ OTP belongs to current retailer');
          
          // Check if expired
          const now = new Date();
          const expiresAt = data.expiresAt?.toDate();
          if (expiresAt && expiresAt > now) {
            console.log('✅ OTP is still valid');
            
            // Try to decrypt the code
            console.log('🔓 Attempting to decrypt OTP code...');
            
            // The encryption method is: reverse + base64
            try {
              const decoded = atob(data.code);
              const decryptedCode = decoded.split('').reverse().join('');
              console.log('🔓 Decrypted OTP code:', decryptedCode);
              
              // Test verification
              console.log('\n🧪 Testing OTP verification...');
              const verifyResult = await secureOTPStorage.verifyOTP(paymentId, decryptedCode);
              console.log('✅ Verification result:', verifyResult);
              
              if (verifyResult.valid) {
                console.log('🎉 OTP VERIFICATION SUCCESSFUL!');
                console.log('The payment should now be marked as complete.');
              } else {
                console.log('❌ Verification failed:', verifyResult.error);
              }
            } catch (decryptError) {
              console.error('❌ Failed to decrypt OTP:', decryptError);
            }
          } else {
            console.log('❌ OTP has expired');
          }
        } else {
          console.log('❌ OTP does not belong to current retailer');
          console.log('Expected retailerId:', user.uid);
          console.log('Actual retailerId:', data.retailerId);
        }
      });
    } else {
      console.log('❌ No OTP found with paymentId:', paymentId);
    }
    
    // Also check through secure storage
    console.log('\n🔐 Checking through secure storage...');
    const otp = await secureOTPStorage.getOTP(paymentId);
    if (otp) {
      console.log('✅ OTP found through secure storage:', {
        id: otp.id,
        paymentId: otp.paymentId,
        retailerId: otp.retailerId,
        amount: otp.amount,
        lineWorkerName: otp.lineWorkerName,
        isUsed: otp.isUsed,
        expiresAt: otp.expiresAt
      });
    } else {
      console.log('❌ OTP not found through secure storage');
    }
    
    // Check active OTPs for retailer
    console.log('\n📋 Checking all active OTPs for retailer...');
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log('📋 Active OTPs:', activeOTPs.length, 'found');
    activeOTPs.forEach(otp => {
      console.log(`  - ${otp.code} (₹${otp.amount}) from ${otp.lineWorkerName} - Payment: ${otp.paymentId}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking OTP:', error);
  }
})();