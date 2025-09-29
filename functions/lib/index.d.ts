import * as functions from 'firebase-functions';
import 'dotenv/config';
export declare const sendRetailerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const sendWholesalerPaymentSMS: functions.HttpsFunction & functions.Runnable<any>;
export declare const processSMSResponse: functions.HttpsFunction & functions.Runnable<any>;
