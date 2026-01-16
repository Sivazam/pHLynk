import { useState, useEffect } from 'react';

/**
 * Hook to track the user's online status.
 * Returns true if the user is online, false otherwise.
 */
export function useOnlineStatus() {
    // Assume online by default to prevent flash of offline screen on load
    // If window is defined (client-side), use navigator.onLine
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof window !== 'undefined' ? window.navigator.onLine : true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        setIsOnline(window.navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
