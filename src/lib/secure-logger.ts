/**
 * Secure Logger Utility
 * 
 * This logger provides safe logging without exposing sensitive data.
 * Use this instead of console.log for any production logging.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  requestId?: string;
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const sensitiveFields = [
      'password', 'token', 'otp', 'code', 'phone', 'email', 
      'secret', 'key', 'auth', 'credential', 'sessionId'
    ];
    
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      // Check if key contains sensitive information
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
      requestId: this.generateRequestId()
    };
    
    if (this.isDevelopment) {
      // In development, show more detailed logs but still redact sensitive data
      const prefix = `[${logEntry.timestamp}] ${level.toUpperCase()}:`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, logEntry.context);
          break;
        case 'warn':
          console.warn(prefix, message, logEntry.context);
          break;
        case 'debug':
          console.debug(prefix, message, logEntry.context);
          break;
        default:
          console.log(prefix, message, logEntry.context);
      }
    } else {
      // In production, send to logging service (you can integrate with Sentry, LogRocket, etc.)
      // For now, just log essential info without context
      console.log(`[${level.toUpperCase()}] ${message}`);
      
      // TODO: Send to production logging service
      // this.sendToLoggingService(logEntry);
    }
  }
  
  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }
  
  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }
  
  // Security-specific logging methods
  security(message: string, context?: Record<string, any>) {
    this.log('warn', `🔒 SECURITY: ${message}`, context);
  }
  
  auth(message: string, context?: Record<string, any>) {
    this.log('info', `🔐 AUTH: ${message}`, { 
      ...context, 
      timestamp: new Date().toISOString() 
    });
  }
  
  otp(message: string, context?: Record<string, any>) {
    // Never log OTP codes, only metadata
    const safeContext = this.sanitizeContext(context);
    this.log('info', `🔐 OTP: ${message}`, safeContext);
  }
  
  payment(message: string, context?: Record<string, any>) {
    // Log payment events without sensitive details
    this.log('info', `💳 PAYMENT: ${message}`, context);
  }
}

export const secureLogger = new SecureLogger();
export const logger = secureLogger; // For backward compatibility

// Export types for use in other files
export type { LogLevel, LogEntry };