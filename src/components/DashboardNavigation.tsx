'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, X, AlertCircle, CheckCircle, Info, MoreHorizontal, LogOut } from 'lucide-react';
import Image from 'next/image';

export type NavItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export type NotificationItem = {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  workerName?: string; // Added to show line worker name
  retailerName?: string; // Added to show retailer name
  paymentId?: string; // Added to show payment ID
  areaName?: string; // Added to show area name
  retailerCount?: number; // Added to show retailer count
  zipCount?: number; // Added to show zip count
  totalCollections?: number; // Added to show total collections
  paymentCount?: number; // Added to show payment count
  milestoneType?: string; // Added to show milestone type
  milestoneValue?: number; // Added to show milestone value
  amount?: number; // Added to show payment amount
  collectionTime?: string; // Added to show collection time
  initiatedAt?: string; // Added to show payment initiation time
  dueDate?: string; // Added to show invoice due date
  activityCount?: number; // Added to show activity count
  collectionCount?: number; // Added to show collection count
};

interface DashboardNavigationProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  notificationCount?: number;
  notifications?: NotificationItem[];
  user?: {
    displayName?: string;
    email?: string;
  };
  onLogout?: () => void;
}

export function DashboardNavigation({
  activeNav,
  setActiveNav,
  navItems,
  title,
  subtitle,
  notificationCount = 0,
  notifications = [],
  user,
  onLogout
}: DashboardNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleNavClick = (navId: string) => {
    setActiveNav(navId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-gray-100 border-b border-gray-200">
      {/* Header */}
      <header className="bg-black shadow-sm border-b border-gray-800 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Image 
                src="/logoMain.png" 
                alt="PharmaLync Logo" 
                width={40} 
                height={40}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg"
              />
            </div>
            
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                PharmaLync
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-300">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  [...notifications]
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex-col items-start p-4 cursor-default">
                      <div className="flex items-start space-x-3 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.type === 'warning' && (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          {notification.type === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {notification.type === 'info' && (
                            <Info className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {notification.retailerName ? 
                              // If we have retailerName, reconstruct the message properly
                              (() => {
                                if (notification.title === 'Payment collected successfully') {
                                  return `Successfully collected ₹${notification.amount?.toLocaleString() || '0'} from ${notification.retailerName}`;
                                } else if (notification.title === 'Payment initiated') {
                                  return `Payment of ₹${notification.amount?.toLocaleString() || '0'} initiated for ${notification.retailerName}`;
                                } else if (notification.title === 'High-value collection!') {
                                  return `Excellent! Collected ₹${notification.amount?.toLocaleString() || '0'} from ${notification.retailerName}`;
                                } else {
                                  return notification.message;
                                }
                              })()
                              : 
                              // Fallback to original message
                              notification.message
                            }
                          </div>
                          {/* Display additional payment details if available */}
                          {notification.amount && (
                            <div className="text-sm text-purple-600 font-medium mt-1">
                              Amount: ₹{notification.amount.toLocaleString()}
                            </div>
                          )}
                          {notification.collectionTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              Collected at: {notification.collectionTime}
                            </div>
                          )}
                          {notification.initiatedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Initiated at: {notification.initiatedAt}
                            </div>
                          )}
                          {notification.dueDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Due date: {notification.dueDate}
                            </div>
                          )}
                          {notification.activityCount && (
                            <div className="text-xs text-gray-500 mt-1">
                              Activities: {notification.activityCount}
                            </div>
                          )}
                          {notification.collectionCount && (
                            <div className="text-xs text-gray-500 mt-1">
                              Collections: {notification.collectionCount}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-gray-400">
                              {notification.timestamp.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: notification.timestamp.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </div>
                            {notification.workerName && (
                              <div className="text-xs text-gray-500">
                                {notification.workerName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Info */}
            <div className="text-right min-w-0 hidden sm:block">
              <div className="text-sm font-medium text-white truncate">
                Welcome, {user?.displayName || user?.email}
              </div>
            </div>

            {/* Logout Button */}
            {onLogout && (
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="flex-shrink-0"
                size="sm"
              >
                <LogOut className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs */}
      <div className="hidden lg:block pt-16 sm:pt-20 border-b border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8 bg-black">
          <nav className="flex space-x-1 overflow-x-auto py-3" aria-label="Tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    group relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                    transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  {Icon && (
                    <Icon className={`
                      mr-2 h-4 w-4
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}
                    `} />
                  )}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={isActive ? 'default' : 'secondary'}
                      className={`
                        ml-2 px-1.5 py-0.5 text-xs
                        ${isActive ? 'bg-gray-700 text-white' : ''}
                      `}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-black border-t border-gray-800 shadow-lg">
          <nav className="flex justify-around items-center py-2" aria-label="Mobile navigation">
            {/* First 3 navigation items */}
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    flex flex-col items-center justify-center px-4 py-2 min-w-[60px] max-w-[80px]
                    transition-all duration-200 rounded-lg
                    ${isActive 
                      ? 'text-white bg-gray-800' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="relative flex-shrink-0">
                    {Icon && (
                      <Icon className={`
                        h-5 w-5 mb-1
                        ${isActive ? 'text-white' : 'text-gray-400'}
                        transition-colors duration-200
                      `} />
                    )}
                    {item.badge && (
                      <Badge 
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs min-w-[16px] border border-white"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className={`
                    text-xs font-medium text-center leading-tight w-full
                    ${isActive ? 'text-white' : 'text-gray-400'}
                    transition-colors duration-200
                  `}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            
            {/* More Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`
                  flex flex-col items-center justify-center px-4 py-2 min-w-[60px] max-w-[80px]
                  transition-all duration-200 rounded-lg
                  ${showMoreMenu 
                    ? 'text-white bg-gray-800' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <div className="relative flex-shrink-0">
                  <MoreHorizontal className={`
                    h-5 w-5 mb-1
                    ${showMoreMenu ? 'text-white' : 'text-gray-400'}
                    transition-colors duration-200
                  `} />
                </div>
                <span className={`
                  text-xs font-medium text-center leading-tight w-full
                  ${showMoreMenu ? 'text-white' : 'text-gray-400'}
                  transition-colors duration-200
                `}>
                  More
                </span>
              </button>
              
              {/* More Menu Dropdown */}
              {showMoreMenu && navItems.length > 3 && (
                <div className="absolute bottom-full right-0 mb-3 z-40 sm:right-auto sm:left-1/2 sm:transform sm:-translate-x-1/2">
                  {/* Menu container with professional styling */}
                  <div className="relative z-20">
                    {/* Arrow pointing to More button */}
                    <div className="absolute top-full right-4 sm:right-auto sm:left-1/2 sm:transform sm:-translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                    
                    {/* Menu header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg border-b border-blue-800">
                      <h3 className="text-sm font-semibold">More Options</h3>
                      <p className="text-xs text-blue-100 mt-0.5">Additional navigation</p>
                    </div>
                    
                    {/* Menu items list */}
                    <div className="bg-gray-800 rounded-b-lg shadow-2xl border border-gray-700 min-w-[240px] max-h-[70vh] overflow-y-auto">
                      <div className="p-1">
                        {navItems.slice(3).map((item, index) => {
                          const Icon = item.icon;
                          const isActive = activeNav === item.id;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                handleNavClick(item.id);
                                setShowMoreMenu(false);
                              }}
                              className={`
                                w-full flex items-center px-3 py-3 rounded-lg text-sm mb-1 last:mb-0
                                transition-all duration-200 group relative overflow-hidden
                                ${isActive 
                                  ? 'bg-gray-700 text-white border-l-4 border-blue-500 shadow-sm' 
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-md'
                                }
                              `}
                            >
                              {/* Icon container */}
                              <div className={`
                                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-3
                                transition-all duration-200
                                ${isActive 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-700 text-gray-300 group-hover:bg-blue-600 group-hover:text-white'
                                }
                              `}>
                                {Icon && <Icon className="h-4 w-4" />}
                              </div>
                              
                              {/* Text content */}
                              <div className="flex-1 text-left">
                                <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                  {item.label}
                                </div>
                                <div className={`text-xs mt-0.5 ${isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                  Navigate to {item.label.toLowerCase()}
                                </div>
                              </div>
                              
                              {/* Badge */}
                              {item.badge && (
                                <Badge 
                                  variant={isActive ? "default" : "secondary"}
                                  className={`
                                    ml-2 px-2 py-1 text-xs font-medium rounded-full
                                    ${isActive 
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-gray-600 text-gray-200 group-hover:bg-blue-600 group-hover:text-white'
                                    }
                                  `}
                                >
                                  {item.badge > 99 ? '99+' : item.badge}
                                </Badge>
                              )}
                              
                              {/* Active indicator */}
                              {isActive && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Menu footer */}
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 rounded-b-lg">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{navItems.length - 3} items</span>
                          <span>Tap to close</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}