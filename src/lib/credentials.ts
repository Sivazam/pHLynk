/**
 * Secure Credential Management
 * 
 * This utility provides secure access to credentials and environment variables
 * with validation and error handling.
 */

interface CredentialConfig {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  description: string;
}

const REQUIRED_CREDENTIALS: CredentialConfig[] = [
  {
    name: 'NEXT_PUBLIC_FCM_VAPID_KEY',
    required: true,
    validator: (value) => value.length > 20,
    description: 'FCM VAPID key for push notifications'
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    validator: (value) => value.length >= 32,
    description: 'NextAuth secret for session security'
  },
  {
    name: 'FAST2SMS_API_KEY',
    required: false,
    validator: (value) => value.length > 10,
    description: 'Fast2SMS API key for SMS notifications'
  },
  {
    name: 'APP_FIREBASE_PROJECT_ID',
    required: true,
    validator: (value) => value.length > 0,
    description: 'Firebase project ID'
  }
];

export class CredentialManager {
  private static instance: CredentialManager;
  private validated = false;
  private missingCredentials: string[] = [];

  static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Validate all required credentials
   */
  validateCredentials(): { valid: boolean; missing: string[]; warnings: string[] } {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const credential of REQUIRED_CREDENTIALS) {
      const value = process.env[credential.name];
      
      if (!value && credential.required) {
        missing.push(credential.name);
        continue;
      }

      if (!value && !credential.required) {
        warnings.push(`Optional credential ${credential.name} is not set: ${credential.description}`);
        continue;
      }

      if (value && credential.validator && !credential.validator(value)) {
        missing.push(credential.name);
      }
    }

    this.missingCredentials = missing;
    this.validated = missing.length === 0;

    return {
      valid: this.validated,
      missing,
      warnings
    };
  }

  /**
   * Get credential value with validation
   */
  getCredential(name: string): string | null {
    const value = process.env[name];
    
    if (!value) {
      return null;
    }

    // Additional validation for sensitive credentials
    const credential = REQUIRED_CREDENTIALS.find(c => c.name === name);
    if (credential && credential.validator && !credential.validator(value)) {
      throw new Error(`Invalid format for credential: ${name}`);
    }

    return value;
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): {
    isProduction: boolean;
    isDevelopment: boolean;
    apiBaseUrl: string;
    logLevel: string;
  } {
    return {
      isProduction: this.isProduction(),
      isDevelopment: this.isDevelopment(),
      apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      logLevel: process.env.LOG_LEVEL || 'info'
    };
  }

  /**
   * Generate secure random string for secrets
   */
  static generateSecureSecret(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Mask sensitive values for logging
   */
  static maskSensitiveValue(value: string, showFirst: number = 4, showLast: number = 4): string {
    if (!value || value.length <= showFirst + showLast) {
      return '***';
    }
    
    const first = value.substring(0, showFirst);
    const last = value.substring(value.length - showLast);
    const middle = '*'.repeat(value.length - showFirst - showLast);
    
    return `${first}${middle}${last}`;
  }
}

export const credentials = CredentialManager.getInstance();

// Export convenience functions
export const isProduction = () => credentials.isProduction();
export const isDevelopment = () => credentials.isDevelopment();
export const getCredential = (name: string) => credentials.getCredential(name);
export const validateCredentials = () => credentials.validateCredentials();