#!/usr/bin/env node

/**
 * Firebase Functions Configuration Migration Script
 * 
 * This script helps migrate from functions.config() to .env files
 * for the deprecated Firebase Runtime Configuration API.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase Functions Configuration Migration');
console.log('==========================================\n');

// Check if we're in the functions directory
if (!fs.existsSync('package.json') || !JSON.parse(fs.readFileSync('package.json', 'utf8')).name.includes('functions')) {
  console.error('❌ Error: Please run this script from the functions directory');
  process.exit(1);
}

console.log('📋 Step 1: Checking current Firebase configuration...');
try {
  const config = execSync('firebase functions:config:get', { encoding: 'utf8' });
  console.log('Current configuration:');
  console.log(config);
  console.log('\n');
} catch (error) {
  console.log('⚠️  Could not retrieve current configuration (might not exist)\n');
}

console.log('📝 Step 2: Creating .env file template...');

// Read existing .env file if it exists
let existingEnv = '';
if (fs.existsSync('.env')) {
  existingEnv = fs.readFileSync('.env', 'utf8');
  console.log('✅ Found existing .env file');
}

// Extract Fast2SMS config from existing config if possible
let fast2smsApiKey = 'your_fast2sms_api_key_here';
let fast2smsSenderId = 'SNSYST';
let fast2smsEntityId = 'your_fast2sms_entity_id_here';

// Try to get existing values from Firebase config
try {
  const configOutput = execSync('firebase functions:config:get', { encoding: 'utf8' });
  const configMatch = configOutput.match(/fast2sms:\s*{\s*api_key:\s*['"]([^'"]+)['"].*?sender_id:\s*['"]([^'"]+)['"].*?entity_id:\s*['"]([^'"]+)['"]/s);
  
  if (configMatch) {
    fast2smsApiKey = configMatch[1];
    fast2smsSenderId = configMatch[2];
    fast2smsEntityId = configMatch[3];
    console.log('✅ Extracted existing Fast2SMS configuration');
  }
} catch (error) {
  console.log('⚠️  Could not extract existing configuration');
}

// Create .env content
const envContent = `# Fast2SMS Configuration
FAST2SMS_API_KEY=${fast2smsApiKey}
FAST2SMS_SENDER_ID=${fast2smsSenderId}
FAST2SMS_ENTITY_ID=${fast2smsEntityId}

# Firebase Configuration
FIREBASE_PROJECT_ID=plkapp-8c052

# FCM Configuration (if needed)
FCM_SERVER_KEY=your_fcm_server_key_here
`;

// Write .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file with configuration\n');

console.log('📝 Step 3: Updating package.json for dotenv support...');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add dotenv if not present
if (!packageJson.dependencies.dotenv) {
  packageJson.dependencies.dotenv = '^16.0.0';
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Added dotenv dependency');
} else {
  console.log('✅ dotenv dependency already exists');
}

console.log('\n🚀 Step 4: Deployment Instructions');
console.log('=====================================');
console.log('1. Update the .env file with your actual Fast2SMS credentials:');
console.log(`   - FAST2SMS_API_KEY: ${fast2smsApiKey.includes('your_') ? 'SET_YOUR_ACTUAL_KEY' : 'Already set'}`);
console.log(`   - FAST2SMS_ENTITY_ID: ${fast2smsEntityId.includes('your_') ? 'SET_YOUR_ACTUAL_ENTITY_ID' : 'Already set'}`);
console.log('\n2. Install dependencies:');
console.log('   npm install');
console.log('\n3. Test locally:');
console.log('   npm run build');
console.log('   firebase emulators:start --only functions');
console.log('\n4. Deploy to production:');
console.log('   firebase deploy --only functions');
console.log('\n5. (Optional) Clean up old configuration:');
console.log('   firebase functions:config:unset fast2sms');
console.log('\n✅ Migration completed successfully!');
console.log('\n📖 For more information, see:');
console.log('   https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv');