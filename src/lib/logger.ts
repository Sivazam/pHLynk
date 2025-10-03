/**
 * Environment-aware logging utility
 * Only logs in development environment unless forced
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  force?: boolean; // Force log even in production
  context?: string; // Add context to the log message
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger utility that respects environment settings
 */
export const logger = {
  /**
   * Log informational messages (only in development unless forced)
   */
  info: (message: string, data?: any, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const prefix = options.context ? `[${options.context}]` : '[INFO]';
      if (data !== undefined) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  },

  /**
   * Log warning messages (only in development unless forced)
   */
  warn: (message: string, data?: any, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const prefix = options.context ? `[${options.context}]` : '[WARN]';
      if (data !== undefined) {
        console.warn(`${prefix} ${message}`, data);
      } else {
        console.warn(`${prefix} ${message}`);
      }
    }
  },

  /**
   * Log error messages (always logs, even in production)
   */
  error: (message: string, error?: any, options: LogOptions = {}) => {
    const prefix = options.context ? `[${options.context}]` : '[ERROR]';
    if (error !== undefined) {
      console.error(`${prefix} ${message}`, error);
    } else {
      console.error(`${prefix} ${message}`);
    }
  },

  /**
   * Log debug messages (only in development unless forced)
   */
  debug: (message: string, data?: any, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const prefix = options.context ? `[${options.context}]` : '[DEBUG]';
      if (data !== undefined) {
        console.debug(`${prefix} ${message}`, data);
      } else {
        console.debug(`${prefix} ${message}`);
      }
    }
  },

  /**
   * Log success messages (only in development unless forced)
   */
  success: (message: string, data?: any, options: LogOptions = {}) => {
    if (isDevelopment || options.force) {
      const prefix = options.context ? `[${options.context}]` : '[SUCCESS]';
      if (data !== undefined) {
        console.log(`\x1b[32m${prefix} ${message}\x1b[0m`, data);
      } else {
        console.log(`\x1b[32m${prefix} ${message}\x1b[0m`);
      }
    }
  }
};

/**
 * Legacy console.log replacement for gradual migration
 * @deprecated Use logger.info() instead
 */
export const consoleLog = logger.info;