/**
 * Optimized Payment Verification Service
 * 
 * This module provides optimized payment verification with parallel queries,
 * caching, and batch operations to reduce database load using Firebase Firestore.
 */

import { db as firestore } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, query, where, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { secureLogger } from '@/lib/secure-logger';
import { secureOTPStorage } from '@/lib/secure-otp-storage';

export interface PaymentVerificationRequest {
  paymentId: string;
  retailerId: string;
  otpCode?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  payment?: {
    id: string;
    amount: number;
    retailerName: string;
    lineWorkerName: string;
    status: string;
    createdAt: Date;
    verifiedAt?: Date;
  };
  error?: string;
  processingTime?: number;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  retailerId: string;
  retailerName: string;
  lineWorkerName: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  hasOTP: boolean;
}

export class OptimizedPaymentVerification {
  private static instance: OptimizedPaymentVerification;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private paymentsCollection = 'payments';
  private retailersCollection = 'retailers';
  
  static getInstance(): OptimizedPaymentVerification {
    if (!OptimizedPaymentVerification.instance) {
      OptimizedPaymentVerification.instance = new OptimizedPaymentVerification();
    }
    return OptimizedPaymentVerification.instance;
  }

  /**
   * Helper function to get retailer name (handles both legacy and new profile formats)
   */
  private getRetailerName(retailer: any): string {
    if (retailer?.profile?.realName) {
      return retailer.profile.realName;
    }
    return retailer?.name || 'Unknown Retailer';
  }
  
