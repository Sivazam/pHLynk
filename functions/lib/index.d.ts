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
