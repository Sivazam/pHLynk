import * as functions from 'firebase-functions';
export declare const generateOTP: functions.HttpsFunction & functions.Runnable<any>;
export declare const verifyOTP: functions.HttpsFunction & functions.Runnable<any>;
export declare const cleanupExpiredOTPs: functions.CloudFunction<unknown>;
export declare const sendRetailerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendWholesalerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
