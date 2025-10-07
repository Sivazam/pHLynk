'use client';

import { useState, useEffect } from 'react';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function LoadingTestPage() {
  const [showLoading, setShowLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Testing loading screen...');

  useEffect(() => {
    if (showLoading) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => setShowLoading(false), 500);
            return 100;
          }
          
          // Update stage based on progress
          if (newProgress >= 90) {
            setStage('Almost ready...');
          } else if (newProgress >= 70) {
            setStage('Finalizing setup...');
          } else if (newProgress >= 50) {
            setStage('Loading components...');
          } else if (newProgress >= 30) {
            setStage('Initializing services...');
          } else if (newProgress >= 10) {
            setStage('Starting application...');
          }
          
          return newProgress;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [showLoading]);

  const restartTest = () => {
    setShowLoading(true);
    setProgress(0);
    setStage('Testing loading screen...');
  };

  if (showLoading) {
    return <AppLoadingScreen progress={progress} stage={stage} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Screen Test</h1>
        <p className="text-gray-600 mb-6">
          The loading screen test has completed successfully! The screen showed progress from 0% to 100% 
          with different stage messages.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={restartTest}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Test Again
          </button>
          
          <a
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}