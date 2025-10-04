#!/usr/bin/env node

/**
 * Script to help set up Firebase service account environment variables
 * Usage: node setup-env.js path/to/service-account-key.json
 */

const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.log('❌ Usage: node setup-env.js <path-to-service-account-key.json>');
  console.log('   Example: node setup-env.js service-account-key.json');
  process.exit(1);
}

const keyPath = process.argv[2];

if (!fs.existsSync(keyPath)) {
  console.log(`❌ File not found: ${keyPath}`);
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  // Create the JSON string for environment variable
  const envJson = JSON.stringify(serviceAccount)
    .replace(/"/g, '\\"'); // Escape quotes for shell
  
  // Create .env content
  const envContent = `# Firebase Service Account Configuration
# Generated from ${keyPath}

# Complete JSON configuration
APP_FIREBASE_CONFIG="${envJson}"

# Individual variables (backup)
APP_SERVICE_ACCOUNT_TYPE=${serviceAccount.type}
APP_SERVICE_ACCOUNT_PROJECT_ID=${serviceAccount.project_id}
APP_SERVICE_ACCOUNT_PRIVATE_KEY_ID=${serviceAccount.private_key_id}
APP_SERVICE_ACCOUNT_PRIVATE_KEY="${serviceAccount.private_key}"
APP_SERVICE_ACCOUNT_CLIENT_EMAIL=${serviceAccount.client_email}
APP_SERVICE_ACCOUNT_CLIENT_ID=${serviceAccount.client_id}
APP_SERVICE_ACCOUNT_AUTH_URI=${serviceAccount.auth_uri}
APP_SERVICE_ACCOUNT_TOKEN_URI=${serviceAccount.token_uri}
APP_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL=${serviceAccount.auth_provider_x509_cert_url}
APP_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL=${serviceAccount.client_x509_cert_url}
APP_SERVICE_ACCOUNT_UNIVERSE_DOMAIN=${serviceAccount.universe_domain}

# Fast2SMS Configuration (add your actual values)
FAST2SMS_API_KEY=your-fast2sms-api-key
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=your-fast2sms-entity-id
`;

  // Write to .env file
  fs.writeFileSync('.env', envContent);
  
  console.log('✅ Successfully created .env file in functions directory');
  console.log('📝 Please update the Fast2SMS configuration with your actual values');
  console.log('');
  console.log('🚀 You can now run: firebase deploy --only functions');
  
} catch (error) {
  console.error('❌ Error processing service account key:', error.message);
  process.exit(1);
}