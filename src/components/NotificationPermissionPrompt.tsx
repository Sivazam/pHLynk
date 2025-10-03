'use client';

import { useEffect, useState } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isFCMSupported, getNotificationPermission, initializeFCM } from '@/lib/fcm';
import { toast } from 'sonner';

interface NotificationPermissionPromptProps {
  onClose?: () => void;
  className?: string;
}

export default function NotificationPermissionPrompt({ onClose, className }: NotificationPermissionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermissionStatus = () => {
      if (!isFCMSupported()) {
        return; // Don't show if FCM is not supported
      }

      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // Show prompt only if permission is default (not asked yet) and user hasn't dismissed it
      if (currentPermission === 'default') {
        const hasDismissed = localStorage.getItem('fcm-prompt-dismissed');
        if (!hasDismissed) {
          // Delay showing the prompt to avoid immediate popup
          setTimeout(() => {
            setIsVisible(true);
          }, 3000);
        }
      }
    };

    checkPermissionStatus();
  }, []);

  const handleEnableNotifications = async () => {
    if (!isFCMSupported()) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      const token = await initializeFCM();
      
      if (token) {
        toast.success('🔔 Notifications enabled successfully!');
        setIsVisible(false);
        if (onClose) onClose();
      } else {
        toast.error('Failed to enable notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications. Please check your browser settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('fcm-prompt-dismissed', 'true');
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleAskLater = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Don't render if not visible or FCM is not supported
  if (!isVisible || !isFCMSupported()) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="shadow-lg border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-600">Stay updated with real-time alerts</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <p className="mb-2">Get instant notifications for:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>🔐 OTP verification codes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>💳 Payment confirmations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>📱 Important account updates</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 mr-2 border border-white border-t-transparent rounded-full animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleAskLater}
                size="sm"
                className="flex-1"
              >
                Later
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can change this anytime in settings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to manually show the permission prompt
export function useNotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const show = () => {
    localStorage.removeItem('fcm-prompt-dismissed');
    setShowPrompt(true);
  };

  const hide = () => {
    setShowPrompt(false);
  };

  return {
    showPrompt,
    show,
    hide
  };
}