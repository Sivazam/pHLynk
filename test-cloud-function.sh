#!/bin/bash

echo "🧪 Testing Cloud Function Connectivity..."

echo "1. Testing debug function (should be simple)..."
timeout 10 curl -X POST https://us-central1-pharmalynkk.cloudfunctions.net/debugTest \
  -H "Content-Type: application/json" \
  -d '{"test": "debug"}' \
  -w "\nStatus: %{http_code}\n" || echo "❌ Debug function failed/timed out"

echo ""
echo "2. Testing OTP function with POST..."
timeout 10 curl -X POST https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotificationHTTP \
  -H "Content-Type: application/json" \
  -d '{
    "retailerId": "test-retailer-id",
    "otp": "123456",
    "amount": 1500,
    "paymentId": "test-payment-123",
    "lineWorkerName": "Test Line Worker"
  }' \
  -w "\nStatus: %{http_code}\n" || echo "❌ OTP function failed/timed out"

echo ""
echo "3. Testing with GET (should return 405)..."
timeout 10 curl -X GET https://us-central1-pharmalynkk.cloudfunctions.net/sendOTPNotificationHTTP \
  -w "\nStatus: %{http_code}\n" || echo "❌ GET request failed/timed out"

echo ""
echo "🏁 Test completed"