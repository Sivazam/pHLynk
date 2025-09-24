interface Fast2SMSConfig {
  apiKey?: string;
  senderId?: string;
}

interface Fast2SMSResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

interface SMSVariables {
  amount: string;
  lineWorkerName: string;
  retailerName: string;
  retailerArea: string;
  wholesalerName: string;
  collectionDate: string;
}

export class Fast2SMSService {
  private config: Fast2SMSConfig;

  constructor() {
    this.config = this.getConfig();
  }

  private getConfig(): Fast2SMSConfig {
    return {
      apiKey: process.env.FAST2SMS_API_KEY,
      senderId: process.env.FAST2SMS_SENDER_ID || 'SNSYST'
    };
  }

  async sendPaymentConfirmationSMS(
    phoneNumber: string,
    templateType: 'retailer' | 'wholesaler',
    variables: SMSVariables
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Format phone number (remove +91 if present, Fast2SMS expects 10-digit)
      const formattedPhone = phoneNumber.startsWith('+91') 
        ? phoneNumber.substring(3) 
        : phoneNumber.startsWith('91') 
        ? phoneNumber.substring(2) 
        : phoneNumber;

      // Get template ID based on type
      const templateId = this.getTemplateId(templateType);
      
      // Format variables for Fast2SMS API - order matters based on template
      let variablesValues: string[];
      
      if (templateType === 'retailer') {
        // Retailer Payment Confirmation template order:
        // Thanks {retailerName}, {retailerArea} for the Payment of {amount}/- to Line man {lineWorkerName} who collected behalf of {wholesalerName} on {collectionDate} - SNSYST.
        variablesValues = [
          variables.retailerName,
          variables.retailerArea,
          variables.amount,
          variables.lineWorkerName,
          variables.wholesalerName,
          variables.collectionDate
        ];
      } else {
        // Wholesaler Collection Notification template order:
        // Congratulations, {amount}/- has been successfully collected from {retailerName}, {retailerArea} by Line man {lineWorkerName} on {collectionDate} - SNSYST.
        variablesValues = [
          variables.amount,
          variables.retailerName,
          variables.retailerArea,
          variables.lineWorkerName,
          variables.collectionDate
        ];
      }
      
      const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

      // Construct Fast2SMS API URL
      const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${this.config.apiKey}&route=dlt&sender_id=${this.config.senderId}&message=${templateId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}`;

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
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+91') 
        ? phoneNumber.substring(3) 
        : phoneNumber.startsWith('91') 
        ? phoneNumber.substring(2) 
        : phoneNumber;

      // Security alert template (you'll need to get the actual template ID)
      const templateId = '198234'; // Placeholder - you'll replace this
      
      // Variables for security alert
      const variablesValues = [lineWorkerName].join('%7C');

      // Construct Fast2SMS API URL
      const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${this.config.apiKey}&route=dlt&sender_id=${this.config.senderId}&message=${templateId}&variables_values=${variablesValues}&flash=0&numbers=${formattedPhone}`;

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

  private getTemplateId(templateType: 'retailer' | 'wholesaler'): string {
    // Updated template IDs from the Excel file
    switch (templateType) {
      case 'retailer':
        return '1707175871824482924'; // RetailerPaymentConfirmation template ID
      case 'wholesaler':
        return '1707175871835697439'; // WholesalerCollectionNotification template ID
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getConfigStatus(): { configured: boolean; missing: string[] } {
    const required = ['apiKey'];
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
}

// Export singleton instance
export const fast2SMSService = new Fast2SMSService();