// FCM Workflow Visualization
// This file creates a comprehensive flow chart of the FCM process

const fcmWorkflow = {
  title: "FCM Token Lifecycle & Notification Flow",
  
  phases: [
    {
      phase: "1. Token Generation",
      location: "Mobile App (Client)",
      triggers: [
        "App first install",
        "App startup after closure", 
        "Token expiration (30-60 days)",
        "User clears app data"
      ],
      process: [
        "Firebase SDK initializes",
        "Requests notification permission",
        "Generates unique FCM token",
        "Returns token to app"
      ],
      code: `const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY'
      });`
    },
    
    {
      phase: "2. Token Storage",
      location: "Server API",
      triggers: [
        "User login",
        "User registration", 
        "Token refresh"
      ],
      process: [
        "Client sends token to server",
        "Server validates user authentication",
        "Maps user type to collection",
        "Stores token in user document"
      ],
      mapping: {
        "retailer" → "retailers collection",
        "tenant" → "tenants collection", 
        "user" → "users collection"
      }
    },
    
    {
      phase: "3. Token Retrieval",
      location: "Server FCM Service",
      triggers: [
        "OTP generation",
        "Order updates",
        "Payment confirmations",
        "System alerts"
      ],
      process: [
        "Identify user ID and type",
        "Map to correct collection",
        "Query user document",
        "Extract FCM token(s)"
      ],
      code: `const collectionName = getCollectionName(userType);
const userDoc = await db.collection(collectionName)
  .doc(userId).get();
const fcmToken = userDoc.data().fcmToken;`
    },
    
    {
      phase: "4. Notification Sending",
      location: "Firebase FCM API",
      triggers: [
        "Business logic triggers notification",
        "FCM token available"
      ],
      process: [
        "Construct notification payload",
        "Send to Firebase FCM API",
        "Firebase delivers to device",
        "Handle delivery status"
      ],
      payload: {
        token: "device_fcm_token",
        notification: {
          title: "Your OTP Code",
          body: "123456"
        },
        data: {
          type: "otp",
          otp: "123456"
        }
      }
    },
    
    {
      phase: "5. Device Reception",
      location: "Mobile App (Client)",
      triggers: [
        "App in foreground",
        "App in background",
        "App terminated"
      ],
      process: [
        "Firebase SDK receives message",
        "Tracks app state",
        "Displays notification or calls handler",
        "App processes notification data"
      ],
      handlers: {
        foreground: "onMessage() handler",
        background: "onBackgroundMessage() handler",
        quit: "System notification tray"
      }
    },
    
    {
      phase: "6. Token Management",
      location: "Both Client & Server",
      triggers: [
        "Token refresh automatically",
        "Token becomes invalid",
        "User uninstalls app"
      ],
      process: [
        "Client detects token refresh",
        "Sends new token to server",
        "Server updates stored token",
        "Cleanup invalid tokens periodically"
      ]
    }
  ],
  
  dataFlow: `
  Mobile App → FCM Token → Server API → Database Storage
      ↓                                    ↓
  Token Refresh ← Server Update ← Token Retrieval ← Notification Trigger
      ↓                                    ↓
  New Token → Server Update → FCM API → Device Delivery
  `,
  
  errorHandling: {
    commonErrors: [
      "messaging/registration-token-not-registered",
      "messaging/invalid-registration-token", 
      "messaging/unavailable",
      "messaging/internal-error"
    ],
    solutions: [
      "Request new token from client",
      "Update token in database",
      "Implement retry logic",
      "Use fallback SMS for critical notifications"
    ]
  }
};

console.log("FCM Workflow Visualization:");
console.log(JSON.stringify(fcmWorkflow, null, 2));