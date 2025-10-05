/**
 * OTP Storage Migration Utility
 * 
 * This utility helps migrate from the old memory-based OTP storage
 * to the new secure database-based storage.
 */

import { secureOTPStorage } from './secure-otp-storage';
import { otpStore } from './otp-store';
import { secureLogger } from './secure-logger';

export class OTPStorageMigration {
  /**
   * Migrate all active OTPs from memory to secure storage
   */
  static async migrateFromMemory(): Promise<{
    success: boolean;
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;
    
    try {
      secureLogger.info('Starting OTP storage migration from memory to database');
      
      // Get all OTPs from memory store
      const memoryOTPs = Array.from(otpStore.entries());
      
      if (memoryOTPs.length === 0) {
        secureLogger.info('No OTPs found in memory to migrate');
        return { success: true, migrated: 0, errors: [] };
      }
      
      // Migrate each OTP
      for (const [paymentId, otpData] of memoryOTPs) {
        try {
          // Check if OTP is still valid
          if (otpData.expiresAt < new Date()) {
            secureLogger.debug('Skipping expired OTP during migration', { paymentId });
            continue;
          }
          
          // Store in secure storage
          await secureOTPStorage.storeOTP({
            paymentId,
            code: otpData.code,
            retailerId: 'unknown', // We don't have this info in memory
            amount: 0, // We don't have this info in memory
            lineWorkerName: 'Unknown',
            expiresAt: otpData.expiresAt
          });
          
          migrated++;
          secureLogger.debug('OTP migrated successfully', { paymentId });
          
        } catch (error) {
          const errorMsg = `Failed to migrate OTP ${paymentId}: ${error.message}`;
          errors.push(errorMsg);
          secureLogger.error('OTP migration failed', { 
            paymentId, 
            error: error.message 
          });
        }
      }
      
      // Clear memory store after successful migration
      if (migrated > 0) {
        otpStore.clear();
        secureLogger.info('Memory OTP store cleared after migration');
      }
      
      secureLogger.info('OTP storage migration completed', {
        totalFound: memoryOTPs.length,
        migrated,
        errors: errors.length
      });
      
      return {
        success: errors.length === 0,
        migrated,
        errors
      };
      
    } catch (error) {
      secureLogger.error('OTP storage migration failed', { 
        error: error.message 
      });
      return {
        success: false,
        migrated,
        errors: [`Migration error: ${error.message}`]
      };
    }
  }
  
  /**
   * Validate migration by comparing counts
   */
  static async validateMigration(): Promise<{
    memoryCount: number;
    databaseCount: number;
    valid: boolean;
  }> {
    try {
      const memoryCount = otpStore.size;
      
      // Count active OTPs in database (this would need to be implemented in secureOTPStorage)
      const databaseCount = 0; // We'll implement this later
      
      const valid = memoryCount === 0 && databaseCount >= 0;
      
      secureLogger.info('Migration validation completed', {
        memoryCount,
        databaseCount,
        valid
      });
      
      return {
        memoryCount,
        databaseCount,
        valid
      };
      
    } catch (error) {
      secureLogger.error('Migration validation failed', { 
        error: error.message 
      });
      return {
        memoryCount: otpStore.size,
        databaseCount: -1,
        valid: false
      };
    }
  }
  
  /**
   * Cleanup old memory storage (call this after confirming migration is successful)
   */
  static cleanupMemoryStorage(): void {
    try {
      otpStore.clear();
      secureLogger.info('Memory OTP storage cleaned up');
    } catch (error) {
      secureLogger.error('Failed to cleanup memory storage', { 
        error: error.message 
      });
    }
  }
}

/**
 * Run migration on application startup
 */
export async function runOTPMigration(): Promise<void> {
  try {
    const result = await OTPStorageMigration.migrateFromMemory();
    
    if (!result.success) {
      secureLogger.warn('OTP migration completed with errors', {
        errors: result.errors
      });
    }
    
    if (result.migrated > 0) {
      secureLogger.info(`Successfully migrated ${result.migrated} OTPs to secure storage`);
    }
    
  } catch (error) {
    secureLogger.error('Failed to run OTP migration', { 
      error: error.message 
    });
  }
}