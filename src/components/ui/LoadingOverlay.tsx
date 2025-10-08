'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  variant?: 'fullscreen' | 'overlay' | 'inline';
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  message = "Loading...", 
  progress,
  variant = 'fullscreen',
  className 
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  const baseClasses = cn(
    'flex items-center justify-center',
    variant === 'fullscreen' && 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50',
    variant === 'overlay' && 'absolute inset-0 bg-white/80 backdrop-blur-sm z-40',
    variant === 'inline' && 'w-full h-full min-h-[200px]',
    className
  );

  return (
    <div className={baseClasses}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        
        {message && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
        
        {progress !== undefined && (
          <div className="w-48 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-center">
              <span className="text-xs text-muted-foreground font-medium">
                {Math.round(Math.min(progress, 100))}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}