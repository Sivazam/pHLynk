// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';
import { callFirebaseFunction } from '@/lib/firebase';
import { logger } from '@/lib/logger';

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

// Optimized data fetching with MAXIMUM PARALLEL PROCESSING
async function getVerificationDataOptimized(paymentId: string, retailerId: string, lineWorkerId: string, tenantId: string) {
  console.log('🚀 getVerificationDataOptimized called');

  try {
    // MAXIMUM PARALLELISM - All queries run simultaneously
    const promises = [
      // Get retailer user
      RetailerAuthService.getRetailerUserByRetailerId(retailerId),
      // Get payment
      paymentService.getById(paymentId, tenantId)
    ];

    const [retailerUser, payment] = await Promise.all(promises);

    let lineWorkerData: any = null;
    let wholesalerData: any = null;

    // If we have line worker ID, get line worker and wholesaler data in parallel
    if (lineWorkerId) {
      const lineWorkerPromise = getDoc(doc(db, 'users', lineWorkerId));

      const lineWorkerDoc = await lineWorkerPromise;

      if (lineWorkerDoc.exists()) {
        const data = lineWorkerDoc.data();
        if (data) {
          lineWorkerData = data;

          // Get wholesaler data IMMEDIATELY if we have tenantId
          if (data.tenantId) {
            const wholesalerPromise = getDoc(doc(db, 'tenants', data.tenantId));

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

    console.log('✅ Verification data retrieved');

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

    // Prepare retailer SMS request only (wholesaler SMS removed - FCM used instead)
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

    // Get retailer SMS function only (wholesaler SMS removed - FCM used instead)
    const sendRetailerSMSFunction = await getHttpsCallableOptimized('sendRetailerPaymentSMS');

    console.log('📞 Sending retailer SMS notification (wholesaler uses FCM)...');

    // Send retailer SMS only (wholesaler removed - FCM used instead)
    const smsPromises = [
      sendRetailerSMSFunction(retailerSMSRequest)
    ];

    const results = await Promise.allSettled(smsPromises);

    const retailerResult = results[0].status === 'fulfilled' ? results[0].value : null;

    console.log('📱 SMS Results:');
    console.log('  Retailer SMS:', retailerResult?.data?.success ? '✅ Sent' : '❌ Failed');

    return {
      retailerSMSSuccess: retailerResult?.data?.success || false,
      wholesalerSMSSuccess: false, // FCM used instead
      retailerResult,
      wholesalerResult: null
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

interface CreateCompletedPaymentRequest {
  tenantId: string;
  retailerId: string;
  retailerName: string;
  lineWorkerId: string;
  totalPaid: number;
  method: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  utr?: string;
  notes?: string;
  lineWorkerName: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 CREATE COMPLETED PAYMENT STARTED');

  try {
    const body: CreateCompletedPaymentRequest = await request.json();
    const {
      tenantId,
      retailerId,
      retailerName,
      lineWorkerId,
      totalPaid,
      method,
      utr,
      notes,
      lineWorkerName
    } = body;

    console.log('💳 Creating completed payment request:', {
      retailerId,
      retailerName,
      amount: totalPaid,
      method,
      utr
    });

    if (!tenantId || !retailerId || !lineWorkerId || !totalPaid || !method) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate UTR for UPI payments
    if (method === 'UPI' && (!utr || utr.length !== 4)) {
      console.log('❌ Invalid UTR for UPI payment');
      return NextResponse.json(
        { error: 'UTR must be exactly 4 digits for UPI payments' },
        { status: 400 }
      );
    }

    const completionTime = new Date();

    // Create payment in COMPLETED state
    console.log('💳 Creating payment in COMPLETED state...');

    // Build payment data - only include fields that have values
    const paymentData: any = {
      retailerId,
      retailerName,
      lineWorkerId,
      lineWorkerName,
      totalPaid,
      method,
      state: 'COMPLETED',
      verificationMethod: 'DIRECT',
      evidence: [],
      timeline: {
        initiatedAt: Timestamp.fromDate(completionTime),
        completedAt: Timestamp.fromDate(completionTime)
      }
    };

    // Only add optional fields if they have values
    if (utr && utr.length === 4) {
      paymentData.utr = utr;
    }

    if (notes && notes.trim().length > 0) {
      paymentData.notes = notes;
    }

    const paymentId = await paymentService.create(paymentData as any, tenantId);
    console.log('✅ Payment created:', paymentId);

    // Get the created payment
    const payment = await paymentService.getById(paymentId, tenantId);
    if (!payment) {
      console.log('❌ Failed to retrieve created payment');
      return NextResponse.json(
        { error: 'Failed to retrieve created payment' },
        { status: 500 }
      );
    }

    // Update retailer computed fields
    try {
      await retailerService.updateForPayment(retailerId, tenantId, {
        id: paymentId,
        totalPaid,
        method,
        createdAt: Timestamp.fromDate(completionTime),
        state: 'COMPLETED'
      });
      console.log('✅ Retailer data updated');
    } catch (error) {
      logger.error('Error updating retailer data', error, { context: 'CreateCompletedPayment' });
      // Don't fail - continue with SMS/FCM sending
    }

    // Get verification data for SMS/FCM
    const verificationData = await getVerificationDataOptimized(paymentId, retailerId, lineWorkerId, tenantId);
    const { retailerUser, lineWorkerData, wholesalerData } = verificationData;

    if (!retailerUser) {
      console.log('❌ Retailer user not found');
      // Payment is already created, so don't fail
      // Just return success with warning
      return NextResponse.json({
        success: true,
        paymentId,
        message: 'Payment created successfully (SMS sending failed - retailer not found)',
        retailerSMSSuccess: false,
        wholesalerSMSSuccess: false
      });
    }

    // Prepare data for SMS
    const retailerArea = (retailerUser as any)?.address || (retailerUser as any)?.area || 'Unknown Area';
    const wholesalerName = wholesalerData?.name || wholesalerData?.displayName || 'Wholesaler';
    const collectionDate = completionTime.toLocaleDateString('en-IN');

    // Get the correct wholesaler tenant ID from line worker data
    // CRITICAL: Don't use payment.tenantId (which is retailer's tenant), use line worker's tenant!
    const wholesalerTenantId = lineWorkerData?.tenantId || tenantId;
    console.log('📋 Wholesaler tenant IDs:', {
      'payment.tenantId (retailer\'s)': payment.tenantId,
      'lineWorker.tenantId (correct)': wholesalerTenantId,
      'wholesaler.name': wholesalerName
    });

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
      console.log('📱 Starting FCM notification process...');
      console.log('📞 Sending retailer SMS notification (wholesaler uses FCM)...');

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const fcmUrl = `${baseUrl}/api/fcm/send-payment-completion`;

      console.log('🔗 FCM URL:', fcmUrl);
      console.log('📦 FCM Request body:', JSON.stringify({
        retailerId: payment.retailerId,
        amount: payment.totalPaid,
        paymentId: paymentId,
        retailerName: payment.retailerName,
        lineWorkerName: payment.lineWorkerName,
        wholesalerId: wholesalerTenantId // Use correct wholesaler tenant ID from line worker data
      }));

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

      console.log('📊 FCM Response status:', fcmResponse.status);
      console.log('📊 FCM Response ok:', fcmResponse.ok);

      if (fcmResponse.ok) {
        const fcmResult = await fcmResponse.json();
        console.log('✅ FCM payment completion notification sent successfully:', fcmResult);
      } else {
        const errorText = await fcmResponse.text();
        console.warn('⚠️ FCM payment completion notification failed:', {
          status: fcmResponse.status,
          statusText: fcmResponse.statusText,
          errorText
        });
      }
    } catch (fcmError) {
      console.error('❌ Error sending FCM payment completion notification:', fcmError);
      console.error('Stack trace:', fcmError instanceof Error ? fcmError.stack : 'Unknown');
      // Don't fail the request if FCM fails
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`🚀 CREATE COMPLETED PAYMENT COMPLETED in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      paymentId,
      message: 'Payment created and completed successfully',
      retailerSMSSuccess: smsResults.retailerSMSSuccess,
      wholesalerSMSSuccess: smsResults.wholesalerSMSSuccess
    });

  } catch (error: any) {
    console.error('❌ Error creating completed payment:', error);
    logger.error('Error creating completed payment', error, { context: 'CreateCompletedPayment' });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create payment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
