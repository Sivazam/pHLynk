# SMS Notification Implementation for PharmaLync

## Overview

This document describes the implementation of SMS notifications for successful payment collection in the PharmaLync platform using Fast2SMS API with approved DLT templates.

## Approved Templates

### 1. RetailerNotify
- **DLT Template ID**: `11-1XAV7MG4PYBD7` (for reference)
- **Fast2SMS Message ID**: `199054` (used in API calls)
- **Status**: Approved
- **Content**: "Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}. — SAANVI SYSTEMS"

### 2. WholeSalerNotify
- **DLT Template ID**: `11-1XAXAMG4Q387R` (for reference)
- **Fast2SMS Message ID**: `199055` (used in API calls)
- **Status**: Approved
- **Content**: "Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}. — SAANVI SYSTEMS."

## Fast2SMS API Format

The implementation uses the correct Fast2SMS API format:

```
https://www.fast2sms.com/dev/bulkV2?authorization=(Your API Key)&route=dlt&sender_id=ROTCMS&message=198233&variables_values=1111%7C2222%7C3333%7C4444%7C&flash=0&numbers=9014882779
```

### API Parameters Used:
- **authorization**: Fast2SMS API key
- **route**: `dlt` (for DLT route)
- **sender_id**: `SNSYST` (configurable)
- **message**: Fast2SMS message ID (`199054` or `199055`)
- **variables_values**: URL-encoded pipe-separated variables
- **flash**: `0` (non-flash SMS)
- **numbers**: Recipient phone number
- **entity_id**: Optional entity ID for DLT compliance

## Variable Mapping

### Retailer SMS Variables:
| Variable | Source | Description |
|----------|--------|-------------|
| `{#var#}` | `payment.totalPaid.toString()` | Amount that Retailer accepted to pay |
| `{#var#}` | `retailerUser.name` | Name of the Retailer who is paying |
| `{#var#}` | `retailerData.areaName` | Area associated to this Retailer |
| `{#var#}` | `wholesalerData.displayName || wholesalerData.name` | Wholesaler Name (goods supplied by) |
| `{#var#}` | `lineWorkerData.name` | Line worker name |
| `{#var#}` | `Fast2SMSService.formatDateForSMS(new Date())` | Date on which this payment happened |

### Wholesaler SMS Variables:
| Variable | Source | Description |
|----------|--------|-------------|
| `{#var#}` | `payment.totalPaid.toString()` | Amount that retailer paid successfully |
| `{#var#}` | `retailerUser.name` | Name of the Retailer who paid |
| `{#var#}` | `retailerData.areaName` | Area of this Retailer associated |
| `{#var#}` | `lineWorkerData.name` | Line worker Name |
| `{#var#}` | `wholesalerData.displayName || wholesalerData.name` | Wholesaler with whom this Line worker is associated |
| `{#var#}` | `Fast2SMSService.formatDateForSMS(new Date())` | Date on which this payment happened |

## Implementation Details

### Fast2SMS Service (`src/services/fast2sms-service.ts`)

The Fast2SMS service has been updated to use the approved template IDs and correct variable mapping.

#### Key Features:
- **Template Management**: Uses approved Fast2SMS message IDs for API calls
- **DLT Compliance**: Includes DLT template IDs for reference and entity_id parameter
- **Variable Mapping**: Correctly maps variables according to approved template order
- **Entity ID Support**: Includes entity_id parameter for DLT compliance
- **Error Handling**: Graceful fallback to development mode when API keys are not configured
- **Security Alerts**: Includes security alert SMS for OTP breach attempts

#### Environment Variables:

The service supports the following environment variables:

```bash
# Fast2SMS Configuration
fast2sms_api_key=your_fast2sms_api_key_here
FAST2SMS_SENDER_ID=SNSYST  # Default sender ID
entityid=your_entity_id_here
```

#### Usage Example:

