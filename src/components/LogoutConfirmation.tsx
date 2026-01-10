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
import { LogOut, Power, Loader2 } from 'lucide-react';

interface LogoutConfirmationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    userName?: string;
}

export function LogoutConfirmation({
    open,
    onOpenChange,
    onConfirm,
    userName
}: LogoutConfirmationProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleConfirm = async () => {
        setIsLoggingOut(true);
        // Show shutting down animation for at least 1.5 seconds
        await new Promise(resolve => setTimeout(resolve, 1500));
        await onConfirm();
        setIsLoggingOut(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                {isLoggingOut ? (
                    // Shutting Down Animation
                    <div className="flex flex-col items-center justify-center py-8 space-y-6">
                        <div className="relative">
                            {/* Animated power icon */}
                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                            <div className="relative p-4 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                                <Power className="h-10 w-10 text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold text-gray-900">Shutting Down...</h3>
                            <p className="text-sm text-gray-500">
                                Cleaning up your session securely
                            </p>
                        </div>

                        {/* Progress bar animation */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-progress"
                                style={{
                                    animation: 'progress 1.5s ease-in-out forwards'
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Logging out safely...</span>
                        </div>
                    </div>
                ) : (
                    // Confirmation Dialog
                    <>
                        <AlertDialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-full bg-orange-100">
                                    <LogOut className="h-5 w-5 text-orange-600" />
                                </div>
                                <AlertDialogTitle className="text-lg">
                                    Confirm Logout
                                </AlertDialogTitle>
                            </div>
                            <AlertDialogDescription className="text-gray-600">
                                {userName ? (
                                    <>Are you sure you want to log out, <strong>{userName}</strong>?</>
                                ) : (
                                    <>Are you sure you want to log out?</>
                                )}
                                <br /><br />
                                <span className="text-sm text-gray-500">
                                    You will need to sign in again to access your dashboard.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="mt-0">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm();
                                }}
                                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Yes, Logout
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>

            {/* Add the progress animation keyframes */}
            <style jsx global>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out forwards;
        }
      `}</style>
        </AlertDialog>
    );
}
