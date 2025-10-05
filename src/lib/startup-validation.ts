/**
 * Startup Validation Script
 * 
 * This script runs at application startup to validate all required
 * credentials and configurations before the app starts serving requests.
 */

import { credentials, validateCredentials } from './credentials';
import { secureLogger } from './secure-logger';

export interface StartupValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
  timestamp: string;
}

export class StartupValidator {
  static async validate(): Promise<StartupValidationResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      secureLogger.info('Starting application validation...');
      
      // 1. Validate credentials
      const credentialValidation = validateCredentials();
      if (!credentialValidation.valid) {
        errors.push(
          `Missing required credentials: ${credentialValidation.missing.join(', ')}`
        );
      }
      warnings.push(...credentialValidation.warnings);
      
      // 2. Validate environment
      const envConfig = credentials.getEnvironmentConfig();
      secureLogger.info('Environment config validated', {
        isProduction: envConfig.isProduction,
        apiBaseUrl: envConfig.apiBaseUrl,
        logLevel: envConfig.logLevel
      });
      
      // 3. Validate critical services
      await this.validateFirebaseConnection(errors, warnings);
      await this.validateDatabaseConnection(errors, warnings);
      
      // 4. Security checks
      this.performSecurityChecks(errors, warnings);
      
      const success = errors.length === 0;
      
      if (success) {
        secureLogger.info('✅ Application validation completed successfully');
      } else {
        secureLogger.error('❌ Application validation failed', { errors, warnings });
      }
      
      return {
        success,
        errors,
        warnings,
        environment: process.env.NODE_ENV || 'unknown',
        timestamp
      };
      
    } catch (error) {
      secureLogger.error('Startup validation error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
        environment: process.env.NODE_ENV || 'unknown',
        timestamp
      };
    }
  }
  
  private static async validateFirebaseConnection(
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    try {
      // Test Firebase initialization
      const { db } = await import('./firebase');
      if (!db) {
        errors.push('Firebase database connection failed');
      } else {
        secureLogger.info('Firebase connection validated');
      }
    } catch (error) {
      errors.push(`Firebase validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private static async validateDatabaseConnection(
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    try {
      // Test database connection
      const { db } = await import('./db');
      if (!db) {
        errors.push('Database connection failed');
      } else {
        secureLogger.info('Database connection validated');
      }
    } catch (error) {
      errors.push(`Database validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private static performSecurityChecks(
    errors: string[], 
    warnings: string[]
  ): void {
    // Check for development credentials in production
    if (credentials.isProduction()) {
      const mockValues = [
        'mock-', 'test-', 'example-', 'demo-', 'fake-'
      ];
      
      for (const credential of ['NEXT_PUBLIC_FCM_VAPID_KEY', 'FAST2SMS_API_KEY']) {
        const value = process.env[credential];
        if (value && mockValues.some(mock => value.includes(mock))) {
          errors.push(`Mock credential detected in production: ${credential}`);
        }
      }
    }
    
    // Check for weak secrets
    const nextauthSecret = process.env.NEXTAUTH_SECRET;
    if (nextauthSecret && nextauthSecret.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters long');
    }
    
    secureLogger.info('Security checks completed');
  }
  
  /**
   * Get startup health check endpoint data
   */
  static getHealthCheck(): {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    environment: string;
    version: string;
  } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}

/**
 * Validate application on startup
 * Call this function in your app's entry point
 */
export async function validateApplication(): Promise<void> {
  const result = await StartupValidator.validate();
  
  if (!result.success) {
    secureLogger.error('Application startup validation failed', {
      errors: result.errors,
      warnings: result.warnings
    });
    
    // In production, we might want to exit the process
    if (credentials.isProduction()) {
      secureLogger.error('Critical validation errors detected, exiting...');
      process.exit(1);
    }
  }
  
  // Log warnings in all environments
  if (result.warnings.length > 0) {
    secureLogger.warn('Application started with warnings', {
      warnings: result.warnings
    });
  }
}