```typescript
import { fast2SMSService } from '@/services/fast2sms-service';

// Send payment confirmation SMS
const result = await fast2SMSService.sendPaymentConfirmationSMS(
  '912345678901',  // Phone number
  'retailer',      // Template type: 'retailer' or 'wholesaler'
  {
    amount: '579',
    lineWorkerName: 'John Doe',
    retailerName: 'ABC Pharmacy',
    retailerArea: 'Downtown',
    wholesalerName: 'XYZ Meds',
    collectionDate: '24/09/25'
  }
);
```

### SMS Notification Trigger

SMS notifications are automatically triggered after successful OTP verification in the payment flow:

**Location**: `src/app/api/otp/verify/route.ts`

#### Trigger Flow:
1. User enters correct OTP
2. Payment state is updated to 'COMPLETED'
3. SMS notifications are sent to both retailer and wholesaler
4. PWA push notifications are sent
5. Real-time dashboard updates are triggered

#### Implementation:

```typescript
// Send payment confirmation SMS to both retailer and wholesaler
try {
  const payment = await getPaymentWithCorrectTenant(paymentId);
  if (payment) {
    // Get retailer user details
    const retailerUser = await RetailerAuthService.getRetailerUserByRetailerId(payment.retailerId);
    
    if (retailerUser) {
      // Get line worker details
      const lineWorkerRef = doc(db, 'users', payment.lineWorkerId);
      const lineWorkerDoc = await getDoc(lineWorkerRef);
      
      if (lineWorkerDoc.exists()) {
        const lineWorkerData = lineWorkerDoc.data();
        const lineWorkerName = lineWorkerData.name || 'Line Worker';
        
        // Get retailer details for area information
        const retailerRef = doc(db, 'retailers', payment.retailerId);
        const retailerDoc = await getDoc(retailerRef);
        
        let retailerArea = 'Unknown Area';
        if (retailerDoc.exists()) {
          const retailerData = retailerDoc.data();
          retailerArea = retailerData.areaName || 'Unknown Area';
        }
        
        // Format collection date
        const collectionDate = Fast2SMSService.formatDateForSMS(new Date());
        
        // Send SMS to retailer
        if (retailerUser.phone) {
          const retailerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
            retailerUser.phone,
            'retailer',
            {
              amount: payment.totalPaid.toString(),
              lineWorkerName,
              retailerName: retailerUser.name || 'Retailer',
              retailerArea,
              collectionDate,
              wholesalerName: lineWorkerData.wholesalerName || 'Wholesaler'
            }
          );
          
          console.log('📱 Retailer confirmation SMS result:', retailerSMSResult);
        }
        
        // Send SMS to wholesaler
        if (lineWorkerData.wholesalerId) {
          const wholesalerRef = doc(db, 'users', lineWorkerData.wholesalerId);
          const wholesalerDoc = await getDoc(wholesalerRef);
          
          if (wholesalerDoc.exists()) {
            const wholesalerData = wholesalerDoc.data();
            if (wholesalerData.phone) {
              const wholesalerSMSResult = await fast2SMSService.sendPaymentConfirmationSMS(
                wholesalerData.phone,
                'wholesaler',
                {
                  amount: payment.totalPaid.toString(),
                  lineWorkerName,
                  retailerName: retailerUser.name || 'Retailer',
                  retailerArea,
                  collectionDate,
                  wholesalerName: wholesalerData.displayName || 'Wholesaler'
                }
              );
              
              console.log('📱 Wholesaler confirmation SMS result:', wholesalerSMSResult);
            }
          }
        }
      }
    }
  }
} catch (smsError) {
  console.error('❌ Error sending payment confirmation SMS:', smsError);
  // Don't fail the verification if SMS sending fails
}
```

## Configuration

### Firebase Functions Configuration

Set the environment variables using Firebase Functions config:

```bash
firebase functions:config:set fast2sms.api_key="your_api_key_here"
firebase functions:config:set fast2sms.sender_id="SNSYST"
firebase functions:config:set fast2sms.entity_id="your_entity_id_here"
```

### Environment Variables

