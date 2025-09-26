'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Pill, 
  User, 
  Store, 
  Shield,
  ArrowRight,
  HelpCircle,
  FileText,
  Mail,
  Phone
} from 'lucide-react';
import { StatusBarColor } from '../ui/StatusBarColor';

interface NetflixRoleSelectionProps {
  onRoleSelect: (role: string) => void;
  onBack: () => void;
}

export function NetflixRoleSelection({ onRoleSelect, onBack }: NetflixRoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  // Prevent back navigation to dashboard when on role selection
  useEffect(() => {
    // Replace current history state to prevent back navigation to dashboard
    window.history.replaceState({}, '', '/');
    
    const handlePopState = (event: PopStateEvent) => {
      // If user tries to navigate back, prevent it
      window.history.pushState({}, '', '/');
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const roles = [
    {
      id: 'WHOLESALER_ADMIN',
      title: 'Wholesale Admin',
      description: 'Manage retailers, LineMan, areas, and analytics',
      icon: Pill,
      color: 'from-red-600 to-red-800',
      nameColor: 'text-red-400',
      shadowColor: 'shadow-red-500/25',
      bgColor: 'bg-red-600/10',
      borderColor: 'border-red-500/30'
    },
    {
      id: 'LINE_WORKER',
      title: 'Line Worker',
      description: "Field payment collection and retailer management",
      icon: User,
      color: 'from-blue-600 to-blue-800',
      nameColor: 'text-blue-400',
      shadowColor: 'shadow-blue-500/25',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'RETAILER',
      title: 'Retailer',
      description: 'Access dashboard - manage and track payments',
      icon: Store,
      color: 'from-green-600 to-green-800',
      nameColor: 'text-green-400',
      shadowColor: 'shadow-green-500/25',
      bgColor: 'bg-green-600/10',
      borderColor: 'border-green-500/30'
    },
    {
      id: 'SUPER_ADMIN',
      title: 'Super Admin',
      description: 'System-wide administration and configuration',
      icon: Shield,
      color: 'from-purple-600 to-purple-800',
      nameColor: 'text-purple-400',
      shadowColor: 'shadow-purple-500/25',
      bgColor: 'bg-purple-600/10',
      borderColor: 'border-purple-500/30'
    }
  ];

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    
    // Add a small delay for the animation
    setTimeout(() => {
      if (role === 'RETAILER') {
        // Redirect to retailer login page
        window.location.href = '/retailer-login';
      } else {
        onRoleSelect(role);
      }
    }, 300);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.4 }
    }
  };

  const profileVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.7,
      y: 60,
      rotateX: 15
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.8
      }
    },
    hover: {
      scale: 1.08,
      y: -12,
      rotateX: -5,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: 0.4
      }
    },
    selected: {
      scale: 1.12,
      y: -18,
      rotateX: -8,
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 18,
        duration: 0.5
      }
    }
  };

  const iconVariants: Variants = {
    hidden: { 
      scale: 0, 
      rotate: -180,
      opacity: 0
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 180,
        damping: 12,
        delay: 0.3,
        duration: 0.6
      }
    },
    hover: {
      scale: 1.15,
      rotate: 8,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 12,
        duration: 0.3
      }
    }
  };

  const glowVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.6,
      filter: "blur(0px)"
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(20px)",
      transition: {
        duration: 0.8,
        delay: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      opacity: 0.7,
      scale: 1.4,
      filter: "blur(30px)",
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const textVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      opacity: 1,
      y: -2,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  return (
     <>
      <StatusBarColor theme="black" />
          
      <div className="min-h-screen bg-black flex flex-col font-sans">
        {/* Netflix-style Header */}
        <header className="relative z-50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            {/* Netflix-style Logo Area */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* PharmaLync Branding integrated with Netflix style */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="relative">
                  <Image 
                    src="/logoMain.png" 
                    alt="PharmaLync" 
                    width={28}
                    height={28}
                    className="rounded sm:w-8 sm:h-8"
                  />
                  {/* <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-full animate-pulse"></div> */}
                </div>
                <span className="text-xl sm:text-2xl font-bold " style={{
                  color: "#ffff",
                  textShadow: "0px 1px 2px rgba(0,0,0,0.25)",
                }}>
                  PharmaLync
                  {/* <p style={{fontSize:'0.5rem',color:'gray'}}>Powered By SAANVI SYSTEMS</p> */}
                </span>
              </div>
            </div>

            {/* Right side navigation */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-transparent text-sm sm:text-base font-medium"
                onClick={onBack}
              >
                Sign In
              </Button>
            </div>
          </div>
          
          {/* Netflix-style gradient divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="w-full max-w-6xl mx-auto">
            {/* Updated Header with Choose Your Role */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-center mb-12 sm:mb-16 pt-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 font-heading">
                Choose Your Role
              </h1>
              <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto px-4 font-body">
                Select your access level to continue to your PharmaLync dashboard
              </p>
            </motion.div>

            {/* Profile Grid - Enhanced Netflix Style with Perfect Centering */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="
                grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 
                gap-6 sm:gap-8 md:gap-10 lg:gap-12 
                justify-items-center items-center
                px-4 sm:px-6 md:px-8
              "
            >
              {roles.map((role) => {
                const isSelected = selectedRole === role.id;
                const isHovering = isHovered === role.id;
                const Icon = role.icon;

                return (
                  <motion.div
                    key={role.id}
                    variants={profileVariants}
                    whileHover="hover"
                    animate={isSelected ? "selected" : "visible"}
                    onHoverStart={() => setIsHovered(role.id)}
                    onHoverEnd={() => setIsHovered(null)}
                    onClick={() => handleRoleSelect(role.id)}
                    className="cursor-pointer group relative flex flex-col items-center"
                    style={{ perspective: '1000px' }}
                  >
                    {/* Netflix-style profile circle with enhanced glow effect */}
                    <div className="relative flex-shrink-0">
                      {/* Enhanced Glow effect */}
                      <motion.div
                        variants={glowVariants}
                        className={`
                          absolute inset-0 rounded-full
                          ${role.shadowColor}
                          ${isHovering ? 'opacity-70' : 'opacity-40'}
                          filter blur-xl
                        `}
                        style={{
                          transform: 'translateZ(-20px)'
                        }}
                      />
                      
                      {/* Profile circle with enhanced styling */}
                      <div className={`
                        relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 
                        rounded-full
                        bg-gradient-to-br ${role.color}
                        flex items-center justify-center
                        border-3 sm:border-4 border-transparent
                        group-hover:border-white/60
                        transition-all duration-400 ease-out
                        ${isSelected ? 'ring-4 ring-white/80 scale-110' : ''}
                        overflow-hidden
                        shadow-2xl
                        backdrop-blur-sm
                      `}>
                        {/* Enhanced Netflix-style profile icon */}
                        <motion.div
                          variants={iconVariants}
                          className="text-white flex items-center justify-center"
                        >
                          <Icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
                        </motion.div>
                        
                        {/* Enhanced pattern overlay */}
                        <div className="absolute inset-0 bg-white/10 opacity-20"></div>
                        {/* Inner glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    </div>

                    {/* Enhanced Profile name and description - Perfectly Centered */}
                    <motion.div
                      variants={textVariants}
                      className={`
                        mt-4 sm:mt-5 text-center 
                        ${isHovering ? 'text-white' : 'text-gray-300'}
                        group-hover:text-white transition-all duration-300 ease-out
                        flex flex-col items-center
                        w-full max-w-[140px] sm:max-w-[160px] md:max-w-[180px]
                      `}
                    >
                      <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1 font-heading">
                        {role.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed font-body">
                        {role.description}
                      </p>
                    </motion.div>

                    {/* Enhanced Netflix-style hover effect */}
                    {isHovering && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 15,
                          duration: 0.3 
                        }}
                        className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-10"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                        </div>
                      </motion.div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2"
                      >
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full animate-pulse"></div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Mobile-optimized spacing */}
            <div className="h-8 sm:h-12 md:h-16"></div>
          </div>
        </main>

        {/* Enhanced Netflix-style footer */}
        <footer className="border-t border-gray-800">
          {/* Main Footer Content */}
          <div className="px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto">
              {/* Questions? Contact */}
              <div className="text-center mb-8 sm:mb-12">
                <p className="text-gray-500 text-sm sm:text-base mb-4">
                  Questions? Contact us 24/7 for support
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a 
                    href="tel:9014882779" 
                    className="flex items-center text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm sm:text-base">+91 9014882779</span>
                  </a>
                  <a 
                    href="mailto:support@pharmalynk.com" 
                    className="flex items-center text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-sm sm:text-base">support@pharmalynk.com</span>
                  </a>
                </div>
              </div>

              {/* Footer Links Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
                {/* Company */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Company</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/about" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/careers" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Careers
                      </Link>
                    </li>
                    <li>
                      <Link href="/press" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Press
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Support */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Support</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/help-center" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Help Center
                      </Link>
                    </li>
                    <li>
                      <Link href="/faq" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Contact Us
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Legal */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Legal</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/privacy-policy" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms-of-use" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Terms of Use
                      </Link>
                    </li>
                    <li>
                      <Link href="/cookies" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Cookie Preferences
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Resources */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Resources</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/blog" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Blog
                      </Link>
                    </li>
                    <li>
                      <Link href="/documentation" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        Documentation
                      </Link>
                    </li>
                    <li>
                      <Link href="/api" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                        API
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Copyright */}
              <div className="pt-6 sm:pt-8 border-t border-gray-800">
                <p className="text-gray-500 text-sm text-center">
                  © 2025 PharmaLync. All rights reserved.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="bg-gray-900 px-4 sm:px-6 py-4 sm:py-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <select className="bg-transparent text-gray-500 text-sm border border-gray-700 rounded px-2 py-1">
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                    <option value="ta">தமிழ்</option>
                    <option value="te">తెలుగు</option>
                  </select>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  Made with ❤️ for pharmaceutical supply chain
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}