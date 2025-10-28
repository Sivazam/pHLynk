// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { secureOTPStorage } from '@/lib/secure-otp-storage';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';
import { fast2SMSService, Fast2SMSService } from '@/services/fast2sms-service';
import { Retailer } from '@/types';
import { secureLogger } from '@/lib/secure-logger';
import { callFirebaseFunction } from '@/lib/firebase';

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

// Performance optimization: Simple cache for Firebase Functions
const functionCache = new Map<string, any>();
let functionsInitialized = false;

// Performance optimization: Simple cache for frequently accessed data
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCachedData(key: string, ttl = 60000): any {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any, ttl = 60000): void {
  dataCache.set(key, { data, timestamp: Date.now(), ttl });
}

// Optimized Firebase Functions initialization
async function getHttpsCallableOptimized(functionName: string) {
  // Check cache first
  if (functionCache.has(functionName)) {
    console.log(`🚀 Using cached Firebase Function: ${functionName}`);
    return functionCache.get(functionName);
  }

  // Use HTTP calls directly (faster and avoids client-side issues)
  console.log(`🖥️ Using optimized HTTP calls for ${functionName}`);
  const callableFunction = async (data: any) => {
    try {
      console.log(`🌐 Calling Firebase Function via HTTP: ${functionName}`);
      const result = await callFirebaseFunction(functionName, data);
      console.log(`✅ Firebase Function ${functionName} called successfully`);
      return { data: result };
    } catch (error) {
      console.error(`❌ HTTP call to ${functionName} failed:`, error);
      throw error;
    }
  };
  
  // Cache the function
  functionCache.set(functionName, callableFunction);
  return callableFunction;
}

