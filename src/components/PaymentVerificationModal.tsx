import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payment } from '@/types';
import { formatCurrency, formatTimestamp } from '@/lib/timestamp-utils';
import { CheckCircle, X, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

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

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const resetKeys = () => {
        setZoomLevel(1);
        setRotation(0);
    };

    // Reset zoom/rotation when payment changes - MUST be before any early returns
    React.useEffect(() => {
        if (payment?.id) {
            resetKeys();
        }
    }, [payment?.id]);

    // Early return AFTER all hooks
    if (!payment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0">

                {/* Left Side: Image Viewer */}
                <div className="flex-1 bg-gray-900 relative flex items-center justify-center p-4 min-h-[50vh] md:min-h-0 md:h-full overflow-auto group">
                    {payment.proofUrl ? (
                        <div
                            className="relative transition-transform duration-200 ease-out flex items-center justify-center w-full h-full"
                            style={{
                                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                                cursor: zoomLevel > 1 ? 'grab' : 'default'
                            }}
                        >
                            <img
                                src={payment.proofUrl}
                                alt="Payment Proof"
                                className="max-h-[70vh] max-w-full object-contain shadow-2xl rounded-md"
                            />
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-4xl mb-2">📷</span>
                            <p>No proof image attached</p>
                            <p className="text-sm mt-1">Check UTR: {payment.utr}</p>
                        </div>
                    )}

                    {/* Image Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-white text-xs min-w-[3ch] text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleRotate}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={resetKeys}>
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Right Side: Details & Actions */}
                <div className="w-full md:w-[400px] flex flex-col bg-white border-l h-full">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="text-xl">Verify Payment</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Amount - Key Detail */}
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                            <p className="text-sm text-green-600 font-medium uppercase tracking-wider">Amount Paid</p>
                            <p className="text-4xl font-bold text-green-700 mt-1">{formatCurrency(payment.totalPaid)}</p>
                        </div>

                        {/* Transaction Details */}
                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Retailer</Label>
                                <p className="text-lg font-medium text-gray-900 leading-tight mt-1">{payment.retailerName || 'Unknown'}</p>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</Label>
                                <p className="text-base text-gray-900 mt-1">{payment.createdAt ? formatTimestamp(payment.createdAt) : 'N/A'}</p>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Worker</Label>
                                <p className="text-base text-gray-900 mt-1">{payment.lineWorkerName || 'Unknown'}</p>
                            </div>

                            {payment.utr && (
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UTR Reference</Label>
                                    <p className="text-base font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1 text-gray-800">
                                        {String(payment.utr)}
                                    </p>
                                </div>
                            )}

                            {payment.notes && (
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</Label>
                                    <p className="text-sm text-gray-600 italic mt-1 bg-gray-50 p-3 rounded border">
                                        "{String(payment.notes)}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-6 border-t bg-gray-50 space-y-3">
                        <Button
                            onClick={() => onVerify(payment.id)}
                            disabled={isVerifying}
                            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-[0.98] transition-all"
                        >
                            {isVerifying ? (
                                <div className="flex items-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Verifying & Deleting Proof...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Verify & Clear Proof
                                </div>
                            )}
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={onSkip}
                                disabled={isVerifying}
                                className="w-full text-gray-600 border-gray-300 hover:bg-gray-100"
                            >
                                Skip for Now
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isVerifying}
                                className="w-full text-gray-600 border-gray-300 hover:bg-gray-100"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Utility component for Label
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={className}>{children}</div>;
}
