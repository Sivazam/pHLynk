// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { ChevronLeft, ChevronRight, X, CheckCircle, BarChart3, Users, CreditCard, Shield, TrendingUp, Smartphone, ArrowRight } from 'lucide-react';
// import Image from 'next/image';

// interface AppIntroCarouselProps {
//   onComplete: () => void;
//   onSkip?: () => void;
// }

// export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
//   const [currentSlide, setCurrentSlide] = useState(0);
//   const [direction, setDirection] = useState<'left' | 'right'>('right');
//   const [isTransitioning, setIsTransitioning] = useState(false);
//   const touchStartX = useRef(0);
//   const touchEndX = useRef(0);

//   const slides = [
//     {
//       title: "Welcome to PharmaLync",
//       subtitle: "Professional Medical Distribution Platform",
//       description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
//       features: [
//         { icon: Users, text: "Retailer Management", color: "text-blue-600" },
//         { icon: CreditCard, text: "Payment Tracking", color: "text-green-600" },
//         { icon: Shield, text: "Secure Collections", color: "text-purple-600" }
//       ],
//       background: "bg-gradient-to-br from-blue-50 via-white to-indigo-50",
//       accent: "from-blue-600 to-indigo-600",
//       imageAlt: "Medical distribution platform dashboard"
//     },
//     {
//       title: "Powerful Features",
//       subtitle: "Everything You Need to Succeed",
//       description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
//       features: [
//         { icon: Shield, text: "Secure Line Worker Collections", color: "text-red-600" },
//         { icon: BarChart3, text: "Real-time Analytics", color: "text-blue-600" },
//         { icon: Users, text: "Retailer Network Management", color: "text-green-600" },
//         { icon: TrendingUp, text: "Business Intelligence", color: "text-purple-600" }
//       ],
//       background: "bg-gradient-to-br from-green-50 via-white to-emerald-50",
//       accent: "from-green-600 to-emerald-600",
//       imageAlt: "Analytics dashboard and business intelligence"
//     },
//     {
//       title: "Ready to Transform Your Business?",
//       subtitle: "Join Thousands of Medical Wholesalers",
//       description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
//       features: [
//         { icon: Shield, text: "Bank-level Security", color: "text-red-600" },
//         { icon: Smartphone, text: "Mobile First Design", color: "text-blue-600" },
//         { icon: TrendingUp, text: "Scale Your Business", color: "text-green-600" }
//       ],
//       background: "bg-gradient-to-br from-purple-50 via-white to-pink-50",
//       accent: "from-purple-600 to-pink-600",
//       isLastSlide: true,
//       imageAlt: "Mobile app and business growth visualization"
//     }
//   ];

//   const nextSlide = () => {
//     if (isTransitioning) return;
//     setDirection('right');
//     setIsTransitioning(true);
//     if (currentSlide < slides.length - 1) {
//       setCurrentSlide(currentSlide + 1);
//     } else {
//       handleComplete();
//     }
//     setTimeout(() => setIsTransitioning(false), 300);
//   };

//   const prevSlide = () => {
//     if (isTransitioning || currentSlide === 0) return;
//     setDirection('left');
//     setIsTransitioning(true);
//     setCurrentSlide(currentSlide - 1);
//     setTimeout(() => setIsTransitioning(false), 300);
//   };

//   const handleSkip = () => {
//     localStorage.setItem('pharmalync-intro-seen', 'true');
//     if (onSkip) {
//       onSkip();
//     } else {
//       onComplete();
//     }
//   };

//   const handleComplete = () => {
//     localStorage.setItem('pharmalync-intro-seen', 'true');
//     onComplete();
//   };

//   const handleDotClick = (index: number) => {
//     if (isTransitioning || index === currentSlide) return;
//     setDirection(index > currentSlide ? 'right' : 'left');
//     setIsTransitioning(true);
//     setCurrentSlide(index);
//     setTimeout(() => setIsTransitioning(false), 300);
//   };

