'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, CheckCircle, AlertTriangle, Info, Zap, DollarSign } from 'lucide-react';
import { formatTimestampWithTime } from '@/lib/timestamp-utils';
import { Payment, User, Retailer } from '@/types';
import { formatCurrency } from '@/lib/timestamp-utils';

interface Notification {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  amount?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface RealTimeNotificationsProps {
  payments: Payment[];
  lineWorkers: User[];
  retailers: Retailer[];
}

export function RealTimeNotifications({ payments, lineWorkers, retailers }: RealTimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate notifications from actual payment data
  useEffect(() => {
    const paymentNotifications: Notification[] = payments
      .filter(p => p.state === 'COMPLETED')
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, 10)
      .map(payment => {
        const lineWorker = lineWorkers.find(w => w.id === payment.lineWorkerId);
        const retailer = retailers.find(r => r.id === payment.retailerId);
        
        return {
          id: `payment_${payment.id}`,
          type: 'SUCCESS' as const,
          title: 'Payment Collected',
          message: `${lineWorker?.displayName || 'Line Worker'} collected ${formatCurrency(payment.totalPaid)} from ${retailer?.name || 'Retailer'}`,
          timestamp: payment.createdAt.toDate(),
          read: false,
          amount: payment.totalPaid
        };
      });

    // Add some system notifications
    const systemNotifications: Notification[] = [
      {
        id: 'high_outstanding',
        type: 'WARNING' as const,
        title: 'High Outstanding Balance',
        message: 'Some retailers have outstanding balances requiring attention',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true
      },
      {
        id: 'daily_summary',
        type: 'INFO' as const,
        title: 'Daily Collection Summary',
        message: `Today's total collections: ${formatCurrency(paymentNotifications.reduce((sum, n) => sum + (n.amount || 0), 0))}`,
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        read: true
      }
    ];

    const allNotifications = [...paymentNotifications, ...systemNotifications];
    setNotifications(allNotifications);
    updateUnreadCount(allNotifications);
  }, [payments, lineWorkers, retailers]);

  // Update unread count when notifications change
  useEffect(() => {
    updateUnreadCount(notifications);
  }, [notifications]);

  const updateUnreadCount = (notifs: Notification[]) => {
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    updateUnreadCount(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'ERROR':
        return <X className="h-5 w-5 text-red-500" />;
      case 'INFO':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-l-green-500 bg-green-50';
      case 'WARNING':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'ERROR':
        return 'border-l-red-500 bg-red-50';
      case 'INFO':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const displayNotifications = showAll ? notifications : notifications.slice(0, 5);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            {notifications.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show less' : 'Show all'}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Real-time payment collection updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          displayNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 transition-all duration-200 ${
                getNotificationColor(notification.type)
              } ${!notification.read ? 'shadow-md' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      {notification.amount && (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                          +{formatCurrency(notification.amount)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatTimestampWithTime(notification.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}