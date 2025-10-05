/**
 * Input Validation and Sanitization
 * 
 * Comprehensive input validation with sanitization for security
 * and data integrity
 */

import { secureLogger } from '@/lib/secure-logger';

export interface ValidationResult {
  isValid: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  sanitize?: boolean;
  whitelist?: string[];
  blacklist?: string[];
  custom?: (value: any) => string | null;
}

export class InputValidator {
  private static instance: InputValidator;
  
  static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }
  
  /**
   * Validate and sanitize input data
   */
  validate(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: any = {};
    
    try {
      for (const rule of rules) {
        const value = data[rule.field];
        const fieldName = rule.field;
        
        // Check if required
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${fieldName} is required`);
          continue;
        }
        
        // Skip validation if field is not provided and not required
        if (value === undefined || value === null || value === '') {
          continue;
        }
        
        // Type validation
        const typeError = this.validateType(value, rule.type, fieldName);
        let finalValue = value;
        
        if (typeError) {
          // Special handling for number fields that might be strings
          if (rule.type === 'number' && typeof value === 'string') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              finalValue = numValue; // Convert string to number
            } else {
              errors.push(typeError);
              continue;
            }
          } else {
            errors.push(typeError);
            continue;
          }
        }
        
        // Sanitize value
        let sanitizedValue = finalValue;
        if (rule.sanitize !== false) {
          sanitizedValue = this.sanitizeValue(finalValue, rule);
        }
        
        // Length validation for strings
        if (typeof sanitizedValue === 'string') {
          if (rule.minLength && sanitizedValue.length < rule.minLength) {
            errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
          }
          
          if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
            errors.push(`${fieldName} must not exceed ${rule.maxLength} characters`);
            sanitizedValue = sanitizedValue.substring(0, rule.maxLength);
            warnings.push(`${fieldName} was truncated to ${rule.maxLength} characters`);
          }
        }
        
        // Range validation for numbers
        if (typeof sanitizedValue === 'number') {
          if (rule.min !== undefined && sanitizedValue < rule.min) {
            errors.push(`${fieldName} must be at least ${rule.min}`);
          }
          
          if (rule.max !== undefined && sanitizedValue > rule.max) {
            errors.push(`${fieldName} must not exceed ${rule.max}`);
          }
        }
        
        // Pattern validation
        if (rule.pattern && typeof sanitizedValue === 'string') {
          if (!rule.pattern.test(sanitizedValue)) {
            errors.push(`${fieldName} format is invalid`);
          }
        }
        
        // Whitelist validation
        if (rule.whitelist && rule.whitelist.length > 0) {
          if (!rule.whitelist.includes(sanitizedValue)) {
            errors.push(`${fieldName} contains invalid value`);
          }
        }
        
        // Blacklist validation
        if (rule.blacklist && rule.blacklist.length > 0) {
          if (rule.blacklist.includes(sanitizedValue)) {
            errors.push(`${fieldName} contains prohibited value`);
          }
        }
        
        // Custom validation
        if (rule.custom) {
          const customError = rule.custom(sanitizedValue);
          if (customError) {
            errors.push(customError);
          }
        }
        
        // Store sanitized value
        sanitized[fieldName] = sanitizedValue;
      }
      
      // Log validation results
      if (errors.length > 0) {
        secureLogger.security('Input validation failed', {
          errors,
          fieldCount: rules.length,
          hasWarnings: warnings.length > 0
        });
      } else if (warnings.length > 0) {
        secureLogger.performance('Input validation with warnings', {
          warnings,
          fieldCount: rules.length
        });
      }
      
      return {
        isValid: errors.length === 0,
        data: sanitized,
        errors,
        warnings
      };
      
    } catch (error) {
      secureLogger.error('Input validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fieldCount: rules.length
      });
      
      return {
        isValid: false,
        errors: ['Validation system error'],
        warnings: []
      };
    }
  }
  
  /**
   * Validate data type
   */
  private validateType(value: any, type: string | undefined, fieldName: string): string | null {
    if (!type) return null;
    
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`;
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${fieldName} must be a valid number`;
        }
        break;
        
      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return `${fieldName} must be a valid email address`;
        }
        break;
        
      case 'phone':
        if (typeof value !== 'string' || !this.isValidPhone(value)) {
          return `${fieldName} must be a valid phone number`;
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${fieldName} must be a boolean`;
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return `${fieldName} must be an object`;
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          return `${fieldName} must be an array`;
        }
        break;
        
      default:
        console.warn(`Unknown validation type: ${type}`);
    }
    
    return null;
  }
  
  /**
   * Sanitize input value
   */
  private sanitizeValue(value: any, rule: ValidationRule): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value, rule);
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item, rule) : item
        );
      }
      
      // Recursively sanitize object
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = typeof val === 'string' ? this.sanitizeString(val, rule) : val;
      }
      return sanitized;
    }
    
    return value;
  }
  
  /**
   * Sanitize string values
   */
  private sanitizeString(value: string, rule: ValidationRule): string {
    let sanitized = value;
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ''); // Control characters
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Remove script tags and dangerous HTML
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Apply whitelist if provided
    if (rule.whitelist && rule.whitelist.length > 0) {
      if (!rule.whitelist.includes(sanitized)) {
        // Return first valid option or empty string
        sanitized = rule.whitelist[0] || '';
      }
    }
    
    // Apply blacklist if provided
    if (rule.blacklist && rule.blacklist.length > 0) {
      if (rule.blacklist.includes(sanitized)) {
        sanitized = '';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate phone number (basic validation)
   */
  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if it has a reasonable number of digits (10-15)
    return digits.length >= 10 && digits.length <= 15;
  }
}

