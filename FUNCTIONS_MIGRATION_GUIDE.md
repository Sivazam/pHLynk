# Firebase Functions Configuration Migration Guide

## Overview
This guide walks you through migrating from the deprecated `functions.config()` API to the modern `.env` approach for Firebase Functions.

## Why Migrate Now?
- `functions.config()` API is deprecated and will be shut down in March 2026
- Firebase CLI commands for managing config are deprecated
- Deployments will fail after March 2026 if not migrated
- `.env` approach is more secure and easier to manage

## Migration Steps

### 1. Update Your Environment Variables

Edit the `.env` file in the `functions/` directory:

```bash
# Fast2SMS Configuration
FAST2SMS_API_KEY=your_actual_fast2sms_api_key
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=your_actual_fast2sms_entity_id

# Firebase Configuration
FIREBASE_PROJECT_ID=plkapp-8c052

# FCM Configuration (if needed)
FCM_SERVER_KEY=your_fcm_server_key_here
```

### 2. Install Dependencies

```bash
cd functions
npm install
```

### 3. Test Locally

```bash
# Build the functions
npm run build

# Test with Firebase emulator
firebase emulators:start --only functions

# In another terminal, test the functions
curl -X POST http://localhost:5001/plkapp-8c052/us-central1/sendRetailerPaymentSMS \
  -H "Content-Type: application/json" \
  -d '{"data": {"retailerId": "test", "paymentId": "test", "amount": 100, "lineWorkerName": "Test", "retailerName": "Test", "collectionDate": "2024-01-01"}}'
```

### 4. Deploy to Production

```bash
# Deploy functions with new environment configuration
firebase deploy --only functions

# Verify deployment
firebase functions:list
```

### 5. Clean Up Old Configuration (Optional)

```bash
# Remove old configuration after successful deployment
firebase functions:config:unset fast2sms

# Verify old config is removed
firebase functions:config:get
```

## Code Changes Made

### Before (Deprecated)
```javascript
const fast2smsConfig = functions.config().fast2sms;
const fast2smsApiKey = fast2smsConfig?.api_key;
```

### After (Modern)
```javascript
const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
```

## Benefits of Migration

1. **Security**: Environment variables are more secure than runtime config
2. **Portability**: Easier to switch between environments
3. **Maintainability**: Standard approach used by modern Node.js applications
4. **Future-proof**: Won't break when Firebase deprecates the old API

## Troubleshooting

### Common Issues

1. **Environment variables not found**
   - Ensure `.env` file exists in `functions/` directory
   - Check that variables are properly spelled

2. **Functions not deploying**
   - Run `npm run build` to check for TypeScript errors
   - Ensure all dependencies are installed

3. **Fast2SMS API errors**
   - Verify API key and entity ID are correct
   - Check if sender ID is properly configured

### Testing Commands

```bash
# Test environment variables are loaded
cd functions && npm run build && node -e "require('dotenv').config(); console.log('API Key:', process.env.FAST2SMS_API_KEY?.substring(0, 10) + '...');"

# Test function locally
firebase emulators:start --only functions

# Check logs
firebase functions:log
```

## Migration Checklist

- [ ] Update `.env` file with actual credentials
- [ ] Install dependencies (`npm install`)
- [ ] Test functions locally with emulator
- [ ] Deploy to production (`firebase deploy --only functions`)
- [ ] Verify functions work correctly
- [ ] Clean up old configuration (`firebase functions:config:unset fast2sms`)
- [ ] Update any documentation

## Support

For issues:
1. Check Firebase Functions documentation
2. Review the migration guide: https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv
3. Check Fast2SMS API documentation for proper configuration

## Security Notes

- Never commit `.env` file to version control
- Use different values for development and production
- Rotate API keys regularly
- Monitor Firebase Functions logs for unusual activity