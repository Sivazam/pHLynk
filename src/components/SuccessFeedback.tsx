'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SuccessFeedbackProps {
  show: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function SuccessFeedback({ show, message, onClose, duration = 5000 }: SuccessFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Trigger confetti - single blast from bottom center
      const durationMs = 3 * 1000;
      
      // Single massive blast from bottom center going upwards
      confetti({
        particleCount: 200,
        angle: 90, // Straight up
        spread: 30, // Focused spread
        startVelocity: 60, // Good velocity
        gravity: 0.8,
        decay: 0.91,
        origin: { 
          x: 0.5, // Center horizontally
          y: 1.1 // Start slightly below bottom of screen
        },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'],
        shapes: ['circle', 'square'],
        scalar: 1.2
      });

      // Auto-hide after duration
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow animation to complete
      }, duration);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [show, onClose, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop - Transparent to allow confetti to be visible */}
      <div 
        className="absolute inset-0 bg-transparent transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />
      
      {/* Success Card */}
      <div 
        className="relative transform transition-all duration-300 pointer-events-auto"
        style={{ 
          scale: isVisible ? 1 : 0.8,
          opacity: isVisible ? 1 : 0 
        }}
      >
        <Card className="shadow-2xl border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              {/* Success Icon */}
              <div className="relative">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping opacity-75" />
                <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse" />
              </div>
              
              {/* Success Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-900">Success!</h3>
                <p className="text-green-700">{message}</p>
              </div>
              
              {/* Close Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="mt-4 border-green-300 text-green-700 hover:bg-green-100"
              >
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}