// Predefined validation rules for common use cases
export const VALIDATION_RULES = {
  // User authentication
  LOGIN: {
    email: {
      field: 'email',
      required: true,
      type: 'email',
      maxLength: 255,
      sanitize: true
    },
    password: {
      field: 'password',
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 128,
      sanitize: true
    }
  },
  
  // OTP operations
  OTP_SEND: {
    retailerId: {
      field: 'retailerId',
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    paymentId: {
      field: 'paymentId',
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    amount: {
      field: 'amount',
      required: true,
      type: 'number',
      min: 0.01,
      max: 999999.99,
      sanitize: true,
      custom: (value: any) => {
        // Allow string numbers and convert them
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return 'Amount must be a valid number';
          }
          return null;
        }
        return null;
      }
    },
    lineWorkerName: {
      field: 'lineWorkerName',
      required: false,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      sanitize: true
    }
  },
  
  OTP_VERIFY: {
    paymentId: {
      field: 'paymentId',
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    code: {
      field: 'code',
      required: true,
      type: 'string',
      minLength: 4,
      maxLength: 6,
      pattern: /^\d+$/,
      sanitize: true
    }
  },
  
  // Payment operations
  PAYMENT_VERIFY: {
    paymentId: {
      field: 'paymentId',
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    retailerId: {
      field: 'retailerId',
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    otpCode: {
      field: 'otpCode',
      required: false,
      type: 'string',
      minLength: 4,
      maxLength: 6,
      pattern: /^\d+$/,
      sanitize: true
    }
  },
  
  // User registration
  REGISTER: {
    name: {
      field: 'name',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      sanitize: true
    },
    email: {
      field: 'email',
      required: true,
      type: 'email',
      maxLength: 255,
      sanitize: true
    },
    phone: {
      field: 'phone',
      required: true,
      type: 'phone',
      maxLength: 20,
      sanitize: true
    },
    password: {
      field: 'password',
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      sanitize: true,
      custom: (value: string) => {
        if (!/(?=.*[!@#$%^&*])/.test(value)) {
          return 'Password must contain at least one special character';
        }
        return null;
      }
    }
  },
  
  // Retailer operations
  RETAILER_CREATE: {
    name: {
      field: 'name',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 200,
      sanitize: true
    },
    email: {
      field: 'email',
      required: true,
      type: 'email',
      maxLength: 255,
      sanitize: true
    },
    phone: {
      field: 'phone',
      required: true,
      type: 'phone',
      maxLength: 20,
      sanitize: true
    },
    address: {
      field: 'address',
      required: false,
      type: 'string',
      maxLength: 500,
      sanitize: true
    }
  }
};

export const inputValidator = InputValidator.getInstance();

/**
 * Convenience function for validation
 */
export function validateInput(data: any, ruleSet: keyof typeof VALIDATION_RULES): ValidationResult {
  const rules = Object.values(VALIDATION_RULES[ruleSet]);
  return inputValidator.validate(data, rules);
}