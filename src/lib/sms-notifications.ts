// Twilio configuration function
function getTwilioConfig(): { accountSid?: string; authToken?: string; twilioPhoneNumber?: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  // Return null if not configured
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.log('⚠️ Twilio not configured. Missing:', {
      accountSid: !accountSid ? 'TWILIO_ACCOUNT_SID' : undefined,
      authToken: !authToken ? 'TWILIO_AUTH_TOKEN' : undefined,
      twilioPhoneNumber: !twilioPhoneNumber ? 'TWILIO_PHONE_NUMBER' : undefined
    });
    return null;
  }
  
  return {
    accountSid,
    authToken,
    twilioPhoneNumber
  };
}

interface SMSNotification {
  to: string;
  message: string;
}

interface PaymentDetails {
  amount: number;
  retailerName: string;
  lineWorkerName: string;
  pendingAmount: number;
  paymentId: string;
}

export async function sendSMSNotification(notification: SMSNotification): Promise<boolean> {
  const twilioConfig = getTwilioConfig();
  
  if (!twilioConfig || !twilioConfig.twilioPhoneNumber) {
    console.log('⚠️ Twilio not configured for SMS notifications');
    console.log('📱 Would send SMS to:', notification.to);
    console.log('📝 Message:', notification.message);
    return false;
  }

  try {
    // Dynamically import Twilio only when needed
    const twilioModule = await import('twilio');
    const client = new twilioModule.Twilio(twilioConfig.accountSid, twilioConfig.authToken);

    // Format phone number for international use
    const formattedPhone = notification.to.startsWith('+') ? notification.to : `+91${notification.to}`;

    const message = await client.messages.create({
      body: notification.message,
      from: twilioConfig.twilioPhoneNumber,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully! Message SID: ${message.sid}`);
    console.log(`📱 To: ${formattedPhone}`);
    console.log(`📝 Message: ${notification.message}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending SMS notification:', error);
    console.log('📱 Would send SMS to:', notification.to);
    console.log('📝 Message:', notification.message);
    return false;
  }
}

export function generateWholesaleUserNotification(paymentDetails: PaymentDetails): SMSNotification {
  const message = `PharmaLynk Payment Alert: ₹${paymentDetails.amount.toLocaleString()} paid by ${paymentDetails.retailerName} to ${paymentDetails.lineWorkerName}. Pending amount: ₹${paymentDetails.pendingAmount.toLocaleString()}. Payment ID: ${paymentDetails.paymentId}`;
  
  return {
    to: '', // This will be set when we have the wholesale user's phone
    message
  };
}

export function generateRetailerNotification(paymentDetails: PaymentDetails): SMSNotification {
  const message = `PharmaLynk Payment Confirmation: You have successfully paid ₹${paymentDetails.amount.toLocaleString()}. Your pending amount is now ₹${paymentDetails.pendingAmount.toLocaleString()}. Payment ID: ${paymentDetails.paymentId}`;
  
  return {
    to: '', // This will be set when we have the retailer's phone
    message
  };
}

export async function sendPaymentCompletionNotifications(
  retailerPhone: string,
  wholesaleUserPhone: string,
  paymentDetails: PaymentDetails
): Promise<{ wholesaleSent: boolean; retailerSent: boolean }> {
  console.log('🔔 Sending payment completion notifications...');
  console.log('💰 Payment Details:', paymentDetails);

  // Send notification to wholesale user
  const wholesaleNotification = generateWholesaleUserNotification(paymentDetails);
  wholesaleNotification.to = wholesaleUserPhone;
  const wholesaleSent = await sendSMSNotification(wholesaleNotification);

  // Send notification to retailer
  const retailerNotification = generateRetailerNotification(paymentDetails);
  retailerNotification.to = retailerPhone;
  const retailerSent = await sendSMSNotification(retailerNotification);

  console.log('📧 Notification Results:');
  console.log(`  Wholesale User: ${wholesaleSent ? '✅ Sent' : '❌ Failed'}`);
  console.log(`  Retailer: ${retailerSent ? '✅ Sent' : '❌ Failed'}`);

  return {
    wholesaleSent,
    retailerSent
  };
}