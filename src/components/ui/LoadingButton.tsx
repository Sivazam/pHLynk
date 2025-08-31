'use client';

import { Button, ButtonProps } from '@/components/ui/button';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({ 
  isLoading = false, 
  loadingText,
  children,
  disabled,
  className,
  onClick,
  ...props 
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Button 
      disabled={isDisabled}
      onClick={onClick}
      className={cn('relative', className)}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" variant="default" />
        </div>
      )}
      
      <span className={cn(isLoading && 'opacity-0')}>
        {isLoading ? loadingText || 'Loading...' : children}
      </span>
    </Button>
  );
}