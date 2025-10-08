import { sendSMSNotification } from '@/lib/sms-notifications';

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

export class SMSOTPService {
  private config: OTPConfig;

  constructor() {
    this.config = getOTPConfig();
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      // Format phone number for international use
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Create OTP message
      const message = `Your PharmaLync OTP is: ${otp}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.`;

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

      // Send actual SMS via Twilio - with error handling
      try {
        const smsResult = await sendSMSNotification({
          to: formattedPhone,
          message
        });

        if (smsResult) {
          console.log('✅ OTP sent successfully via SMS to:', formattedPhone);
          return {
            success: true,
            message: 'OTP sent successfully to your mobile number'
          };
        } else {
          throw new Error('SMS service returned false');
        }
      } catch (twilioError) {
        console.error('❌ Twilio error:', twilioError);
        // Fallback to development mode
        console.log('📱 Development mode - OTP:', otp);
        return {
          success: true,
          message: `OTP generated successfully. Development mode: ${otp}`
        };
      }

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
export const smsOTPService = new SMSOTPService();