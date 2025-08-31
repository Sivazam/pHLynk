'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';
import type { VariantProps } from "class-variance-authority";

interface LoadingButtonProps extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  asChild?: boolean;
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