'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LOGO_BASE64 } from '@/constants/assets';
import { StatusBarColor } from '@/components/ui/StatusBarColor';

export default function PWALoadingPage() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Launching PWA...');
  const router = useRouter();

  useEffect(() => {
    // ... stages ...
    const stages = [
      { progress: 10, stage: 'Initializing application...', delay: 300 },
      { progress: 25, stage: 'Loading resources...', delay: 400 },
      { progress: 40, stage: 'Checking authentication...', delay: 300 },
      { progress: 60, stage: 'Preparing interface...', delay: 400 },
      { progress: 80, stage: 'Almost ready...', delay: 300 },
      { progress: 95, stage: 'Finalizing setup...', delay: 200 },
      { progress: 100, stage: 'Complete!', delay: 100 }
    ];

    let currentStage = 0;

    const updateProgress = () => {
      if (currentStage < stages.length) {
        const { progress, stage, delay } = stages[currentStage];
        setProgress(progress);
        setStage(stage);
        currentStage++;

        if (currentStage < stages.length) {
          setTimeout(updateProgress, delay);
        } else {
          // Redirect to main app after loading completes
          setTimeout(() => {
            window.location.replace('/');
          }, 500);
        }
      }
    };

    // Start the loading sequence
    const timer = setTimeout(updateProgress, 200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <StatusBarColor theme="blue" />
      <div className="fixed inset-0 bg-[#20439f] flex items-center justify-center z-50 loading-screen">
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Bouncing Logo */}
          <div className="animate-bounce">
            <Image
              src={LOGO_BASE64}
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
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>

            <p className="text-white/80 text-sm font-medium animate-pulse">
              {stage}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}