For local development, add these to your `.env.local` file:

```bash
# Fast2SMS Configuration
fast2sms_api_key=your_fast2sms_api_key_here
FAST2SMS_SENDER_ID=SNSYST
entityid=your_entity_id_here
```

## Testing

### Development Mode

When Fast2SMS API key is not configured, the service runs in development mode:

```typescript
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
```

### Testing SMS Notifications

1. **Setup Environment Variables**: Configure Fast2SMS API credentials
2. **Initiate Payment**: Use the Line Worker Dashboard to collect payment
3. **Verify OTP**: Enter the OTP sent to the retailer
4. **Check Logs**: Monitor console for SMS sending status
5. **Verify Delivery**: Check if SMS are received on configured phone numbers

### Expected SMS Content

#### Retailer Notification Example:
```
Collection Acknowledgement: An amount of 579/- from ABC Pharmacy, Downtown has been updated in PharmaLync as payment towards goods supplied by XYZ Meds. Collected by Line man John Doe on 24/09/25. — SAANVI SYSTEMS
```

#### Wholesaler Notification Example:
```
Payment Update: 579/- has been recorded in the PharmaLync system from ABC Pharmacy, Downtown. Collected by Line man John Doe on behalf of XYZ Meds on 24/09/25. — SAANVI SYSTEMS.
```

## Error Handling

The SMS notification system includes comprehensive error handling:

1. **API Failures**: Graceful fallback to development mode
2. **Missing Data**: Uses default values for missing retailer/wholesaler information
3. **Network Issues**: Automatic retry logic with proper error logging
4. **Invalid Phone Numbers**: Phone number formatting and validation

### Error Scenarios:

| Scenario | Handling | Expected Behavior |
|----------|----------|-------------------|
| API Key Missing | Development Mode | Logs SMS details without sending |
| Invalid Phone Number | Format Validation | Attempts to format and send |
| Network Error | Retry Logic | Logs error and continues payment flow |
| Template Error | Fallback | Uses default template if available |

## Security Considerations

1. **API Key Security**: API keys are stored in environment variables
2. **Phone Number Validation**: Phone numbers are formatted before sending
3. **Rate Limiting**: Built-in security limits for OTP attempts
4. **Audit Logging**: All SMS attempts are logged for debugging

## Monitoring and Logging

The system includes comprehensive logging:

```typescript
console.log('📤 Sending SMS via Fast2SMS:', {
  phoneNumber: formattedPhone,
  templateType,
  variables,
  apiUrl: apiUrl.substring(0, 100) + '...' // Truncated for security
});
```

### Log Levels:

- **📤**: Sending SMS
- **✅**: SMS sent successfully
- **❌**: SMS sending failed
- **⚠️**: Configuration warnings
- **🚨**: Security alerts

## Troubleshooting

### Common Issues:

1. **SMS Not Sending**:
   - Check Fast2SMS API key configuration
   - Verify entity ID is correct
   - Ensure phone numbers are in correct format

2. **Template Rejection**:
   - Verify template IDs are correct (approved ones)
   - Check variable order matches approved template
   - Ensure entity ID is included in API calls

3. **Development Mode**:
   - API key not configured
   - Service logs SMS details instead of sending
   - Check environment variable names

### Debug Commands:

```bash
# Check Firebase Functions config
firebase functions:config:get

# View logs
firebase functions:log

# Test locally with development mode
# Set FAST2SMS_API_KEY=empty to trigger development mode
```

## Future Enhancements

1. **SMS Delivery Reports**: Implement delivery status tracking
2. **Template Management**: Dynamic template selection based on payment type
3. **Multi-language Support**: Support for regional languages
4. **SMS Scheduling**: Batch SMS sending for better performance
5. **Analytics**: SMS delivery and engagement analytics

## Conclusion

The SMS notification system is now fully implemented with approved DLT templates and proper error handling. The system automatically sends payment confirmation notifications to both retailers and wholesalers after successful OTP verification, with comprehensive logging and monitoring capabilities.