//   // Touch handlers for swipe functionality
//   const handleTouchStart = (e: React.TouchEvent) => {
//     touchStartX.current = e.touches[0].clientX;
//   };

//   const handleTouchMove = (e: React.TouchEvent) => {
//     touchEndX.current = e.touches[0].clientX;
//   };

//   const handleTouchEnd = () => {
//     if (!touchStartX.current || !touchEndX.current) return;
    
//     const diff = touchStartX.current - touchEndX.current;
//     const threshold = 50; // minimum distance for swipe
    
//     if (diff > threshold) {
//       // Swipe left, go to next slide
//       nextSlide();
//     } else if (diff < -threshold) {
//       // Swipe right, go to previous slide
//       prevSlide();
//     }
    
//     touchStartX.current = 0;
//     touchEndX.current = 0;
//   };

//   return (
//     <div className="fixed inset-0 overflow-hidden">
//       {/* Progress Bar */}
//       <div className="h-1 bg-gray-200">
//         <div 
//           className="h-full bg-gradient-to-r transition-all duration-500 ease-out"
//           style={{ 
//             width: `${((currentSlide + 1) / slides.length) * 100}%`,
//             background: slides[currentSlide].accent
//           }}
//         />
//       </div>

//       {/* Main Content Area - Full screen without scroll */}
//       <div 
//         className={`h-screen flex flex-col ${slides[currentSlide].background} transition-colors duration-500`}
//         onTouchStart={handleTouchStart}
//         onTouchMove={handleTouchMove}
//         onTouchEnd={handleTouchEnd}
//       >
//         {/* Header - Logo Only */}
//         <div className="flex justify-start items-center p-3">
//           {/* Logo */}
//           <div className="flex items-center space-x-2">
//             <Image 
//               src="/logo.png" 
//               alt="PharmaLync Logo" 
//               width={32} 
//               height={32}
//               className="h-8 w-8 rounded-lg"
//             />
//             <div>
//               <h1 className="text-lg font-bold text-gray-900">PharmaLync</h1>
//             </div>
//           </div>
//         </div>

//         {/* Slide Content */}
//         <div className="flex-1 flex flex-col">
//           {/* Image Placeholder - More than half the screen */}
//           <div className="flex-1 relative min-h-[50vh]">
//             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10">
//               <div className="w-full h-full flex items-center justify-center">
//                 <div className="text-center">
//                   {/* Enhanced Image Placeholder */}
//                   <div className="relative group mb-6">
//                     {/* Main Container */}
//                     <div className="w-48 h-48 mx-auto relative">
//                       {/* Outer Glow Ring */}
//                       <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                      
//                       {/* Main Circle */}
//                       <div className="relative w-full h-full bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-full shadow-2xl border border-white/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                        
//                         {/* Animated Gradient Background */}
//                         <div className="absolute inset-0 opacity-10">
//                           <div className="w-full h-full bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 animate-pulse" 
//                                style={{ 
//                                  backgroundSize: '300% 300%',
//                                  animation: 'gradientShift 4s ease-in-out infinite'
//                                }} />
//                         </div>
                        
//                         {/* Inner Content */}
//                         <div className="relative z-10">
//                           <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full shadow-inner flex items-center justify-center backdrop-blur-sm">
//                             <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full animate-pulse shadow-lg" />
//                           </div>
//                         </div>
                        
//                         {/* Floating Accent Elements */}
//                         <div className="absolute top-6 left-6 w-4 h-4 bg-gradient-to-br rounded-full opacity-40 animate-bounce" 
//                              style={{ background: slides[currentSlide].accent, animationDelay: '0s' }} />
//                         <div className="absolute bottom-6 right-6 w-3 h-3 bg-gradient-to-br rounded-full opacity-40 animate-bounce" 
//                              style={{ background: slides[currentSlide].accent, animationDelay: '0.5s' }} />
//                         <div className="absolute top-1/2 right-8 w-2 h-2 bg-gradient-to-br rounded-full opacity-40 animate-bounce" 
//                              style={{ background: slides[currentSlide].accent, animationDelay: '1s' }} />
//                       </div>
//                     </div>
                    
