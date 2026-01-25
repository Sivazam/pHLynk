
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
import { compressImage } from '@/lib/image-compression';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from 'lucide-react';
import { INDIAN_BANKS } from '@/constants/banks';

interface PaymentCorrectionModalProps {
    payment: Payment | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (paymentId: string, updates: { utr?: string; proofImage?: File | null; isProofRemoved?: boolean; chequeNumber?: string; bankName?: string; chequeDate?: string }) => Promise<void>;
    isUpdating: boolean;
}

// --- BANK SELECTOR COMPONENT ---
const BankSelector = React.memo(({
    value,
    onChange,
    disabled
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    // Handle free text input in query
    const handleQueryChange = (val: string) => {
        setQuery(val);
        // If user is typing, we can optimistically set the value to what they typed
        // This supports the "directly type bank name" requirement
        if (!open) {
            if (val !== value) onChange(val);
        }
    };

    // Logic: Show max 2 matching banks
    const filteredBanks = useMemo(() => {
        if (!query) return INDIAN_BANKS.slice(0, 2); // Show top 2 by default
        const q = query.toLowerCase();
        const matches = INDIAN_BANKS.filter(bank => bank.toLowerCase().includes(q));
        return matches.slice(0, 2); // Only show 2 matching
    }, [query]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="justify-between h-10 w-full bg-white text-left font-normal"
                >
                    <span className={cn("truncate", !value && "text-gray-500")}>
                        {value || "Select or type bank name..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search bank..."
                        value={query}
                        onValueChange={handleQueryChange}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2 text-sm text-gray-500">
                            <div
                                className="cursor-pointer p-2 hover:bg-gray-100 rounded text-blue-600 font-medium"
                                onClick={() => {
                                    onChange(query);
                                    setOpen(false);
                                }}
                            >
                                Use "{query}"
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="Suggestions">
                            {filteredBanks.map((bank) => (
                                <CommandItem
                                    key={bank}
                                    value={bank}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? "" : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === bank ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {bank}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});
BankSelector.displayName = "BankSelector";

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
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize state when payment changes
    useEffect(() => {
        if (payment) {
            setUtr(payment.utr || '');
            setPreviewUrl(payment.proofUrl || null);
            setProofImage(null);
            setIsProofRemoved(false);
            setChequeNumber(payment.chequeNumber || '');
            setBankName(payment.bankName || '');
            // Initialize cheque date if exists. 
            // If payment.chequeDate is a timestamp string or date string, ensure it fits input type="date" (YYYY-MM-DD)
            if (payment.chequeDate) {
                try {
                    const dateObj = new Date(payment.chequeDate);
                    // Check valid date
                    if (!isNaN(dateObj.getTime())) {
                        setChequeDate(dateObj.toISOString().split('T')[0]);
                    } else {
                        setChequeDate('');
                    }
                } catch (e) {
                    setChequeDate('');
                }
            } else {
                setChequeDate('');
            }
            setError(null);
        }
    }, [payment, isOpen]);

    const isUPI = payment?.method === 'UPI';
    const isCheque = payment?.method === 'CHEQUE';
    const isVerified = payment?.verified === true;

    // Calculate if editable for Cheque (48h window)
    const isChequeEditable = useMemo(() => {
        if (!payment || !isCheque) return false;
        const createdTime = payment.createdAt.toMillis ? payment.createdAt.toMillis() : payment.createdAt.seconds * 1000;
        const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
        return diffHours < 48;
    }, [payment, isCheque]);

    // Determine if valid to save
    const isValid = useMemo(() => {
        if (!payment) return false;

        if (isUPI) {
            // For UPI, UTR is mandatory (4 digits)
            if (!utr || utr.length !== 4 || !/^\d{4}$/.test(utr)) {
                return false;
            }
            // Changes?
            const utrChanged = utr !== (payment.utr || '');
            const imageChanged = !!proofImage || isProofRemoved;
            return utrChanged || imageChanged;
        }

        if (isCheque) {
            // Bank Name and Cheque Number are mandatory
            if (!bankName.trim() || !chequeNumber.trim() || !chequeDate) {
                return false;
            }
            // Changes?
            const bankChanged = bankName !== (payment.bankName || '');
            const numberChanged = chequeNumber !== (payment.chequeNumber || '');

            // Date compare: input is YYYY-MM-DD. Payment date might be diff format.
            // Compare simplified YYYY-MM-DD
            let originalDateString = '';
            if (payment.chequeDate) {
                try {
                    originalDateString = new Date(payment.chequeDate).toISOString().split('T')[0];
                } catch (e) { }
            }

            const dateChanged = chequeDate !== originalDateString;

            return bankChanged || numberChanged || dateChanged;
        }

        // Must have at least one change for other methods (if any)
        const imageChanged = !!proofImage || isProofRemoved;
        return imageChanged;
    }, [utr, proofImage, isProofRemoved, payment, isUPI, isCheque, bankName, chequeNumber, chequeDate]);

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
            let processedImage = proofImage;

            // Compress if new image is selected
            if (proofImage) {
                try {
                    console.log('🖼️ Compressing payment correction proof...');
                    processedImage = await compressImage(proofImage);
                } catch (cErr) {
                    console.error('Compression failed, using original', cErr);
                    // Fallback to original
                }
            }

            await onUpdate(payment.id, {
                utr: isUPI ? (utr !== (payment.utr || '') ? utr : undefined) : undefined,
                proofImage: !isCheque ? processedImage : null, // No proof for cheque
                isProofRemoved: !isCheque ? isProofRemoved : undefined,
                // Cheque fields
                chequeNumber: isCheque ? chequeNumber : undefined,
                bankName: isCheque ? bankName : undefined,
                chequeDate: isCheque ? chequeDate : undefined
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
                        {isCheque
                            ? (isChequeEditable ? "Update Cheque details (Available for 48h)." : "Editing period has ended.")
                            : (isVerified
                                ? "This payment has been verified and cannot be edited."
                                : "Update UTR or Payment Proof for this transaction.")}
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
                            {isCheque ? (
                                <span className={cn("font-medium", isChequeEditable ? "text-blue-600" : "text-gray-500")}>
                                    {isChequeEditable ? "Submited (Editable for 48h)" : "Locked (48h Passed)"}
                                </span>
                            ) : (
                                <span className={cn("font-medium", isVerified ? "text-green-600" : "text-amber-600")}>
                                    {isVerified ? "Verified" : "Pending Verification"}
                                </span>
                            )}
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

                    {/* Editable Cheque Fields - Only for CHEQUE */}
                    {isCheque && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                                <BankSelector
                                    value={bankName}
                                    onChange={setBankName}
                                    disabled={isUpdating || isVerified}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chequeNumber">Cheque Number <span className="text-red-500">*</span></Label>
                                <Input
                                    id="chequeNumber"
                                    value={chequeNumber}
                                    onChange={(e) => setChequeNumber(e.target.value)}
                                    placeholder="Enter Cheque Number"
                                    className="font-mono"
                                    disabled={isUpdating || isVerified}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chequeDate">Cheque Date <span className="text-red-500">*</span></Label>
                                <Input
                                    id="chequeDate"
                                    type="date"
                                    value={chequeDate}
                                    onChange={(e) => setChequeDate(e.target.value)}
                                    disabled={isUpdating || isVerified}
                                />
                            </div>
                        </div>
                    )}

                    {/* Editable Proof Image - Hide for Cheque */}
                    {!isCheque && (
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
                    )}

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
