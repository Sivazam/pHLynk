'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle } from 'lucide-react';

interface AppIntroCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to PharmaLync",
      subtitle: "Professional Medical Distribution Platform",
      description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
    },
    {
      title: "Powerful Features",
      subtitle: "Everything You Need to Succeed",
      description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
    },
    {
      title: "Ready to Transform Your Business?",
      subtitle: "Join Thousands of Medical Wholesalers",
      description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
      isLastSlide: true
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('pharmalync-intro-seen', 'true');
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('pharmalync-intro-seen', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentSlide + 1) / slides.length) * 100}%`
          }}
        />
      </div>

      {/* Skip Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-gray-600 hover:text-gray-800"
        >
          <X className="w-4 h-4 mr-1" />
          Skip
        </Button>
      </div>

      {/* Main Content */}
      <div className="h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PharmaLync</h1>
          </div>

          {/* Slide Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {slides[currentSlide].title}
              </h2>
              <p className="text-xl text-blue-600 font-semibold mb-6">
                {slides[currentSlide].subtitle}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={nextSlide}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                {slides[currentSlide].isLastSlide ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Get Started
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
              
              {!slides[currentSlide].isLastSlide && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  size="lg"
                  className="px-8 py-3"
                >
                  Skip Tour
                </Button>
              )}
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-blue-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}