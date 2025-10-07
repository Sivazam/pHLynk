#!/bin/bash

# FCM Debug Script - Test the complete FCM flow
echo "🔍 FCM Debug Script - Testing Complete Flow"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "${BLUE}1. Testing FCM Service Configuration${NC}"
echo "-------------------------------------------"

# Test FCM service configuration
curl -s -X POST http://localhost:3000/api/fcm/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "retailerId": "test-config-check",
    "deviceToken": "test-token-for-config-check",
    "userAgent": "debug-script",
    "isNewUser": false
  }' | jq '.' 2>/dev/null || echo "Response not JSON or curl failed"

echo ""
echo "${BLUE}2. Checking FCM Token Check API${NC}"
echo "------------------------------------"

curl -s -X POST http://localhost:3000/api/fcm/check-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-check",
    "userId": "test-user-id"
  }' | jq '.' 2>/dev/null || echo "Response not JSON or curl failed"

echo ""
echo "${BLUE}3. Testing FCM Service Health${NC}"
echo "-----------------------------------"

curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || echo "Health check failed"

echo ""
echo "${YELLOW}4. Instructions for Manual Testing${NC}"
echo "---------------------------------------"
echo "1. Open browser and navigate to: http://localhost:3000/fcm-test"
echo "2. Login as a retailer user first"
echo "3. Click 'Test FCM Registration' button"
echo "4. Watch the logs in the browser console"
echo "5. Check the server logs: tail -f /home/z/my-project/dev.log"
echo ""
echo "${GREEN}Expected Flow:${NC}"
echo "1. User logs in as retailer"
echo "2. AuthContext initializes FCM with retailerId"
echo "3. FCM token is generated"
echo "4. Token is registered via API to retailers collection"
echo "5. Token should appear in retailer document's fcmDevices array"
echo ""
echo "${RED}Common Issues:${NC}"
echo "- Wrong retailerId being passed to FCM service"
echo "- Retailer document not found in Firestore"
echo "- FCM service not configured properly"
echo "- Token being saved to wrong collection"
echo ""
echo "🔧 Debug logs have been added to:"
echo "- src/lib/fcm.ts"
echo "- src/lib/fcm-service.ts" 
echo "- src/app/api/fcm/register-device/route.ts"
echo "- src/contexts/AuthContext.tsx"
echo ""
echo "📱 Test page available at: http://localhost:3000/fcm-test"