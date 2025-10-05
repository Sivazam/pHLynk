/**
 * OTP Bridge Service
 * 
 * This service bridges the gap between the new secure OTP storage
 * and the existing retailer dashboard that expects the old format.
 */

import { secureOTPStorage } from './secure-otp-storage';
import { addActiveOTP, removeActiveOTP, getActiveOTPsForRetailer } from './otp-store';

export interface OTPData {
  code: string;
  retailerId: string;
  amount: number;
  expiresAt: Date;
  paymentId: string;
  lineWorkerName: string;
  createdAt: Date;
  isExpired?: boolean;
}

class OTPBridge {
  private static instance: OTPBridge;
  
  static getInstance(): OTPBridge {
    if (!OTPBridge.instance) {
      OTPBridge.instance = new OTPBridge();
    }
    return OTPBridge.instance;
  }
  
  /**
   * Fetch OTPs from secure storage and sync them to the in-memory store
   * that the retailer dashboard expects
   */
  async syncOTPsToRetailerDashboard(retailerId: string): Promise<Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
  }>> {
    try {
      console.log('🔐 Fetching OTPs from secure storage for retailer:', retailerId);
      
      // Get OTPs from secure storage
      const secureOTPs = await secureOTPStorage.getActiveOTPsForRetailer(retailerId);
      
      // Transform to match expected format
      const transformedOTPs: OTPData[] = secureOTPs.map(otp => ({
        code: otp.code,
        retailerId: retailerId,
        amount: otp.amount,
        expiresAt: otp.expiresAt,
        paymentId: otp.paymentId,
        lineWorkerName: otp.lineWorkerName,
        createdAt: otp.createdAt,
        isExpired: otp.isExpired
      }));
      
      console.log('🔐 Retrieved OTPs from secure storage:', {
        count: transformedOTPs.length,
        paymentIds: transformedOTPs.map(otp => otp.paymentId)
      });
      
      // Get current OTPs in memory store
      const currentOTPs = getActiveOTPsForRetailer(retailerId);
      const currentPaymentIds = new Set(currentOTPs.map(otp => otp.paymentId));
      
      // Add new OTPs to memory store
      const newOTPs = transformedOTPs.filter(otp => !currentPaymentIds.has(otp.paymentId));
      
      if (newOTPs.length > 0) {
        console.log('🆕 Adding new OTPs to memory store:', newOTPs.length);
        
        newOTPs.forEach(otp => {
          if (!otp.isExpired) {
            addActiveOTP({
              code: otp.code,
              retailerId: otp.retailerId,
              amount: otp.amount,
              expiresAt: otp.expiresAt,
              paymentId: otp.paymentId,
              lineWorkerName: otp.lineWorkerName,
              createdAt: otp.createdAt
            });
          }
        });
      }
      
      // Remove expired OTPs from memory store
      const expiredPaymentIds = transformedOTPs
        .filter(otp => otp.isExpired)
        .map(otp => otp.paymentId);
      
      if (expiredPaymentIds.length > 0) {
        console.log('🗑️ Removing expired OTPs from memory store:', expiredPaymentIds.length);
        expiredPaymentIds.forEach(paymentId => {
          removeActiveOTP(paymentId);
        });
      }
      
      // Return fresh list from memory store
      return getActiveOTPsForRetailer(retailerId);
      
    } catch (error) {
      console.error('❌ Error syncing OTPs from secure storage:', error);
      return [];
    }
  }
  
  /**
   * Get current active OTPs for retailer (from memory store)
   */
  getActiveOTPs(retailerId: string): Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
  }> {
    return getActiveOTPsForRetailer(retailerId);
  }
  
  /**
   * Remove OTP from memory store (called after verification)
   */
  removeOTP(paymentId: string): void {
    removeActiveOTP(paymentId);
  }
}

export const otpBridge = OTPBridge.getInstance();