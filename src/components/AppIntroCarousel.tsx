// 'use client';

// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { X, CheckCircle } from 'lucide-react';
// import Image from 'next/image';

// interface AppIntroCarouselProps {
//   onComplete: () => void;
//   onSkip?: () => void;
// }

// export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
//   const [currentSlide, setCurrentSlide] = useState(0);

//   const slides = [
//     {
//       title: "Welcome to PharmaLync",
//       subtitle: "Professional Medical Distribution Platform",
//       description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
//     },
//     {
//       title: "Powerful Features",
//       subtitle: "Everything You Need to Succeed",
//       description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
//     },
//     {
//       title: "Ready to Transform Your Business?",
//       subtitle: "Join Thousands of Medical Wholesalers",
//       description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
//       isLastSlide: true
//     }
//   ];

//   const nextSlide = () => {
//     if (currentSlide < slides.length - 1) {
//       setCurrentSlide(currentSlide + 1);
//     } else {
//       handleComplete();
//     }
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

//   return (
//     <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//       {/* Progress Bar */}
//       <div className="h-1 bg-gray-200">
//         <div 
//           className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
//           style={{ 
//             width: `${((currentSlide + 1) / slides.length) * 100}%`
//           }}
//         />
//       </div>

//       {/* Skip Button */}
//       <div className="absolute top-4 right-4 z-10">
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={handleSkip}
//           className="text-gray-600 hover:text-gray-800"
//         >
//           <X className="w-4 h-4 mr-1" />
//           Skip
//         </Button>
//       </div>

//       {/* Main Content */}
//       <div className="h-screen flex flex-col items-center justify-center px-6 py-12">
//         <div className="max-w-2xl mx-auto text-center">
//           {/* Logo */}
          
//           <div className="mb-8">
//                       <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center">

//              <Image 
//                       src="/logoMain.png" 
//                       alt="pHLynk" 
//                       width={120} 
//                       height={120}
//                       className="drop-shadow-lg"
//                       style={{borderRadius:'12px'}}
//                       priority
//                     />
//                       <h1 className="text-2xl font-bold text-gray-900">PharmaLync</h1>
//                     </div>
          
//           </div>

//           {/* Slide Content */}
//           <div className="space-y-6">
//             <div>
//               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
//                 {slides[currentSlide].title}
//               </h2>
//               <p className="text-xl text-blue-600 font-semibold mb-6">
//                 {slides[currentSlide].subtitle}
//               </p>
//               <p className="text-lg text-gray-600 leading-relaxed">
//                 {slides[currentSlide].description}
//               </p>
//             </div>

//             {/* Navigation */}
//             <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
//               <Button
//                 onClick={nextSlide}
//                 size="lg"
//                 className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
//               >
//                 {slides[currentSlide].isLastSlide ? (
//                   <>
//                     <CheckCircle className="w-5 h-5 mr-2" />
//                     Get Started
//                   </>
//                 ) : (
//                   'Continue'
//                 )}
//               </Button>
              
//               {!slides[currentSlide].isLastSlide && (
//                 <Button
//                   variant="outline"
//                   onClick={handleSkip}
//                   size="lg"
//                   className="px-8 py-3"
//                 >
//                   Skip Tour
//                 </Button>
//               )}
//             </div>

//             {/* Slide Indicators */}
//             <div className="flex justify-center space-x-2 mt-8">
//               {slides.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => setCurrentSlide(index)}
//                   className={`w-3 h-3 rounded-full transition-colors ${
//                     index === currentSlide
//                       ? 'bg-blue-600'
//                       : 'bg-gray-300 hover:bg-gray-400'
//                   }`}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




// 'use client';

// import { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { X, CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// interface AppIntroCarouselProps {
//   onComplete: () => void;
//   onSkip?: () => void;
// }

// export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
//   const [currentSlide, setCurrentSlide] = useState(0);
//   const [isAnimating, setIsAnimating] = useState(false);

//   const slides = [
//     {
//       title: "Welcome to PharmaLync",
//       subtitle: "Professional Medical Distribution Platform",
//       description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1679615911754-fafb37c81998?q=80&w=363&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=869&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
//       buttonText: "Continue",
//       accentColor: "from-blue-500 to-cyan-600",
//       glowColor: "shadow-blue-500/30"
//     },
//     {
//       title: "Powerful Features",
//       subtitle: "Everything You Need to Succeed", 
//       description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199800-62583bd04f13?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
//       buttonText: "Explore",
//       accentColor: "from-indigo-500 to-purple-600",
//       glowColor: "shadow-indigo-500/30"
//     },
//     {
//       title: "Ready to Transform?",
//       subtitle: "Join Thousands of Medical Wholesalers",
//       description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199786-33a2eaed7b7c?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
//       buttonText: "Get Started",
//       accentColor: "from-emerald-500 to-teal-600",
//       glowColor: "shadow-emerald-500/30",
//       isLastSlide: true
//     }
//   ];

//   const nextSlide = () => {
//     if (isAnimating) return;
//     setIsAnimating(true);
    
//     if (currentSlide < slides.length - 1) {
//       setCurrentSlide(currentSlide + 1);
//     } else {
//       handleComplete();
//     }
    
//     setTimeout(() => setIsAnimating(false), 1200);
//   };

//   const prevSlide = () => {
//     if (isAnimating || currentSlide === 0) return;
//     setIsAnimating(true);
//     setCurrentSlide(currentSlide - 1);
//     setTimeout(() => setIsAnimating(false), 1200);
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

//   const goToSlide = (index: number) => {
//     if (isAnimating || index === currentSlide) return;
//     setIsAnimating(true);
//     setCurrentSlide(index);
//     setTimeout(() => setIsAnimating(false), 1200);
//   };

//   return (
//     <div className="fixed inset-0 overflow-hidden bg-black">
//       {/* Logo and Branding - Top Center */}
//       <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
//         <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
//           <div className="w-8 h-8 flex items-center justify-center">
//             <img 
//               src="/logoMain.png" 
//               alt="PharmaLync Logo" 
//               className="w-8 h-8 rounded object-cover"
//               onError={(e) => {
//                 // Fallback to text if logo doesn't load
//                 e.currentTarget.style.display = 'none';
//                 e.currentTarget.nextElementSibling.style.display = 'flex';
//               }}
//             />
//             <span className="text-white font-bold text-sm hidden">P</span>
//           </div>
//           <span className="text-white font-semibold text-lg tracking-wide">PharmaLync</span>
//         </div>
//       </div>

//       {/* Skip Button with Enhanced Styling */}
//       <div className="absolute top-8 right-8 z-30">
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={handleSkip}
//           className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/30 rounded-full px-3 py-2 font-medium transition-all duration-300 hover:scale-105"
//         >
//           <X className="w-4 h-4 mr-1" />
//           Skip Tour
//         </Button>
//       </div>

//       {/* Main Slides Container */}
//       <div className="relative h-full">
//         {slides.map((slide, index) => (
//           <div
//             key={index}
//             className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
//               index === currentSlide
//                 ? 'opacity-100 z-20'
//                 : 'opacity-0 z-10'
//             }`}
//           >
//             {/* Background with Smooth Cross-Fade */}
//             <div className="absolute inset-0 overflow-hidden">
//               <div 
//                 className={`w-full h-full bg-cover bg-center transition-all duration-1000 ease-out ${
//                   index === currentSlide 
//                     ? 'opacity-100 scale-100' 
//                     : 'opacity-0 scale-105'
//                 }`}
//                 style={{ 
//                   backgroundImage: `url(${slide.backgroundImage})`
//                 }}
//               />
//               {/* Layered Gradient Overlays for Depth */}
//               <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20"></div>
//               <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/30"></div>
//               <div className={`absolute inset-0 bg-gradient-to-t ${
//                 index === currentSlide 
//                   ? `from-${slide.accentColor.split(' ')[1].split('-')[0]}-900/30 via-transparent to-transparent` 
//                   : 'from-transparent to-transparent'
//               } transition-all duration-1000`}></div>
//             </div>

