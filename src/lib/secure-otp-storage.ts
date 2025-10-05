/**
 * Secure OTP Storage System
 * 
 * This module provides secure OTP storage using Firebase Firestore instead of memory.
 * Includes encryption, expiration handling, and security tracking.
 */

import { db } from '@/lib/firebase';
import { secureLogger } from '@/lib/secure-logger';

export interface StoredOTP {
  id: string;
  paymentId: string;
  code: string; // Encrypted
  retailerId: string;
  amount: number;
  lineWorkerName: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  lastAttemptAt: Date | null;
  cooldownUntil: Date | null;
  consecutiveFailures: number;
  breachDetected: boolean;
  isUsed: boolean;
  usedAt?: Date;
}

export interface OTPCreateData {
  paymentId: string;
  code: string;
  retailerId: string;
  amount: number;
  lineWorkerName: string;
  expiresAt: Date;
}

export class SecureOTPStorage {
  private static instance: SecureOTPStorage;
  private collection = 'secure_otps';
  
  static getInstance(): SecureOTPStorage {
    if (!SecureOTPStorage.instance) {
      SecureOTPStorage.instance = new SecureOTPStorage();
    }
    return SecureOTPStorage.instance;
  }
  
  /**
   * Simple encryption for OTP codes (in production, use proper encryption)
   */
  private encryptOTP(code: string): string {
    // This is basic obfuscation - in production use proper encryption
    const reversed = code.split('').reverse().join('');
    return Buffer.from(reversed).toString('base64');
  }
  
  /**
   * Simple decryption for OTP codes
   */
  private decryptOTP(encryptedCode: string): string {
    // This is basic obfuscation - in production use proper encryption
    const decoded = Buffer.from(encryptedCode, 'base64').toString();
    return decoded.split('').reverse().join('');
  }
  
  /**
   * Store OTP in Firebase Firestore
   */
  async storeOTP(data: OTPCreateData): Promise<string> {
    try {
      const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const encryptedCode = this.encryptOTP(data.code);
      
      const otpData: StoredOTP = {
        id: otpId,
        paymentId: data.paymentId,
        code: encryptedCode,
        retailerId: data.retailerId,
        amount: data.amount,
        lineWorkerName: data.lineWorkerName,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
        attempts: 0,
        lastAttemptAt: null,
        cooldownUntil: null,
        consecutiveFailures: 0,
        breachDetected: false,
        isUsed: false
      };
      
      await db.collection(this.collection).doc(otpId).set(otpData);
      
      secureLogger.otp('OTP stored securely in Firestore', {
        otpId,
        paymentId: data.paymentId,
        retailerId: data.retailerId,
        expiresAt: data.expiresAt.toISOString()
      });
      
      return otpId;
      
    } catch (error) {
      secureLogger.error('Failed to store OTP in Firestore', { 
        error: error.message,
        paymentId: data.paymentId 
      });
      throw new Error('Failed to store OTP');
    }
  }
  