// Optimized payment retrieval - SINGLE QUERY ONLY
async function getPaymentOptimized(paymentId: string) {
  console.log('🚀 getPaymentOptimized called for paymentId:', paymentId);
  
  // Check cache first
  const cacheKey = `payment_${paymentId}`;
  const cachedPayment = getCachedData(cacheKey, 30000); // 30 seconds cache
  if (cachedPayment) {
    console.log('✅ Payment found in cache');
    return cachedPayment;
  }
  
  try {
    // Single direct document access - NO MULTIPLE QUERIES
    const paymentRef = doc(db, 'payments', paymentId);
    const paymentDoc = await getDoc(paymentRef);
    
    if (paymentDoc.exists()) {
      const paymentData = {
        id: paymentDoc.id,
        ...paymentDoc.data()
      };
      
      // Cache the result
      setCachedData(cacheKey, paymentData, 30000);
      console.log('✅ Payment retrieved and cached');
      return paymentData;
    } else {
      console.log('❌ Payment not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving payment:', error);
    return null;
  }
}

// Optimized data fetching with MAXIMUM PARALLEL PROCESSING
async function getVerificationDataOptimized(paymentId: string, retailerId: string) {
  console.log('🚀 getVerificationDataOptimized called');
  
  // Check cache first
  const cacheKey = `verification_${paymentId}_${retailerId}`;
  const cachedData = getCachedData(cacheKey, 20000); // 20 seconds cache
  if (cachedData) {
    console.log('✅ Verification data found in cache');
    return cachedData;
  }
  
  try {
    // MAXIMUM PARALLELISM - All queries run simultaneously
    const promises = [
      // Get retailer user
      RetailerAuthService.getRetailerUserByRetailerId(retailerId),
      // Get payment
      getPaymentOptimized(paymentId)
    ];
    
    const [retailerUser, payment] = await Promise.all(promises);
    
    let lineWorkerData: any = null;
    let wholesalerData: any = null;
    
    // If we have line worker ID, get line worker and wholesaler data in parallel
    if (payment?.lineWorkerId) {
      const lineWorkerPromise = getDoc(doc(db, 'users', payment.lineWorkerId));
      
      // Start line worker query immediately
      lineWorkerPromise.then(lineWorkerDoc => {
        if (lineWorkerDoc.exists()) {
          const data = lineWorkerDoc.data();
          if (data) {
            lineWorkerData = data;
            
            // If we have tenantId, cache line worker data
            if (data.tenantId) {
              setCachedData(`line_worker_${payment.lineWorkerId}`, data, 300000); // 5 minutes
            }
          }
        }
      });
      
      const lineWorkerDoc = await lineWorkerPromise;
      
      if (lineWorkerDoc.exists()) {
        const data = lineWorkerDoc.data();
        if (data) {
          lineWorkerData = data;
          
          // Get wholesaler data IMMEDIATELY if we have tenantId
          if (lineWorkerData.tenantId) {
            const wholesalerPromise = getDoc(doc(db, 'tenants', lineWorkerData.tenantId));
            
            wholesalerPromise.then(wholesalerDoc => {
              if (wholesalerDoc.exists()) {
                const data = wholesalerDoc.data();
                if (data) {
                  wholesalerData = data;
                  
                  // Cache wholesaler data
                  setCachedData(`wholesaler_${lineWorkerData.tenantId}`, data, 300000); // 5 minutes
                }
              }
            });
            
            const wholesalerDoc = await wholesalerPromise;
            if (wholesalerDoc.exists()) {
              const data = wholesalerDoc.data();
              if (data) {
                wholesalerData = data;
              }
            }
          }
        }
      }
    }
    
    const result = {
      retailerUser,
      lineWorkerData,
      wholesalerData
    };
    
    // Cache the result
    setCachedData(cacheKey, result, 20000);
    console.log('✅ Verification data retrieved and cached');
    
    return result;
  } catch (error) {
    console.error('❌ Error retrieving verification data:', error);
    return { retailerUser: null, lineWorkerData: null, wholesalerData: null };
  }
}

// MAXIMUM PARALLEL SMS SENDING
async function sendSMSNotificationsOptimized(data: {
  payment: any;
  retailerUser: any;
  lineWorkerData: any;
  wholesalerData: any;
  lineWorkerName: string;
  retailerArea: string;
  wholesalerName: string;
  collectionDate: string;
}) {
  console.log('🚀 sendSMSNotificationsOptimized called');
  
  try {
    // Prepare both SMS requests IMMEDIATELY
    const retailerSMSRequest = {
      data: {
        retailerId: data.payment.retailerId,
        paymentId: data.payment.id,
        amount: data.payment.totalPaid,
        lineWorkerName: data.lineWorkerName,
        retailerName: data.retailerUser.name || 'Retailer',
        retailerArea: data.retailerArea,
        wholesalerName: data.wholesalerName,
        collectionDate: data.collectionDate
      }
    };
    
    const wholesalerSMSRequest = {
      data: {
        retailerId: data.payment.retailerId,
        paymentId: data.payment.id,
        amount: data.payment.totalPaid,
        lineWorkerName: data.lineWorkerName,
        lineWorkerId: data.payment.lineWorkerId,
        retailerName: data.retailerUser.name || 'Retailer',
        retailerArea: data.retailerArea,
        wholesalerName: data.wholesalerName,
        collectionDate: data.collectionDate
      }
    };
    
    // Get both functions in PARALLEL
    const functionPromises = [
      getHttpsCallableOptimized('sendRetailerPaymentSMS'),
      getHttpsCallableOptimized('sendWholesalerPaymentSMS')
    ];
    
    const [sendRetailerSMSFunction, sendWholesalerSMSFunction] = await Promise.all(functionPromises);
    
    console.log('📞 Sending both SMS notifications in MAXIMUM PARALLEL...');
    
    // Send both SMS in PARALLEL - NO WAITING
    const smsPromises = [
      sendRetailerSMSFunction(retailerSMSRequest),
      sendWholesalerSMSFunction(wholesalerSMSRequest)
    ];
    
    const results = await Promise.allSettled(smsPromises);
    
    const retailerResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const wholesalerResult = results[1].status === 'fulfilled' ? results[1].value : null;
    
    console.log('📱 PARALLEL SMS Results:');
    console.log('  Retailer SMS:', retailerResult?.data?.success ? '✅ Sent' : '❌ Failed');
    console.log('  Wholesaler SMS:', wholesalerResult?.data?.success ? '✅ Sent' : '❌ Failed');
    
    return {
      retailerSMSSuccess: retailerResult?.data?.success || false,
      wholesalerSMSSuccess: wholesalerResult?.data?.success || false,
      retailerResult,
      wholesalerResult
    };
    
  } catch (error) {
    console.error('❌ Error sending parallel SMS notifications:', error);
    return {
      retailerSMSSuccess: false,
      wholesalerSMSSuccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

interface OTPVerifyRequest {
  paymentId: string;
  otp: string;
  purpose?: 'PAYMENT' | 'RETAILER_VERIFICATION'; // Add purpose field
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 ULTRA-OPTIMIZED OTP VERIFICATION STARTED');
  
  try {
    const body: OTPVerifyRequest = await request.json();
    const { paymentId, otp, purpose = 'PAYMENT' } = body;

    console.log('🔍 OTP VERIFICATION REQUEST:');
    console.log('Payment ID:', paymentId);
    console.log('OTP Code:', otp);
    console.log('Purpose:', purpose);

    if (!paymentId || !otp) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean up expired OTPs
    await secureOTPStorage.cleanupExpiredOTPs();

    // Verify OTP using secure storage
    const otpVerification = await secureOTPStorage.verifyOTP(paymentId, otp);
    
    if (!otpVerification.valid) {
      console.log('❌ OTP verification failed:', otpVerification.error);
      return NextResponse.json(
        { 
          error: otpVerification.error || 'OTP verification failed',
          remainingAttempts: otpVerification.otp ? Math.max(0, 3 - otpVerification.otp.attempts) : 0
        },
        { status: 400 }
      );
    }
    
    console.log('✅ OTP verified successfully!');
    
    // For retailer verification, just return success without payment processing
    if (purpose === 'RETAILER_VERIFICATION') {
      console.log('🔐 Retailer verification completed');
      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully',
        purpose: 'RETAILER_VERIFICATION',
        verifiedAt: new Date().toISOString()
      });
    }
    
    // For payment, continue with existing payment processing logic
    console.log('💳 Processing payment verification');
    
    // Record successful verification
    const verificationTime = new Date();
    
    // Get payment and verification data in MAXIMUM PARALLEL
    const promises = [
      getPaymentOptimized(paymentId),
      getVerificationDataOptimized(paymentId, (await getPaymentOptimized(paymentId))?.retailerId || '')
    ];
    
    const [payment, verificationData] = await Promise.all(promises);
    
    if (!payment) {
      console.log('❌ Payment not found');
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

      const { retailerUser, lineWorkerData, wholesalerData } = verificationData;
      
      if (!retailerUser) {
        console.log('❌ Retailer user not found');
        return NextResponse.json(
          { error: 'Retailer user not found' },
          { status: 404 }
        );
      }

      // Update payment status
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        state: 'COMPLETED',
        verifiedAt: verificationTime,
        verificationMethod: 'OTP',
        'timeline.completedAt': Timestamp.fromDate(verificationTime),
        updatedAt: new Date()
      });

    // Clean up OTP - OTP is already marked as used by secureOTPStorage.verifyOTP


    // Prepare data for SMS
    const lineWorkerName = lineWorkerData?.displayName || lineWorkerData?.name || 'Line Worker';
    const retailerArea = retailerUser.address || retailerUser.area || 'Unknown Area';
    const wholesalerName = wholesalerData?.name || wholesalerData?.displayName || 'Wholesaler';
    const collectionDate = verificationTime.toLocaleDateString('en-IN');

    console.log('📱 Sending SMS notifications (ULTRA-OPTIMIZED PARALLEL)...');
      
      // Send SMS notifications in MAXIMUM PARALLEL
      const smsResults = await sendSMSNotificationsOptimized({
        payment,
        retailerUser,
        lineWorkerData,
        wholesalerData,
        lineWorkerName,
        retailerArea,
        wholesalerName,
        collectionDate
      });

      // Send FCM notification for payment completion
      try {
        console.log('📱 Sending FCM payment completion notification...');
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const fcmUrl = `${baseUrl}/api/fcm/send-payment-completion`;
        
        console.log('🔗 FCM URL:', fcmUrl);
        console.log('📤 FCM Request data:', {
          retailerId: payment.retailerId,
          amount: payment.totalPaid,
          paymentId: paymentId,
          retailerName: payment.retailerName,
          lineWorkerName: payment.lineWorkerName,
          wholesalerId: payment.tenantId
        });
        
        const fcmResponse = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId: payment.retailerId,
            amount: payment.totalPaid,
            paymentId: paymentId,
            retailerName: payment.retailerName,
            lineWorkerName: payment.lineWorkerName,
            wholesalerId: payment.tenantId
          })
        });

        console.log('📡 FCM Response status:', fcmResponse.status);
        console.log('📡 FCM Response ok:', fcmResponse.ok);

        if (fcmResponse.ok) {
          const fcmResult = await fcmResponse.json();
          console.log('✅ FCM payment completion notification sent successfully:', fcmResult);
        } else {
          const errorText = await fcmResponse.text();
          console.warn('⚠️ FCM payment completion notification failed:', {
            status: fcmResponse.status,
            statusText: fcmResponse.statusText,
            errorText: errorText
          });
        }
      } catch (fcmError) {
        console.warn('⚠️ Error sending FCM payment completion notification:', {
          error: fcmError instanceof Error ? fcmError.message : 'Unknown error',
          stack: fcmError instanceof Error ? fcmError.stack : undefined
        });
        // Don't fail the request if FCM fails
      }

      // PWA notifications are now handled by FCM - no need for duplicate local notifications
      console.log('📱 FCM payment completion notification sent - skipping local PWA notification to avoid duplicates');

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`🚀 ULTRA-OPTIMIZED OTP VERIFICATION COMPLETED in ${processingTime}ms`);
      console.log('📊 SMS Results:', {
        retailer: smsResults.retailerSMSSuccess ? '✅ Sent' : '❌ Failed',
        wholesaler: smsResults.wholesalerSMSSuccess ? '✅ Sent' : '❌ Failed'
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId,
        amount: payment.totalPaid,
        retailerName: retailerUser.name,
        verifiedAt: verificationTime,
        smsNotifications: smsResults,
        processingTime
      });

  } catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.error('❌ OTP verification error:', error);
    console.error(`Processing time: ${processingTime}ms`);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      },
      { status: 500 }
    );
  }
}