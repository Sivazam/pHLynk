// Payment Service with Local OTP Generation and Cloud SMS Notifications
import { db } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { localOTPService, OTPGenerationResult, OTPVerificationResult } from './local-otp-service';
import { fast2SMSService } from './fast2sms-service';

interface PaymentData {
  retailerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  notes?: string;
  lineWorkerName?: string;
}

interface RetailerData {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  areaId?: string;
}

interface WholesalerData {
  id: string;
  name: string;
  phone?: string;
}

export class PaymentService {
  // Get retailer data
  private async getRetailerData(retailerId: string): Promise<RetailerData | null> {
    try {
      const retailerDoc = await db.retailer.findUnique({
        where: { id: retailerId },
        include: {
          area: true
        }
      });

      if (!retailerDoc) return null;

      return {
        id: retailerDoc.id,
        name: retailerDoc.name,
        phone: retailerDoc.phone || undefined,
        address: retailerDoc.address || undefined,
        areaId: retailerDoc.areaId || undefined
      };
    } catch (error) {
      console.error('Error fetching retailer data:', error);
      return null;
    }
  }

  // Get wholesaler data
  private async getWholesalerData(): Promise<WholesalerData | null> {
    try {
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      // Get user data from Firestore to find wholesaler
      // This is a simplified approach - adjust based on your user structure
      const userDoc = await db.user.findFirst({
        where: {
          OR: [
            { firebaseUid: currentUser.uid },
            { email: currentUser.email }
          ],
          roles: {
            has: 'WHOLESALER_ADMIN'
          }
        }
      });

      if (!userDoc) return null;

      return {
        id: userDoc.id,
        name: userDoc.name || userDoc.email || 'Wholesaler',
        phone: userDoc.phone || undefined
      };
    } catch (error) {
      console.error('Error fetching wholesaler data:', error);
      return null;
    }
  }

  // Get line worker name
  private async getLineWorkerName(): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return 'Line Worker';

      const userDoc = await db.user.findFirst({
        where: {
          OR: [
            { firebaseUid: currentUser.uid },
            { email: currentUser.email }
          ]
        }
      });

