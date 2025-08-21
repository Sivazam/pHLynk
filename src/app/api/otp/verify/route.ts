import { NextRequest, NextResponse } from 'next/server';
import { otpStore, cleanupExpiredOTPs, removeActiveOTP, addCompletedPayment } from '@/lib/otp-store';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { otpService } from '@/services/firestore';
import { Retailer } from '@/types';

interface OTPVerifyRequest {
  paymentId: string;
  otp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OTPVerifyRequest = await request.json();
    const { paymentId, otp } = body;

    console.log('🔍 OTP VERIFICATION REQUEST:');
    console.log('Payment ID:', paymentId);
    console.log('OTP Code:', otp);
    console.log('Current OTP Store contents:');
    for (const [key, value] of otpStore.entries()) {
      console.log(`  Payment ID: ${key}, OTP: ${value.code}, Expires: ${value.expiresAt.toISOString()}, Attempts: ${value.attempts}`);
    }

    if (!paymentId || !otp) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean up expired OTPs first
    cleanupExpiredOTPs();

    // Get OTP from in-memory store first
    let otpData = otpStore.get(paymentId);
    console.log('🔍 OTP found in in-memory store:', otpData ? 'YES' : 'NO');
    
    // If not found in memory, try to get from Firestore
    if (!otpData) {
      console.log('🔍 OTP not in memory, checking Firestore...');
      try {
        const firestoreOTP = await otpService.getOTPByPaymentId(paymentId);
        console.log('🔍 Firestore OTP result:', firestoreOTP ? 'FOUND' : 'NOT FOUND');
        if (firestoreOTP) {
          // Convert Firestore OTP to in-memory format
          otpData = {
            code: firestoreOTP.code,
            expiresAt: firestoreOTP.expiresAt.toDate(),
            attempts: 0 // Firestore OTPs don't have attempt tracking
          };
          console.log('🔍 Found OTP in Firestore, converted to memory format:', {
            code: otpData.code,
            expiresAt: otpData.expiresAt.toISOString(),
            attempts: otpData.attempts
          });
        }
      } catch (error) {
        console.error('❌ Error getting OTP from Firestore:', error);
      }
    }
    
    console.log('🔍 Found OTP data:', otpData ? 'YES' : 'NO');
    if (otpData) {
      console.log('🔍 OTP details:', {
        code: otpData.code,
        expiresAt: otpData.expiresAt.toISOString(),
        attempts: otpData.attempts,
        isExpired: otpData.expiresAt < new Date()
      });
    }
    
