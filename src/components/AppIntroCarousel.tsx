// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import { Button } from '@/components/ui/button';
// import { X, CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
// import { markIntroCarouselAsSeen } from '@/lib/intro-carousel';
// import { StatusBarColor } from '@/components/ui/StatusBarColor';

// interface AppIntroCarouselProps {
//   onComplete: () => void;
//   onSkip?: () => void;
// }

// export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
//   const [currentSlide, setCurrentSlide] = useState(0);
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [touchStart, setTouchStart] = useState(0);
//   const [touchEnd, setTouchEnd] = useState(0);
//   const carouselRef = useRef<HTMLDivElement>(null);

//   const slides = [
//     {
//       title: "Welcome to PharmaLync",
//       subtitle: "Professional Medical Distribution Platform",
//       description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1679615911754-fafb37c81998?q=80&w=869&auto=format&fit=crop",
//       buttonText: "Continue",
//       accentColor: "from-blue-500 to-cyan-600",
//       glowColor: "shadow-blue-500/30"
//     },
//     {
//       title: "Powerful Features",
//       subtitle: "Everything You Need to Succeed", 
//       description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199800-62583bd04f13?q=80&w=870&auto=format&fit=crop",
//       buttonText: "Explore",
//       accentColor: "from-indigo-500 to-purple-600",
//       glowColor: "shadow-indigo-500/30"
//     },
//     {
//       title: "Ready to Transform?",
//       subtitle: "Join Thousands of Medical Wholesalers",
//       description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
//       backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199786-33a2eaed7b7c?q=80&w=870&auto=format&fit=crop",
//       buttonText: "Get Started",
//       accentColor: "from-emerald-500 to-teal-600",
//       glowColor: "shadow-emerald-500/30",
//       isLastSlide: true
//     }
//   ];

//   // Touch swipe
//   const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
//   const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
//   const handleTouchEnd = () => {
//     if (touchStart - touchEnd > 75) nextSlide();
//     else if (touchEnd - touchStart > 75) prevSlide();
//   };

//   // Keyboard arrows
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === 'ArrowLeft') prevSlide();
//       else if (e.key === 'ArrowRight') nextSlide();
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [currentSlide, isAnimating]);

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
//     markIntroCarouselAsSeen();
//     if (onSkip) onSkip();
//     else onComplete();
//   };

//   const handleComplete = () => {
//     markIntroCarouselAsSeen();
//     onComplete();
//   };

//   const goToSlide = (index: number) => {
//     if (isAnimating || index === currentSlide) return;
//     setIsAnimating(true);
//     setCurrentSlide(index);
//     setTimeout(() => setIsAnimating(false), 1200);
//   };

//   return (
//     <>
//       <StatusBarColor theme="black" />

//       <div
//         ref={carouselRef}
//         className="fixed inset-0 overflow-hidden bg-black font-[Poppins,Inter,'SF Pro Display',sans-serif]"
//         onTouchStart={handleTouchStart}
//         onTouchMove={handleTouchMove}
//         onTouchEnd={handleTouchEnd}
//       >
//         {/* Backgrounds */}
//         <div className="absolute inset-0">
//           {slides.map((slide, index) => (
//             <div
//               key={index}
//               className={`absolute inset-0 transition-all duration-1000 ${
//                 index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
//               }`}
//             >
//               <div
//                 className="absolute inset-0 bg-cover bg-center"
//                 style={{ backgroundImage: `url(${slide.backgroundImage})`, transform: 'scale(1.1)' }}
//               />
//               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
//               <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/40"></div>
//             </div>
//           ))}
//         </div>

//         {/* Logo */}
//         <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
//           <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
//             <img src="/logoMain.png" alt="PharmaLync Logo" className="w-8 h-8 rounded object-cover" />
//             <span className="text-white font-semibold text-lg tracking-wide">PharmaLync</span>
//           </div>
//         </div>

//         {/* Skip */}
//         <div className="absolute top-6 right-6 z-30">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleSkip}
//             className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2"
//           >
//             <X className="w-4 h-4 mr-1" /> Skip
//           </Button>
//         </div>

//         {/* Slide Content */}
//         <div className="relative z-20 h-full flex flex-col justify-end">
//           {slides.map((slide, index) => (
//             <div
//               key={index}
//               className={`absolute inset-x-0 bottom-0 px-6 md:px-12 lg:px-16 transition-all duration-1000 ${
//                 index === currentSlide
//                   ? 'opacity-100 translate-y-0'
//                   : 'opacity-0 translate-y-12 pointer-events-none'
//               }`}
//             >
//               <div className="bg-white/10 backdrop-blur-2xl border-t border-white/20 rounded-t-2xl p-6 md:p-10 space-y-6">
//                 {/* Subtitle */}
//                 <div className="flex items-center space-x-3">
//                   <div className={`h-0.5 bg-gradient-to-r ${slide.accentColor} rounded-full w-16`} />
//                   <p className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-widest">
//                     {slide.subtitle}
//                   </p>
//                 </div>
//                 {/* Title */}
//                 <h1 className={`text-3xl md:text-5xl font-black leading-tight bg-gradient-to-r ${slide.accentColor} bg-clip-text text-transparent`}>
//                   {slide.title}
//                 </h1>
//                 {/* Description */}
//                 <p className="text-base md:text-lg text-white/95 leading-relaxed font-light">
//                   {slide.description}
//                 </p>
//                 {/* Button */}
//                 <div className="pt-4">
//                   <Button
//                     onClick={slide.isLastSlide ? handleComplete : nextSlide}
//                     className={`w-full group relative overflow-hidden bg-gradient-to-r ${slide.accentColor} text-white font-semibold py-4 text-lg rounded-xl transition-all duration-300 ${slide.glowColor}`}
//                   >
//                     <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
//                     <div className="relative flex items-center justify-center">
//                       {slide.isLastSlide ? (
//                         <>
//                           <CheckCircle className="w-6 h-6 mr-3" />
//                           {slide.buttonText}
//                         </>
//                       ) : (
//                         <>
//                           {slide.buttonText}
//                           <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
//                         </>
//                       )}
//                     </div>
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Arrows */}
//         {currentSlide > 0 && (
//           <button
//             onClick={prevSlide}
//             disabled={isAnimating}
//             className="absolute left-6 top-[42%] -translate-y-1/2 z-30 group disabled:opacity-50"
//           >
//             <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full p-4 group-hover:scale-110 transition">
//               <ChevronLeft className="w-8 h-8 text-white" />
//             </div>
//           </button>
//         )}
//         {currentSlide < slides.length - 1 && (
//           <button
//             onClick={nextSlide}
//             disabled={isAnimating}
//             className="absolute right-6 top-[42%] -translate-y-1/2 z-30 group disabled:opacity-50"
//           >
//             <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full p-4 group-hover:scale-110 transition">
//               <ChevronRight className="w-8 h-8 text-white" />
//             </div>
//           </button>
//         )}

//         {/* Dots */}
//         <div className="absolute bottom-8 left-8 z-30">
//           <div className="flex items-center space-x-4 bg-black/20 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
//             <div className="flex space-x-2">
//               {slides.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => goToSlide(index)}
//                   className={`relative transition-all duration-500 ${
//                     index === currentSlide ? 'w-12' : 'w-2'
//                   }`}
//                   disabled={isAnimating}
//                 >
//                   <div className={`h-2 rounded-full ${
//                     index === currentSlide
//                       ? `bg-gradient-to-r ${slides[currentSlide].accentColor}`
//                       : 'bg-white/40 hover:bg-white/60'
//                   }`}></div>
//                 </button>
//               ))}
//             </div>
//             <div className="flex items-center space-x-2 text-white/80 font-medium">
//               <span className="text-lg font-bold">{currentSlide + 1}</span>
//               <div className="w-px h-4 bg-white/40"></div>
//               <span className="text-sm">{slides.length}</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { markIntroCarouselAsSeen } from '@/lib/intro-carousel';
import { StatusBarColor } from '@/components/ui/StatusBarColor';

interface AppIntroCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function AppIntroCarousel({ onComplete, onSkip }: AppIntroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const slides = [
    {
      title: "Welcome to PharmaLync",
      subtitle: "Professional Medical Distribution Platform",
      description: "The comprehensive platform designed exclusively for wholesalers and medical distributors. Streamline your operations, manage retailers, and track payments with confidence.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1679615911754-fafb37c81998?q=80&w=869&auto=format&fit=crop",
      buttonText: "Continue",
      accentColor: "from-blue-500 to-cyan-600",
      glowColor: "shadow-blue-500/30"
    },
    {
      title: "Powerful Features",
      subtitle: "Everything You Need to Succeed", 
      description: "Comprehensive tools to manage your medical distribution business efficiently. From line worker management to detailed analytics, PharmaLync empowers your growth.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199800-62583bd04f13?q=80&w=870&auto=format&fit=crop",
      buttonText: "Explore",
      accentColor: "from-indigo-500 to-purple-600",
      glowColor: "shadow-indigo-500/30"
    },
    {
      title: "Ready to Transform?",
      subtitle: "Join Thousands of Medical Wholesalers",
      description: "Experience the power of professional distribution management. Get started in minutes and unlock the full potential of your medical wholesale business.",
      backgroundImage: "https://plus.unsplash.com/premium_photo-1732319199786-33a2eaed7b7c?q=80&w=870&auto=format&fit=crop",
      buttonText: "Get Started",
      accentColor: "from-emerald-500 to-teal-600",
      glowColor: "shadow-emerald-500/30",
      isLastSlide: true
    }
  ];

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) nextSlide();
    else if (touchEnd - touchStart > 75) prevSlide();
  };

  // Keyboard arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isAnimating]);

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
    markIntroCarouselAsSeen();
    if (onSkip) onSkip();
    else onComplete();
  };

  const handleComplete = () => {
    markIntroCarouselAsSeen();
    onComplete();
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 1200);
  };

  return (
    <>
      <StatusBarColor theme="black" />

      <div
        ref={carouselRef}
        className="fixed inset-0 overflow-hidden bg-black font-[Poppins,Inter,'SF Pro Display',sans-serif]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Backgrounds */}
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ${
                index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.backgroundImage})`, transform: 'scale(1.1)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/40"></div>
            </div>
          ))}
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
            <img src="/logoMain.png" alt="PharmaLync Logo" className="w-8 h-8 rounded object-cover" />
            <span className="text-white font-semibold text-lg tracking-wide">PharmaLync</span>
          </div>
        </div>

        {/* Skip */}
        <div className="absolute top-6 right-6 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2"
          >
            <X className="w-4 h-4 mr-1" /> Skip
          </Button>
        </div>

        {/* Slide Content */}
        <div className="relative z-20 h-full flex flex-col justify-end">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-x-0 bottom-0 px-6 md:px-12 lg:px-16 transition-all duration-1000 ${
                index === currentSlide
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-12 pointer-events-none'
              }`}
            >
              {/* Dots Above Card */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-4 bg-black/30 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
                  <div className="flex space-x-2">
                    {slides.map((_, dotIndex) => (
                      <button
                        key={dotIndex}
                        onClick={() => goToSlide(dotIndex)}
                        className={`relative transition-all duration-500 ${
                          dotIndex === currentSlide ? 'w-12' : 'w-2'
                        }`}
                        disabled={isAnimating}
                      >
                        <div
                          className={`h-2 rounded-full ${
                            dotIndex === currentSlide
                              ? `bg-gradient-to-r ${slides[currentSlide].accentColor}`
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                        ></div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 text-white/80 font-medium">
                    <span className="text-lg font-bold">{currentSlide + 1}</span>
                    <div className="w-px h-4 bg-white/40"></div>
                    <span className="text-sm">{slides.length}</span>
                  </div>
                </div>
              </div>

              {/* Glassmorphism Card */}
              <div className="bg-white/10 backdrop-blur-2xl border-t border-white/20 rounded-t-2xl p-6 md:p-10 space-y-6">
                {/* Subtitle */}
                <div className="flex items-center space-x-3">
                  <div className={`h-0.5 bg-gradient-to-r ${slide.accentColor} rounded-full w-16`} />
                  <p className="text-sm md:text-base font-semibold text-white/90 uppercase tracking-widest">
                    {slide.subtitle}
                  </p>
                </div>
                {/* Title */}
                <h1
                  className={`text-3xl md:text-5xl font-black leading-tight bg-gradient-to-r ${slide.accentColor} bg-clip-text text-transparent`}
                >
                  {slide.title}
                </h1>
                {/* Description */}
                <p className="text-base md:text-lg text-white/95 leading-relaxed font-light">
                  {slide.description}
                </p>
                {/* Button */}
                <div className="pt-4">
                  <Button
                    onClick={slide.isLastSlide ? handleComplete : nextSlide}
                    className={`w-full group relative overflow-hidden bg-gradient-to-r ${slide.accentColor} text-white font-semibold py-4 text-lg rounded-xl transition-all duration-300 ${slide.glowColor}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center">
                      {slide.isLastSlide ? (
                        <>
                          <CheckCircle className="w-6 h-6 mr-3" />
                          {slide.buttonText}
                        </>
                      ) : (
                        <>
                          {slide.buttonText}
                          <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Arrows */}
        {currentSlide > 0 && (
          <button
            onClick={prevSlide}
            disabled={isAnimating}
            className="absolute left-6 top-[42%] -translate-y-1/2 z-30 group disabled:opacity-50"
          >
            <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full p-4 group-hover:scale-110 transition">
              <ChevronLeft className="w-8 h-8 text-white" />
            </div>
          </button>
        )}
        {currentSlide < slides.length - 1 && (
          <button
            onClick={nextSlide}
            disabled={isAnimating}
            className="absolute right-6 top-[42%] -translate-y-1/2 z-30 group disabled:opacity-50"
          >
            <div className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full p-4 group-hover:scale-110 transition">
              <ChevronRight className="w-8 h-8 text-white" />
            </div>
          </button>
        )}
      </div>
    </>
  );
}
