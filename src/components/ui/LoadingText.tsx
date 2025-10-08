'use client';

import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

interface LoadingTextProps {
  isLoading: boolean;
  text?: string;
  fallback?: React.ReactNode;
  className?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export function LoadingText({ 
  isLoading, 
  text = 'Loading...', 
  fallback,
  className,
  spinnerSize = 'sm'
}: LoadingTextProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <LoadingSpinner size={spinnerSize} />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  }

  return <>{fallback}</>;
}