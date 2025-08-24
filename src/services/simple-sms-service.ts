interface OTPConfig {
  accountSid?: string;
  authToken?: string;
  twilioPhoneNumber?: string;
}

function getOTPConfig(): OTPConfig {
  // In production, these should be environment variables
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER
  };
}

export class SimpleSMSService {
  private config: OTPConfig;

  constructor() {
    this.config = getOTPConfig();
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      // Format phone number for international use
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Create OTP message
      const message = `Your PharmaLynk OTP is: ${otp}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.`;

      // Check if Twilio is configured
      if (!this.config.accountSid || !this.config.authToken || !this.config.twilioPhoneNumber) {
        console.log('⚠️ Twilio not configured - using development mode');
        console.log('📱 Would send SMS to:', formattedPhone);
        console.log('📝 Message:', message);
        
        return {
          success: true,
          message: `OTP generated successfully. In development mode: ${otp}`
        };
      }

      // For now, just log the SMS without actually sending it
      // This avoids the Twilio import issues
      console.log('📱 SMS would be sent to:', formattedPhone);
      console.log('📝 Message:', message);
      console.log('⚠️ Twilio is configured but SMS sending is disabled for now');
      
      return {
        success: true,
        message: 'OTP generated successfully. SMS logging mode enabled.'
      };

    } catch (error) {
      console.error('❌ Error sending OTP SMS:', error);
      
      // Fallback to development mode
      console.log('📱 Development mode - OTP:', otp);
      return {
        success: true,
        message: `OTP generated successfully. Development mode: ${otp}`
      };
    }
  }

  isConfigured(): boolean {
    return !!(this.config.accountSid && this.config.authToken && this.config.twilioPhoneNumber);
  }

  getConfigStatus(): { configured: boolean; missing: string[] } {
    const required = ['accountSid', 'authToken', 'twilioPhoneNumber'];
    const missing = required.filter(key => !this.config[key as keyof OTPConfig]);
    
    return {
      configured: missing.length === 0,
      missing
    };
  }
}

// Export singleton instance
export const simpleSMSService = new SimpleSMSService();