      return userDoc?.name || userDoc?.email || 'Line Worker';
    } catch (error) {
      console.error('Error fetching line worker name:', error);
      return 'Line Worker';
    }
  }

  // Create payment record
  private async createPaymentRecord(paymentData: PaymentData, otpId: string): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const payment = await db.payment.create({
        data: {
          retailerId: paymentData.retailerId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
          state: 'OTP_SENT',
          lineWorkerId: currentUser.uid,
          otpId: otpId,
          timeline: {
            otpSentAt: new Date(),
            initiatedAt: new Date()
          }
        }
      });

      return payment.id;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  }

  // Generate OTP locally and create payment
  async initiatePayment(paymentData: PaymentData): Promise<{
    success: boolean;
    paymentId?: string;
    otpCode?: string;
    error?: string;
  }> {
    try {
      console.log('💳 PAYMENT SERVICE - Initiating payment:', paymentData);

      // Get required data
      const retailerData = await this.getRetailerData(paymentData.retailerId);
      if (!retailerData) {
        throw new Error('Retailer not found');
      }

      const lineWorkerName = await this.getLineWorkerName();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate OTP locally
      const otpResult: OTPGenerationResult = await localOTPService.generateOTP(
        'temp_payment_id', // Will be replaced with actual payment ID
        paymentData.retailerId,
        retailerData.id, // retailer user ID
        retailerData.phone || '',
        retailerData.name,
        paymentData.amount,
        lineWorkerName,
        currentUser.uid
      );

      if (!otpResult.success || !otpResult.otpId) {
        throw new Error(otpResult.error || 'Failed to generate OTP');
      }

      // Create payment record
      const paymentId = await this.createPaymentRecord(paymentData, otpResult.otpId);

      // Update OTP with actual payment ID
      // Note: You might need to modify the local OTP service to support updating payment ID
      // For now, we'll work with the generated OTP

      console.log('✅ PAYMENT SERVICE - Payment initiated successfully:', {
        paymentId,
        otpId: otpResult.otpId,
        otpCode: otpResult.code
      });

      return {
        success: true,
        paymentId,
        otpCode: otpResult.code
      };

    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error initiating payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Verify OTP locally and complete payment
  async verifyPaymentOTP(paymentId: string, otp: string): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
  }> {
    try {
      console.log('🔐 PAYMENT SERVICE - Verifying OTP for payment:', paymentId);

      // Get payment data
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          retailer: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Verify OTP locally
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const otpResult: OTPVerificationResult = await localOTPService.verifyOTP(
        paymentId,
        otp,
        currentUser.uid
      );

      if (!otpResult.success || !otpResult.verified) {
        return {
          success: false,
          verified: false,
          error: otpResult.message
        };
      }

      // Update payment status to completed
      await db.payment.update({
        where: { id: paymentId },
        data: {
          state: 'COMPLETED',
          timeline: {
            completedAt: new Date(),
            verifiedAt: new Date()
          }
        }
      });

      console.log('✅ PAYMENT SERVICE - OTP verified successfully, payment completed');

      return {
        success: true,
        verified: true
      };

    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error verifying OTP:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send SMS notifications using cloud functions
  async sendPaymentNotifications(paymentId: string): Promise<{
    retailerSMS: { success: boolean; message?: string; error?: string };
    wholesalerSMS: { success: boolean; message?: string; error?: string };
  }> {
    try {
      console.log('📤 PAYMENT SERVICE - Sending SMS notifications for payment:', paymentId);

      // Get payment data with related information
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          retailer: {
            include: {
              area: true
            }
          },
          lineWorker: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get wholesaler data
      const wholesalerData = await this.getWholesalerData();
      if (!wholesalerData) {
        throw new Error('Wholesaler data not found');
      }

      // Format collection date
      const collectionDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });

      // Prepare notification data
      const notificationData = {
        retailerId: payment.retailerId,
        paymentId: payment.id,
        amount: payment.amount,
        lineWorkerName: payment.lineWorker?.name || 'Line Worker',
        retailerName: payment.retailer.name,
        retailerArea: payment.retailer.area?.name || payment.retailer.address || 'Unknown Area',
        wholesalerName: wholesalerData.name,
        collectionDate
      };

      // Try to use cloud functions first, fallback to Fast2SMS service
      let retailerSMS = { success: false, message: '', error: '' };
      let wholesalerSMS = { success: false, message: '', error: '' };

      try {
        // Try cloud functions for retailer SMS
        if (functions) {
          const sendRetailerSMS = httpsCallable(functions, 'sendRetailerPaymentSMS');
          const retailerResult = await sendRetailerSMS(notificationData);
          
          retailerSMS = {
            success: retailerResult.data.success,
            message: retailerResult.data.message,
            error: retailerResult.data.error
          };
        }
      } catch (error) {
        console.log('⚠️ Cloud function not available, using Fast2SMS service directly');
        // Fallback to direct Fast2SMS service
        retailerSMS = await this.sendDirectSMS('retailer', notificationData);
      }

      try {
        // Try cloud functions for wholesaler SMS
        if (functions) {
          const sendWholesalerSMS = httpsCallable(functions, 'sendWholesalerPaymentSMS');
          const wholesalerResult = await sendWholesalerSMS(notificationData);
          
          wholesalerSMS = {
            success: wholesalerResult.data.success,
            message: wholesalerResult.data.message,
            error: wholesalerResult.data.error
          };
        }
      } catch (error) {
        console.log('⚠️ Cloud function not available, using Fast2SMS service directly');
        // Fallback to direct Fast2SMS service
        wholesalerSMS = await this.sendDirectSMS('wholesaler', notificationData);
      }

      console.log('📤 PAYMENT SERVICE - SMS notifications sent:', {
        retailerSMS,
        wholesalerSMS
      });

      return { retailerSMS, wholesalerSMS };

    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error sending SMS notifications:', error);
      return {
        retailerSMS: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        wholesalerSMS: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Direct SMS using Fast2SMS service (fallback)
  private async sendDirectSMS(
    recipient: 'retailer' | 'wholesaler',
    data: any
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get retailer phone number
      const retailer = await db.retailer.findUnique({
        where: { id: data.retailerId }
      });

      if (!retailer || !retailer.phone) {
        return { success: false, error: 'Retailer phone number not found' };
      }

      const phoneNumber = retailer.phone;
      const templateType = recipient === 'retailer' ? 'retailer' : 'wholesaler';

      const result = await fast2SMSService.sendPaymentConfirmationSMS(
        phoneNumber,
        templateType,
        {
          amount: data.amount.toString(),
          lineWorkerName: data.lineWorkerName,
          retailerName: data.retailerName,
          retailerArea: data.retailerArea,
          wholesalerName: data.wholesalerName,
          collectionDate: data.collectionDate
        }
      );

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };

    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error sending direct SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const payment = await db.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      return {
        success: true,
        status: payment.state
      };

    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error getting payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get active OTPs for retailer
  async getRetailerActiveOTPs(retailerId: string): Promise<any[]> {
    try {
      return localOTPService.getActiveOTPs(retailerId);
    } catch (error) {
      console.error('❌ PAYMENT SERVICE - Error getting active OTPs:', error);
      return [];
    }
  }

  // Get OTP service statistics
  getOTPStats() {
    return localOTPService.getStats();
  }
}

// Export singleton instance
export const paymentService = new PaymentService();