//                     {/* Hover Glow Effect */}
//                     <div className="absolute inset-0 rounded-full bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-lg -z-10"
//                          style={{ background: slides[currentSlide].accent }} />
//                   </div>
                  
//                   {/* Enhanced Text */}
//                   <div className="space-y-2">
//                     <p className="text-gray-700 text-base font-semibold">Image Placeholder</p>
//                     <p className="text-gray-500 text-sm italic max-w-xs mx-auto">{slides[currentSlide].imageAlt}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             {/* Navigation Arrows */}
//             <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
//               <button
//                 onClick={prevSlide}
//                 disabled={currentSlide === 0 || isTransitioning}
//                 className={`pointer-events-auto group relative p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-white/30 transition-all duration-300 ${
//                   currentSlide === 0 || isTransitioning 
//                     ? 'opacity-40 cursor-not-allowed' 
//                     : 'hover:bg-white hover:scale-110 hover:shadow-2xl'
//                 }`}
//               >
//                 <ChevronLeft className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" />
//                 {/* Subtle Glow */}
//                 <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"
//                      style={{ background: slides[currentSlide].accent }} />
//               </button>
              
//               <button
//                 onClick={nextSlide}
//                 disabled={isTransitioning}
//                 className={`pointer-events-auto group relative p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-white/30 transition-all duration-300 ${
//                   isTransitioning 
//                     ? 'opacity-40 cursor-not-allowed' 
//                     : 'hover:bg-white hover:scale-110 hover:shadow-2xl'
//                 }`}
//               >
//                 <ChevronRight className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" />
//                 {/* Subtle Glow */}
//                 <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"
//                      style={{ background: slides[currentSlide].accent }} />
//               </button>
//             </div>
//           </div>

//           {/* Content Section */}
//           <div className="px-6 py-6 bg-white/98 backdrop-blur-sm border-t border-white/20">
//             <div className="max-w-2xl mx-auto text-center">
//               {/* Title */}
//               <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight leading-tight">
//                 {slides[currentSlide].title}
//               </h2>
              
//               {/* Subtitle */}
//               <p className={`text-base md:text-lg font-semibold mb-4 bg-gradient-to-r ${slides[currentSlide].accent} bg-clip-text text-transparent leading-tight`}>
//                 {slides[currentSlide].subtitle}
//               </p>
              
//               {/* Description */}
//               <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto">
//                 {slides[currentSlide].description}
//               </p>

//               {/* Features */}
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
//                 {slides[currentSlide].features.map((feature, index) => (
//                   <div key={index} className="group relative">
//                     {/* Feature Card */}
//                     <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                      
//                       {/* Icon Background Circle */}
//                       <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
//                         <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${slides[currentSlide].accent} shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
//                           <feature.icon className="w-8 h-8 text-white drop-shadow-lg" />
//                         </div>
//                       </div>
                      
//                       {/* Feature Content */}
//                       <div className="pt-10">
//                         <h3 className="font-bold text-gray-900 text-base text-center mb-3 group-hover:text-gray-800 transition-colors leading-tight">
//                           {feature.text}
//                         </h3>
                        
//                         {/* Decorative Elements */}
//                         <div className="flex justify-center space-x-1">
//                           <div className="w-2 h-2 rounded-full bg-gradient-to-r opacity-60" 
//                                style={{ background: slides[currentSlide].accent }} />
//                           <div className="w-6 h-0.5 rounded-full bg-gradient-to-r opacity-80" 
//                                style={{ background: slides[currentSlide].accent }} />
//                           <div className="w-2 h-2 rounded-full bg-gradient-to-r opacity-60" 
//                                style={{ background: slides[currentSlide].accent }} />
//                         </div>
//                       </div>
                      
//                       {/* Bottom Accent Line */}
//                       <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r opacity-30 rounded-full" 
//                            style={{ background: slides[currentSlide].accent }} />
//                     </div>
                    
