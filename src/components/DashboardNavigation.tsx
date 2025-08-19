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
import { Bell, Menu, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

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

  const handleNavClick = (navId: string) => {
    setActiveNav(navId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-gray-100 border-b border-gray-200">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
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
                  notifications.map((notification) => (
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
                            {notification.message}
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
              <div className="text-sm font-medium text-gray-900 truncate">
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
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="px-4 py-2">
            <Select value={activeNav} onValueChange={handleNavClick}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {navItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center space-x-2">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Desktop Navigation Tabs */}
      <div className="hidden lg:block">
        <div className="px-4 sm:px-6 lg:px-8">
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
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {Icon && (
                    <Icon className={`
                      mr-2 h-4 w-4
                      ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                  )}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={isActive ? 'default' : 'secondary'}
                      className={`
                        ml-2 px-1.5 py-0.5 text-xs
                        ${isActive ? 'bg-blue-100 text-blue-600' : ''}
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
    </div>
  );
}