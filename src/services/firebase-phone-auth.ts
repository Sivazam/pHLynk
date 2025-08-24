import { auth } from '@/lib/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential,
  User
} from 'firebase/auth';

export class FirebasePhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;
  private useVisibleRecaptcha: boolean = false;

  constructor() {
    // Initialize reCAPTCHA when needed
  }

  /**
   * Initialize reCAPTCHA verifier
   */
  async initializeRecaptcha(containerId: string = 'recaptcha-container'): Promise<void> {
    try {
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
      }

      // Set app verification for Firebase to handle the current domain
      auth.settings.appVerificationDisabledForTesting = false;
      
      this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: this.useVisibleRecaptcha ? 'normal' : 'invisible',
        callback: (response: string) => {
          // reCAPTCHA solved - allow sending OTP
          console.log('reCAPTCHA verified:', response);
        },
        'expired-callback': () => {
          // Response expired - ask user to solve reCAPTCHA again
          console.log('reCAPTCHA expired');
        }
      });

      await this.recaptchaVerifier.render();
      console.log(`reCAPTCHA initialized (${this.useVisibleRecaptcha ? 'visible' : 'invisible'})`);
    } catch (error) {
        console.log('Error initializing reCAPTCHA:', error);
      throw error;
    }
  }

  /**
   * Send OTP to phone number using Firebase Authentication
   */
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.recaptchaVerifier) {
        // Initialize invisible reCAPTCHA if not already done
        await this.initializeRecaptcha();
      }

      // Format phone number for Firebase (should include country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      console.log('Sending OTP via Firebase to:', formattedPhone);

      // Send OTP using Firebase Authentication
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, this.recaptchaVerifier);
      
      console.log('OTP sent successfully via Firebase');
      
      return {
        success: true,
        message: 'OTP sent successfully to your mobile number'
      };
    } catch (error: any) {
      console.log('Error sending OTP via Firebase:', error);
      
      let errorMessage = 'Failed to send OTP';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This user has been disabled';
      } else if (error.code === 'auth/captcha-check-failed') {
        // Try with visible reCAPTCHA as fallback
        if (!this.useVisibleRecaptcha) {
          console.log('Retrying with visible reCAPTCHA...');
          this.useVisibleRecaptcha = true;
          if (this.recaptchaVerifier) {
            this.recaptchaVerifier.clear();
            this.recaptchaVerifier = null;
          }
          return await this.sendOTP(phoneNumber);
        } else {
          errorMessage = 'reCAPTCHA verification failed. This might be due to domain configuration. Please try again later.';
        }
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Verify OTP using Firebase Authentication
   */
  async verifyOTP(otp: string): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      if (!this.confirmationResult) {
        throw new Error('No pending OTP verification. Please request OTP first.');
      }

      console.log('Verifying OTP with Firebase');

      // Verify OTP using Firebase Authentication
      const result = await this.confirmationResult.confirm(otp);
      const user = result.user;
      
      console.log('OTP verified successfully');
      console.log('User:', user.uid, user.phoneNumber);
      
      // Clear confirmation result after successful verification
      this.confirmationResult = null;
      
      return {
        success: true,
        user,
        message: 'OTP verified successfully'
      };
    } catch (error: any) {
        console.log('Error verifying OTP:', error);
      
      let errorMessage = 'Invalid OTP';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Code expired. Please request a new OTP';
      } else if (error.code === 'auth/missing-verification-code') {
        errorMessage = 'Missing verification code';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Clear previous confirmation result
      this.confirmationResult = null;
      
      // Send new OTP
      return await this.sendOTP(phoneNumber);
    } catch (error: any) {
      console.log('Error resending OTP:', error);
      return {
        success: false,
        message: error.message || 'Failed to resend OTP'
      };
    }
  }

  /**
   * Check if Firebase phone auth is configured
   */
  isConfigured(): boolean {
    // Firebase is always configured, but we can check if phone auth is enabled
    // This will be determined at runtime when we try to use it
    return true;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.log('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.confirmationResult = null;
    this.useVisibleRecaptcha = false;
  }
}

// Export singleton instance
export const firebasePhoneAuthService = new FirebasePhoneAuthService();