//                     {/* Glow Effect */}
//                     <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-sm -z-10"
//                          style={{ background: slides[currentSlide].accent }} />
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Bottom Navigation */}
//         <div className="p-3 bg-white/98 backdrop-blur-sm border-t border-white/40 shadow-lg">
//           <div className="max-w-2xl mx-auto flex items-center justify-between">
//             {/* Previous Button (Bottom Left) */}
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={prevSlide}
//               disabled={currentSlide === 0 || isTransitioning}
//               className={`group relative text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-4 py-2 text-sm h-8 transition-all duration-300 rounded-xl ${
//                 currentSlide === 0 || isTransitioning ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md'
//               }`}
//             >
//               <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
//               Previous
//               {/* Subtle Glow */}
//               <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"
//                    style={{ background: slides[currentSlide].accent }} />
//             </Button>

//             {/* Progress Dots */}
//             <div className="flex space-x-2">
//               {slides.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => handleDotClick(index)}
//                   disabled={isTransitioning}
//                   className={`group relative w-2 h-2 rounded-full transition-all duration-300 ${
//                     index === currentSlide 
//                       ? 'bg-gradient-to-r scale-125 shadow-sm' 
//                       : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
//                   } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
//                   style={index === currentSlide ? { background: slides[currentSlide].accent } : {}}
//                   aria-label={`Go to slide ${index + 1}`}
//                 >
//                   {/* Dot Glow */}
//                   {index === currentSlide && (
//                     <div className="absolute inset-0 rounded-full bg-gradient-to-r opacity-30 animate-pulse -z-10"
//                          style={{ background: slides[currentSlide].accent }} />
//                   )}
//                 </button>
//               ))}
//             </div>

//             {/* Skip/Next/Get Started Button (Bottom Right) */}
//             {slides[currentSlide].isLastSlide ? (
//               <div className="flex-1 flex justify-center">
//                 <Button
//                   onClick={handleComplete}
//                   size="sm"
//                   disabled={isTransitioning}
//                   className={`group relative bg-gradient-to-r ${slides[currentSlide].accent} hover:opacity-95 text-white px-8 py-2 text-sm h-8 transition-all duration-300 rounded-xl shadow-lg ${
//                     isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'
//                   }`}
//                 >
//                   Get Started
//                   <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
//                   {/* Button Glow */}
//                   <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"
//                        style={{ background: slides[currentSlide].accent }} />
//                 </Button>
//               </div>
//             ) : (
//               <div className="flex items-center space-x-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={handleSkip}
//                   disabled={isTransitioning}
//                   className={`group relative text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-4 py-2 text-sm h-8 transition-all duration-300 rounded-xl ${
//                     isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md'
//                   }`}
//                 >
//                   Skip
//                   {/* Subtle Glow */}
//                   <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"
//                        style={{ background: slides[currentSlide].accent }} />
//                 </Button>
//                 <Button
//                   onClick={nextSlide}
//                   size="sm"
//                   disabled={isTransitioning}
//                   className={`group relative bg-gradient-to-r ${slides[currentSlide].accent} hover:opacity-95 text-white px-4 py-2 text-sm h-8 transition-all duration-300 rounded-xl shadow-lg ${
//                     isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'
//                   }`}
//                 >
//                   Next
//                   <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
//                   {/* Button Glow */}
//                   <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"
//                        style={{ background: slides[currentSlide].accent }} />
//                 </Button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CreditCard,
  Shield,
  BarChart3,
  TrendingUp,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

