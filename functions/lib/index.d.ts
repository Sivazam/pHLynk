import * as functions from 'firebase-functions';
export declare const sendRetailerPaymentSMS: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    messageId: any;
    phone: string;
    status: string;
}>, unknown>;
export declare const sendWholesalerPaymentSMS: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    messageId: any;
    phone: string;
    status: string;
}>, unknown>;
export declare const processSMSResponse: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    requestId: any;
    messages: any;
    messageId?: undefined;
    error?: undefined;
} | {
    success: boolean;
    messageId: any;
    error: string;
    requestId?: undefined;
    messages?: undefined;
} | {
    success: boolean;
    error: string;
    requestId?: undefined;
    messages?: undefined;
    messageId?: undefined;
}>, unknown>;
export declare const debugTest: functions.https.HttpsFunction;
export declare const sendOTPNotificationHTTP: functions.https.HttpsFunction;
export declare const sendPaymentCompletionNotification: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    error: string;
    fallbackToSMS: boolean;
    messageId?: undefined;
    type?: undefined;
} | {
    success: boolean;
    messageId: string;
    type: string;
    error?: undefined;
    fallbackToSMS?: undefined;
}>, unknown>;
export declare const sendTestFCMNotificationHTTP: functions.https.HttpsFunction;
