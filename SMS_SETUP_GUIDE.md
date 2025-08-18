# SMS/OTP Setup Guide

## Current Status
Your OTP system is currently working in **demo mode** - it generates OTPs and logs them to the console but doesn't send actual SMS messages.

## To Enable Real SMS Delivery

### Option 1: Twilio (Recommended for International)

1. **Sign up for Twilio**
   - Go to https://www.twilio.com/
   - Create a free account
   - Verify your email and phone number

2. **Get Your Credentials**
   - Login to Twilio Console
   - Go to Dashboard → Account Info
   - Copy your **Account SID** and **Auth Token**

3. **Get a Twilio Phone Number**
   - Go to Phone Numbers → Buy a Number
   - Search for Indian numbers (+91) or choose any available number
   - Purchase the number (trial accounts get some free credit)

4. **Configure Environment Variables**
   - Open your `.env` file
   - Replace the placeholder values:
     ```
     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     TWILIO_AUTH_TOKEN=your_auth_token_here
     TWILIO_PHONE_NUMBER=+1234567890
     ```

5. **Test SMS Sending**
   - Restart your development server
   - Try sending an OTP - it should now send real SMS!

### Option 2: Indian SMS Providers (More Cost-Effective for India)

#### MSG91 Setup
1. Sign up at https://msg91.com/
2. Get API key from dashboard
3. Add to `.env`:
   ```
   MSG91_AUTH_KEY=your_msg91_auth_key
   MSG91_SENDER_ID=your_sender_id
   ```

#### Fast2SMS Setup
1. Sign up at https://www.fast2sms.com/
2. Get API key from dashboard
3. Add to `.env`:
   ```
   FAST2SMS_API_KEY=your_fast2sms_api_key
   FAST2SMS_SENDER_ID=your_sender_id
   ```

### Option 3: Firebase Phone Authentication (Free but Limited)

Firebase offers phone authentication that can send OTPs, but it's designed for user authentication, not general SMS notifications.

## Testing Your Setup

After configuring your SMS service:

1. **Restart the development server**
   ```bash
   npm run dev
   ```

2. **Test OTP sending**
   - Go to your application
   - Try to collect a payment
   - Click "Proceed to OTP"
   - Check the console for detailed logs

3. **Check for success messages**
   - With Twilio: Look for "✅ SMS sent via Twilio! Message SID: xxx"
   - With other providers: Similar success messages

## Troubleshooting

### Common Issues:

1. **"Twilio credentials not found"**
   - Make sure you've set the environment variables in `.env`
   - Restart the server after changing `.env`

2. **SMS not delivered**
   - Check if the phone number format is correct (should include country code)
   - Verify your Twilio account has sufficient balance
   - Check Twilio logs for error details

3. **Country code issues**
   - The system automatically adds +91 for Indian numbers
   - For other countries, make sure numbers include the country code

4. **Trial account limitations**
   - Twilio trial accounts can only send SMS to verified numbers
   - Upgrade your account or verify your phone number in Twilio console

## Cost Considerations

- **Twilio**: ~$1-2 per month for phone number + ~$0.08 per SMS to India
- **Indian providers**: Often cheaper for Indian SMS (~$0.02-0.05 per SMS)
- **Volume discounts**: Available for high usage

## Security Notes

- Never commit your actual credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys and tokens
- Monitor your SMS usage for unusual activity