import { Timestamp } from 'firebase/firestore';
import { formatTimestampWithTime } from '@/lib/timestamp-utils';
import { NotificationItem } from '@/components/DashboardNavigation';

// Notification service for managing app-wide notifications
export class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationItem[] = [];
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();

  private constructor() {
    // Initialize empty notifications - no sample data
    this.notifications = [];
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Add a new notification
  addNotification(notification: Omit<NotificationItem, 'id'>): string {
    // Check for duplicate notifications based on content and recent timestamp
    const isDuplicate = this.notifications.some(existingNotification => {
      const timeDiff = Math.abs(
        new Date(notification.timestamp).getTime() - 
        new Date(existingNotification.timestamp).getTime()
      );
      
      // Consider it a duplicate if:
      // 1. Same title and message
      // 2. Same type
      // 3. Within 10 seconds of each other (increased from 5 to catch more duplicates)
      // 4. Same amount and worker combination for payment notifications
      const hasSamePaymentDetails = (
        notification.amount && 
        existingNotification.amount && 
        notification.amount === existingNotification.amount &&
        notification.workerName && 
        existingNotification.workerName && 
        notification.workerName === existingNotification.workerName
      );
      
      return (
        (existingNotification.title === notification.title &&
        existingNotification.message === notification.message &&
        existingNotification.type === notification.type &&
        timeDiff < 10000) || // 10 seconds
        hasSamePaymentDetails
      );
    });

    if (isDuplicate) {
      console.log('🔔 Duplicate notification detected, skipping:', notification.title);
      return '';
    }

    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: NotificationItem = {
      id,
      ...notification
    };
    
    this.notifications.unshift(fullNotification); // Add to beginning (most recent first)
    this.notifyListeners();
    
    console.log('New notification added:', fullNotification);
    return id;
  }

  // Add a payment collected notification
  addPaymentCollectedNotification(
    workerName: string,
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'Payment collected',
      message: `Payment collected from ${retailerName}`,
      timestamp: new Date(),
      read: false,
      workerName,
      amount,
      collectionTime: formatTimestampWithTime(new Date())
    });
  }

  // Add a payment initiated notification
  addPaymentInitiatedNotification(
    workerName: string,
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'info',
      title: 'Payment initiated',
      message: `${workerName} initiated payment from ${retailerName}`,
      timestamp: new Date(),
      read: false,
      workerName,
      amount,
      initiatedAt: formatTimestampWithTime(new Date())
    });
  }

  // Add a payment failed notification
  addPaymentFailedNotification(
    workerName: string,
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'warning',
      title: 'Payment failed',
      message: `Payment of ₹${amount.toLocaleString()} from ${retailerName} failed for ${workerName}`,
      timestamp: new Date(),
      read: false,
      workerName,
      amount,
      initiatedAt: formatTimestampWithTime(new Date())
    });
  }

  // Add a top performer notification
  addTopPerformerNotification(
    workerName: string,
    amount: number,
    collectionCount: number
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'Top performer',
      message: `${workerName} collected ${collectionCount} payments totaling ₹${amount.toLocaleString()} today`,
      timestamp: new Date(),
      read: false,
      workerName,
      amount,
      collectionCount
    });
  }

  // Add an overdue invoice notification
  addOverdueInvoiceNotification(
    retailerName: string,
    amount: number,
    invoiceNumber: string,
    daysOverdue: number
  ): string {
    return this.addNotification({
      type: 'warning',
      title: 'Overdue invoice',
      message: `Invoice #${invoiceNumber} for ${retailerName} is ${daysOverdue} days overdue (₹${amount.toLocaleString()})`,
      timestamp: new Date(),
      read: false,
      amount,
      dueDate: formatTimestampWithTime(new Date())
    });
  }

  // Add an inactive worker activity notification
  addInactiveWorkerActivityNotification(
    workerName: string,
    activityCount: number
  ): string {
    return this.addNotification({
      type: 'info',
      title: 'Inactive worker activity',
      message: `Inactive worker ${workerName} has ${activityCount} recent payment activities`,
      timestamp: new Date(),
      read: false,
      workerName,
      activityCount
    });
  }

  // Line Worker Specific Notifications
  
  // Add payment completion notification for line worker
  addLineWorkerPaymentCompletedNotification(
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'Payment collected successfully',
      message: `Successfully collected ₹${amount.toLocaleString()} from ${retailerName}`,
      timestamp: new Date(),
      read: false,
      amount,
      retailerName,
      paymentId
    });
  }

  // Add payment initiated notification for line worker
  addLineWorkerPaymentInitiatedNotification(
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'info',
      title: 'Payment initiated',
      message: `Payment of ₹${amount.toLocaleString()} initiated for ${retailerName}`,
      timestamp: new Date(),
      read: false,
      amount,
      retailerName,
      paymentId
    });
  }

  // Add payment failed notification for line worker
  addLineWorkerPaymentFailedNotification(
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'warning',
      title: 'Payment failed',
      message: `Payment of ₹${amount.toLocaleString()} failed for ${retailerName}`,
      timestamp: new Date(),
      read: false,
      amount,
      retailerName,
      paymentId
    });
  }

  // Add new retailer assignment notification for line worker
  addLineWorkerNewRetailerAssignment(
    retailerName: string,
    areaName: string,
    retailerCount: number
  ): string {
    return this.addNotification({
      type: 'info',
      title: 'New retailer assigned',
      message: `${retailerName} in ${areaName} has been assigned to you`,
      timestamp: new Date(),
      read: false,
      retailerName,
      areaName,
      retailerCount
    });
  }

  // Add new area assignment notification for line worker
  addLineWorkerNewAreaAssignment(
    areaName: string,
    zipCount: number,
    retailerCount: number
  ): string {
    return this.addNotification({
      type: 'info',
      title: 'New area assigned',
      message: `Area ${areaName} with ${zipCount} zip codes and ${retailerCount} retailers assigned to you`,
      timestamp: new Date(),
      read: false,
      areaName,
      zipCount,
      retailerCount
    });
  }

  // Add daily collection summary notification for line worker
  addLineWorkerDailySummary(
    totalCollections: number,
    paymentCount: number,
    retailerCount: number
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'Daily collection summary',
      message: `Collected ₹${totalCollections.toLocaleString()} from ${paymentCount} payments across ${retailerCount} retailers today`,
      timestamp: new Date(),
      read: false,
      totalCollections,
      paymentCount,
      retailerCount
    });
  }

  // Add high-value collection notification for line worker
  addLineWorkerHighValueCollection(
    retailerName: string,
    amount: number,
    paymentId: string
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'High-value collection!',
      message: `Excellent! Collected ₹${amount.toLocaleString()} from ${retailerName}`,
      timestamp: new Date(),
      read: false,
      amount,
      retailerName,
      paymentId
    });
  }

  // Add milestone notification for line worker
  addLineWorkerMilestone(
    milestoneType: 'PAYMENTS' | 'AMOUNT' | 'RETAILERS',
    milestoneValue: number,
    description: string
  ): string {
    return this.addNotification({
      type: 'success',
      title: 'Milestone achieved!',
      message: description,
      timestamp: new Date(),
      read: false,
      milestoneType,
      milestoneValue
    });
  }

  // Get all notifications
  getNotifications(): NotificationItem[] {
    // Return notifications sorted by timestamp (most recent first)
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get unread notification count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Mark notification as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Remove a notification
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Clear all notifications
  clearNotifications(): void {
    console.log('🔔 Clearing all notifications');
    this.notifications = [];
    this.notifyListeners();
  }

  // Add a listener for notification changes
  addListener(listener: (notifications: NotificationItem[]) => void): void {
    this.listeners.add(listener);
  }

  // Remove a listener
  removeListener(listener: (notifications: NotificationItem[]) => void): void {
    this.listeners.delete(listener);
  }

  // Notify all listeners of changes
  private notifyListeners(): void {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();