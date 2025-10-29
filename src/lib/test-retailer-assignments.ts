/**
 * Test script to verify retailer assignment fixes
 * This script tests the key scenarios that were causing issues
 */

import { RetailerService } from '../services/firestore';

// Test scenarios:
// 1. Create retailer for tenant A
// 2. Add same retailer to tenant B (should update existing, not duplicate)
// 3. Reassign retailer to different line worker
// 4. Verify data integrity across all operations

export async function testRetailerAssignments() {
  console.log('🧪 Testing Retailer Assignment Fixes...');
  
  const retailerService = new RetailerService();
  const tenantA = 'test-tenant-a';
  const tenantB = 'test-tenant-b';
  const lineWorker1 = 'test-line-worker-1';
  const lineWorker2 = 'test-line-worker-2';
  
  try {
    // Test 1: Create retailer for tenant A
    console.log('\n📝 Test 1: Creating retailer for tenant A...');
    const retailerId1 = await retailerService.createRetailer(tenantA, {
      name: 'Test Pharmacy',
      phone: '+1234567890',
      address: '123 Test Street',
      areaId: 'area-1',
      zipcodes: ['110001']
    });
    console.log(`✅ Created retailer: ${retailerId1}`);
    
    // Test 2: Add same retailer to tenant B (should update existing)
    console.log('\n📝 Test 2: Adding same retailer to tenant B...');
    const retailerId2 = await retailerService.createRetailer(tenantB, {
      name: 'Test Pharmacy', // Same name
      phone: '+1234567890', // Same phone - should find existing
      address: '123 Test Street',
      areaId: 'area-2', // Different area
      zipcodes: ['110002']
    });
    console.log(`✅ Added to tenant B: ${retailerId2}`);
    
    // Verify it's the same retailer
    if (retailerId1 === retailerId2) {
      console.log('✅ SUCCESS: Same retailer ID returned - no duplication!');
    } else {
      console.log('❌ FAILURE: Different retailer IDs - duplication occurred!');
      return false;
    }
    
    // Test 3: Get retailer data for both tenants
    console.log('\n📝 Test 3: Verifying tenant-specific data...');
    const retailerForTenantA = await retailerService.getById(retailerId1, tenantA);
    const retailerForTenantB = await retailerService.getById(retailerId1, tenantB);
    
    console.log(`🏪 Tenant A data: area=${retailerForTenantA?.areaId}, worker=${retailerForTenantA?.assignedLineWorkerId}`);
    console.log(`🏪 Tenant B data: area=${retailerForTenantB?.areaId}, worker=${retailerForTenantB?.assignedLineWorkerId}`);
    
    // Test 4: Reassign retailer for tenant A
    console.log('\n📝 Test 4: Reassigning retailer for tenant A...');
    await retailerService.reassignRetailerToLineWorker(retailerId1, tenantA, lineWorker1);
    console.log(`✅ Assigned to line worker: ${lineWorker1}`);
    
    // Test 5: Verify reassignment only affects tenant A
    console.log('\n📝 Test 5: Verifying tenant isolation...');
    const updatedRetailerA = await retailerService.getById(retailerId1, tenantA);
    const updatedRetailerB = await retailerService.getById(retailerId1, tenantB);
    
    console.log(`🔄 Tenant A (updated): worker=${updatedRetailerA?.assignedLineWorkerId}`);
    console.log(`🔄 Tenant B (unchanged): worker=${updatedRetailerB?.assignedLineWorkerId}`);
    
    if (updatedRetailerA?.assignedLineWorkerId === lineWorker1 && 
        updatedRetailerB?.assignedLineWorkerId !== lineWorker1) {
      console.log('✅ SUCCESS: Tenant isolation working correctly!');
    } else {
      console.log('❌ FAILURE: Tenant isolation broken!');
      return false;
    }
    
    console.log('\n🎉 ALL TESTS PASSED! Retailer assignment fixes are working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

export default testRetailerAssignments;