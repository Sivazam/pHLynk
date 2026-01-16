import React from 'react';
import Image from 'next/image';
import { WifiOff, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOGO_BASE64 } from '@/constants/assets';

export function OfflineBlockingScreen() {
    const handleRetry = () => {
        // A simple retry action - often simply reloading the page or triggering a re-check is enough.
        // Since the hook listens to events, the screen will dismiss automatically when online.
        // This button provides a tactile feedback for the user to "try" something.
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-full max-w-md space-y-8">

                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm mb-4">
                        <Image
                            src={LOGO_BASE64}
                            alt="PharmaLync Logo"
                            width={64}
                            height={64}
                            className="object-contain"
                            priority
                        />
                        {/* Offline Badge on Logo */}
                        <div className="absolute -bottom-2 -right-2 bg-red-100 p-2 rounded-full border-2 border-white">
                            <WifiOff className="w-5 h-5 text-red-600" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">
                        No Internet Connection
                    </h1>

                    <p className="text-gray-500 max-w-sm mx-auto">
                        To prevent transaction errors and ensure data integrity, access to the dashboard is paused while you are offline.
                    </p>
                </div>

                {/* Action Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center space-x-3 text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Waiting for connection...</span>
                    </div>

                    <Button
                        onClick={handleRetry}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Retry Connection
                    </Button>
                </div>

                <p className="text-xs text-gray-400">
                    PharmaLync • Secured Offline Protection
                </p>

            </div>
        </div>
    );
}
