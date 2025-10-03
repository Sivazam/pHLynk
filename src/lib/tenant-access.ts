import { doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS, TENANT_STATUSES } from '@/lib/firebase';
import { User, AuthUser } from '@/types';

/**
 * Check if a user has access based on their tenant status
 * @param user The user object (can be User or AuthUser)
 * @returns Promise<boolean> True if user has access, false otherwise
 */
export async function checkUserTenantAccess(user: User | AuthUser): Promise<boolean> {
  try {
    // If user is a retailer, they always have access if active
    // Retailers use 'isActive' field in Retailer collection, but AuthUser doesn't have this
    if (user.roles.includes('RETAILER')) {
      // For retailer users in AuthUser format, we can't check isActive since it's not included
      // We'll assume they are active since they passed authentication
      return true;
    }

    // If user is not a wholesaler admin or line worker, they have access
    if (!user.roles.includes('WHOLESALER_ADMIN') && !user.roles.includes('LINE_WORKER')) {
      return true;
    }

    // Check if user is active (only for User type, not AuthUser)
    if ('active' in user && !user.active) {
      return false;
    }

    // Check if user has tenantId
    if (!user.tenantId) {
      return false;
    }

    // Fetch tenant document
    const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
    
    if (!tenantDoc.exists()) {
      return false;
    }

    const tenantData = tenantDoc.data();
    
    // Check if tenant is active
    return tenantData.status === TENANT_STATUSES.ACTIVE;
  } catch (error) {
    console.error('Error checking user tenant access:', error);
    return false;
  }
}

/**
 * Get tenant status for a user
 * @param user The user object (can be User or AuthUser)
 * @returns Promise<string | null> Tenant status or null if not applicable
 */
export async function getUserTenantStatus(user: User | AuthUser): Promise<string | null> {
  try {
    // If user is a retailer, tenant status is not applicable
    // Retailers don't have tenant status - they are always active
    if (user.roles.includes('RETAILER')) {
      return null;
    }

    // If user is not a wholesaler admin or line worker, tenant status is not applicable
    if (!user.roles.includes('WHOLESALER_ADMIN') && !user.roles.includes('LINE_WORKER')) {
      return null;
    }

    if (!user.tenantId) {
      return null;
    }

    const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
    
    if (!tenantDoc.exists()) {
      return null;
    }

    const tenantData = tenantDoc.data();
    return tenantData.status || null;
  } catch (error) {
    console.error('Error getting user tenant status:', error);
    return null;
  }
}

/**
 * Check if a user can access dashboard based on their role and tenant status
 * @param user The user object (can be User or AuthUser)
 * @returns Promise<{ hasAccess: boolean; reason?: string }> Access check result
 */
export async function checkDashboardAccess(user: User | AuthUser): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    // For retailer users, they always have access if they exist
    // Retailers use 'isActive' field in Retailer collection, but AuthUser doesn't have this
    if (user.roles.includes('RETAILER')) {
      // For retailer users in AuthUser format, we can't check isActive since it's not included
      // We'll assume they are active since they passed authentication
      return { hasAccess: true };
    }

    // For super admins, they always have access if active
    if (user.roles.includes('SUPER_ADMIN')) {
      // Check if user is active (only for User type, not AuthUser)
      if ('active' in user && !user.active) {
        return { hasAccess: false, reason: 'User account is inactive' };
      }
      return { hasAccess: true };
    }

    // Check if user is active (for wholesaler admins and line workers)
    if ('active' in user && !user.active) {
      return { hasAccess: false, reason: 'User account is inactive' };
    }

    // For wholesaler admins and line workers, check tenant status
    if (user.roles.includes('WHOLESALER_ADMIN') || user.roles.includes('LINE_WORKER')) {
      if (!user.tenantId) {
        return { hasAccess: false, reason: 'User is not assigned to any tenant' };
      }

      const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
      
      if (!tenantDoc.exists()) {
        return { hasAccess: false, reason: 'Tenant account not found' };
      }

      const tenantData = tenantDoc.data();
      
      switch (tenantData.status) {
        case TENANT_STATUSES.ACTIVE:
          return { hasAccess: true };
        case TENANT_STATUSES.PENDING:
          return { hasAccess: false, reason: 'Tenant account is pending approval' };
        case TENANT_STATUSES.SUSPENDED:
          return { hasAccess: false, reason: 'Tenant account is suspended' };
        default:
          return { hasAccess: false, reason: 'Tenant account status is unknown' };
      }
    }

    // Default case - should not reach here for valid roles
    return { hasAccess: false, reason: 'Invalid user role' };
  } catch (error) {
    console.error('Error checking dashboard access:', error);
    return { hasAccess: false, reason: 'Error verifying access permissions' };
  }
}