//             {/* Content with Staggered Animations */}
//             <div className="relative z-20 h-full flex flex-col justify-end">
//               <div className="px-6 pb-32 md:px-12 lg:px-16 md:pb-40">
//                 <div className="max-w-4xl space-y-8">
//                   {/* Animated Content */}
//                   <div className={`space-y-6 transition-all duration-1200 delay-300 ${
//                     index === currentSlide 
//                       ? 'opacity-100 translate-y-0 scale-100' 
//                       : 'opacity-0 translate-y-12 scale-95'
//                   }`}>
//                     {/* Subtitle with Enhanced Animation */}
//                     <div className={`flex items-center space-x-3 transition-all duration-1000 delay-400 ${
//                       index === currentSlide 
//                         ? 'opacity-100 translate-x-0' 
//                         : 'opacity-0 -translate-x-6'
//                     }`}>
//                       <div className={`h-0.5 bg-gradient-to-r ${slide.accentColor} rounded-full transition-all duration-800 ${
//                         index === currentSlide ? 'w-16' : 'w-0'
//                       }`}></div>
//                       <p className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-widest">
//                         {slide.subtitle}
//                       </p>
//                     </div>

//                     {/* Main Title with Staggered Character Animation */}
//                     <div className={`transition-all duration-1000 delay-500 ${
//                       index === currentSlide 
//                         ? 'opacity-100 translate-y-0' 
//                         : 'opacity-0 translate-y-8'
//                     }`}>
//                       <h1 className={`text-4xl md:text-6xl lg:text-7xl font-black leading-[0.9] bg-gradient-to-r ${slide.accentColor} bg-clip-text text-transparent drop-shadow-2xl`}>
//                         {slide.title}
//                       </h1>
//                     </div>

//                     {/* Description with Fade-in */}
//                     <div className={`transition-all duration-1000 delay-700 ${
//                       index === currentSlide 
//                         ? 'opacity-100 translate-y-0' 
//                         : 'opacity-0 translate-y-4'
//                     }`}>
//                       <p className="text-lg md:text-xl text-white/95 leading-relaxed max-w-2xl font-light">
//                         {slide.description}
//                       </p>
//                     </div>

//                     {/* CTA Button with Delayed Entrance */}
//                     <div className={`pt-6 transition-all duration-1000 delay-900 ${
//                       index === currentSlide 
//                         ? 'opacity-100 translate-y-0 scale-100' 
//                         : 'opacity-0 translate-y-6 scale-95'
//                     }`}>
//                       <Button
//                         onClick={slide.isLastSlide ? handleComplete : nextSlide}
//                         className={`group relative overflow-hidden bg-gradient-to-r ${slide.accentColor} hover:scale-105 text-white font-semibold px-12 py-4 text-lg rounded-full transition-all duration-300 ${slide.glowColor} hover:shadow-2xl border border-white/20`}
//                       >
//                         <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
//                         <div className="relative flex items-center">
//                           {slide.isLastSlide ? (
//                             <>
//                               <CheckCircle className="w-6 h-6 mr-3" />
//                               {slide.buttonText}
//                             </>
//                           ) : (
//                             <>
//                               {slide.buttonText}
//                               <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
//                             </>
//                           )}
//                         </div>
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Premium Navigation Arrows */}
//       {currentSlide > 0 && (
//         <button
//           onClick={prevSlide}
//           disabled={isAnimating}
//           className="absolute left-8 top-1/2 transform -translate-y-1/2 z-30 group disabled:opacity-50"
//         >
//           <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/40 rounded-full p-4 transition-all duration-300 group-hover:scale-110">
//             <ChevronLeft className="w-8 h-8 text-white" />
//           </div>
//         </button>
//       )}

//       {currentSlide < slides.length - 1 && (
//         <button
//           onClick={nextSlide}
//           disabled={isAnimating}
//           className="absolute right-8 top-1/2 transform -translate-y-1/2 z-30 group disabled:opacity-50"
//         >
//           <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/40 rounded-full p-4 transition-all duration-300 group-hover:scale-110">
//             <ChevronRight className="w-8 h-8 text-white" />
//           </div>
//         </button>
//       )}

