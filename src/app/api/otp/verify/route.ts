import { NextRequest, NextResponse } from 'next/server';
import { otpStore, cleanupExpiredOTPs, removeActiveOTP, addCompletedPayment, checkSecurityLimits, recordFailedAttempt, resetSecurityTracking, getSecurityStatus } from '@/lib/otp-store';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';
import { fast2SMSService, Fast2SMSService } from '@/services/fast2sms-service';
import { pushNotificationService } from '@/services/push-notification-service';
import { Retailer } from '@/types';
import { logger } from '@/lib/logger';
import { functions, initializeFirebaseFunctions } from '@/lib/firebase';

// Type definitions for Firebase Function results
interface SMSFunctionResult {
  success: boolean;
  messageId?: string;
  phone?: string;
  status?: string;
  error?: string;
}

interface FirebaseFunctionResponse {
  data: SMSFunctionResult;
}

// Helper function to get httpsCallable if functions are available
async function getHttpsCallable(functionName: string) {
  try {
    console.log(`🔧 Attempting to get Firebase Function: ${functionName}`);
    
    // Ensure Firebase Functions are initialized
    const functionsInstance = await initializeFirebaseFunctions();
    console.log(`📋 Firebase Functions instance result:`, functionsInstance ? 'AVAILABLE' : 'NOT AVAILABLE');
    
    if (!functionsInstance) {
      console.log(`⚠️ Firebase Functions not available for ${functionName}, attempting to reinitialize...`);
      
      // Try to reinitialize Firebase Functions
      try {
        const retryInstance = await initializeFirebaseFunctions();
        if (!retryInstance) {
          console.log(`❌ Firebase Functions reinitialization failed for ${functionName}`);
          return null;
        }
        console.log(`✅ Firebase Functions reinitialization successful for ${functionName}`);
      } catch (retryError) {
        console.error(`❌ Error during Firebase Functions reinitialization for ${functionName}:`, retryError);
        return null;
      }
    }
    
    const functionsModule = await import('firebase/functions');
    console.log(`📦 Firebase Functions module imported successfully for ${functionName}`);
    
    const callableFunction = functionsModule.httpsCallable(functionsInstance, functionName);
    console.log(`✅ Successfully created callable function for ${functionName}`);
    
    return callableFunction;
  } catch (error) {
    console.error(`❌ Error getting Firebase Function ${functionName}:`, error);
    console.log(`⚠️ Firebase Functions not available for ${functionName}, using fallback mode`);
    return null;
  }
}

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
    // Proactively initialize Firebase Functions to ensure they're ready
    console.log('🔧 Initializing Firebase Functions at start of OTP verification...');
    try {
      await initializeFirebaseFunctions();
      console.log('✅ Firebase Functions initialization completed');
    } catch (initError) {
      console.error('❌ Firebase Functions initialization failed:', initError);
      // Don't fail the request - we'll try to initialize again when needed
    }

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

    // Check security limits before proceeding
    const securityCheck = checkSecurityLimits(paymentId);
    if (!securityCheck.canAttempt) {
      console.log('🚫 Security limits exceeded:', securityCheck);
      return NextResponse.json(
        { 
          error: securityCheck.message || 'Access denied due to security limits',
          securityStatus: getSecurityStatus(paymentId)
        },
        { status: 400 }
      );
    }

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
              
              // Check if we already have security tracking for this payment
              const existingSecurityData = otpStore.get(paymentId);
              const existingAttempts = existingSecurityData ? existingSecurityData.attempts : 0;
              const existingConsecutiveFailures = existingSecurityData ? existingSecurityData.consecutiveFailures : 0;
              
              // Convert retailer OTP to in-memory format, preserving existing security data
              otpData = {
                code: retailerOTP.code,
                expiresAt: retailerOTP.expiresAt.toDate(),
                attempts: existingAttempts, // Preserve existing attempts
                lastAttemptAt: existingSecurityData?.lastAttemptAt || null,
                cooldownUntil: existingSecurityData?.cooldownUntil || null,
                consecutiveFailures: existingConsecutiveFailures, // Preserve consecutive failures
                breachDetected: existingSecurityData?.breachDetected || false
              };
              
              // Update the in-memory store with the preserved data
              otpStore.set(paymentId, otpData);
              
              console.log('🔍 Found OTP in retailer document, converted to memory format:', {
                code: otpData.code,
                expiresAt: otpData.expiresAt.toISOString(),
                attempts: otpData.attempts,
                consecutiveFailures: otpData.consecutiveFailures,
                breachDetected: otpData.breachDetected,
                inCooldown: otpData.cooldownUntil ? otpData.cooldownUntil > new Date() : false
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
      const securityStatus = getSecurityStatus(paymentId);
      console.log('🚫 Maximum attempts reached for payment:', paymentId);
      return NextResponse.json(
        { 
          error: 'Too many failed attempts. Please request a new OTP.',
          remainingAttempts: 0,
          securityStatus,
          maxAttemptsReached: true
        },
        { status: 400 }
      );
    }

    // Verify OTP (case-insensitive comparison)
    console.log('🔍 Comparing OTP codes:');
    console.log('  Provided OTP:', otp);
    console.log('  Stored OTP:', otpData.code);
    console.log('  Provided (uppercase):', otp.toUpperCase());
    console.log('  Stored (uppercase):', otpData.code.toUpperCase());
    console.log('  Match:', otpData.code.toUpperCase() === otp.toUpperCase());
    
    if (otpData.code.toUpperCase() === otp.toUpperCase()) {
      console.log('✅ OTP verification successful!');
      
      // Use Cloud Function to verify OTP (more secure) - if available
      try {
        const verifyOTPFunction = await getHttpsCallable('verifyOTP');
        if (verifyOTPFunction) {
          const cloudResult = await verifyOTPFunction({
            paymentId,
            otp
          });

          console.log('🔐 Cloud Function verification result:', cloudResult.data);

          const data = cloudResult.data as any;
          if (data && data.success) {
            console.log('✅ OTP verified successfully via cloud function');
          } else {
            console.log('⚠️ Cloud function verification failed, continuing with local verification');
            // Continue with local verification if cloud function fails
          }
        } else {
          console.log('⚠️ Cloud Functions not available, using local verification');
        }
      } catch (cloudFunctionError) {
        console.error('❌ Error calling cloud function for verification:', cloudFunctionError);
        console.log('⚠️ Continuing with local verification');
      }
      
      // Reset security tracking on successful verification
      resetSecurityTracking(paymentId);
      
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
                completedAt: Timestamp.fromDate(new Date()),
                verifiedAt: Timestamp.fromDate(new Date())
              }
            });
            console.log('✅ Payment state updated to COMPLETED using PaymentService');
          } else {
            // Fallback to direct update if no valid tenantId
            const paymentRef = doc(db, 'payments', paymentId);
            await updateDoc(paymentRef, {
              state: 'COMPLETED',
              'timeline.completedAt': Timestamp.fromDate(new Date()),
              'timeline.verifiedAt': Timestamp.fromDate(new Date()),
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
      
      // Mark OTP as used in retailer document AND REMOVE IT
      try {
        // First, get the payment to find the retailerId and tenantId
        const payment = await getPaymentWithCorrectTenant(paymentId);
        
        if (payment && payment.retailerId) {
          // Get retailer user to get tenantId
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
          if (retailerUser && retailerUser.tenantId) {
            await retailerService.removeOTPFromRetailer(payment.retailerId, retailerUser.tenantId, paymentId);
            console.log('✅ OTP completely removed from retailer document');
          } else {
            console.log('⚠️ Retailer user not found or missing tenantId, cannot remove OTP');
          }
        } else {
          console.log('⚠️ Payment or retailerId not found, cannot remove OTP');
        }
      } catch (firestoreError) {
        console.error('❌ Error removing OTP from retailer document:', firestoreError);
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
                  
                  // Since invoices are removed, outstanding is always 0
                  const currentOutstanding = 0;
                  remainingOutstanding = Math.max(0, currentOutstanding - paymentData.totalPaid);
                  
                  // Update the retailer's outstanding amount in Firestore
                  await updateDoc(retailerRef, {
                    currentOutstanding: remainingOutstanding,
                    updatedAt: Timestamp.fromDate(new Date())
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
              
              // Send PWA push notification for payment completion
              try {
                const paymentNotificationSent = await pushNotificationService.sendPaymentCompletedNotification({
                  amount: paymentData.totalPaid,
                  paymentId: paymentId,
                  retailerName: retailerUser.name || 'Retailer',
                  lineWorkerName: lineWorkerData.name || 'Line Worker'
                });
                
                if (paymentNotificationSent) {
                  console.log('📱 PWA payment completion notification sent successfully');
                } else {
                  console.log('⚠️ PWA payment completion notification failed');
                }
              } catch (notificationError) {
                console.error('❌ Error sending PWA payment completion notification:', notificationError);
                // Don't fail the verification if notification fails
              }
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
              
              // Send PWA notification for fallback case
              try {
                await pushNotificationService.sendPaymentCompletedNotification({
                  amount: paymentData.totalPaid,
                  paymentId: paymentId,
                  retailerName: 'Retailer',
                  lineWorkerName: 'Line Worker'
                });
              } catch (notificationError) {
                console.error('❌ Error sending fallback PWA notification:', notificationError);
              }
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
            
            // Send PWA notification for fallback case
            try {
              await pushNotificationService.sendPaymentCompletedNotification({
                amount: paymentData.totalPaid,
                paymentId: paymentId,
                retailerName: 'Retailer',
                lineWorkerName: 'Line Worker'
              });
            } catch (notificationError) {
              console.error('❌ Error sending fallback PWA notification:', notificationError);
            }
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
      
      // Comprehensive OTP cleanup - remove from all locations
      await comprehensiveOTPCleanup(paymentId);
      
      // Send payment confirmation SMS to both retailer and wholesaler using Firebase Functions
      try {
        const payment = await getPaymentWithCorrectTenant(paymentId);
        if (payment) {
          // Get retailer user details
          const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
          
          if (retailerUser) {
            // Get line worker details
            const lineWorkerRef = doc(db, 'users', payment.lineWorkerId);
            const lineWorkerDoc = await getDoc(lineWorkerRef);
            
            if (lineWorkerDoc.exists()) {
              const lineWorkerData = lineWorkerDoc.data();
              const lineWorkerName = lineWorkerData.name || 'Line Worker';
              
              // Get retailer details for area information
              const retailerRef = doc(db, 'retailers', payment.retailerId);
              const retailerDoc = await getDoc(retailerRef);
              
              let retailerArea = 'Unknown Area';
              if (retailerDoc.exists()) {
                const retailerData = retailerDoc.data();
                retailerArea = retailerData.areaName || 'Unknown Area';
              }
              
              // Get wholesaler name from wholesaler document
              let wholesalerName = 'Wholesaler';
              if (lineWorkerData.wholesalerId) {
                const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
                const wholesalerDoc = await getDoc(wholesalerRef);
                
                if (wholesalerDoc.exists()) {
                  const wholesalerData = wholesalerDoc.data();
                  wholesalerName = wholesalerData.displayName || wholesalerData.name || 'Wholesaler';
                }
              }
              
              // Format collection date
              const collectionDate = Fast2SMSService.formatDateForSMS(new Date());
              
              // Send SMS to retailer using Firebase Function
              console.log('🚀 Attempting to send retailer SMS via Firebase Function...');
              try {
                const sendRetailerSMSFunction = await getHttpsCallable('sendRetailerPaymentSMS');
                console.log('📞 Firebase Function result:', sendRetailerSMSFunction ? 'AVAILABLE' : 'NOT AVAILABLE');
                
                if (sendRetailerSMSFunction && retailerUser.phone) {
                  console.log('📤 Calling sendRetailerPaymentSMS Firebase Function with data:', {
                    retailerId: payment.retailerId,
                    paymentId: paymentId,
                    amount: payment.totalPaid,
                    lineWorkerName,
                    retailerName: retailerUser.name || 'Retailer',
                    retailerArea,
                    wholesalerName,
                    collectionDate
                  });
                  
                  try {
                    const retailerSMSResult = await sendRetailerSMSFunction({
                      retailerId: payment.retailerId,
                      paymentId: paymentId,
                      amount: payment.totalPaid,
                      lineWorkerName,
                      retailerName: retailerUser.name || 'Retailer',
                      retailerArea,
                      wholesalerName,
                      collectionDate
                    });
                    
                    console.log('📱 Retailer confirmation SMS result via Firebase Function:', retailerSMSResult.data);
                    
                    // Check if the SMS was sent successfully
                    const resultData = retailerSMSResult.data as SMSFunctionResult;
                    if (resultData && resultData.success) {
                      console.log('✅ Retailer SMS sent successfully via Firebase Function');
                      console.log('📋 SMS Details:', {
                        messageId: resultData.messageId,
                        phone: resultData.phone,
                        status: resultData.status
                      });
                    } else {
                      console.warn('⚠️ Retailer SMS Firebase Function returned unsuccessful result:', resultData);
                      // Fallback to local service
                      throw new Error(resultData?.error || 'Firebase Function returned unsuccessful result');
                    }
                  } catch (functionCallError) {
                    console.error('❌ Error calling retailer SMS Firebase Function:', functionCallError);
                    throw functionCallError; // Re-throw to trigger fallback
                  }
                } else {
                  console.log('⚠️ Firebase Function not available or retailer phone missing, falling back to local service for retailer SMS');
                  console.log('  - Function available:', !!sendRetailerSMSFunction);
                  console.log('  - Retailer phone:', retailerUser.phone);
                  // Fallback to local service if Firebase Function not available
                  if (retailerUser.phone) {
                    const retailerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
                      retailerUser.phone,
                      'retailer',
                      {
                        amount: payment.totalPaid.toString(),
                        lineWorkerName,
                        retailerName: retailerUser.name || 'Retailer',
                        retailerArea,
                        collectionDate,
                        wholesalerName
                      }
                    );
                    console.log('📱 Retailer confirmation SMS result (fallback):', retailerSMSResult);
                  }
                }
              } catch (retailerSMSError) {
                console.error('❌ Error sending retailer SMS via Firebase Function:', retailerSMSError);
                // Fallback to local service
                try {
                  if (retailerUser.phone) {
                    const retailerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
                      retailerUser.phone,
                      'retailer',
                      {
                        amount: payment.totalPaid.toString(),
                        lineWorkerName,
                        retailerName: retailerUser.name || 'Retailer',
                        retailerArea,
                        collectionDate,
                        wholesalerName
                      }
                    );
                    console.log('📱 Retailer confirmation SMS result (fallback after error):', retailerSMSResult);
                  }
                } catch (fallbackError) {
                  console.error('❌ Error in retailer SMS fallback:', fallbackError);
                }
              }
              
              // Send SMS to wholesaler using Firebase Function
              console.log('🚀 Attempting to send wholesaler SMS via Firebase Function...');
              try {
                const sendWholesalerSMSFunction = await getHttpsCallable('sendWholesalerPaymentSMS');
                console.log('📞 Wholesaler Firebase Function result:', sendWholesalerSMSFunction ? 'AVAILABLE' : 'NOT AVAILABLE');
                
                if (sendWholesalerSMSFunction && lineWorkerData.wholesalerId) {
                  const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
                  const wholesalerDoc = await getDoc(wholesalerRef);
                  
                  if (wholesalerDoc.exists()) {
                    const wholesalerData = wholesalerDoc.data();
                    if (wholesalerData.phone) {
                      console.log('📤 Calling sendWholesalerPaymentSMS Firebase Function with data:', {
                        retailerId: payment.retailerId,
                        paymentId: paymentId,
                        amount: payment.totalPaid,
                        lineWorkerName,
                        retailerName: retailerUser.name || 'Retailer',
                        retailerArea,
                        wholesalerName: wholesalerData.displayName || wholesalerData.name || 'Wholesaler',
                        collectionDate
                      });
                      
                      try {
                        const wholesalerSMSResult = await sendWholesalerSMSFunction({
                          retailerId: payment.retailerId,
                          paymentId: paymentId,
                          amount: payment.totalPaid,
                          lineWorkerName,
                          retailerName: retailerUser.name || 'Retailer',
                          retailerArea,
                          wholesalerName: wholesalerData.displayName || wholesalerData.name || 'Wholesaler',
                          collectionDate
                        });
                        
                        console.log('📱 Wholesaler confirmation SMS result via Firebase Function:', wholesalerSMSResult.data);
                        
                        // Check if the SMS was sent successfully
                        const wholesalerResultData = wholesalerSMSResult.data as SMSFunctionResult;
                        if (wholesalerResultData && wholesalerResultData.success) {
                          console.log('✅ Wholesaler SMS sent successfully via Firebase Function');
                          console.log('📋 SMS Details:', {
                            messageId: wholesalerResultData.messageId,
                            phone: wholesalerResultData.phone,
                            status: wholesalerResultData.status
                          });
                        } else {
                          console.warn('⚠️ Wholesaler SMS Firebase Function returned unsuccessful result:', wholesalerResultData);
                          // Fallback to local service
                          throw new Error(wholesalerResultData?.error || 'Firebase Function returned unsuccessful result');
                        }
                      } catch (functionCallError) {
                        console.error('❌ Error calling wholesaler SMS Firebase Function:', functionCallError);
                        throw functionCallError; // Re-throw to trigger fallback
                      }
                    } else {
                      console.log('⚠️ Wholesaler phone not found, skipping SMS');
                    }
                  } else {
                    console.log('⚠️ Wholesaler document not found, skipping SMS');
                  }
                } else {
                  console.log('⚠️ Firebase Function not available or wholesaler ID missing, falling back to local service for wholesaler SMS');
                  console.log('  - Function available:', !!sendWholesalerSMSFunction);
                  console.log('  - Wholesaler ID:', lineWorkerData.wholesalerId);
                  // Fallback to local service if Firebase Function not available
                  if (lineWorkerData.wholesalerId) {
                    const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
                    const wholesalerDoc = await getDoc(wholesalerRef);
                    
                    if (wholesalerDoc.exists()) {
                      const wholesalerData = wholesalerDoc.data();
                      if (wholesalerData.phone) {
                        const wholesalerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
                          wholesalerData.phone,
                          'wholesaler',
                          {
                            amount: payment.totalPaid.toString(),
                            lineWorkerName,
                            retailerName: retailerUser.name || 'Retailer',
                            retailerArea,
                            collectionDate,
                            wholesalerName: wholesalerData.displayName || wholesalerData.name || 'Wholesaler'
                          }
                        );
                        console.log('📱 Wholesaler confirmation SMS result (fallback):', wholesalerSMSResult);
                      }
                    }
                  }
                }
              } catch (wholesalerSMSError) {
                console.error('❌ Error sending wholesaler SMS via Firebase Function:', wholesalerSMSError);
                // Fallback to local service
                try {
                  if (lineWorkerData.wholesalerId) {
                    const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
                    const wholesalerDoc = await getDoc(wholesalerRef);
                    
                    if (wholesalerDoc.exists()) {
                      const wholesalerData = wholesalerDoc.data();
                      if (wholesalerData.phone) {
                        const wholesalerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
                          wholesalerData.phone,
                          'wholesaler',
                          {
                            amount: payment.totalPaid.toString(),
                            lineWorkerName,
                            retailerName: retailerUser.name || 'Retailer',
                            retailerArea,
                            collectionDate,
                            wholesalerName: wholesalerData.displayName || wholesalerData.name || 'Wholesaler'
                          }
                        );
                        console.log('📱 Wholesaler confirmation SMS result (fallback after error):', wholesalerSMSResult);
                      }
                    }
                  }
                } catch (fallbackError) {
                  console.error('❌ Error in wholesaler SMS fallback:', fallbackError);
                }
              }
            }
          }
        }
      } catch (smsError) {
        console.error('❌ Error sending payment confirmation SMS:', smsError);
        // Don't fail the verification if SMS sending fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        verified: true
      });
    } else {
      console.log('❌ OTP verification failed!');
      console.log('🔍 Before recording attempt - Current attempts:', otpData.attempts);
      
      // Record failed attempt and check security limits
      const failureResult = recordFailedAttempt(paymentId);
      
      console.log('📊 Failed attempt recorded:', failureResult);
      console.log('🔍 After recording attempt - Updated attempts:', otpStore.get(paymentId)?.attempts);
      
      // Get updated security status
      const securityStatus = getSecurityStatus(paymentId);
      console.log('🔍 Updated security status:', securityStatus);
      
      // If breach detected, send security alert to wholesaler
      if (failureResult.breachDetected) {
        console.log('🚨 BREACH DETECTED - Sending security alert');
        try {
          // Get payment details to find wholesaler
          const payment = await getPaymentWithCorrectTenant(paymentId);
          if (payment && payment.lineWorkerId) {
            // Get line worker details
            const lineWorkerRef = doc(db, 'users', payment.lineWorkerId);
            const lineWorkerDoc = await getDoc(lineWorkerRef);
            
            if (lineWorkerDoc.exists()) {
              const lineWorkerData = lineWorkerDoc.data();
              const lineWorkerName = lineWorkerData.name || 'Line Worker';
              
              // Get wholesaler info (assuming line worker has wholesalerId field)
              if (lineWorkerData.wholesalerId) {
                const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
                const wholesalerDoc = await getDoc(wholesalerRef);
                
                if (wholesalerDoc.exists()) {
                  const wholesalerData = wholesalerDoc.data();
                  if (wholesalerData.phone) {
                    // Send security alert to wholesaler
                    const alertResult = await fast2SMSService.sendSecurityAlertSMS(
                      wholesalerData.phone,
                      lineWorkerName
                    );
                    
                    console.log('🚨 Security alert sent to wholesaler:', alertResult);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error sending security alert:', error);
        }
      }
      
      // Calculate remaining attempts
      const remainingAttempts = Math.max(0, 3 - securityStatus.attempts);
      
      // Construct appropriate error message
      let errorMessage = failureResult.message || `Invalid OTP. ${remainingAttempts} attempts remaining.`;
      
      // Add cooldown information if applicable
      if (securityStatus.inCooldown && securityStatus.cooldownTime) {
        const cooldownMinutes = Math.floor(securityStatus.cooldownTime / 60);
        const cooldownSeconds = securityStatus.cooldownTime % 60;
        errorMessage = failureResult.message || `Too many attempts. Please wait ${cooldownMinutes}:${cooldownSeconds.toString().padStart(2, '0')} before trying again.`;
      }
      
      // Add breach detection message
      if (failureResult.breachDetected) {
        errorMessage = failureResult.message || 'Security breach detected. Wholesaler has been notified.';
      }
      
      console.log('📤 Returning error response:', {
        error: errorMessage,
        remainingAttempts,
        securityStatus,
        breachDetected: failureResult.breachDetected,
        cooldownTriggered: failureResult.cooldownTriggered
      });
      
      return NextResponse.json(
        { 
          error: errorMessage,
          securityStatus,
          remainingAttempts,
          breachDetected: failureResult.breachDetected,
          cooldownTriggered: failureResult.cooldownTriggered,
          maxAttemptsReached: remainingAttempts === 0
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

// Comprehensive OTP cleanup function
async function comprehensiveOTPCleanup(paymentId: string) {
  console.log('🧹 Starting comprehensive OTP cleanup for payment:', paymentId);
  
  try {
    // 1. Remove from in-memory store
    if (otpStore.has(paymentId)) {
      otpStore.delete(paymentId);
      console.log('✅ Removed OTP from in-memory store');
    }
    
    // 2. Remove from active OTPs display
    removeActiveOTP(paymentId);
    console.log('✅ Removed OTP from active display');
    
    // 3. Remove from retailer document in Firestore
    try {
      const payment = await getPaymentWithCorrectTenant(paymentId);
      if (payment && payment.retailerId) {
        const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
        if (retailerUser && retailerUser.tenantId) {
          await retailerService.removeOTPFromRetailer(payment.retailerId, retailerUser.tenantId, paymentId);
          console.log('✅ Removed OTP from retailer document');
        }
      }
    } catch (firestoreError) {
      console.error('❌ Error removing OTP from retailer document:', firestoreError);
    }
    
    // 4. Remove from dedicated OTPs collection in Firestore (if cloud function didn't already)
    try {
      const otpsQuery = query(
        collection(db, 'otps'),
        where('paymentId', '==', paymentId)
      );
      const otpsSnapshot = await getDocs(otpsQuery);
      
      if (!otpsSnapshot.empty) {
        const batch = writeBatch(db);
        otpsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Removed ${otpsSnapshot.size} OTP documents from Firestore collection`);
      }
    } catch (collectionError) {
      console.error('❌ Error removing OTP from Firestore collection:', collectionError);
    }
    
    console.log('🎉 Comprehensive OTP cleanup completed for payment:', paymentId);
    
  } catch (error) {
    console.error('❌ Error during comprehensive OTP cleanup:', error);
  }
}