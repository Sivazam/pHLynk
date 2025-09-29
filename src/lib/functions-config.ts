// Utility to access Firebase Functions config in Next.js API routes
export interface FunctionsConfig {
  fast2sms?: {
    api_key?: string;
    sender_id?: string;
    entity_id?: string;
  };
}

/**
 * Get Firebase Functions config for Next.js API routes
 * In Firebase Functions environment, this would use functions.config()
 * In Next.js API routes, we need to access environment variables that were set by Firebase Functions config
 */
export function getFunctionsConfig(): FunctionsConfig {
  return {
    fast2sms: {
      api_key: process.env.fast2sms_api_key || process.env.FAST2SMS_API_KEY,
      sender_id: process.env.fast2sms_sender_id || process.env.FAST2SMS_SENDER_ID,
      entity_id: process.env.fast2sms_entity_id || process.env.ENTITY_ID || process.env.entityid
    }
  };
}

/**
 * Check if Fast2SMS is properly configured
 */
export function isFast2SMSConfigured(): boolean {
  const config = getFunctionsConfig();
  return !!config.fast2sms?.api_key;
}

/**
 * Get Fast2SMS configuration
 */
export function getFast2SMSConfig() {
  const config = getFunctionsConfig();
  return {
    apiKey: config.fast2sms?.api_key,
    senderId: config.fast2sms?.sender_id || 'SNSYST',
    entityId: config.fast2sms?.entity_id
  };
}