//       {/* Modern Slide Indicators */}
//       <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-30">
//         <div className="flex items-center space-x-6 bg-black/20 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4">
//           {/* Dots */}
//           <div className="flex space-x-3">
//             {slides.map((_, index) => (
//               <button
//                 key={index}
//                 onClick={() => goToSlide(index)}
//                 className={`relative transition-all duration-500 ${
//                   index === currentSlide ? 'w-12' : 'w-3'
//                 }`}
//                 disabled={isAnimating}
//               >
//                 <div className={`h-3 rounded-full transition-all duration-500 ${
//                   index === currentSlide 
//                     ? `bg-gradient-to-r ${slides[currentSlide].accentColor}` 
//                     : 'bg-white/40 hover:bg-white/60'
//                 }`}></div>
//               </button>
//             ))}
//           </div>

//           {/* Progress Counter */}
//           <div className="flex items-center space-x-2 text-white/80 font-medium">
//             <span className="text-lg font-bold text-white">{currentSlide + 1}</span>
//             <div className="w-px h-4 bg-white/40"></div>
//             <span className="text-sm">{slides.length}</span>
//           </div>
//         </div>
//       </div>

//       {/* Floating Progress Bar */}
//       <div className="absolute top-0 left-0 right-0 z-30">
//         <div className="h-1 bg-black/20 backdrop-blur-sm">
//           <div 
//             className={`h-full bg-gradient-to-r ${slides[currentSlide].accentColor} transition-all duration-800 ease-out`}
//             style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
//           ></div>
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface AppIntroCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const slides = [
    {
      title: "Welcome to PharmaLync",
      subtitle: "Professional Medical Distribution Platform",
      description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1679615911754-fafb37c81998?q=80&w=363&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=869&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
      buttonText: "Continue",
      accentColor: "from-blue-500 to-cyan-600",
      glowColor: "shadow-blue-500/30"
    },
    {
      title: "Powerful Features",
      subtitle: "Everything You Need to Succeed", 
      description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199800-62583bd04f13?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
      buttonText: "Explore",
      accentColor: "from-indigo-500 to-purple-600",
      glowColor: "shadow-indigo-500/30"
    },
    {
      title: "Ready to Transform?",
      subtitle: "Join Thousands of Medical Wholesalers",
      description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199786-33a2eaed7b7c?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080&q=80",
      buttonText: "Get Started",
      accentColor: "from-emerald-500 to-teal-600",
      glowColor: "shadow-emerald-500/30",
      isLastSlide: true
    }
  ];

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
    setTimeout(() => setIsAnimating(false), 1200);
  };

  const prevSlide = () => {
    if (isAnimating || currentSlide === 0) return;
    setIsAnimating(true);
    setCurrentSlide(currentSlide - 1);
    setTimeout(() => setIsAnimating(false), 1200);
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

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 1200);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black font-[Poppins,Inter,'SF Pro Display',sans-serif]">
      {/* Logo - Top Center */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
          <img src="/logoMain.png" alt="PharmaLync Logo" className="w-8 h-8 rounded object-cover" />
          <span className="text-white font-bold text-lg tracking-wide">PharmaLync</span>
        </div>
      </div>

      {/* Skip Button - Flush Top Right */}
      <div className="absolute top-2 right-2 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/30 rounded-full px-4 py-2 font-medium transition-all duration-300"
        >
          <X className="w-4 h-4 mr-1" />
          Skip
        </Button>
      </div>

      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ${
              index === currentSlide ? 'opacity-100 z-20' : 'opacity-0 z-10'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.backgroundImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20"></div>

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-end">
              <div className="px-6 pb-32">
                <div className="max-w-3xl space-y-6">
                  <p className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-widest">
                    {slide.subtitle}
                  </p>
                  <h1 className={`text-4xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r ${slide.accentColor} bg-clip-text text-transparent`}>
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/95 leading-relaxed">
                    {slide.description}
                  </p>
                  <Button
                    onClick={slide.isLastSlide ? handleComplete : nextSlide}
                    className={`bg-gradient-to-r ${slide.accentColor} text-white font-semibold px-10 py-4 text-lg rounded-full`}
                  >
                    {slide.isLastSlide ? (
                      <>
                        <CheckCircle className="w-6 h-6 mr-2" />
                        {slide.buttonText}
                      </>
                    ) : (
                      <>
                        {slide.buttonText}
                        <ArrowRight className="w-6 h-6 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows (moved slightly up) */}
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/4 z-30 bg-white/10 p-3 rounded-full"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/4 z-30 bg-white/10 p-3 rounded-full"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  );
}
