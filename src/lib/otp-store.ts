// Shared OTP store for demo purposes
// In production, you'd use a more robust storage solution like Redis or database
export const otpStore = new Map<string, { 
  code: string; 
  expiresAt: Date; 
  attempts: number;
  lastAttemptAt: Date | null;
  cooldownUntil: Date | null;
  consecutiveFailures: number;
  breachDetected: boolean;
}>();

// Store for active OTPs that need to be displayed on retailer dashboard
export const activeOTPs = new Map<string, {
  code: string;
  retailerId: string;
  amount: number;
  expiresAt: Date;
  paymentId: string;
  lineWorkerName: string;
  createdAt: Date;
}>();

// Store for completed payments to show settlement notifications
export const completedPayments = new Map<string, {
  retailerId: string;
  amount: number;
  paymentId: string;
  lineWorkerName: string;
  completedAt: Date;
  remainingOutstanding: number;
}>();

export function generateOTP(): string {
  // Generate 4 random digits
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Randomly insert R and X at different positions
  const positions = [0, 1, 2, 3, 4, 5];
  const rPosition = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
  const xPosition = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
  
  // Build the OTP with R and X inserted
  let otp = digits.split('');
  otp.splice(rPosition, 0, 'R');
  otp.splice(xPosition + (xPosition > rPosition ? 1 : 0), 0, 'X');
  
  return otp.join('');
}

// Security tracking functions
export function checkSecurityLimits(paymentId: string): {
  canAttempt: boolean;
  remainingAttempts: number;
  cooldownTime?: number;
  message?: string;
} {
  const otpData = otpStore.get(paymentId);
  
  if (!otpData) {
    return { canAttempt: true, remainingAttempts: 3 };
  }

  const now = new Date();

  // Check if in cooldown period
  if (otpData.cooldownUntil && otpData.cooldownUntil > now) {
    const remainingCooldown = Math.ceil((otpData.cooldownUntil.getTime() - now.getTime()) / 1000);
    return {
      canAttempt: false,
      remainingAttempts: 0,
      cooldownTime: remainingCooldown,
      message: `Too many attempts. Please wait ${remainingCooldown} seconds before trying again.`
    };
  }

  // Check if breach detected
  if (otpData.breachDetected) {
    return {
      canAttempt: false,
      remainingAttempts: 0,
      message: 'Security breach detected. Please contact your wholesaler.'
    };
  }

  // Check attempts
  const remainingAttempts = Math.max(0, 3 - otpData.attempts);
  
  return {
    canAttempt: remainingAttempts > 0,
    remainingAttempts
  };
}

export function recordFailedAttempt(paymentId: string): {
  success: boolean;
  breachDetected: boolean;
  cooldownTriggered: boolean;
  message?: string;
} {
  const otpData = otpStore.get(paymentId);
  
  if (!otpData) {
    return { success: false, breachDetected: false, cooldownTriggered: false };
  }

  const now = new Date();
  
  // Update attempt tracking
  otpData.attempts++;
  otpData.lastAttemptAt = now;
  otpData.consecutiveFailures++;

  // Check for breach detection (6 consecutive failures)
  if (otpData.consecutiveFailures >= 6) {
    otpData.breachDetected = true;
    otpStore.set(paymentId, otpData);
    
    console.log('🚨 SECURITY BREACH DETECTED:', {
      paymentId,
      consecutiveFailures: otpData.consecutiveFailures,
      timestamp: now.toISOString()
    });
    
    return {
      success: true,
      breachDetected: true,
      cooldownTriggered: false,
      message: 'Security breach detected. Wholesaler has been notified.'
    };
  }

  // Check for cooldown trigger (3 failures)
  if (otpData.attempts >= 3) {
    otpData.cooldownUntil = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes cooldown
    otpStore.set(paymentId, otpData);
    
    console.log('⏰ COOLDOWN TRIGGERED:', {
      paymentId,
      attempts: otpData.attempts,
      cooldownUntil: otpData.cooldownUntil.toISOString()
    });
    
    return {
      success: true,
      breachDetected: false,
      cooldownTriggered: true,
      message: 'Too many failed attempts. Please wait 2 minutes before trying again.'
    };
  }

  // Update store
  otpStore.set(paymentId, otpData);
  
  return {
    success: true,
    breachDetected: false,
    cooldownTriggered: false
  };
}

export function resetSecurityTracking(paymentId: string) {
  const otpData = otpStore.get(paymentId);
  
  if (otpData) {
    otpData.attempts = 0;
    otpData.lastAttemptAt = null;
    otpData.cooldownUntil = null;
    otpData.consecutiveFailures = 0;
    otpData.breachDetected = false;
    otpStore.set(paymentId, otpData);
    
    console.log('🔄 Security tracking reset for payment:', paymentId);
  }
}

