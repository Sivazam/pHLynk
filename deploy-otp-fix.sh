#!/bin/bash

# OTP Notification Function Fix Deployment Script
# This script deploys the updated cloud functions with the OTP fix

echo "🚀 Starting OTP Notification Function Deployment..."

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null && ! command -v npx firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Navigate to functions directory
cd "$(dirname "$0")/functions"

echo "📁 Current directory: $(pwd)"

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
if ! npx firebase login list &> /dev/null; then
    echo "🔑 Please login to Firebase:"
    npx firebase login
fi

# Set the active project
echo "🎯 Setting active project to: pharmalync-retailer-app"
npx firebase use pharmalync-retailer-app

# Deploy only the cloud functions
echo "📦 Deploying cloud functions..."
npx firebase deploy --only functions

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ Cloud functions deployed successfully!"
    echo ""
    echo "🧪 Testing the deployed function..."
    
    # Test the debug function first
    echo "Testing debug function..."
    curl -X POST https://us-central1-pharmalync-retailer-app.cloudfunctions.net/debugTest \
        -H "Content-Type: application/json" \
        -d '{"test": "debug"}' \
        -w "\nStatus: %{http_code}\n"
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test the OTP notification in the app"
    echo "2. Monitor function logs: npx firebase functions:log"
    echo "3. Check for any errors in the console"
    echo ""
    echo "🔍 Function URLs:"
    echo "Debug: https://us-central1-pharmalync-retailer-app.cloudfunctions.net/debugTest"
    echo "OTP Notification: https://us-central1-pharmalync-retailer-app.cloudfunctions.net/sendOTPNotificationHTTP"
    
else
    echo "❌ Deployment failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi