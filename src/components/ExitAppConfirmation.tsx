'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Power, Loader2, XCircle } from 'lucide-react';

interface ExitAppConfirmationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}

export function ExitAppConfirmation({
    open,
    onOpenChange,
    onConfirm
}: ExitAppConfirmationProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleConfirm = async () => {
        setIsExiting(true);
        // Show exit animation for 1.2 seconds
        await new Promise(resolve => setTimeout(resolve, 1200));
        await onConfirm();
        setIsExiting(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md border-none shadow-2xl">
                {isExiting ? (
                    // Exiting Animation
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                            <div className="relative p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-200">
                                <Power className="h-10 w-10 text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Safely Exiting...</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                Thank you for using PharmaLync
                            </p>
                        </div>

                        {/* Progress bar animation */}
                        <div className="w-64 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-progress-exit"
                                style={{
                                    animation: 'progress-exit 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs uppercase tracking-widest">Process Termination</span>
                        </div>
                    </div>
                ) : (
                    // Confirmation Dialog
                    <div className="overflow-hidden">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 -mx-6 -mt-6 p-8 mb-6 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <XCircle className="w-24 h-24" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                                    <Power className="h-8 w-8 text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight">Exit Application?</h2>
                                    <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                        Are you sure you want to close PharmaLync? Your session will remain active until you manually logout.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <AlertDialogCancel className="flex-1 h-12 rounded-xl border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all">
                                Keep Working
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm();
                                }}
                                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                                <Power className="h-4 w-4 mr-2" />
                                Yes, Exit App
                            </AlertDialogAction>
                        </div>
                    </div>
                )}
            </AlertDialogContent>

            <style jsx global>{`
                @keyframes progress-exit {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progress-exit {
                    animation: progress-exit 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
            `}</style>
        </AlertDialog>
    );
}
