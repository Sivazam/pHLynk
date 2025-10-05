/**
 * Notification De-duplication System
 * Prevents duplicate notifications across PWA and browser instances
 */

interface NotificationRecord {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  type?: string;
  amount?: number;
  otp?: string;
  shown: boolean;
}

interface AppState {
  isPWA: boolean;
  isForeground: boolean;
  lastActive: number;
  sessionId: string;
}

class NotificationDeduplicator {
  private static instance: NotificationDeduplicator;
  private notifications: Map<string, NotificationRecord> = new Map();
  private appState: AppState;
  private storageKey = 'notification_deduplicator_data';
  private sessionTimeout = 5 * 60 * 1000; // 5 minutes
  private notificationTimeout = 30 * 1000; // 30 seconds

  private constructor() {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      this.appState = {
        isPWA: false,
        isForeground: true,
        lastActive: Date.now(),
        sessionId: 'server'
      };
      return;
    }

    const isPWA = this.detectPWA();
    this.appState = {
      isPWA,
      isForeground: !document.hidden,
      lastActive: Date.now(),
      sessionId: `${isPWA ? 'pwa' : 'browser'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.loadFromStorage();
    this.setupEventListeners();
    this.cleanup();
  }

  static getInstance(): NotificationDeduplicator {
    if (!NotificationDeduplicator.instance) {
      NotificationDeduplicator.instance = new NotificationDeduplicator();
    }
    return NotificationDeduplicator.instance;
  }

  
  private detectPWA(): boolean {
    if (typeof window === 'undefined') return false;
    
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone || 
           document.referrer.includes('android-app://');
  }

  private generateNotificationId(payload: any): string {
    // Create a unique ID based on notification content and timestamp
    const baseData = {
      title: payload.notification?.title || '',
      body: payload.notification?.body || '',
      type: payload.data?.type || '',
      amount: payload.data?.amount || 0,
      otp: payload.data?.otp || '',
      timestamp: Math.floor(Date.now() / 10000) // Round to 10 seconds to handle slight delays
    };
    
    return btoa(JSON.stringify(baseData)).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Track app visibility
    document.addEventListener('visibilitychange', () => {
      this.appState.isForeground = !document.hidden;
      this.appState.lastActive = Date.now();
      this.saveToStorage();
    });

    // Track window focus
    window.addEventListener('focus', () => {
      this.appState.isForeground = true;
      this.appState.lastActive = Date.now();
      this.saveToStorage();
    });

    window.addEventListener('blur', () => {
      this.appState.isForeground = false;
      this.saveToStorage();
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        this.handleStorageUpdate(e.newValue);
      }
    });
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load notifications
        if (data.notifications) {
          this.notifications = new Map(Object.entries(data.notifications));
        }
        
        // Update app state if newer session exists
        if (data.appState && data.appState.lastActive > this.appState.lastActive) {
          this.appState = { ...this.appState, ...data.appState };
        }
      }
    } catch (error) {
      console.warn('Failed to load notification deduplicator data:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = {
        notifications: Object.fromEntries(this.notifications),
        appState: this.appState,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save notification deduplicator data:', error);
    }
  }

  private handleStorageUpdate(newValue: string): void {
    try {
      const data = JSON.parse(newValue);
      
      // Merge notifications from other tabs
      if (data.notifications) {
        const otherNotifications = new Map(Object.entries(data.notifications));
        
        // Add notifications we don't have
        otherNotifications.forEach((notification: any, id: string) => {
          if (!this.notifications.has(id)) {
            this.notifications.set(id, notification as NotificationRecord);
          }
        });
      }
      
      // Update app state if needed
      if (data.appState && data.appState.lastActive > this.appState.lastActive) {
        this.appState = { ...this.appState, ...data.appState };
      }
    } catch (error) {
      console.warn('Failed to handle storage update:', error);
    }
  }

  private cleanup(): void {
    // Clean up old notifications and sessions
    const now = Date.now();
    
    // Clean old notifications
    this.notifications.forEach((notification, id) => {
      if (now - notification.timestamp > this.notificationTimeout) {
        this.notifications.delete(id);
      }
    });

    // Clean up if session is too old
    if (now - this.appState.lastActive > this.sessionTimeout) {
      this.appState.sessionId = this.generateSessionId();
    }

    this.saveToStorage();

    // Schedule next cleanup
    setTimeout(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Check if a notification should be shown
   */
  shouldShowNotification(payload: any): { shouldShow: boolean; reason: string } {
    const notificationId = this.generateNotificationId(payload);
    const now = Date.now();
    
    // Check if we've already shown this notification
    const existing = this.notifications.get(notificationId);
    if (existing) {
      const timeDiff = now - existing.timestamp;
      if (timeDiff < this.notificationTimeout) {
        return { shouldShow: false, reason: 'Duplicate notification (recently shown)' };
      }
    }

    // Check app state priority
    const shouldShowBasedOnAppState = this.checkAppStatePriority();
    if (!shouldShowBasedOnAppState) {
      return { shouldShow: false, reason: 'Another app instance has priority' };
    }

    // Record this notification
    this.notifications.set(notificationId, {
      id: notificationId,
      timestamp: now,
      title: payload.notification?.title || '',
      body: payload.notification?.body || '',
      type: payload.data?.type,
      amount: payload.data?.amount,
      otp: payload.data?.otp,
      shown: true
    });

    this.saveToStorage();
    
    return { shouldShow: true, reason: 'Notification approved' };
  }

  private checkAppStatePriority(): boolean {
    const now = Date.now();
    const timeSinceActive = now - this.appState.lastActive;
    
    // If this app has been active recently, it has priority
    if (timeSinceActive < 30000) { // 30 seconds
      return true;
    }

    // If this is PWA and the other is browser, PWA gets priority
    if (this.appState.isPWA) {
      return true;
    }

    // If this is foreground, it gets priority
    if (this.appState.isForeground) {
      return true;
    }

    // Otherwise, don't show to avoid duplicates
    return false;
  }

  /**
   * Get current app state information
   */
  getAppState(): AppState {
    return { ...this.appState };
  }

  /**
   * Get notification history
   */
  getNotificationHistory(): NotificationRecord[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 notifications
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notifications.clear();
    this.saveToStorage();
  }

  /**
   * Debug information
   */
  getDebugInfo(): any {
    return {
      appState: this.appState,
      notificationCount: this.notifications.size,
      recentNotifications: this.getNotificationHistory(),
      storageKey: this.storageKey,
      isPWA: this.appState.isPWA,
      isForeground: this.appState.isForeground,
      timeSinceActive: Date.now() - this.appState.lastActive
    };
  }
}

// Safe export with lazy initialization
export const notificationDeduplicator = typeof window !== 'undefined' 
  ? NotificationDeduplicator.getInstance() 
  : null;