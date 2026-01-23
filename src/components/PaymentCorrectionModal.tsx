
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Payment } from '@/types';
import { formatCurrency, formatTimestampWithTime } from '@/lib/timestamp-utils';
import { Camera, X, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentCorrectionModalProps {
    payment: Payment | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (paymentId: string, updates: { utr?: string; proofImage?: File | null; isProofRemoved?: boolean }) => Promise<void>;
    isUpdating: boolean;
}

export const PaymentCorrectionModal = ({
    payment,
    isOpen,
    onClose,
    onUpdate,
    isUpdating
}: PaymentCorrectionModalProps) => {
    const [utr, setUtr] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProofRemoved, setIsProofRemoved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize state when payment changes
    useEffect(() => {
        if (payment) {
            setUtr(payment.utr || '');
            setPreviewUrl(payment.proofUrl || null);
            setProofImage(null);
            setIsProofRemoved(false);
            setError(null);
        }
    }, [payment, isOpen]);

    const isUPI = payment?.method === 'UPI';
    const isVerified = payment?.verified === true;

    // Determine if valid to save
    const isValid = useMemo(() => {
        if (!payment) return false;

        if (isUPI) {
            // For UPI, UTR is mandatory (4 digits)
            if (!utr || utr.length !== 4 || !/^\d{4}$/.test(utr)) {
                return false;
            }
        }

        // Must have at least one change
        const utrChanged = utr !== (payment.utr || '');
        const imageChanged = !!proofImage || isProofRemoved;

        return utrChanged || imageChanged;
    }, [utr, proofImage, isProofRemoved, payment, isUPI]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("File size must be less than 5MB");
                return;
            }
            setProofImage(file);
            setIsProofRemoved(false); // Reset removal flag if new file selected

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            setError(null);
        }
    };

    const handleRemoveImage = () => {
        setProofImage(null);
        setPreviewUrl(null);
        setIsProofRemoved(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!isValid || !payment) return;

        try {
            await onUpdate(payment.id, {
                utr: utr !== (payment.utr || '') ? utr : undefined,
                proofImage: proofImage,
                isProofRemoved: isProofRemoved
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update payment');
        }
    };

    if (!payment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isUpdating && !open && onClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Correct Payment Details</DialogTitle>
                    <DialogDescription>
                        {isVerified
                            ? "This payment has been verified and cannot be edited."
                            : "Update UTR or Payment Proof for this transaction."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Read-Only Details */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm border border-gray-100">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Retailer</span>
                            <span className="font-medium text-gray-900">{payment.retailerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-medium text-gray-900">{formatCurrency(payment.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date</span>
                            <span className="font-medium text-gray-900">{formatTimestampWithTime(payment.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Method</span>
                            <span className="font-medium text-gray-900">{payment.method}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={cn("font-medium", isVerified ? "text-green-600" : "text-amber-600")}>
                                {isVerified ? "Verified" : "Pending Verification"}
                            </span>
                        </div>
                    </div>

                    {/* Editable UTR - Only for UPI */}
                    {isUPI && (
                        <div className="space-y-2">
                            <Label htmlFor="utr">UTR (Last 4 Digits) <span className="text-red-500">*</span></Label>
                            <Input
                                id="utr"
                                value={utr}
                                onChange={(e) => {
                                    // Only allow numbers and max 4 chars
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setUtr(val);
                                }}
                                placeholder="Enter last 4 digits"
                                className="text-lg tracking-widest font-mono"
                                maxLength={4}
                                disabled={isUpdating || isVerified}
                            />
                            {!isVerified && (
                                <p className="text-xs text-gray-500">
                                    Strictly required for UPI payments.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Editable Proof Image */}
                    <div className="space-y-2">
                        <Label>Payment Proof</Label>

                        {!previewUrl ? (
                            <div
                                onClick={() => !isUpdating && !isVerified && fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center transition-colors h-40",
                                    (isUpdating || isVerified) ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:bg-gray-50"
                                )}
                            >
                                <Camera className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600 font-medium">Capture / Upload</span>
                                <span className="text-xs text-gray-400 mt-1">Tap to select image</span>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                <img
                                    src={previewUrl}
                                    alt="Payment Proof"
                                    className="w-full h-48 object-cover"
                                />
                                {!isUpdating && !isVerified && (
                                    <button
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}

                                {proofImage && (
                                    <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm flex items-center gap-1">
                                        <Upload className="h-3 w-3" /> New
                                    </div>
                                )}
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={isUpdating || isVerified}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                        Cancel
                    </Button>
                    {!isVerified && (
                        <Button
                            onClick={handleSave}
                            disabled={!isValid || isUpdating}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