interface AppIntroCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const slides = [
    {
      title: "Welcome to pharmaLync",
      subtitle: "Smarter Pharma Collections",
      description:
        "Streamline payment collections between wholesalers, retailers, and line workers with real-time tracking and OTP verification.",
      features: [
        { icon: Users, text: "Wholesaler → Retailer Flow" },
        { icon: CreditCard, text: "Secure Payments" },
        { icon: Shield, text: "OTP Verification" },
      ],
      accent: "from-blue-500 to-indigo-600",
    },
    {
      title: "Simplify Operations",
      subtitle: "End-to-End Visibility",
      description:
        "From invoice creation to payment confirmation, pharmaLync keeps your entire supply chain in sync.",
      features: [
        { icon: BarChart3, text: "Invoice Tracking" },
        { icon: TrendingUp, text: "Outstanding Balance" },
        { icon: Smartphone, text: "Mobile Dashboards" },
      ],
      accent: "from-green-500 to-emerald-600",
    },
    {
      title: "Collect With Confidence",
      subtitle: "Instant & Reliable",
      description:
        "Line workers record payments on the go. Retailers confirm instantly via OTP. Wholesalers get live updates.",
      features: [
        { icon: Shield, text: "Fraud Prevention" },
        { icon: Users, text: "Line Worker Support" },
        { icon: CreditCard, text: "Partial or Full Payments" },
      ],
      accent: "from-purple-500 to-pink-600",
    },
    {
      title: "Stay in Control",
      subtitle: "Data-Driven Decisions",
      description:
        "Track collections, monitor areas, and identify risks with built-in dashboards and real-time notifications.",
      features: [
        { icon: BarChart3, text: "Analytics" },
        { icon: TrendingUp, text: "Performance Reports" },
        { icon: Shield, text: "Audit Trail" },
      ],
      accent: "from-orange-500 to-red-600",
    },
    {
      title: "Grow with pharmaLync",
      subtitle: "Ready for Deployment",
      description:
        "Designed for wholesalers of every size — secure, scalable, and mobile-first. Let's power your collections.",
      features: [
        { icon: Smartphone, text: "Mobile First" },
        { icon: Users, text: "Multi-Tenant Support" },
        { icon: Shield, text: "Bank-Grade Security" },
      ],
      accent: "from-teal-500 to-cyan-600",
      isLast: true,
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    // Store intro completion status safely
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem("pharmalync-intro-seen", "true");
      }
    } catch (error) {
      console.warn("Could not save intro status to localStorage:", error);
    }
    onSkip ? onSkip() : onComplete();
  };

  const handleComplete = () => {
    // Store intro completion status safely
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem("pharmalync-intro-seen", "true");
      }
    } catch (error) {
      console.warn("Could not save intro status to localStorage:", error);
    }
    onComplete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full bg-gradient-to-r ${slides[currentSlide].accent} transition-all duration-300`}
          style={{
            width: `${((currentSlide + 1) / slides.length) * 100}%`,
          }}
        />
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col justify-between px-6 py-8 text-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="flex justify-center items-center space-x-2">
          <Image src="/logo.png" alt="PharmaLync" width={36} height={36} />
          <h1 className="text-lg font-semibold text-gray-900">PharmaLync</h1>
        </div>

        {/* Slide Text */}
        <div className="mt-6 flex-1 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {slides[currentSlide].title}
          </h2>
          <p
            className={`bg-gradient-to-r ${slides[currentSlide].accent} bg-clip-text text-transparent font-medium mb-3`}
          >
            {slides[currentSlide].subtitle}
          </p>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {slides[currentSlide].description}
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {slides[currentSlide].features.map((feature, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <feature.icon className="w-6 h-6 text-gray-700 mb-2" />
                <span className="text-sm font-medium text-gray-800">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between">
          {currentSlide > 0 ? (
            <Button variant="outline" size="sm" onClick={prevSlide}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
          ) : (
            <div />
          )}

          {/* Progress dots */}
          <div className="flex space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentSlide
                    ? `bg-gradient-to-r ${slides[currentSlide].accent}`
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {slides[currentSlide].isLast ? (
            <Button
              onClick={handleComplete}
              className={`bg-gradient-to-r ${slides[currentSlide].accent} text-white`}
            >
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={nextSlide}
              className={`bg-gradient-to-r ${slides[currentSlide].accent} text-white`}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip option */}
        {!slides[currentSlide].isLast && (
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 mt-3 underline hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}