  /**
   * Get cached data or fetch from Firebase
   */
  private async getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl: number = 30000): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now, ttl });
    
    return data;
  }
  
  /**
   * Clear cache for specific key or all cache
   */
  private clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Optimized payment verification with parallel queries
   */
  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const startTime = Date.now();
    
    try {
      secureLogger.payment('Starting payment verification', {
        paymentId: request.paymentId,
        retailerId: request.retailerId
      });
      
      // Parallel queries to reduce Firebase round trips
      const [payment, retailer, otp] = await Promise.all([
        this.getPaymentById(request.paymentId),
        this.getRetailerById(request.retailerId),
        request.otpCode ? secureOTPStorage.getOTP(request.paymentId) : Promise.resolve(null)
      ]);
      
      // Validate payment exists
      if (!payment) {
        const error = 'Payment not found';
        secureLogger.payment('Payment verification failed - payment not found', {
          paymentId: request.paymentId
        });
        return { success: false, error, processingTime: Date.now() - startTime };
      }
      
      // Validate retailer matches
      if (payment.retailerId !== request.retailerId) {
        const error = 'Payment does not belong to this retailer';
        secureLogger.security('Payment verification failed - retailer mismatch', {
          paymentId: request.paymentId,
          expectedRetailerId: payment.retailerId,
          providedRetailerId: request.retailerId
        });
        return { success: false, error, processingTime: Date.now() - startTime };
      }
      
      // Validate retailer exists and is active
      if (!retailer || !retailer.isActive) {
        const error = 'Retailer not found or inactive';
        secureLogger.payment('Payment verification failed - retailer issue', {
          retailerId: request.retailerId,
          retailerExists: !!retailer,
          retailerActive: retailer?.isActive
        });
        return { success: false, error, processingTime: Date.now() - startTime };
      }
      
      // Check if already verified
      if (payment.isVerified) {
        const result = {
          success: true,
          payment: {
            id: payment.id,
            amount: payment.amount,
            retailerName: this.getRetailerName(retailer),
            lineWorkerName: payment.lineWorkerName,
            status: 'verified',
            createdAt: payment.createdAt,
            verifiedAt: payment.verifiedAt
          },
          processingTime: Date.now() - startTime
        };
        
        secureLogger.payment('Payment already verified', {
          paymentId: request.paymentId,
          verifiedAt: payment.verifiedAt
        });
        
        return result;
      }
      
      // Check expiration
      if (payment.expiresAt < new Date()) {
        await this.markPaymentExpired(payment.id);
        
        const result = {
          success: false,
          error: 'Payment has expired',
          payment: {
            id: payment.id,
            amount: payment.amount,
            retailerName: this.getRetailerName(retailer),
            lineWorkerName: payment.lineWorkerName,
            status: 'expired',
            createdAt: payment.createdAt
          },
          processingTime: Date.now() - startTime
        };
        
        secureLogger.payment('Payment verification failed - expired', {
          paymentId: request.paymentId,
          expiredAt: payment.expiresAt
        });
        
        return result;
      }
      
      // OTP verification if provided
      if (request.otpCode) {
        if (!otp) {
          const error = 'OTP not found for this payment';
          secureLogger.payment('Payment verification failed - OTP not found', {
            paymentId: request.paymentId
          });
          return { success: false, error, processingTime: Date.now() - startTime };
        }
        
        const otpResult = await secureOTPStorage.verifyOTP(request.paymentId, request.otpCode);
        
        if (!otpResult.valid) {
          const result = {
            success: false,
            error: otpResult.error || 'Invalid OTP',
            payment: {
              id: payment.id,
              amount: payment.amount,
              retailerName: this.getRetailerName(retailer),
              lineWorkerName: payment.lineWorkerName,
              status: 'failed',
              createdAt: payment.createdAt
            },
            processingTime: Date.now() - startTime
          };
          
          secureLogger.payment('Payment verification failed - OTP invalid', {
            paymentId: request.paymentId,
            otpError: otpResult.error
          });
          
          return result;
        }
      }
      
      // Mark payment as verified
      await this.markPaymentVerified(payment.id);
      
      // Clear cache for this payment
      this.clearCache(`payment:${request.paymentId}`);
      this.clearCache(`retailer:${request.retailerId}`);
      
      const result = {
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          retailerName: this.getRetailerName(retailer),
          lineWorkerName: payment.lineWorkerName,
          status: 'verified',
          createdAt: payment.createdAt,
          verifiedAt: new Date()
        },
        processingTime: Date.now() - startTime
      };
      
      secureLogger.payment('Payment verified successfully', {
        paymentId: request.paymentId,
        amount: payment.amount,
        retailerId: request.retailerId,
        processingTime: result.processingTime
      });
      
      return result;
      
    } catch (error) {
      secureLogger.error('Payment verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentId: request.paymentId,
        retailerId: request.retailerId,
        processingTime: Date.now() - startTime
      });
      
      return {
        success: false,
        error: 'Verification failed due to system error',
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Get payment by ID with caching
   */
  private async getPaymentById(paymentId: string) {
    return this.getCachedData(
      `payment:${paymentId}`,
      async () => {
        const docRef = doc(firestore, this.paymentsCollection, paymentId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return null;
        
        const payment = docSnap.data();
        
        // Convert Firestore timestamps to Date objects
        const createdAt = payment.createdAt && payment.createdAt.toDate ? 
          payment.createdAt.toDate() : payment.createdAt;
        const expiresAt = payment.expiresAt && payment.expiresAt.toDate ? 
          payment.expiresAt.toDate() : payment.expiresAt;
        const verifiedAt = payment.verifiedAt && payment.verifiedAt.toDate ? 
          payment.verifiedAt.toDate() : payment.verifiedAt;
        
        return {
          id: docSnap.id,
          amount: payment.amount,
          retailerId: payment.retailerId,
          lineWorkerName: payment.lineWorkerName,
          isVerified: payment.isVerified || false,
          verifiedAt,
          createdAt,
          expiresAt,
          status: payment.status || 'pending'
        };
      },
      30000 // 30 seconds cache
    );
  }
  
  /**
   * Get retailer by ID with caching
   */
  private async getRetailerById(retailerId: string) {
    return this.getCachedData(
      `retailer:${retailerId}`,
      async () => {
        const docRef = doc(firestore, this.retailersCollection, retailerId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return null;
        
        const retailer = docSnap.data();
        
        return {
          id: docSnap.id,
          name: retailer.name,
          profile: retailer.profile, // Include profile data
          isActive: retailer.isActive !== false // Default to true
        };
      },
      60000 // 1 minute cache
    );
  }
  
  /**
   * Mark payment as verified
   */
  private async markPaymentVerified(paymentId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.paymentsCollection, paymentId), {
        isVerified: true,
        verifiedAt: new Date(),
        status: 'verified'
      });
      
      secureLogger.payment('Payment marked as verified', { paymentId });
      
    } catch (error) {
      secureLogger.error('Failed to mark payment as verified', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentId
      });
      throw error;
    }
  }
  
  /**
   * Mark payment as expired
   */
  private async markPaymentExpired(paymentId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.paymentsCollection, paymentId), {
        status: 'expired'
      });
      
      secureLogger.payment('Payment marked as expired', { paymentId });
      
    } catch (error) {
      secureLogger.error('Failed to mark payment as expired', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentId
      });
    }
  }
  
  /**
   * Get payment summary for retailer with batch optimization
   */
  async getPaymentSummaryForRetailer(retailerId: string): Promise<PaymentSummary[]> {
    try {
      const cacheKey = `payments_summary:${retailerId}`;
      
      return this.getCachedData(
        cacheKey,
        async () => {
          // Single query with all needed data
          const q = query(
            collection(firestore, this.paymentsCollection),
            where('retailerId', '==', retailerId),
            orderBy('createdAt', 'desc'),
            limit(50) // Limit to recent payments
          );
          const snapshot = await getDocs(q);
          
          const now = new Date();
          
          // Get retailer data in parallel
          const retailerDocRef = doc(firestore, this.retailersCollection, retailerId);
          const retailerDocSnap = await getDoc(retailerDocRef);
          const retailerData = retailerDocSnap.exists() ? retailerDocSnap.data() : null;
          const retailerName = retailerData ? this.getRetailerName(retailerData) : 'Unknown Retailer';
          
          return snapshot.docs.map(doc => {
            const payment = doc.data();
            
            // Convert Firestore timestamps
            const createdAt = payment.createdAt && payment.createdAt.toDate ? 
              payment.createdAt.toDate() : payment.createdAt;
            const expiresAt = payment.expiresAt && payment.expiresAt.toDate ? 
              payment.expiresAt.toDate() : payment.expiresAt;
            
            const isExpired = expiresAt < now;
            
            return {
              id: doc.id,
              amount: payment.amount,
              retailerId: payment.retailerId,
              retailerName,
              lineWorkerName: payment.lineWorkerName,
              status: payment.isVerified ? 'verified' : 
                     isExpired ? 'expired' : 
                     payment.status === 'expired' ? 'expired' : 'pending',
              createdAt,
              expiresAt,
              isExpired,
              hasOTP: true // We assume all payments have OTPs generated
            };
          });
        },
        15000 // 15 seconds cache
      );
      
    } catch (error) {
      secureLogger.error('Failed to get payment summary for retailer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        retailerId
      });
      return [];
    }
  }
  
  /**
   * Batch verify multiple payments (admin function)
   */
  async batchVerifyPayments(paymentIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    
    try {
      // Process in batches to avoid overwhelming Firebase
      const batchSize = 10;
      
      for (let i = 0; i < paymentIds.length; i += batchSize) {
        const batch = paymentIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (paymentId) => {
          try {
            const docRef = doc(firestore, this.paymentsCollection, paymentId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              failed.push({ id: paymentId, error: 'Payment not found' });
              return;
            }
            
            const payment = docSnap.data();
            
            if (payment.isVerified) {
              successful.push(paymentId);
              return;
            }
            
            const expiresAt = payment.expiresAt && payment.expiresAt.toDate ? 
              payment.expiresAt.toDate() : payment.expiresAt;
            
            if (expiresAt < new Date()) {
              failed.push({ id: paymentId, error: 'Payment expired' });
              return;
            }
            
            await updateDoc(doc(firestore, this.paymentsCollection, paymentId), {
              isVerified: true,
              verifiedAt: new Date(),
              status: 'verified'
            });
            
            successful.push(paymentId);
            
          } catch (error) {
            failed.push({ 
              id: paymentId, 
              error: error instanceof Error ? error.message : 'Verification failed' 
            });
          }
        });
        
        await Promise.all(batchPromises);
        
        // Clear cache for verified payments
        batch.forEach(id => this.clearCache(`payment:${id}`));
      }
      
      secureLogger.payment('Batch verification completed', {
        total: paymentIds.length,
        successful: successful.length,
        failed: failed.length
      });
      
      return { successful, failed };
      
    } catch (error) {
      secureLogger.error('Batch verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalPayments: paymentIds.length
      });
      
      return { 
        successful, 
        failed: [...failed, ...paymentIds.filter(id => !successful.includes(id) && !failed.find(f => f.id === id)).map(id => ({ id, error: 'Batch process failed' }))]
      };
    }
  }
  
  /**
   * Clean up expired payments
   */
  async cleanupExpiredPayments(): Promise<number> {
    try {
      const now = new Date();
      const expiredThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const q = query(
        collection(firestore, this.paymentsCollection),
        where('expiresAt', '<', expiredThreshold),
        where('isVerified', '==', false)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return 0;
      }
      
      // Delete in batches
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        
        await batch.commit();
      }
      
      if (deletedCount > 0) {
        secureLogger.payment('Cleaned up expired payments', {
          count: deletedCount,
          threshold: expiredThreshold.toISOString()
        });
      }
      
      return deletedCount;
      
    } catch (error) {
      secureLogger.error('Failed to cleanup expired payments', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }
}

export const optimizedPaymentVerification = OptimizedPaymentVerification.getInstance();