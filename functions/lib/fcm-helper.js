"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// Enhanced getFCMTokenForUser function for retailer users (matches working version)
async function getFCMTokenForUser(userId, collectionName = 'retailerUsers') {
    var _a;
    try {
        console.log('🔧 Looking for FCM token for user:', userId, 'in collection:', collectionName);
        // First try the specified collection
        const userDoc = await admin.firestore().collection(collectionName).doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log(`📱 Found user in ${collectionName}, checking FCM devices...`);
            // Check for fcmDevices array (new structure)
            const fcmDevices = (userData === null || userData === void 0 ? void 0 : userData.fcmDevices) || [];
            if (fcmDevices.length > 0) {
                // Return the most recently active device token
                const activeDevice = fcmDevices.reduce((latest, device) => {
                    var _a, _b, _c, _d;
                    const deviceTime = ((_b = (_a = device.lastActive) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(0);
                    const latestTime = ((_d = (_c = latest === null || latest === void 0 ? void 0 : latest.lastActive) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(0);
                    return deviceTime > latestTime ? device : latest;
                }, fcmDevices[0]);
                console.log(`✅ Found ${fcmDevices.length} FCM devices, using most recent:`, ((_a = activeDevice.token) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
                return activeDevice.token || null;
            }
            // Fallback to single fcmToken field (old structure)
            if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                console.log('✅ Found single FCM token (old structure)');
                return userData.fcmToken;
            }
            console.log(`❌ No FCM devices found for user in ${collectionName}`);
        }
        else {
            console.log(`❌ User document not found in ${collectionName}`);
            // If we didn't find in retailers collection, try retailerUsers as fallback for OTP notifications
            if (collectionName === 'retailers') {
                console.log('🔍 Trying fallback to retailerUsers collection...');
                return await getFCMTokenForUser(userId, 'retailerUsers');
            }
        }
        console.log('❌ User document not found');
        return null;
    }
    catch (error) {
        console.error('❌ Error getting FCM token for user:', userId, error);
        return null;
    }
}
console.log('✅ Updated getFCMTokenForUser function loaded');
//# sourceMappingURL=fcm-helper.js.map