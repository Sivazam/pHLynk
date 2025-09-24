import { NextRequest, NextResponse } from 'next/server';
import { otpStore, cleanupExpiredOTPs, removeActiveOTP, addCompletedPayment } from '@/lib/otp-store';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';
import { Retailer } from '@/types';
import { logger } from '@/lib/logger';

interface OTPVerifyRequest {
  paymentId: string;
  otp: string;
}

// Helper function to get payment with correct tenantId
async function getPaymentWithCorrectTenant(paymentId: string) {
  console.log('🔍 getPaymentWithCorrectTenant called for paymentId:', paymentId);
  
  // First try with 'system' tenant
  console.log('🔍 Trying with system tenant...');
  let payment = await paymentService.getById(paymentId, 'system');
  
  if (!payment) {
    // If not found with 'system', try to get the payment document directly without tenantId checking
    console.log('🔍 Not found with system tenant, trying direct document access...');
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists()) {
        const paymentData = paymentDoc.data();
        console.log('🔍 Found payment document directly:', {
          id: paymentDoc.id,
          tenantId: paymentData.tenantId,
          retailerId: paymentData.retailerId
        });
        
        // Create a payment object with the correct structure
        payment = {
          id: paymentDoc.id,
          ...paymentData
        } as any;
        
        console.log('🔍 Payment found via direct access');
      } else {
        console.log('🔍 Payment document not found via direct access');
      }
    } catch (error) {
      console.error('Error accessing payment document directly:', error);
    }
  }
  
  console.log('🔍 Final payment result:', payment ? 'FOUND' : 'NOT FOUND');
  return payment;
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
    logger.debug('OTP found in in-memory store', otpData ? 'YES' : 'NO', { context: 'OTPVerifyAPI' });
    
    // If not found in memory, try to get from retailer document
    if (!otpData) {
      console.log('🔍 OTP not in memory, checking retailer document...');
      try {
        // First, get the payment to find the retailerId and tenantId
        const payment = await getPaymentWithCorrectTenant(paymentId);
        
        console.log('🔍 Payment retrieval result:', payment ? 'FOUND' : 'NOT FOUND');
        if (payment) {
          console.log('🔍 Payment details:', {
            id: payment.id,
            retailerId: payment.retailerId,
            lineWorkerId: payment.lineWorkerId,
            totalPaid: payment.totalPaid,
            state: payment.state
          });
        }
        
        if (payment && payment.retailerId) {
          // Get retailer user to get tenantId
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
          console.log('🔍 Retailer user retrieval result:', retailerUser ? 'FOUND' : 'NOT FOUND');
          if (retailerUser) {
            console.log('🔍 Retailer user details:', {
              id: retailerUser.id,
              retailerId: retailerUser.retailerId,
              tenantId: retailerUser.tenantId,
              phone: retailerUser.phone
            });
          }
          
          if (retailerUser && retailerUser.tenantId) {
            console.log('🔍 Attempting to get OTPs from retailer document...');
            const retailerOTPs = await retailerService.getActiveOTPsFromRetailer(payment.retailerId, retailerUser.tenantId);
            console.log('🔍 Retailer OTPs retrieved:', retailerOTPs.length, 'OTPs found');
            console.log('🔍 Retailer OTPs details:', retailerOTPs.map(otp => ({
              paymentId: otp.paymentId,
              code: otp.code,
              amount: otp.amount,
              expiresAt: otp.expiresAt.toDate(),
              isUsed: otp.isUsed
            })));
            
            const retailerOTP = retailerOTPs.find(otp => otp.paymentId === paymentId);
            console.log('🔍 Looking for OTP with paymentId:', paymentId);
            console.log('🔍 Retailer OTP result:', retailerOTP ? 'FOUND' : 'NOT FOUND');
            if (retailerOTP) {
              console.log('🔍 Found OTP details:', {
                paymentId: retailerOTP.paymentId,
                code: retailerOTP.code,
                amount: retailerOTP.amount,
                expiresAt: retailerOTP.expiresAt.toDate(),
                isUsed: retailerOTP.isUsed
              });
              // Convert retailer OTP to in-memory format
              otpData = {
                code: retailerOTP.code,
                expiresAt: retailerOTP.expiresAt.toDate(),
                attempts: 0 // Retailer OTPs don't have attempt tracking
              };
              console.log('🔍 Found OTP in retailer document, converted to memory format:', {
                code: otpData.code,
                expiresAt: otpData.expiresAt.toISOString(),
                attempts: otpData.attempts
              });
            } else {
              console.log('❌ OTP not found in retailer OTPs array');
              console.log('🔍 Available OTP paymentIds:', retailerOTPs.map(otp => otp.paymentId));
            }
          } else {
            console.log('⚠️ Retailer user not found or missing tenantId');
          }
        } else {
          console.log('⚠️ Payment or retailerId not found');
        }
      } catch (error) {
        console.error('❌ Error getting OTP from retailer document:', error);
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
    } else {
      console.log('❌ OTP NOT FOUND - This is the issue!');
      console.log('🔍 Debugging info:');
      console.log('  - PaymentId:', paymentId);
      console.log('  - OTP Code provided:', otp);
      console.log('  - In-memory store had OTP:', otpStore.get(paymentId) ? 'YES' : 'NO');
    }
    
    if (!otpData) {
      console.log('❌ OTP not found or expired - returning error');
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
      
      // Update payment state to COMPLETED using PaymentService
      try {
        const payment = await getPaymentWithCorrectTenant(paymentId);
        if (payment) {
          // Get the correct tenantId
          let tenantId = payment.tenantId;
          if (!tenantId || tenantId === 'system') {
            // If payment doesn't have tenantId or it's 'system', get it from retailer user
            const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
            if (retailerUser && retailerUser.tenantId) {
              tenantId = retailerUser.tenantId;
            }
          }
          
          if (tenantId && tenantId !== 'system') {
            await paymentService.updatePaymentState(paymentId, tenantId, 'COMPLETED', {
              timeline: {
                ...payment.timeline,
                completedAt: Timestamp.now(),
                verifiedAt: Timestamp.now()
              }
            });
            console.log('✅ Payment state updated to COMPLETED using PaymentService');
          } else {
            // Fallback to direct update if no valid tenantId
            const paymentRef = doc(db, 'payments', paymentId);
            await updateDoc(paymentRef, {
              state: 'COMPLETED',
              'timeline.completedAt': new Date(),
              'timeline.verifiedAt': new Date(),
              updatedAt: new Date()
            });
            console.log('✅ Payment state updated to COMPLETED (direct fallback)');
          }
        } else {
          console.log('❌ Payment not found, cannot update state');
        }
      } catch (paymentUpdateError) {
        console.error('❌ Error updating payment state:', paymentUpdateError);
        // Don't fail the verification if payment update fails
      }
      
      // Mark OTP as used in retailer document
      try {
        // First, get the payment to find the retailerId and tenantId
        const payment = await getPaymentWithCorrectTenant(paymentId);
        
        if (payment && payment.retailerId) {
          // Get retailer user to get tenantId
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
          if (retailerUser && retailerUser.tenantId) {
            await retailerService.markOTPAsUsedInRetailer(payment.retailerId, retailerUser.tenantId, paymentId);
            console.log('✅ OTP marked as used in retailer document');
          } else {
            console.log('⚠️ Retailer user not found or missing tenantId, cannot mark OTP as used');
          }
        } else {
          console.log('⚠️ Payment or retailerId not found, cannot mark OTP as used');
        }
      } catch (firestoreError) {
        console.error('❌ Error marking OTP as used in retailer document:', firestoreError);
        // Don't fail the verification if retailer document update fails
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