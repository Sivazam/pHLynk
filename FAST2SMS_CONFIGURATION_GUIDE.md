# Fast2SMS Configuration Guide

## Firebase Functions Configuration

For the cloud functions to work properly, you need to configure the Fast2SMS settings in your Firebase Functions environment.

### 1. Set Firebase Functions Config

Run these commands in your project directory:

```bash
# Set Fast2SMS API key
firebase functions:config:set fast2sms.api_key="YOUR_FAST2SMS_API_KEY"

# Set Fast2SMS sender ID (optional, defaults to 'SNSYST')
firebase functions:config:set fast2sms.sender_id="YOUR_SENDER_ID"

# Set Fast2SMS entity ID (required for DLT compliance)
firebase functions:config:set fast2sms.entity_id="YOUR_ENTITY_ID"
```

### 2. Required Configuration Values

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `fast2sms.api_key` | Your Fast2SMS API key | ✅ Yes | - |
| `fast2sms.sender_id` | 6-character sender ID | ❌ No | SNSYST |
| `fast2sms.entity_id` | DLT entity ID | ✅ Yes | - |

### 3. Fast2SMS Template Configuration

The cloud functions use these pre-approved DLT templates:

#### Retailer Notification (Template ID: 199054)
```
"Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}."
```

**Variables Order:**
1. `{#var#}` - Payment amount
2. `{#var#}` - Retailer name  
3. `{#var#}` - Retailer area
4. `{#var#}` - Wholesaler name
5. `{#var#}` - Line worker name
6. `{#var#}` - Collection date

#### Wholesaler Notification (Template ID: 199055)
```
"Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}."
```

**Variables Order:**
1. `{#var#}` - Payment amount
2. `{#var#}` - Retailer name
3. `{#var#}` - Retailer area  
4. `{#var#}` - Line worker name
5. `{#var#}` - Wholesaler name
6. `{#var#}` - Collection date

### 4. Verification Commands

Check your current configuration:

```bash
# View all config
firebase functions:config:get

# View specific Fast2SMS config
firebase functions:config:get fast2sms
```

### 5. Testing Configuration

After setting up the configuration, test it:

```bash
# Test cloud functions locally
firebase emulators:start --only functions

# Or deploy and test
firebase deploy --only functions
```

Then use the test endpoint:
```bash
curl -X POST http://localhost:3000/api/test-cloud-functions
```

### 6. Troubleshooting

#### Common Issues:

1. **"Fast2SMS API key not configured"**
   - Run: `firebase functions:config:set fast2sms.api_key="YOUR_KEY"`

2. **"Fast2SMS entity ID not configured"**
   - Run: `firebase functions:config:set fast2sms.entity_id="YOUR_ENTITY_ID"`

3. **SMS not sending**
   - Check API key validity
   - Verify entity ID is correct
   - Check template IDs are approved

4. **Wrong variable order in SMS**
   - Ensure variables match the approved DLT template order exactly
   - Check cloud function logs for variable values

### 7. Security Notes

- Never commit API keys to version control
- Use different API keys for development and production
- Monitor SMS usage and costs
- Implement rate limiting (already included in cloud functions)

### 8. Monitoring

Monitor your cloud functions through:

1. **Firebase Console**: Functions → Logs
2. **Firestore**: `smsLogs` collection for delivery status
3. **Fast2SMS Dashboard**: API usage and delivery reports

### 9. Rate Limits

The cloud functions include built-in rate limiting:
- **SMS Functions**: 5 requests per minute per IP/user
- **Process SMS Response**: 20 requests per minute per IP/user

These limits prevent abuse and ensure reliable delivery.