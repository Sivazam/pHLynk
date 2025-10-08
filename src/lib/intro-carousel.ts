/**
 * Intro Carousel Management Utility
 * Handles version-controlled carousel display logic
 */

// Current version of the intro carousel
// Increment this version when you want to show the carousel again to all users
export const INTRO_CAROUSEL_VERSION = '1.0.0';

// Storage key format: pharmalync-intro-seen-v{version}
export const getIntroStorageKey = () => {
  return `pharmalync-intro-seen-v${INTRO_CAROUSEL_VERSION}`;
};

/**
 * Check if we're running on the client side
 */
const isClient = (): boolean => {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

/**
 * Check if the user has seen the current version of the intro carousel
 * @returns boolean - true if user has seen this version, false otherwise
 */
export const hasSeenIntroCarousel = (): boolean => {
  // Always return false on server side to prevent hydration issues
  if (!isClient()) {
    return false;
  }
  
  try {
    const storageKey = getIntroStorageKey();
    const hasSeen = localStorage.getItem(storageKey);
    return hasSeen === 'true';
  } catch (error) {
    // If localStorage is not available (e.g., private browsing), assume they haven't seen it
    console.warn('Unable to access localStorage for intro carousel:', error);
    return false;
  }
};

/**
 * Mark the current version of the intro carousel as seen
 */
export const markIntroCarouselAsSeen = (): void => {
  // Do nothing on server side
  if (!isClient()) {
    return;
  }
  
  try {
    const storageKey = getIntroStorageKey();
    localStorage.setItem(storageKey, 'true');
    
    // Clean up old version keys to prevent localStorage bloat
    cleanupOldIntroKeys();
  } catch (error) {
    console.warn('Unable to mark intro carousel as seen:', error);
  }
};

/**
 * Clean up old version keys from localStorage
 * This prevents localStorage from getting cluttered with old version keys
 */
export const cleanupOldIntroKeys = (): void => {
  // Do nothing on server side
  if (!isClient()) {
    return;
  }
  
  try {
    const keysToRemove: string[] = [];
    
    // Find all intro carousel keys that don't match the current version
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pharmalync-intro-seen-v')) {
        // Extract version from key and compare with current version
        const keyVersion = key.replace('pharmalync-intro-seen-v', '');
        if (keyVersion !== INTRO_CAROUSEL_VERSION) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove old keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old intro carousel keys`);
    }
  } catch (error) {
    console.warn('Unable to cleanup old intro carousel keys:', error);
  }
};

/**
 * Reset the intro carousel (for testing purposes)
 * This will remove all intro carousel related entries from localStorage
 */
export const resetIntroCarousel = (): void => {
  // Do nothing on server side
  if (!isClient()) {
    return;
  }
  
  try {
    const keysToRemove: string[] = [];
    
    // Find all intro carousel keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pharmalync-intro-seen-v')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all intro carousel keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Reset intro carousel - removed ${keysToRemove.length} keys`);
  } catch (error) {
    console.warn('Unable to reset intro carousel:', error);
  }
};

/**
 * Get the current intro carousel version
 * @returns string - current version
 */
export const getCurrentIntroVersion = (): string => {
  return INTRO_CAROUSEL_VERSION;
};

/**
 * Force show the intro carousel (for testing or admin purposes)
 * This temporarily marks the current version as unseen
 */
export const forceShowIntroCarousel = (): void => {
  // Do nothing on server side
  if (!isClient()) {
    return;
  }
  
  try {
    const storageKey = getIntroStorageKey();
    localStorage.removeItem(storageKey);
    console.log('Intro carousel forced to show - removed seen flag');
  } catch (error) {
    console.warn('Unable to force show intro carousel:', error);
  }
};