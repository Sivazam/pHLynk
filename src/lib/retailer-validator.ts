import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Validate if a retailer document exists in Firestore
 */
export async function validateRetailer(retailerId: string): Promise<boolean> {
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    return retailerDoc.exists();
  } catch (error) {
    console.error('❌ Error validating retailer:', error);
    return false;
  }
}

/**
 * Clean invalid retailer data from localStorage
 */
export function cleanInvalidRetailerData(): void {
  const retailerId = localStorage.getItem('retailerId');
  if (retailerId) {
    console.log('🧹 Found retailerId in localStorage:', retailerId);
    // For now, just remove it - the validation will happen asynchronously
    localStorage.removeItem('retailerId');
    console.log('🗑️ Removed retailerId from localStorage for validation');
  }
}

/**
 * Validate and clean retailer ID from localStorage
 */
export async function validateAndCleanRetailerId(): Promise<string | null> {
  const storedRetailerId = localStorage.getItem('retailerId');
  
  if (!storedRetailerId) {
    return null;
  }

  console.log('🔍 Validating retailer ID from localStorage:', storedRetailerId);
  
  const isValid = await validateRetailer(storedRetailerId);
  
  if (isValid) {
    console.log('✅ Retailer ID is valid:', storedRetailerId);
    return storedRetailerId;
  } else {
    console.warn('⚠️ Retailer ID is invalid, removing from localStorage:', storedRetailerId);
    localStorage.removeItem('retailerId');
    return null;
  }
}

/**
 * Check if the current user has a valid retailer document
 */
export async function hasValidRetailerDocument(retailerId: string): Promise<boolean> {
  if (!retailerId) {
    return false;
  }
  
  try {
    const retailerRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailerRef);
    
    if (retailerDoc.exists()) {
      const retailerData = retailerDoc.data();
      return retailerData.active !== false; // Return false only if explicitly inactive
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking retailer document:', error);
    return false;
  }
}