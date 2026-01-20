import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payment } from '@/types';
import { formatCurrency, formatTimestamp } from '@/lib/timestamp-utils';
import { CheckCircle, X, ZoomIn, ZoomOut, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';

interface PaymentVerificationModalProps {
    payment: Payment | null;
    isOpen: boolean;
    onClose: () => void;
    onVerify: (paymentId: string) => Promise<void>;
    onSkip: () => void;
    isVerifying: boolean;
}

export function PaymentVerificationModal({
    payment,
    isOpen,
    onClose,
    onVerify,
    onSkip,
    isVerifying
}: PaymentVerificationModalProps) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [showDetails, setShowDetails] = useState(true);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const resetView = () => {
        setZoomLevel(1);
        setRotation(0);
    };

    // Reset zoom/rotation when payment changes - MUST be before any early returns
    React.useEffect(() => {
        if (payment?.id) {
            resetView();
            setShowDetails(true);
        }
    }, [payment?.id]);

    // Early return AFTER all hooks
    if (!payment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col bg-gray-900">

                {/* Image Viewer - Takes Full Space */}
                <div className="flex-1 relative flex items-center justify-center overflow-auto">
                    {payment.proofUrl ? (
                        <div
                            className="transition-transform duration-200 ease-out"
                            style={{
                                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                                cursor: zoomLevel > 1 ? 'grab' : 'default'
                            }}
                        >
                            <img
                                src={payment.proofUrl}
                                alt="Payment Proof"
                                className="max-h-[80vh] max-w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-6xl mb-4">📷</span>
                            <p className="text-lg">No proof image attached</p>
                            {payment.utr && (
                                <p className="text-sm mt-2 bg-gray-800 px-4 py-2 rounded-lg">
                                    UTR: <span className="font-mono font-bold text-white">{String(payment.utr)}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Top Bar - Close & Zoom Controls */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-10 w-10 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm"
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm p-2 rounded-full">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomOut}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-white text-xs min-w-[3ch] text-center">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomIn}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <div className="w-px h-4 bg-white/30" />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleRotate}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom Overlay Panel */}
                <div className={`bg-gradient-to-t from-black via-black/95 to-black/80 text-white transition-all duration-300 ${showDetails ? 'max-h-[50vh]' : 'max-h-20'}`}>
                    {/* Toggle Handle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full flex justify-center py-2 hover:bg-white/10 transition-colors"
                    >
                        {showDetails ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronUp className="h-5 w-5 text-gray-400" />}
                    </button>

                    {/* Collapsed View - Amount Only */}
                    {!showDetails && (
                        <div className="px-6 pb-4 flex items-center justify-between">
                            <div>
                                <span className="text-gray-400 text-sm">Amount: </span>
                                <span className="text-2xl font-bold text-green-400">{formatCurrency(payment.totalPaid)}</span>
                            </div>
                            <Button
                                onClick={() => onVerify(payment.id)}
                                disabled={isVerifying}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {isVerifying ? 'Verifying...' : 'Verify'}
                            </Button>
                        </div>
                    )}

                    {/* Expanded View - Full Details */}
                    {showDetails && (
                        <div className="px-6 pb-6 space-y-4">
                            {/* Amount - Hero */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Amount Paid</p>
                                    <p className="text-3xl font-bold text-green-400">{formatCurrency(payment.totalPaid)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Method</p>
                                    <p className="text-lg font-semibold">{payment.method}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Retailer</p>
                                    <p className="font-medium truncate">{payment.retailerName || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Line Worker</p>
                                    <p className="font-medium truncate">{payment.lineWorkerName || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Date</p>
                                    <p className="font-medium">{payment.createdAt ? formatTimestamp(payment.createdAt) : 'N/A'}</p>
                                </div>
                                {payment.utr && (
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wider">UTR</p>
                                        <p className="font-mono font-medium">{String(payment.utr)}</p>
                                    </div>
                                )}
                            </div>

                            {payment.notes && (
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-sm italic">"{String(payment.notes)}"</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={() => onVerify(payment.id)}
                                    disabled={isVerifying}
                                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
                                >
                                    {isVerifying ? (
                                        <div className="flex items-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Verifying...
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Verify & Clear Proof
                                        </div>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    disabled={isVerifying}
                                    className="h-12 px-6 border-white/20 text-white hover:bg-white/10"
                                >
                                    Skip
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
