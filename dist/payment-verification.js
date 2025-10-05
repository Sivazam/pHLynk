"use strict";
/**
 * Optimized Payment Verification Service
 *
 * This module provides optimized payment verification with parallel queries,
 * caching, and batch operations to reduce database load.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedPaymentVerification = exports.OptimizedPaymentVerification = void 0;
const db_1 = require("@/lib/db");
const secure_logger_1 = require("@/lib/secure-logger");
const secure_otp_storage_1 = require("@/lib/secure-otp-storage");
class OptimizedPaymentVerification {
    constructor() {
        this.cache = new Map();
    }
    static getInstance() {
        if (!OptimizedPaymentVerification.instance) {
            OptimizedPaymentVerification.instance = new OptimizedPaymentVerification();
        }
        return OptimizedPaymentVerification.instance;
    }
    /**
     * Get cached data or fetch from database
     */
    async getCachedData(key, fetcher, ttl = 30000) {
        const cached = this.cache.get(key);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < cached.ttl) {
            return cached.data;
        }
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now, ttl });
        return data;
    }
    /**
     * Clear cache for specific key or all cache
     */
    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        }
        else {
            this.cache.clear();
        }
    }
    /**
     * Optimized payment verification with parallel queries
     */
    async verifyPayment(request) {
        const startTime = Date.now();
        try {
            secure_logger_1.secureLogger.payment('Starting payment verification', {
                paymentId: request.paymentId,
                retailerId: request.retailerId
            });
            // Parallel queries to reduce database round trips
            const [payment, retailer, otp] = await Promise.all([
                this.getPaymentById(request.paymentId),
                this.getRetailerById(request.retailerId),
                request.otpCode ? secure_otp_storage_1.secureOTPStorage.getOTP(request.paymentId) : Promise.resolve(null)
            ]);
            // Validate payment exists
            if (!payment) {
                const error = 'Payment not found';
                secure_logger_1.secureLogger.payment('Payment verification failed - payment not found', {
                    paymentId: request.paymentId
                });
                return { success: false, error, processingTime: Date.now() - startTime };
            }
            // Validate retailer matches
            if (payment.retailerId !== request.retailerId) {
                const error = 'Payment does not belong to this retailer';
                secure_logger_1.secureLogger.security('Payment verification failed - retailer mismatch', {
                    paymentId: request.paymentId,
                    expectedRetailerId: payment.retailerId,
                    providedRetailerId: request.retailerId
                });
                return { success: false, error, processingTime: Date.now() - startTime };
            }
            // Validate retailer exists and is active
            if (!retailer || !retailer.isActive) {
                const error = 'Retailer not found or inactive';
                secure_logger_1.secureLogger.payment('Payment verification failed - retailer issue', {
                    retailerId: request.retailerId,
                    retailerExists: !!retailer,
                    retailerActive: retailer?.isActive
                });
                return { success: false, error, processingTime: Date.now() - startTime };
            }
            // Check if already verified
            if (payment.isVerified) {
                const result = {
                    success: true,
                    payment: {
                        id: payment.id,
                        amount: payment.amount,
                        retailerName: retailer.name,
                        lineWorkerName: payment.lineWorkerName,
                        status: 'verified',
                        createdAt: payment.createdAt,
                        verifiedAt: payment.verifiedAt
                    },
                    processingTime: Date.now() - startTime
                };
                secure_logger_1.secureLogger.payment('Payment already verified', {
                    paymentId: request.paymentId,
                    verifiedAt: payment.verifiedAt
                });
                return result;
            }
            // Check expiration
            if (payment.expiresAt < new Date()) {
                await this.markPaymentExpired(payment.id);
                const result = {
                    success: false,
                    error: 'Payment has expired',
                    payment: {
                        id: payment.id,
                        amount: payment.amount,
                        retailerName: retailer.name,
                        lineWorkerName: payment.lineWorkerName,
                        status: 'expired',
                        createdAt: payment.createdAt
                    },
                    processingTime: Date.now() - startTime
                };
                secure_logger_1.secureLogger.payment('Payment verification failed - expired', {
                    paymentId: request.paymentId,
                    expiredAt: payment.expiresAt
                });
                return result;
            }
            // OTP verification if provided
            if (request.otpCode) {
                if (!otp) {
                    const error = 'OTP not found for this payment';
                    secure_logger_1.secureLogger.payment('Payment verification failed - OTP not found', {
                        paymentId: request.paymentId
                    });
                    return { success: false, error, processingTime: Date.now() - startTime };
                }
                const otpResult = await secure_otp_storage_1.secureOTPStorage.verifyOTP(request.paymentId, request.otpCode);
                if (!otpResult.valid) {
                    const result = {
                        success: false,
                        error: otpResult.error || 'Invalid OTP',
                        payment: {
                            id: payment.id,
                            amount: payment.amount,
                            retailerName: retailer.name,
                            lineWorkerName: payment.lineWorkerName,
                            status: 'failed',
                            createdAt: payment.createdAt
                        },
                        processingTime: Date.now() - startTime
                    };
                    secure_logger_1.secureLogger.payment('Payment verification failed - OTP invalid', {
                        paymentId: request.paymentId,
                        otpError: otpResult.error
                    });
                    return result;
                }
            }
            // Mark payment as verified
            await this.markPaymentVerified(payment.id);
            // Clear cache for this payment
            this.clearCache(`payment:${request.paymentId}`);
            this.clearCache(`retailer:${request.retailerId}`);
            const result = {
                success: true,
                payment: {
                    id: payment.id,
                    amount: payment.amount,
                    retailerName: retailer.name,
                    lineWorkerName: payment.lineWorkerName,
                    status: 'verified',
                    createdAt: payment.createdAt,
                    verifiedAt: new Date()
                },
                processingTime: Date.now() - startTime
            };
            secure_logger_1.secureLogger.payment('Payment verified successfully', {
                paymentId: request.paymentId,
                amount: payment.amount,
                retailerId: request.retailerId,
                processingTime: result.processingTime
            });
            return result;
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Payment verification error', {
                error: error.message,
                paymentId: request.paymentId,
                retailerId: request.retailerId,
                processingTime: Date.now() - startTime
            });
            return {
                success: false,
                error: 'Verification failed due to system error',
                processingTime: Date.now() - startTime
            };
        }
    }
    /**
     * Get payment by ID with caching
     */
    async getPaymentById(paymentId) {
        return this.getCachedData(`payment:${paymentId}`, async () => {
            const payment = await db_1.db.payment.findUnique({
                where: { id: paymentId }
            });
            if (!payment)
                return null;
            return {
                id: payment.id,
                amount: payment.amount,
                retailerId: payment.retailerId,
                lineWorkerName: payment.lineWorkerName,
                isVerified: payment.isVerified,
                verifiedAt: payment.verifiedAt,
                createdAt: payment.createdAt,
                expiresAt: payment.expiresAt
            };
        }, 30000 // 30 seconds cache
        );
    }
    /**
     * Get retailer by ID with caching
     */
    async getRetailerById(retailerId) {
        return this.getCachedData(`retailer:${retailerId}`, async () => {
            const retailer = await db_1.db.retailer.findUnique({
                where: { id: retailerId }
            });
            if (!retailer)
                return null;
            return {
                id: retailer.id,
                name: retailer.name,
                isActive: retailer.isActive
            };
        }, 60000 // 1 minute cache
        );
    }
    /**
     * Mark payment as verified
     */
    async markPaymentVerified(paymentId) {
        try {
            await db_1.db.payment.update({
                where: { id: paymentId },
                data: {
                    isVerified: true,
                    verifiedAt: new Date()
                }
            });
            secure_logger_1.secureLogger.payment('Payment marked as verified', { paymentId });
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Failed to mark payment as verified', {
                error: error.message,
                paymentId
            });
            throw error;
        }
    }
    /**
     * Mark payment as expired
     */
    async markPaymentExpired(paymentId) {
        try {
            await db_1.db.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'expired'
                }
            });
            secure_logger_1.secureLogger.payment('Payment marked as expired', { paymentId });
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Failed to mark payment as expired', {
                error: error.message,
                paymentId
            });
        }
    }
    /**
     * Get payment summary for retailer with batch optimization
     */
    async getPaymentSummaryForRetailer(retailerId) {
        try {
            const cacheKey = `payments_summary:${retailerId}`;
            return this.getCachedData(cacheKey, async () => {
                // Single query with all needed data
                const payments = await db_1.db.payment.findMany({
                    where: {
                        retailerId
                    },
                    include: {
                        retailer: {
                            select: {
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 50 // Limit to recent payments
                });
                const now = new Date();
                return payments.map(payment => ({
                    id: payment.id,
                    amount: payment.amount,
                    retailerId: payment.retailerId,
                    retailerName: payment.retailer.name,
                    lineWorkerName: payment.lineWorkerName,
                    status: payment.isVerified ? 'verified' :
                        payment.expiresAt < now ? 'expired' :
                            payment.status === 'expired' ? 'expired' : 'pending',
                    createdAt: payment.createdAt,
                    expiresAt: payment.expiresAt,
                    isExpired: payment.expiresAt < now,
                    hasOTP: true // We assume all payments have OTPs generated
                }));
            }, 15000 // 15 seconds cache
            );
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Failed to get payment summary for retailer', {
                error: error.message,
                retailerId
            });
            return [];
        }
    }
    /**
     * Batch verify multiple payments (admin function)
     */
    async batchVerifyPayments(paymentIds) {
        const successful = [];
        const failed = [];
        try {
            // Process in batches to avoid overwhelming the database
            const batchSize = 10;
            for (let i = 0; i < paymentIds.length; i += batchSize) {
                const batch = paymentIds.slice(i, i + batchSize);
                const batchPromises = batch.map(async (paymentId) => {
                    try {
                        const payment = await db_1.db.payment.findUnique({
                            where: { id: paymentId }
                        });
                        if (!payment) {
                            failed.push({ id: paymentId, error: 'Payment not found' });
                            return;
                        }
                        if (payment.isVerified) {
                            successful.push(paymentId);
                            return;
                        }
                        if (payment.expiresAt < new Date()) {
                            failed.push({ id: paymentId, error: 'Payment expired' });
                            return;
                        }
                        await db_1.db.payment.update({
                            where: { id: paymentId },
                            data: {
                                isVerified: true,
                                verifiedAt: new Date()
                            }
                        });
                        successful.push(paymentId);
                    }
                    catch (error) {
                        failed.push({
                            id: paymentId,
                            error: error.message || 'Verification failed'
                        });
                    }
                });
                await Promise.all(batchPromises);
                // Clear cache for verified payments
                batch.forEach(id => this.clearCache(`payment:${id}`));
            }
            secure_logger_1.secureLogger.payment('Batch verification completed', {
                total: paymentIds.length,
                successful: successful.length,
                failed: failed.length
            });
            return { successful, failed };
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Batch verification failed', {
                error: error.message,
                totalPayments: paymentIds.length
            });
            return {
                successful,
                failed: [...failed, ...paymentIds.filter(id => !successful.includes(id) && !failed.find(f => f.id === id)).map(id => ({ id, error: 'Batch process failed' }))]
            };
        }
    }
    /**
     * Clean up expired payments
     */
    async cleanupExpiredPayments() {
        try {
            const now = new Date();
            const expiredThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
            const result = await db_1.db.payment.deleteMany({
                where: {
                    AND: [
                        { expiresAt: { lt: expiredThreshold } },
                        { isVerified: false }
                    ]
                }
            });
            if (result.count > 0) {
                secure_logger_1.secureLogger.payment('Cleaned up expired payments', {
                    count: result.count,
                    threshold: expiredThreshold.toISOString()
                });
            }
            return result.count;
        }
        catch (error) {
            secure_logger_1.secureLogger.error('Failed to cleanup expired payments', {
                error: error.message
            });
            return 0;
        }
    }
}
exports.OptimizedPaymentVerification = OptimizedPaymentVerification;
exports.optimizedPaymentVerification = OptimizedPaymentVerification.getInstance();
