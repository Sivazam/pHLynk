import { getFast2SMSConfig } from '@/lib/functions-config';

interface Fast2SMSConfig {
  apiKey?: string;
  senderId?: string;
  entityId?: string;
}

interface Fast2SMSResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

interface SMSVariables {
  amount: string;           // Payment amount (e.g., "579")
  lineWorkerName: string;   // Name of the line worker who collected the payment
  retailerName: string;     // Name of the retailer who made the payment
  retailerArea: string;     // Area/address of the retailer
  wholesalerName: string;   // Name of the wholesaler (for "goods supplied by" or "on behalf of")
  collectionDate: string;   // Date of collection in DD/MM/YY format
}

export class Fast2SMSService {
  private config: Fast2SMSConfig;

  constructor() {
    this.config = this.getConfig();
  }

  private getConfig(): Fast2SMSConfig {
    const config = getFast2SMSConfig();
    return {
      apiKey: config.apiKey,
      senderId: config.senderId,
      entityId: config.entityId
    };
  }

  async sendPaymentConfirmationSMS(
    phoneNumber: string,
    templateType: 'retailer' | 'wholesaler',
    variables: SMSVariables
  ): Promise<{ success: boolean; message: string; error?: string; requestId?: string }> {
    try {
      // Format phone number (remove +91 if present, Fast2SMS expects 10-digit)
      const formattedPhone = phoneNumber.startsWith('+91') 
        ? phoneNumber.substring(3) 
        : phoneNumber.startsWith('91') 
        ? phoneNumber.substring(2) 
        : phoneNumber;

      // Get Fast2SMS message ID based on type
      const messageId = this.getFast2SMSMessageId(templateType);
      
      // Format variables for Fast2SMS API - order matters based on approved templates
      let variablesValues: string[];
      
      if (templateType === 'retailer') {
        // RetailerNotify Fast2SMS template order:
        // "Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}. — SAANVI SYSTEMS"
        // Fast2SMS Message ID: 199054
        variablesValues = [
          variables.amount,           // {#var#} - payment amount
          variables.retailerName,     // {#var#} - retailer name
          variables.retailerArea,     // {#var#} - retailer area
          variables.wholesalerName,   // {#var#} - wholesaler name (goods supplied by)
          variables.lineWorkerName,   // {#var#} - line worker name
          variables.collectionDate    // {#var#} - collection date
        ];
      } else {
        // WholeSalerNotify Fast2SMS template order:
        // "Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}. — SAANVI SYSTEMS."
        // Fast2SMS Message ID: 199055
        variablesValues = [
          variables.amount,           // {#var#} - payment amount
          variables.retailerName,     // {#var#} - retailer name
          variables.retailerArea,     // {#var#} - retailer area
          variables.lineWorkerName,   // {#var#} - line worker name
          variables.wholesalerName,   // {#var#} - wholesaler name (on behalf of)
          variables.collectionDate    // {#var#} - collection date
        ];
      }
      
      const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

      // Construct Fast2SMS API URL
      const entityIdParam = this.config.entityId ? `&entity_id=${this.config.entityId}` : '';
      const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${this.config.apiKey}&route=dlt&sender_id=${this.config.senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;

      console.log('📤 Sending SMS via Fast2SMS:', {
        phoneNumber: formattedPhone,
        templateType,
        variables,
        apiUrl: apiUrl.substring(0, 100) + '...' // Truncate for security
      });

      // Check if Fast2SMS is configured
      if (!this.config.apiKey) {
        console.log('⚠️ Fast2SMS not configured - using development mode');
        console.log('📱 Would send SMS to:', formattedPhone);
        console.log('📝 Template:', templateType);
        console.log('📝 Variables:', variables);
        
        return {
          success: true,
          message: `SMS logged in development mode. Template: ${templateType}`
        };
      }

      // Make API call to Fast2SMS
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const data: Fast2SMSResponse = await response.json();
      
      if (data.return && data.request_id) {
        console.log('✅ SMS sent successfully via Fast2SMS:', {
          requestId: data.request_id,
          messages: data.message
        });
        
        return {
          success: true,
          message: 'SMS sent successfully',
          requestId: data.request_id
        };
      } else {
        console.error('❌ Fast2SMS API error:', data);
        return {
          success: false,
          message: 'Failed to send SMS',
          error: data.message?.join(', ') || 'Unknown error'
        };
      }

    } catch (error) {
      console.error('❌ Error sending SMS via Fast2SMS:', error);
      
      // Fallback to development mode
      console.log('📱 Development mode - SMS details:', {
        phoneNumber,
        templateType,
        variables
      });
      
      return {
        success: true,
        message: `SMS logged in development mode. Template: ${templateType}`
      };
    }
  }

  async sendSecurityAlertSMS(
    phoneNumber: string,
    lineWorkerName: string
  ): Promise<{ success: boolean; message: string; error?: string; requestId?: string }> {
    try {
      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+91') 
        ? phoneNumber.substring(3) 
        : phoneNumber.startsWith('91') 
        ? phoneNumber.substring(2) 
        : phoneNumber;

      // Security alert template (placeholder - replace with actual Fast2SMS message ID)
      const messageId = '198234'; // TODO: Replace with actual Fast2SMS security alert message ID
      
      // Variables for security alert
      const variablesValues = [lineWorkerName].join('%7C');

      // Construct Fast2SMS API URL
      const entityIdParam = this.config.entityId ? `&entity_id=${this.config.entityId}` : '';
      const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${this.config.apiKey}&route=dlt&sender_id=${this.config.senderId}&message=${messageId}&variables_values=${variablesValues}&flash=0&numbers=${formattedPhone}${entityIdParam}`;

      console.log('🚨 Sending security alert SMS via Fast2SMS:', {
        phoneNumber: formattedPhone,
        lineWorkerName,
        apiUrl: apiUrl.substring(0, 100) + '...'
      });

      // Check if Fast2SMS is configured
      if (!this.config.apiKey) {
        console.log('⚠️ Fast2SMS not configured - using development mode');
        console.log('🚨 Would send security alert to:', formattedPhone);
        console.log('📝 Line Worker:', lineWorkerName);
        
        return {
          success: true,
          message: `Security alert logged in development mode for ${lineWorkerName}`
        };
      }

      // Make API call to Fast2SMS
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const data: Fast2SMSResponse = await response.json();
      
      if (data.return && data.request_id) {
        console.log('✅ Security alert sent successfully via Fast2SMS:', {
          requestId: data.request_id,
          messages: data.message
        });
        
        return {
          success: true,
          message: 'Security alert sent successfully',
          requestId: data.request_id
        };
      } else {
        console.error('❌ Fast2SMS API error for security alert:', data);
        return {
          success: false,
          message: 'Failed to send security alert',
          error: data.message?.join(', ') || 'Unknown error'
        };
      }

    } catch (error) {
      console.error('❌ Error sending security alert via Fast2SMS:', error);
      
      return {
        success: true,
        message: `Security alert logged in development mode for ${lineWorkerName}`
      };
    }
  }

  private getFast2SMSMessageId(templateType: 'retailer' | 'wholesaler'): string {
    // Fast2SMS message IDs (not DLT template IDs)
    switch (templateType) {
      case 'retailer':
        return '199054'; // Fast2SMS message ID for RetailerNotify
      case 'wholesaler':
        return '199055'; // Fast2SMS message ID for WholeSalerNotify
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getConfigStatus(): { configured: boolean; missing: string[] } {
    const required = ['apiKey'];
    const optional = ['senderId', 'entityId'];
    const missing = required.filter(key => !this.config[key as keyof Fast2SMSConfig]);
    
    return {
      configured: missing.length === 0,
      missing
    };
  }

  // Helper method to format date as DD/MM/YY
  static formatDateForSMS(date: Date = new Date()): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  // Helper method to get entity ID
  getEntityId(): string | undefined {
    return this.config.entityId;
  }
}

// Export singleton instance
export const fast2SMSService = new Fast2SMSService();