export function getSecurityStatus(paymentId: string): {
  attempts: number;
  consecutiveFailures: number;
  breachDetected: boolean;
  inCooldown: boolean;
  cooldownTime?: number;
} {
  const otpData = otpStore.get(paymentId);
  
  if (!otpData) {
    return {
      attempts: 0,
      consecutiveFailures: 0,
      breachDetected: false,
      inCooldown: false
    };
  }

  const now = new Date();
  const inCooldown = otpData.cooldownUntil ? otpData.cooldownUntil > now : false;
  const cooldownTime = inCooldown && otpData.cooldownUntil 
    ? Math.ceil((otpData.cooldownUntil.getTime() - now.getTime()) / 1000)
    : undefined;

  return {
    attempts: otpData.attempts,
    consecutiveFailures: otpData.consecutiveFailures,
    breachDetected: otpData.breachDetected,
    inCooldown,
    cooldownTime
  };
}

export async function sendOTPToRetailer(phone: string, otp: string, amount: number): Promise<boolean> {
  console.log('📱 OTP generated for retailer dashboard display');
  console.log('📞 Phone:', phone);
  console.log('💰 Amount: ₹', amount.toLocaleString());
  console.log('⏰ Time:', new Date().toISOString());

  // For demo purposes, we'll simulate successful sending
  // In production, you would handle actual SMS sending and error handling
  console.log(`📝 OTP added to retailer dashboard: ${otp}`);
  return true;
}

export function cleanupExpiredOTPs() {
  const now = new Date();
  
  // Clean up OTP store
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
  
  // Clean up active OTPs
  for (const [key, value] of activeOTPs.entries()) {
    if (value.expiresAt < now) {
      activeOTPs.delete(key);
    }
  }

  // Clean up expired OTPs from Firestore (async, don't wait)
  import('@/services/firestore').then(({ otpService }) => {
    otpService.cleanupExpiredOTPs().catch(error => {
      console.error('Error cleaning up expired OTPs from Firestore:', error);
    });
  });
}

export function addActiveOTP(otpData: {
  code: string;
  retailerId: string;
  amount: number;
  paymentId: string;
  lineWorkerName: string;
  expiresAt?: Date; // Optional: if not provided, will create new one
  createdAt?: Date; // Optional: if not provided, will create new one
}) {
  const expiresAt = otpData.expiresAt || new Date(Date.now() + 7 * 60 * 1000); // Use provided or create new one
  const createdAt = otpData.createdAt || new Date(); // Use provided or create new one
  
  activeOTPs.set(otpData.paymentId, {
    ...otpData,
    expiresAt,
    createdAt
  });
  
  console.log('📱 Added active OTP for retailer dashboard:', {
    paymentId: otpData.paymentId,
    retailerId: otpData.retailerId,
    code: otpData.code,
    amount: otpData.amount,
    expiresAt: expiresAt.toISOString(),
    duration: '7 minutes'
  });
  
  // Also log to console for development
  console.log(`🚨 NEW OTP GENERATED: ${otpData.code} for ₹${otpData.amount.toLocaleString()} by ${otpData.lineWorkerName}`);
}

export function getActiveOTPsForRetailer(retailerId: string) {
  const now = new Date();
  const retailerOTPs: Array<{
    code: string;
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    expiresAt: Date;
    createdAt: Date;
  }> = [];
  
  for (const [paymentId, otpData] of activeOTPs.entries()) {
    if (otpData.retailerId === retailerId) {
      // Check if OTP is still valid (not expired)
      if (otpData.expiresAt > now) {
        retailerOTPs.push(otpData);
      } else {
        // Keep expired OTPs for at least 2 minutes after expiration for display purposes
        const timeSinceExpiration = now.getTime() - otpData.expiresAt.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (timeSinceExpiration < twoMinutesInMs) {
          retailerOTPs.push({
            ...otpData,
            // Mark as expired but still show it
            code: otpData.code + " (EXPIRED)"
          });
        } else {
          // Remove OTPs older than 2 minutes after expiration
          activeOTPs.delete(paymentId);
          console.log('🗑️ Removed expired OTP from display:', paymentId);
        }
      }
    }
  }
  
  // Sort by creation time (newest first)
  return retailerOTPs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function removeActiveOTP(paymentId: string) {
  activeOTPs.delete(paymentId);
  console.log('🗑️ Removed active OTP for payment:', paymentId);
}

export function addCompletedPayment(paymentData: {
  retailerId: string;
  amount: number;
  paymentId: string;
  lineWorkerName: string;
  remainingOutstanding: number;
}) {
  const completedAt = new Date();
  
  completedPayments.set(paymentData.paymentId, {
    ...paymentData,
    completedAt
  });
  
  console.log('✅ Added completed payment for retailer dashboard:', {
    paymentId: paymentData.paymentId,
    retailerId: paymentData.retailerId,
    amount: paymentData.amount,
    remainingOutstanding: paymentData.remainingOutstanding,
    completedAt: completedAt.toISOString()
  });
}

export function getCompletedPaymentsForRetailer(retailerId: string) {
  const retailerPayments: Array<{
    amount: number;
    paymentId: string;
    lineWorkerName: string;
    completedAt: Date;
    remainingOutstanding: number;
  }> = [];
  
  for (const [paymentId, paymentData] of completedPayments.entries()) {
    if (paymentData.retailerId === retailerId) {
      retailerPayments.push(paymentData);
    }
  }
  
  return retailerPayments;
}

export function removeCompletedPayment(paymentId: string) {
  completedPayments.delete(paymentId);
  console.log('🗑️ Removed completed payment notification:', paymentId);
}