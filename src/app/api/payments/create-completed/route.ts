// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RetailerAuthService } from '@/services/retailer-auth';
import { retailerService, paymentService } from '@/services/firestore';
import { callFirebaseFunction } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { sendPaymentCompletionNotificationViaCloudFunction } from '@/lib/cloud-functions';

// Type definitions for Firebase Function results
interface SMSFunctionResult {
  success: boolean;
  messageId?: string;
  phone?: string;
  status?: string;
  error?: string;
}


// Performance optimization: Simple cache for Firebase Functions
const functionCache = new Map<string, any>();

// Optimized Firebase Functions initialization
async function getHttpsCallableOptimized(functionName: string) {
  // Check cache first
  if (functionCache.has(functionName)) {
    return functionCache.get(functionName);
  }

  // Use HTTP calls directly (faster and avoids client-side issues)
  const callableFunction = async (data: any) => {
    try {
      console.log(`🌐 Calling Firebase Function via HTTP: ${functionName}`);
      const result = await callFirebaseFunction(functionName, data);
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
    // MAXIMUM PARALLELISM - Fetch Retailer, Payment, AND Line Worker simultaneously
    const promises: Promise<any>[] = [
      RetailerAuthService.getRetailerUserByRetailerId(retailerId),
      paymentService.getById(paymentId, tenantId)
    ];

    // Add Line Worker fetch to the initial batch
    if (lineWorkerId) {
      promises.push(getDoc(doc(db, 'users', lineWorkerId)));
    } else {
      promises.push(Promise.resolve(null));
    }

    const [retailerUser, payment, lineWorkerDoc] = await Promise.all(promises);

    let lineWorkerData: any = null;
    let wholesalerData: any = null;

    // Process Line Worker Data
    if (lineWorkerDoc && lineWorkerDoc.exists()) {
      lineWorkerData = lineWorkerDoc.data();

      // If we have tenantId, get wholesaler data immediately
      if (lineWorkerData?.tenantId) {
        const wholesalerDoc = await getDoc(doc(db, 'tenants', lineWorkerData.tenantId));
        if (wholesalerDoc.exists()) {
          wholesalerData = wholesalerDoc.data();
        }
      }
    }

    return {
      retailerUser,
      lineWorkerData,
      wholesalerData
    };
  } catch (error) {
    console.error('❌ Error retrieving verification data:', error);
    return { retailerUser: null, lineWorkerData: null, wholesalerData: null };
  }
}

// Optimized SMS Sending
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
  try {
    // Retailer SMS Request
    const retailerSMSRequest = {
      data: {
        retailerId: data.payment.retailerId,
        paymentId: data.payment.id,
        amount: data.payment.totalPaid,
        lineWorkerName: data.lineWorkerName,
        retailerName: data.retailerUser?.name || 'Retailer',
        retailerArea: data.retailerArea,
        wholesalerName: data.wholesalerName,
        collectionDate: data.collectionDate
      }
    };

    // Get SMS function
    const sendRetailerSMSFunction = await getHttpsCallableOptimized('sendRetailerPaymentSMS');

    console.log('📞 Sending retailer SMS notification...');
    const result = await sendRetailerSMSFunction(retailerSMSRequest);
    console.log('✅ Retailer SMS sent:', result?.data?.success ? 'Success' : 'Failed');

    return {
      retailerSMSSuccess: result?.data?.success || false,
      wholesalerSMSSuccess: false // Not sending wholesaler SMS
    };

  } catch (error) {
    console.warn('⚠️ Error sending SMS notification:', error);
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
  proofUrl?: string; // Optional URL for payment screenshot
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
      lineWorkerName,
      proofUrl
    } = body;

    console.log('💳 Creating completed payment request:', {
      retailerId,
      retailerName,
      amount: totalPaid,
      method,
      utr
    });

    if (!tenantId || !retailerId || !lineWorkerId || !totalPaid || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate: Require either UTR or Proof URL for UPI
    if (method === 'UPI' && (!utr || utr.length !== 4) && !proofUrl) {
      return NextResponse.json({ error: 'For UPI payments, provide either UTR (4 digits) or a payment screenshot' }, { status: 400 });
    }

    const completionTime = new Date();

    // 1. Create Payment (Critical Step - Must Await)
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
      },
      tenantId, // Explicitly save tenantId (singular) for easier querying/display
      ...(utr && { utr }),
      ...(proofUrl && { proofUrl }),
      ...(notes && notes.trim().length > 0 && { notes })
    };

    const paymentId = await paymentService.create(paymentData as any, tenantId);
    console.log('✅ Payment created:', paymentId);

    // 2. Fetch critical data for notifications (Must Await)
    // We need payment object and verification data to build notifications
    const [payment, verificationData] = await Promise.all([
      paymentService.getById(paymentId, tenantId),
      getVerificationDataOptimized(paymentId, retailerId, lineWorkerId, tenantId)
    ]);

    if (!payment) throw new Error('Failed to retrieve created payment');
    const { retailerUser, lineWorkerData, wholesalerData } = verificationData;

    // 3. Prepare Notification Data
    const retailerArea = (retailerUser as any)?.address || (retailerUser as any)?.area || 'Unknown Area';
    const wholesalerName = wholesalerData?.name || wholesalerData?.displayName || 'Wholesaler';
    const collectionDate = completionTime.toLocaleDateString('en-IN');
    const wholesalerTenantId = lineWorkerData?.tenantId || tenantId;

    // 4. PARALLEL EXECUTION: Retailer Update + SMS + FCMs
    // These specific operations don't need to block each other
    const parallelTasks: Promise<any>[] = [];

    // Task A: Update Retailer Data (Firestore)
    parallelTasks.push((async () => {
      try {
        await retailerService.updateForPayment(retailerId, tenantId, {
          id: paymentId,
          totalPaid,
          method,
          createdAt: Timestamp.fromDate(completionTime),
          state: 'COMPLETED'
        });
        console.log('✅ Retailer data updated');
      } catch (e) {
        console.error('❌ Failed to update retailer data', e);
      }
    })());

    // Task B: Send SMS (Retailer only)
    if (retailerUser) {
      parallelTasks.push(sendSMSNotificationsOptimized({
        payment,
        retailerUser,
        lineWorkerData,
        wholesalerData,
        lineWorkerName,
        retailerArea,
        wholesalerName,
        collectionDate
      }));
    }

    // Task C: Send Retailer FCM
    parallelTasks.push(sendPaymentCompletionNotificationViaCloudFunction({
      retailerId: payment.retailerId,
      amount: payment.totalPaid,
      paymentId: paymentId,
      recipientType: 'retailer',
      retailerName: payment.retailerName,
      lineWorkerName: payment.lineWorkerName,
      wholesalerId: wholesalerTenantId,
      title: '🎉 Payment Successful',
      body: `Congratulations - you successfully paid ₹${payment.totalPaid.toLocaleString()} to ${payment.retailerName} via Line Man ${payment.lineWorkerName}.`,
      clickAction: '/retailer/payment-history'
    }));

    // Task D: Send Wholesaler FCM
    if (wholesalerTenantId) {
      parallelTasks.push(sendPaymentCompletionNotificationViaCloudFunction({
        retailerId: wholesalerTenantId, // Wholesaler ID as recipient
        amount: payment.totalPaid,
        paymentId: paymentId,
        recipientType: 'wholesaler',
        retailerName: payment.retailerName,
        lineWorkerName: payment.lineWorkerName,
        wholesalerId: wholesalerTenantId,
        title: '💰 Collection Update',
        body: `Line Man ${payment.lineWorkerName} collected ₹${payment.totalPaid.toLocaleString()} from ${payment.retailerName} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`,
        clickAction: '/wholesaler/dashboard'
      }));
    }

    // Await all background tasks
    // Note: We await here because standard Serverless functions might kill the process early if we don't.
    // However, they run in parallel now, reducing total wait time to the slowest single operation.
    await Promise.allSettled(parallelTasks);

    const processingTime = Date.now() - startTime;
    console.log(`🚀 CREATE COMPLETED PAYMENT FINISHED in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      paymentId,
      message: 'Payment created and completed successfully',
      processingTime
    });

  } catch (error: any) {
    console.error('❌ Error creating completed payment:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create payment',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
      { status: 500 }
    );
  }
}
