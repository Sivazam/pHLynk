import * as functions from 'firebase-functions';
export declare const sendRetailerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendWholesalerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const processSMSResponse: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendOTPNotificationHTTP: functions.HttpsFunction;
export declare const sendPaymentCompletionNotification: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendTestFCMNotificationHTTP: functions.HttpsFunction;
