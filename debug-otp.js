/**
 * Comprehensive OTP Debugging Script
 * Run this in the browser console on the retailer dashboard page
 */

(async function debugOTPSystem() {
  console.log('🔍 Starting comprehensive OTP debugging...');
  
  try {
    // 1. Check if Firebase is initialized
    if (typeof window !== 'undefined' && window.firebase) {
      console.log('✅ Firebase is available');
    } else {
      console.error('❌ Firebase is not available');
      return;
    }
    
    // 2. Check current user and authentication
    const { user } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }
    console.log('✅ Authenticated user:', user.uid);
    
    // 3. Get retailer data
    const { doc, getDoc, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    
    // Try to get retailer document
    const retailerDoc = await getDoc(doc(db, 'retailers', user.uid));
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer document not found for user:', user.uid);
      return;
    }
    
    const retailerData = retailerDoc.data();
    console.log('✅ Retailer data found:', {
      id: retailerDoc.id,
      name: retailerData.name,
      retailerId: retailerData.retailerId,
      activeOTPsCount: retailerData.activeOTPs?.length || 0
    });
    
    // 4. Check secure OTP storage directly
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    console.log('🔐 Checking secure OTP storage...');
    
    const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log('🔐 Secure OTPs retrieved:', {
      count: secureOTPs.length,
      otps: secureOTPs.map(otp => ({
        paymentId: otp.paymentId,
        code: otp.code,
        amount: otp.amount,
        lineWorkerName: otp.lineWorkerName,
        expiresAt: otp.expiresAt,
        isExpired: otp.isExpired,
        createdAt: otp.createdAt
      }))
    });
    
    // 5. Check Firestore directly for OTP documents
    console.log('🔥 Checking Firestore directly for OTP documents...');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const otpQuery = query(
      collection(db, 'secure_otps'),
      where('retailerId', '==', user.uid),
      where('isUsed', '==', false)
    );
    
    const otpSnapshot = await getDocs(otpQuery);
    console.log('🔥 Firestore OTP documents found:', {
      count: otpSnapshot.size,
      documents: otpSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          paymentId: data.paymentId,
          retailerId: data.retailerId,
          amount: data.amount,
          lineWorkerName: data.lineWorkerName,
          isUsed: data.isUsed,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          encryptedCode: data.code
        };
      })
    });
    
    // 6. Test OTP decryption
    if (secureOTPs.length > 0) {
      console.log('🔓 Testing OTP decryption...');
      const testOTP = secureOTPs[0];
      console.log('Test OTP details:', {
        paymentId: testOTP.paymentId,
        decryptedCode: testOTP.code,
        amount: testOTP.amount
      });
    }
    
    // 7. Check if OTP listener is working
    console.log('👂 Setting up test OTP listener...');
    
    let listenerTriggered = false;
    const unsubscribe = secureOTPStorage.onOTPChanges(user.uid, (otps) => {
      listenerTriggered = true;
      console.log('👂 OTP listener triggered!', {
        count: otps.length,
        otps: otps.map(otp => ({
          paymentId: otp.paymentId,
          code: otp.code,
          amount: otp.amount,
          isExpired: otp.isExpired
        }))
      });
    });
    
    // Wait a moment to see if listener triggers
    setTimeout(() => {
      if (listenerTriggered) {
        console.log('✅ OTP listener is working');
      } else {
        console.log('⚠️ OTP listener did not trigger (this might be normal if no changes occurred)');
      }
      unsubscribe();
    }, 3000);
    
    // 8. Summary
    console.log('\n📊 DEBUG SUMMARY:');
    console.log('==================');
    console.log('✅ Authentication: Working');
    console.log('✅ Retailer Data: Found');
    console.log(`🔐 Secure OTPs: ${secureOTPs.length} found`);
    console.log(`🔥 Firestore OTPs: ${otpSnapshot.size} found`);
    
    if (secureOTPs.length === 0 && otpSnapshot.size > 0) {
      console.log('⚠️ ISSUE: OTPs exist in Firestore but not retrieved by secure storage');
    } else if (secureOTPs.length > 0) {
      console.log('✅ OTPs are being retrieved correctly');
      
      // Check if any are expired
      const expiredOTPs = secureOTPs.filter(otp => otp.isExpired);
      if (expiredOTPs.length > 0) {
        console.log(`⚠️ ${expiredOTPs.length} OTPs are expired`);
      }
      
      const validOTPs = secureOTPs.filter(otp => !otp.isExpired);
      if (validOTPs.length > 0) {
        console.log(`✅ ${validOTPs.length} valid OTPs available for use`);
        console.log('These should be visible in your dashboard:');
        validOTPs.forEach(otp => {
          console.log(`  - ${otp.code} (₹${otp.amount}) from ${otp.lineWorkerName}`);
        });
      }
    } else {
      console.log('ℹ️ No OTPs found in the system');
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
})();