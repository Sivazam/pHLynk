/**
 * Comprehensive OTP Debug Solution
 * This script will help identify why OTPs are not showing in the retailer dashboard
 * 
 * Instructions:
 * 1. Open the retailer dashboard in your browser
 * 2. Open the browser console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run the debugging
 */

(async function comprehensiveOTPDebug() {
  console.log('🔍 ===== COMPREHENSIVE OTP DEBUGGING =====');
  
  // Helper function to wait
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // STEP 1: Check authentication
    console.log('\n📋 STEP 1: Checking authentication...');
    const authModule = await import('@/contexts/AuthContext');
    const { useAuth } = authModule;
    
    // Get auth context (this might not work directly in console, so we'll try another approach)
    let currentUser = null;
    try {
      // Try to get from window context
      if (window.__NEXT_DATA__?.props?.pageProps?.user) {
        currentUser = window.__NEXT_DATA__.props.pageProps.user;
      }
    } catch (e) {
      console.log('Could not get user from window context');
    }
    
    if (!currentUser) {
      // Try to get from Firebase auth
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        currentUser = auth.currentUser;
      } catch (e) {
        console.log('Could not get user from Firebase auth');
      }
    }
    
    if (!currentUser) {
      console.error('❌ No authenticated user found. Please log in first.');
      return;
    }
    
    console.log('✅ Authenticated user:', {
      uid: currentUser.uid,
      email: currentUser.email
    });
    
    const retailerId = currentUser.uid;
    
    // STEP 2: Check retailer document
    console.log('\n📋 STEP 2: Checking retailer document...');
    const { doc, getDoc, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    
    const retailerDoc = await getDoc(doc(db, 'retailers', retailerId));
    if (!retailerDoc.exists()) {
      console.error('❌ Retailer document not found');
      return;
    }
    
    const retailerData = retailerDoc.data();
    console.log('✅ Retailer document found:', {
      id: retailerDoc.id,
      name: retailerData.name,
      retailerId: retailerData.retailerId,
      activeOTPsCount: retailerData.activeOTPs?.length || 0
    });
    
    // STEP 3: Check secure_otps collection directly
    console.log('\n📋 STEP 3: Checking secure_otps collection...');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const otpQuery = query(
      collection(db, 'secure_otps'),
      where('retailerId', '==', retailerId),
      where('isUsed', '==', false)
    );
    
    const otpSnapshot = await getDocs(otpQuery);
    console.log(`📄 Found ${otpSnapshot.size} OTP documents in secure_otps collection`);
    
    if (otpSnapshot.size === 0) {
      console.log('ℹ️ No OTPs found in secure_otps collection');
      console.log('This could mean:');
      console.log('  - No OTPs have been generated for this retailer');
      console.log('  - All OTPs have been used');
      console.log('  - OTPs have expired');
    } else {
      otpSnapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate();
        const isExpired = expiresAt && expiresAt <= new Date();
        
        console.log(`📄 OTP Document:`, {
          id: doc.id,
          paymentId: data.paymentId,
          retailerId: data.retailerId,
          amount: data.amount,
          lineWorkerName: data.lineWorkerName,
          isUsed: data.isUsed,
          isExpired: isExpired,
          expiresAt: expiresAt,
          createdAt: data.createdAt?.toDate()
        });
      });
    }
    
    // STEP 4: Test secure OTP storage
    console.log('\n📋 STEP 4: Testing secure OTP storage...');
    const { secureOTPStorage } = await import('@/lib/secure-otp-storage');
    
    const activeOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
    console.log(`🔐 Secure storage returned ${activeOTPs.length} active OTPs`);
    
    if (activeOTPs.length === 0) {
      console.log('⚠️ No active OTPs returned by secure storage');
      
      // Check if there's a mismatch
      if (otpSnapshot.size > 0) {
        console.log('❌ MISMATCH DETECTED:');
        console.log(`  Firestore has ${otpSnapshot.size} OTPs but secure storage returned 0`);
        console.log('This indicates an issue with the secure storage retrieval logic');
      }
    } else {
      activeOTPs.forEach(otp => {
        console.log(`🔐 Active OTP:`, {
          paymentId: otp.paymentId,
          code: otp.code,
          amount: otp.amount,
          lineWorkerName: otp.lineWorkerName,
          isExpired: otp.isExpired,
          expiresAt: otp.expiresAt
        });
      });
    }
    
    // STEP 5: Test OTP listener
    console.log('\n📋 STEP 5: Testing OTP listener...');
    let listenerTriggered = false;
    let listenerOTPs = [];
    
    const unsubscribe = secureOTPStorage.onOTPChanges(retailerId, (otps) => {
      listenerTriggered = true;
      listenerOTPs = otps;
      console.log('👂 OTP Listener triggered!', {
        count: otps.length,
        otps: otps.map(otp => ({
          paymentId: otp.paymentId,
          code: otp.code,
          amount: otp.amount,
          isExpired: otp.isExpired
        }))
      });
    });
    
    // Wait to see if listener triggers
    console.log('⏳ Waiting 3 seconds to see if listener triggers...');
    await wait(3000);
    
    if (listenerTriggered) {
      console.log('✅ OTP listener is working');
    } else {
      console.log('⚠️ OTP listener did not trigger');
      console.log('This could be normal if no changes occurred');
    }
    
    unsubscribe();
    
    // STEP 6: Check for the specific OTP mentioned
    console.log('\n📋 STEP 6: Checking for specific OTP (jyoxlztGX7FEZBNSzFeh)...');
    const specificPaymentId = 'jyoxlztGX7FEZBNSzFeh';
    
    const specificOTP = await secureOTPStorage.getOTP(specificPaymentId);
    if (specificOTP) {
      console.log('✅ Specific OTP found:', {
        id: specificOTP.id,
        paymentId: specificOTP.paymentId,
        retailerId: specificOTP.retailerId,
        amount: specificOTP.amount,
        lineWorkerName: specificOTP.lineWorkerName,
        isUsed: specificOTP.isUsed,
        expiresAt: specificOTP.expiresAt
      });
      
      // Check if it belongs to current retailer
      if (specificOTP.retailerId === retailerId) {
        console.log('✅ This OTP belongs to current retailer');
        
        // Check if expired
        if (specificOTP.expiresAt > new Date()) {
          console.log('✅ OTP is still valid');
          
          // Decrypt the code
          try {
            const encryptedCode = specificOTP.code;
            const decoded = atob(encryptedCode);
            const decryptedCode = decoded.split('').reverse().join('');
            console.log('🔓 Decrypted OTP code:', decryptedCode);
            
            // Test verification
            console.log('\n🧪 Testing OTP verification...');
            const verifyResult = await secureOTPStorage.verifyOTP(specificPaymentId, decryptedCode);
            console.log('✅ Verification result:', verifyResult);
            
            if (verifyResult.valid) {
              console.log('🎉 OTP VERIFICATION SUCCESSFUL!');
              console.log('The payment should now be marked as complete.');
            } else {
              console.log('❌ Verification failed:', verifyResult.error);
            }
          } catch (e) {
            console.error('❌ Failed to decrypt OTP:', e);
          }
        } else {
          console.log('❌ OTP has expired');
        }
      } else {
        console.log('❌ This OTP does not belong to current retailer');
        console.log('Expected:', retailerId);
        console.log('Actual:', specificOTP.retailerId);
      }
    } else {
      console.log('❌ Specific OTP not found');
    }
    
    // STEP 7: Summary and recommendations
    console.log('\n📊 ===== DEBUG SUMMARY =====');
    console.log('Authentication: ✅ Working');
    console.log('Retailer Document: ✅ Found');
    console.log(`Firestore OTPs: ${otpSnapshot.size} found`);
    console.log(`Secure Storage OTPs: ${activeOTPs.length} found`);
    console.log(`OTP Listener: ${listenerTriggered ? '✅ Working' : '⚠️ Not triggered'}`);
    
    if (otpSnapshot.size > 0 && activeOTPs.length === 0) {
      console.log('\n❌ ISSUE IDENTIFIED:');
      console.log('OTPs exist in Firestore but are not being retrieved by secure storage');
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Check the secure-otp-storage.ts getActiveOTPsForRetailer method');
      console.log('2. Verify the decryption logic is working correctly');
      console.log('3. Check if the retailerId matches exactly');
      console.log('4. Look for console errors when secureOTPStorage.getActiveOTPsForRetailer is called');
    } else if (activeOTPs.length > 0) {
      console.log('\n✅ OTPs are being retrieved correctly');
      console.log('If they are not visible in the dashboard, the issue might be:');
      console.log('1. The dashboard is not updating the UI');
      console.log('2. The OTPs are filtered out in the frontend');
      console.log('3. There is a state management issue');
      
      console.log('\n🔧 To check if the dashboard receives the OTPs:');
      console.log('1. Look for console logs starting with "🔔 Real-time OTP update detected"');
      console.log('2. Check if the activeOTPs state is being updated');
      console.log('3. Verify the OTP popup logic is working');
    } else {
      console.log('\nℹ️ No OTPs found in the system');
      console.log('This is normal if no payments have been initiated');
    }
    
    console.log('\n🔍 ===== DEBUGGING COMPLETE =====');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
})();