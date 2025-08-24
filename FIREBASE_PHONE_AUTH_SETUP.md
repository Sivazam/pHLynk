# Firebase Phone Authentication Setup Guide

This guide will help you set up Firebase Phone Authentication for sending real OTP messages to mobile numbers.

## Prerequisites

1. **Firebase Project** - Already created at `pharmalynkk.firebaseapp.com`
2. **Firebase Phone Authentication** - Must be enabled in Firebase Console
3. **Node.js Environment** - For environment variables

## Step 1: Enable Phone Authentication in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pharmalynkk`
3. Go to **Authentication** → **Sign-in method**
4. Click on **Phone** under "Sign-in providers"
5. Enable the phone authentication provider
6. Configure the settings:
   - **Phone numbers for testing**: Add test phone numbers for development
   - **reCAPTCHA**: Configure for your domain

## Step 2: Configure Test Phone Numbers (Development)

For development, you can configure test phone numbers that don't require actual SMS:

1. In Firebase Console → Authentication → Sign-in method → Phone
2. Scroll down to **Phone numbers for testing**
3. Add test phone numbers:
   - **Phone number**: `+919876543210`
   - **Code**: `123456`
   - **Phone number**: `+911234567890`
   - **Code**: `654321`

4. Click **Add**

## Step 3: Verify Firebase Configuration

The Firebase configuration is already set up in `/src/lib/firebase.ts`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAiuROMuOXyBTQ2tAn_7lCk8qBsKLcKBds",
  authDomain: "pharmalynkk.firebaseapp.com",
  projectId: "pharmalynkk",
  storageBucket: "pharmalynkk.firebasestorage.app",
  messagingSenderId: "877118992574",
  appId: "1:877118992574:web:ca55290c721d1c4b18eeef"
};
```

## Step 4: Test Phone Authentication

1. Go to `/retailer-login` in your application
2. Enter a phone number (use test numbers for development)
3. Click "Send OTP"
4. Enter the OTP (use test codes for development)
5. Click "Verify OTP"

## Development vs Production

### Development Mode
- Uses test phone numbers configured in Firebase
- OTP codes are predefined (e.g., `123456`)
- No actual SMS is sent
- reCAPTCHA may be disabled in development

### Production Mode
- Sends actual SMS to real phone numbers
- Uses Firebase's SMS infrastructure
- reCAPTCHA verification is required
- Real OTP codes with expiration

## Troubleshooting

### Common Issues

1. **Phone Authentication Not Enabled**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Phone authentication
   - Save changes

2. **reCAPTCHA Issues**
   - Ensure your domain is whitelisted
   - Check reCAPTCHA site key configuration
   - Verify domain DNS settings

3. **Invalid Phone Number Format**
   - Use international format: `+91XXXXXXXXXX`
   - Ensure 10-digit number after country code
   - No spaces or special characters

4. **OTP Not Received**
   - Check if phone number is correct
   - Verify SMS delivery in Firebase Console
   - Check if number is blocked by carrier

5. **Quota Exceeded**
   - Firebase has free tier limits for SMS
   - Check usage in Firebase Console
   - Upgrade to Blaze plan if needed

### Debug Commands

Check Firebase configuration:
```javascript
// In browser console
firebase.auth().settings.appVerificationDisabledForTesting = true;
```

Test phone authentication manually:
```javascript
// In browser console
const phoneNumber = "+919876543210";
const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');
firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
  .then(confirmationResult => {
    console.log('OTP sent:', confirmationResult);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Cost Considerations

### Firebase Free Tier (Spark Plan)
- 10K phone authentications per month
- Free reCAPTCHA verification
- Limited to test phone numbers in development

### Firebase Paid Tier (Blaze Plan)
- Pay-as-you-go pricing
- $0.01 - $0.06 per authentication (varies by country)
- Additional costs for SMS beyond free tier
- Full production capabilities

## Security Notes

- **Never expose test OTP codes in production**
- **Always use reCAPTCHA in production**
- **Implement rate limiting to prevent abuse**
- **Monitor authentication usage in Firebase Console**
- **Keep Firebase configuration secure**

## Production Deployment

When deploying to production:

1. **Enable Phone Authentication** in Firebase Console
2. **Remove test phone numbers** from production
3. **Configure reCAPTCHA** for your production domain
4. **Set up billing** (Blaze plan) for SMS
5. **Monitor usage** and set up alerts
6. **Implement proper error handling** for failed authentications

## Firebase Console Links

- **Firebase Console**: https://console.firebase.google.com/
- **Authentication Settings**: https://console.firebase.google.com/project/pharmalynkk/authentication
- **Phone Authentication**: https://console.firebase.google.com/project/pharmalynkk/authentication/providers

## API Reference

The Firebase Phone Authentication service provides:

- `sendOTP(phoneNumber)`: Send OTP to phone number
- `verifyOTP(otp)`: Verify entered OTP
- `resendOTP(phoneNumber)`: Resend OTP to same number
- `getCurrentUser()`: Get currently authenticated user
- `signOut()`: Sign out current user

## Integration with Retailer System

The Firebase phone authentication integrates with the existing retailer system:

1. **Phone Number Verification**: Links Firebase auth with retailer accounts
2. **Account Status**: Updates retailer verification status
3. **Login Tracking**: Records last login time
4. **Security**: Uses Firebase's secure authentication system

This provides a secure, scalable, and production-ready phone authentication system for your retailer login functionality.