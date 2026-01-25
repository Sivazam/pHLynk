'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { StatusBarColor } from './ui/StatusBarColor';

interface AppLoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  variant?: 'default' | 'dark-blue' | 'bright-blue' | 'pulse-dots';
  progress?: number;
  stage?: string;
}

export function AppLoadingScreen({
  message = "Loading application...",
  fullScreen = true,
  variant = 'default',
  progress: externalProgress,
  stage: externalStage
}: AppLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Use external progress if provided, otherwise simulate
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
    } else {
      // Simulate loading progress only if no external progress is provided
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15; // Random increment for realistic loading
        });
      }, 200);

      return () => clearInterval(progressInterval);
    }
  }, [externalProgress]);

  // Fallback mechanism to ensure progress always moves forward
  useEffect(() => {
    if (externalProgress === undefined && progress < 10) {
      // If no external progress and we're still at very low progress, start a fallback
      const fallbackTimer = setTimeout(() => {
        setProgress(prev => Math.max(prev, 15));
      }, 1000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [externalProgress, progress]);

  // Determine styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'dark-blue':
        return {
          bgColor: 'bg-[#20439f]',
          message: message || "Loading application..."
        };
      case 'bright-blue':
        return {
          bgColor: 'bg-[#20439f]',
          message: message || "Loading application..."
        };
      case 'pulse-dots':
        return {
          bgColor: 'bg-[#20439f]',
          message: message || "Just a moment..."
        };
      default:
        return {
          bgColor: 'bg-[#20439f]',
          message: message || "Loading application..."
        };
    }
  };

  const { bgColor, message: variantMessage } = getVariantStyles();

  const content = (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Bouncing Logo */}
      <div className="animate-bounce">
        <Image
          src="/PharmaLogo.png"
          alt="PharmaLync"
          width={120}
          height={120}
          className="drop-shadow-lg"
          priority
        />
      </div>

      {/* Progress Bar */}
      <div className="w-64 space-y-2">
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
        <div className="text-center">
          <span className="text-white/60 text-xs font-medium">
            {Math.round(Math.min(progress, 100))}%
          </span>
        </div>
      </div>

      {/* Loading Message */}
      {externalStage || variantMessage ? (
        <p className="text-white/80 text-sm font-medium animate-pulse">
          {externalStage || variantMessage}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <StatusBarColor theme="blue" />
      {fullScreen ? (
        <div className={`fixed inset-0 ${bgColor} flex items-center justify-center z-50 loading-screen`}>
          {content}
        </div>
      ) : (
        <div className={`${bgColor} rounded-lg p-8 flex items-center justify-center loading-screen`}>
          {content}
        </div>
      )}
    </>
  );
}