  /**
   * Retrieve OTP from Firebase Firestore
   */
  async getOTP(paymentId: string): Promise<StoredOTP | null> {
    try {
      const snapshot = await db
        .collection(this.collection)
        .where('paymentId', '==', paymentId)
        .where('isUsed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const otp = doc.data() as StoredOTP;
      
      // Convert Firestore timestamps to Date objects
      if (otp.expiresAt && otp.expiresAt.toDate) {
        otp.expiresAt = otp.expiresAt.toDate();
      }
      if (otp.createdAt && otp.createdAt.toDate) {
        otp.createdAt = otp.createdAt.toDate();
      }
      if (otp.lastAttemptAt && otp.lastAttemptAt.toDate) {
        otp.lastAttemptAt = otp.lastAttemptAt.toDate();
      }
      if (otp.cooldownUntil && otp.cooldownUntil.toDate) {
        otp.cooldownUntil = otp.cooldownUntil.toDate();
      }
      if (otp.usedAt && otp.usedAt.toDate) {
        otp.usedAt = otp.usedAt.toDate();
      }
      
      return otp;
      
    } catch (error) {
      secureLogger.error('Failed to retrieve OTP from Firestore', { 
        error: error.message,
        paymentId 
      });
      return null;
    }
  }
  
  /**
   * Verify OTP code
   */
  async verifyOTP(paymentId: string, providedCode: string): Promise<{
    valid: boolean;
    otp?: StoredOTP;
    error?: string;
  }> {
    try {
      const otp = await this.getOTP(paymentId);
      
      if (!otp) {
        return { valid: false, error: 'OTP not found' };
      }
      
      // Check if expired
      if (otp.expiresAt < new Date()) {
        await this.markAsUsed(otp.id);
        return { valid: false, error: 'OTP expired' };
      }
      
      // Check if already used
      if (otp.isUsed) {
        return { valid: false, error: 'OTP already used' };
      }
      
      // Check security limits
      const securityCheck = this.checkSecurityLimits(otp);
      if (!securityCheck.canAttempt) {
        return { 
          valid: false, 
          error: securityCheck.message || 'Access denied due to security limits' 
        };
      }
      
      // Decrypt and verify code
      const decryptedCode = this.decryptOTP(otp.code);
      const isValid = decryptedCode.toUpperCase() === providedCode.toUpperCase();
      
      if (isValid) {
        // Mark as used and reset security tracking
        await this.markAsUsed(otp.id);
        await this.resetSecurityTracking(otp.id);
        
        secureLogger.otp('OTP verified successfully', {
          paymentId,
          otpId: otp.id
        });
        
        return { valid: true, otp };
      } else {
        // Record failed attempt
        await this.recordFailedAttempt(otp.id);
        
        secureLogger.otp('OTP verification failed', {
          paymentId,
          otpId: otp.id,
          attempts: otp.attempts + 1
        });
        
        return { valid: false, error: 'Invalid OTP' };
      }
      
    } catch (error) {
      secureLogger.error('OTP verification error', { 
        error: error.message,
        paymentId 
      });
      return { valid: false, error: 'Verification failed' };
    }
  }
  
  /**
   * Check security limits
   */
  private checkSecurityLimits(otp: StoredOTP): {
    canAttempt: boolean;
    remainingAttempts: number;
    cooldownTime?: number;
    message?: string;
  } {
    const now = new Date();
    
    // Check if in cooldown period
    if (otp.cooldownUntil && otp.cooldownUntil > now) {
      const remainingCooldown = Math.ceil((otp.cooldownUntil.getTime() - now.getTime()) / 1000);
      return {
        canAttempt: false,
        remainingAttempts: 0,
        cooldownTime: remainingCooldown,
        message: `Too many attempts. Please wait ${remainingCooldown} seconds before trying again.`
      };
    }
    
    // Check if breach detected
    if (otp.breachDetected) {
      return {
        canAttempt: false,
        remainingAttempts: 0,
        message: 'Security breach detected. Please contact your wholesaler.'
      };
    }
    
    // Check attempts
    const remainingAttempts = Math.max(0, 3 - otp.attempts);
    
    return {
      canAttempt: remainingAttempts > 0,
      remainingAttempts
    };
  }
  
  /**
   * Record failed attempt
   */
  private async recordFailedAttempt(otpId: string): Promise<void> {
    try {
      const otpRef = db.collection(this.collection).doc(otpId);
      const otpDoc = await otpRef.get();
      
      if (!otpDoc.exists) return;
      
      const otp = otpDoc.data() as StoredOTP;
      const now = new Date();
      const newAttempts = otp.attempts + 1;
      const newConsecutiveFailures = otp.consecutiveFailures + 1;
      
      let updateData: any = {
        attempts: newAttempts,
        lastAttemptAt: now,
        consecutiveFailures: newConsecutiveFailures
      };
      
      // Check for breach detection (6 consecutive failures)
      if (newConsecutiveFailures >= 6) {
        updateData.breachDetected = true;
        secureLogger.security('Security breach detected', {
          otpId,
          consecutiveFailures: newConsecutiveFailures
        });
      }
      
      // Check for cooldown trigger (3 failures)
      if (newAttempts >= 3) {
        updateData.cooldownUntil = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes
        secureLogger.security('Cooldown triggered', {
          otpId,
          attempts: newAttempts
        });
      }
      
      await otpRef.update(updateData);
      
    } catch (error) {
      secureLogger.error('Failed to record OTP attempt', { 
        error: error.message,
        otpId 
      });
    }
  }
  
  /**
   * Reset security tracking
   */
  private async resetSecurityTracking(otpId: string): Promise<void> {
    try {
      await db.collection(this.collection).doc(otpId).update({
        attempts: 0,
        lastAttemptAt: null,
        cooldownUntil: null,
        consecutiveFailures: 0,
        breachDetected: false
      });
      
      secureLogger.otp('Security tracking reset', { otpId });
      
    } catch (error) {
      secureLogger.error('Failed to reset security tracking', { 
        error: error.message,
        otpId 
      });
    }
  }
  
  /**
   * Mark OTP as used
   */
  private async markAsUsed(otpId: string): Promise<void> {
    try {
      await db.collection(this.collection).doc(otpId).update({
        isUsed: true,
        usedAt: new Date()
      });
      
    } catch (error) {
      secureLogger.error('Failed to mark OTP as used', { 
        error: error.message,
        otpId 
      });
    }
  }
  
  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Clean up expired OTPs
      const expiredSnapshot = await db
        .collection(this.collection)
        .where('expiresAt', '<', now)
        .get();
      
      const batch = db.batch();
      expiredSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Clean up used OTPs older than 24 hours
      const usedSnapshot = await db
        .collection(this.collection)
        .where('isUsed', '==', true)
        .where('usedAt', '<', twentyFourHoursAgo)
        .get();
      
      usedSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      const totalDeleted = expiredSnapshot.size + usedSnapshot.size;
      if (totalDeleted > 0) {
        secureLogger.otp('Cleaned up expired OTPs', { 
          count: totalDeleted,
          expired: expiredSnapshot.size,
          used: usedSnapshot.size
        });
      }
      
    } catch (error) {
      secureLogger.error('Failed to cleanup expired OTPs', { 
        error: error.message 
      });
    }
  }
  
  /**
   * Get active OTPs for retailer (for dashboard display)
   */
  async getActiveOTPsForRetailer(retailerId: string): Promise<Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
    isExpired: boolean;
  }>> {
    try {
      const snapshot = await db
        .collection(this.collection)
        .where('retailerId', '==', retailerId)
        .where('isUsed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      const now = new Date();
      
      return snapshot.docs.map(doc => {
        const otp = doc.data() as StoredOTP;
        const decryptedCode = this.decryptOTP(otp.code);
        const isExpired = otp.expiresAt < now;
        
        // Convert Firestore timestamps
        const expiresAt = otp.expiresAt && otp.expiresAt.toDate ? 
          otp.expiresAt.toDate() : otp.expiresAt;
        const createdAt = otp.createdAt && otp.createdAt.toDate ? 
          otp.createdAt.toDate() : otp.createdAt;
        
        return {
          code: isExpired ? `${decryptedCode} (EXPIRED)` : decryptedCode,
          amount: otp.amount,
          paymentId: otp.paymentId,
          lineWorkerName: otp.lineWorkerName,
          expiresAt,
          createdAt,
          isExpired
        };
      });
      
    } catch (error) {
      secureLogger.error('Failed to get active OTPs for retailer', { 
        error: error.message,
        retailerId 
      });
      return [];
    }
  }
}

export const secureOTPStorage = SecureOTPStorage.getInstance();