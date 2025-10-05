/**
 * Final OTP Debug Script - Targeted Solution
 * This script will pinpoint exactly why the OTP is not showing in your dashboard
 * 
 * SETUP:
 * 1. Make sure you're logged into the retailer dashboard
 * 2. Open browser console (F12)
 * 3. Paste this script and press Enter
 */

(async function finalOTPDebug() {
  console.log('🎯 ===== FINAL OTP DEBUG - TARGETED SOLUTION =====');
  
  try {
    // Get current authenticated user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ Please log in first');
      return;
    }
    
    console.log('✅ Current user:', user.uid);
    
    // Check the specific OTP we know exists
    const paymentId = 'jyoxlztGX7FEZBNSzFeh';
    const expectedCode = 'NDZYMzVS'; // The OTP code from the document
    
    console.log('\n🔍 Checking specific OTP...');
    console.log('Payment ID:', paymentId);
    console.log('Expected Code:', expectedCode);
    
    // 1. Check Firestore directly
    const { doc, getDoc, collection, query, where, getDocs, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    
    const otpQuery = query(
      collection(db, 'secure_otps'),
      where('paymentId', '==', paymentId)
    );
    
    const querySnapshot = await getDocs(otpQuery);
    
    if (querySnapshot.size === 0) {
      console.error('❌ OTP not found in Firestore');
      return;
    }
    
    const otpDoc = querySnapshot.docs[0];
    const otpData = otpDoc.data();
    
    console.log('✅ OTP found in Firestore:', {
      id: otpDoc.id,
      retailerId: otpData.retailerId,
      amount: otpData.amount,
      isUsed: otpData.isUsed,
      expiresAt: otpData.expiresAt?.toDate(),
      createdAt: otpData.createdAt?.toDate()
    });
    
    // 2. Verify it belongs to current retailer
    if (otpData.retailerId !== user.uid) {
      console.error('❌ OTP does not belong to current retailer!');
      console.log('Expected retailerId:', user.uid);
      console.log('Actual retailerId:', otpData.retailerId);
      console.log('\n🔧 SOLUTION: This OTP belongs to a different retailer account.');
      console.log('Please make sure you are logged into the correct retailer account.');
      return;
    }
    
    console.log('✅ OTP belongs to current retailer');
    
    // 3. Check if expired
    const now = new Date();
    const expiresAt = otpData.expiresAt?.toDate();
    
    if (!expiresAt || expiresAt <= now) {
      console.error('❌ OTP has expired!');
      console.log('Expired at:', expiresAt);
      console.log('Current time:', now);
      console.log('\n🔧 SOLUTION: Generate a new OTP for this payment.');
      return;
    }
    
    console.log('✅ OTP is still valid');
    
    // 4. Check secure storage retrieval
    console.log('\n🔐 Testing secure storage retrieval...');
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    
    const retrievedOTP = await secureOTPStorage.getOTP(paymentId);
    if (!retrievedOTP) {
      console.error('❌ OTP not found by secure storage!');
      console.log('\n🔧 SOLUTION: There is an issue with the secure storage retrieval.');
      console.log('Check the secure-otp-storage.ts getOTP method.');
      return;
    }
    
    console.log('✅ OTP retrieved by secure storage');
    
    // 5. Test decryption
    console.log('\n🔓 Testing decryption...');
    try {
      const encryptedCode = otpData.code;
      console.log('Encrypted code:', encryptedCode);
      
      const decoded = atob(encryptedCode);
      const decryptedCode = decoded.split('').reverse().join('');
      console.log('Decrypted code:', decryptedCode);
      
      if (decryptedCode !== expectedCode) {
        console.error('❌ Decrypted code does not match expected code!');
        console.log('Expected:', expectedCode);
        console.log('Got:', decryptedCode);
        console.log('\n🔧 SOLUTION: The encryption/decryption logic has an issue.');
        return;
      }
      
      console.log('✅ Decryption successful');
    } catch (e) {
      console.error('❌ Decryption failed:', e);
      console.log('\n🔧 SOLUTION: The encryption/decryption logic has an issue.');
      return;
    }
    
    // 6. Test active OTPs retrieval
    console.log('\n📋 Testing active OTPs retrieval...');
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(user.uid);
    console.log('Active OTPs count:', activeOTPs.length);
    
    const foundInActive = activeOTPs.find(otp => otp.paymentId === paymentId);
    if (!foundInActive) {
      console.error('❌ OTP not found in active OTPs list!');
      console.log('\n🔧 SOLUTION: The getActiveOTPsForRetailer method has an issue.');
      console.log('It might be filtering out this OTP incorrectly.');
      return;
    }
    
    console.log('✅ OTP found in active OTPs list');
    console.log('Active OTP details:', {
      paymentId: foundInActive.paymentId,
      code: foundInActive.code,
      amount: foundInActive.amount,
      isExpired: foundInActive.isExpired
    });
    
    // 7. Check if the dashboard should be showing this OTP
    console.log('\n🖥️ Checking dashboard display logic...');
    
    // Check if React state has the OTP
    // This is a bit tricky from the console, but we can try
    if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
      console.log('Next.js data found, but checking React state requires access to component state');
    }
    
    // 8. Test OTP verification
    console.log('\n🧪 Testing OTP verification...');
    const verifyResult = await secureOTPStorage.verifyOTP(paymentId, expectedCode);
    console.log('Verification result:', verifyResult);
    
    if (verifyResult.valid) {
      console.log('🎉 OTP VERIFICATION SUCCESSFUL!');
      console.log('The payment should now be marked as complete.');
      console.log('Refresh your dashboard to see the payment in completed status.');
    } else {
      console.error('❌ OTP verification failed:', verifyResult.error);
      
      if (verifyResult.error === 'OTP already used') {
        console.log('\n🔧 SOLUTION: This OTP has already been used.');
        console.log('The payment should already be in completed status.');
      } else {
        console.log('\n🔧 SOLUTION: Check the verification logic.');
      }
    }
    
    // 9. Final recommendations
    console.log('\n📊 ===== FINAL DIAGNOSIS =====');
    
    if (activeOTPs.length > 0 && foundInActive) {
      console.log('✅ OTP is correctly retrieved and should be visible in the dashboard');
      console.log('\nIf you still cannot see the OTP:');
      console.log('1. Refresh the page (F5)');
      console.log('2. Check the browser console for any JavaScript errors');
      console.log('3. Look for logs starting with "🔔 Real-time OTP update detected"');
      console.log('4. Check if the OTP popup is appearing but hidden');
      console.log('5. Verify the "Active OTP Requests" card is visible on the dashboard');
      
      // Add a manual refresh trigger
      console.log('\n🔄 Manually triggering OTP refresh...');
      window.dispatchEvent(new CustomEvent('refreshOTPData'));
    } else {
      console.log('❌ There is an issue with OTP retrieval');
      console.log('The issue has been identified above with the 🔧 SOLUTION label');
    }
    
    console.log('\n🎯 ===== DEBUG COMPLETE =====');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
})();