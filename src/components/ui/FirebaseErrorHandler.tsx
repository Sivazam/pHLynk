'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface FirebaseErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onUseVisibleRecaptcha?: () => void;
  showRetry?: boolean;
  showVisibleRecaptchaOption?: boolean;
}

export function FirebaseErrorHandler({ 
  error, 
  onRetry, 
  onUseVisibleRecaptcha,
  showRetry = true,
  showVisibleRecaptchaOption = true 
}: FirebaseErrorHandlerProps) {
  if (!error) return null;

  const isRecaptchaError = error.includes('reCAPTCHA') || error.includes('captcha') || error.includes('domain configuration');
  const isNetworkError = error.includes('Network') || error.includes('network');
  const isQuotaError = error.includes('quota') || error.includes('too many requests');

  const getErrorTitle = () => {
    if (isRecaptchaError) return 'reCAPTCHA Verification Issue';
    if (isNetworkError) return 'Network Connection Problem';
    if (isQuotaError) return 'Service Limit Reached';
    return 'Authentication Error';
  };

  const getErrorIcon = () => {
    return <AlertCircle className="h-4 w-4" />;
  };

  const getErrorVariant = () => {
    if (isRecaptchaError) return 'default' as const;
    if (isNetworkError) return 'default' as const;
    if (isQuotaError) return 'default' as const;
    return 'destructive' as const;
  };

  const getErrorSuggestion = () => {
    if (isRecaptchaError) {
      return (
        <div className="space-y-2">
          <p className="text-sm">
            This might be due to domain configuration issues. Try these solutions:
          </p>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>Make sure your domain is authorized in Firebase console</li>
            <li>Try using visible reCAPTCHA instead</li>
            <li>Check your internet connection</li>
            <li>Clear browser cache and try again</li>
          </ul>
        </div>
      );
    }
    if (isNetworkError) {
      return (
        <div className="space-y-2">
          <p className="text-sm">
            Please check your internet connection and try again.
          </p>
        </div>
      );
    }
    if (isQuotaError) {
      return (
        <div className="space-y-2">
          <p className="text-sm">
            The service has reached its limit. Please wait a few minutes before trying again.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Alert variant={getErrorVariant()} className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="space-y-3">
        <div>
          <strong className="text-orange-800">{getErrorTitle()}</strong>
          <p className="text-orange-700 mt-1">{error}</p>
        </div>
        
        {getErrorSuggestion()}
        
        <div className="flex flex-wrap gap-2 pt-2">
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          
          {showVisibleRecaptchaOption && isRecaptchaError && onUseVisibleRecaptcha && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUseVisibleRecaptcha}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Use Visible reCAPTCHA
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}