    if (!otpData) {
      console.log('❌ OTP not found or expired');
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (otpData.expiresAt < new Date()) {
      otpStore.delete(paymentId);
      return NextResponse.json(
        { error: 'OTP expired' },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      otpStore.delete(paymentId);
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP
    console.log('🔍 Comparing OTP codes:');
    console.log('  Provided OTP:', otp);
    console.log('  Stored OTP:', otpData.code);
    console.log('  Match:', otpData.code === otp);
    
    if (otpData.code === otp) {
      console.log('✅ OTP verification successful!');
      
      // Mark OTP as used in Firestore
      try {
        const firestoreOTP = await otpService.getOTPByPaymentId(paymentId);
        if (firestoreOTP) {
          await otpService.markOTPAsUsed(firestoreOTP.id);
          console.log('✅ OTP marked as used in Firestore');
        } else {
          console.log('⚠️ OTP not found in Firestore (might be an older OTP)');
        }
      } catch (firestoreError) {
        console.error('❌ Error marking OTP as used in Firestore:', firestoreError);
        // Don't fail the verification if Firestore update fails
      }
      
      // Get payment details from Firestore
      try {
        const paymentRef = doc(db, 'payments', paymentId);
        const paymentDoc = await getDoc(paymentRef);
        
        if (paymentDoc.exists()) {
          const paymentData = paymentDoc.data();
          console.log('📄 Payment data found:', paymentData);
          
          // Get retailer details from retailerUsers collection
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(paymentData.retailerId);
          
          if (retailerUser) {
            console.log('🏪 Retailer user data found:', retailerUser);
            
            // Get line worker details
            const lineWorkerRef = doc(db, 'users', paymentData.lineWorkerId);
            const lineWorkerDoc = await getDoc(lineWorkerRef);
            
            if (lineWorkerDoc.exists()) {
              const lineWorkerData = lineWorkerDoc.data();
              console.log('👷 Line worker data found:', lineWorkerData);
              
              // Get retailer details from retailers collection for outstanding amount
              let remainingOutstanding = 0;
              try {
                const retailerRef = doc(db, 'retailers', paymentData.retailerId);
                const retailerDoc = await getDoc(retailerRef);
                
                if (retailerDoc.exists()) {
                  const retailerData = retailerDoc.data() as Retailer;
                  console.log('🏪 Retailer data found:', retailerData);
                  
                  // Calculate remaining outstanding amount
                  const currentOutstanding = retailerData.currentOutstanding || 0;
                  remainingOutstanding = Math.max(0, currentOutstanding - paymentData.totalPaid);
                  
                  // Update the retailer's outstanding amount in Firestore
                  await updateDoc(retailerRef, {
                    currentOutstanding: remainingOutstanding,
                    updatedAt: new Date()
                  });
                  console.log('✅ Updated retailer outstanding amount to:', remainingOutstanding);
                } else {
                  console.log('⚠️ Retailer document not found, using default outstanding amount');
                  remainingOutstanding = 0;
                }
              } catch (retailerError) {
                console.error('❌ Error getting/retailer retailer data:', retailerError);
                remainingOutstanding = 0;
              }
              
              // Remove the active OTP from retailer dashboard
              removeActiveOTP(paymentId);
              
              // Add completed payment notification to retailer dashboard
              addCompletedPayment({
                retailerId: paymentData.retailerId,
                amount: paymentData.totalPaid,
                paymentId: paymentId,
                lineWorkerName: lineWorkerData.name || 'Line Worker',
                remainingOutstanding: remainingOutstanding
              });
              
              console.log('✅ Added completed payment notification for retailer:', paymentData.retailerId);
            } else {
              console.log('❌ Line worker data not found');
              // Still remove active OTP and add basic notification
              removeActiveOTP(paymentId);
              addCompletedPayment({
                retailerId: paymentData.retailerId,
                amount: paymentData.totalPaid,
                paymentId: paymentId,
                lineWorkerName: 'Line Worker',
                remainingOutstanding: 0
              });
            }
          } else {
            console.log('❌ Retailer user data not found');
            // Still remove active OTP and add basic notification
            removeActiveOTP(paymentId);
            addCompletedPayment({
              retailerId: paymentData.retailerId,
              amount: paymentData.totalPaid,
              paymentId: paymentId,
              lineWorkerName: 'Line Worker',
              remainingOutstanding: 0
            });
          }
        } else {
          console.log('❌ Payment data not found');
          // Still remove active OTP
          removeActiveOTP(paymentId);
        }
      } catch (error) {
        console.error('❌ Error getting payment details for notification:', error);
        // Still remove active OTP
        removeActiveOTP(paymentId);
      }
      
      // OTP is correct, remove from in-memory store if it exists
      if (otpStore.has(paymentId)) {
        otpStore.delete(paymentId);
        console.log('🗑️ Removed OTP from in-memory store');
      }
      
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        verified: true
      });
    } else {
      console.log('❌ OTP verification failed!');
      
      // Only increment attempts if OTP came from in-memory store
      if (otpStore.has(paymentId)) {
        otpData.attempts++;
        // Update the store
        otpStore.set(paymentId, otpData);
        console.log(`🔢 Incremented attempts to ${otpData.attempts} for in-memory OTP`);
      } else {
        // For Firestore OTPs, we don't track attempts, so we'll allow unlimited attempts
        // or implement a different strategy if needed
        console.log('🔢 OTP from Firestore, no attempt tracking implemented');
      }
      
      const remainingAttempts = otpStore.has(paymentId) ? 3 - otpData.attempts : 'unlimited';
      
      return NextResponse.json(
        { 
          error: `Invalid OTP. ${remainingAttempts === 'unlimited' ? 'Please try again.' : `${remainingAttempts} attempts remaining.`}`,
          remainingAttempts 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}