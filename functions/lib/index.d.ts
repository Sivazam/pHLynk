import * as functions from 'firebase-functions';
export declare const sendRetailerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendWholesalerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const processSMSResponse: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendOTPNotification: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendPaymentCompletionNotification: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendTestFCMNotification: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendFCMNotification: functions.HttpsFunction & functions.Runnable<any>;
