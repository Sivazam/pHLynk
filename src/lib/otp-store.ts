// Shared OTP store for demo purposes
// In production, you'd use a more robust storage solution like Redis or database
export const otpStore = new Map<string, { code: string; expiresAt: Date; attempts: number }>();

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
  return Math.floor(100000 + Math.random() * 900000).toString();
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
}

export function addActiveOTP(otpData: {
  code: string;
  retailerId: string;
  amount: number;
  paymentId: string;
  lineWorkerName: string;
}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes (more than 2 mins as requested)
  const createdAt = new Date();
  
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
    duration: '10 minutes'
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