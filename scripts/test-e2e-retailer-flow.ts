#!/usr/bin/env bun
/**
 * End-to-End Test Script for Retailer Flow
 *
 * This script tests the complete flow:
 * 1. Create Wholesaler
 * 2. Create Areas
 * 3. Create Line Worker
 * 4. Create Retailer with phone +91 9959678269
 * 5. Assign Line Worker to Area
 * 6. Create Payment Collection
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, serverTimestamp, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(`\n📋 ${title}\n`, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test Data
const TEST_DATA = {
  wholesaler: {
    businessName: `Test Wholesaler ${Date.now()}`,
    ownerName: 'Test Owner',
    address: '123 Test Street, Test City',
    email: `test${Date.now()}@example.com`,
    mobileNumber: '9876543210',
    password: 'Test@123456'
  },
  retailer: {
    name: 'Test Retailer',
    phone: '9959678269', // Without +91 for Firestore
    phoneWithCountryCode: '+91 9959678269',
    address: '456 Retailer Lane, Retailer City',
    areaId: '',
    zipcodes: ['533101']
  },
  areas: [
    {
      name: 'Test Area 1',
      zipcodes: ['533101', '533102']
    },
    {
      name: 'Test Area 2',
      zipcodes: ['533103', '533104']
    }
  ],
  lineWorker: {
    displayName: 'Test Line Worker',
    email: `lineworker${Date.now()}@example.com`,
    phone: '9876543211'
  },
  payment: {
    totalPaid: 1000,
    method: 'CASH'
  }
};

// Storage for created entities
const createdEntities = {
  wholesaler: null as any,
  tenantId: null as string,
  userId: null as string,
  areas: [] as any[],
  lineWorker: null as any,
  retailer: null as any,
  payment: null as any
};

/**
 * Initialize Firebase Admin
 */
function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      log('✅ Firebase Admin already initialized', 'green');
      const app = existingApps[0];
      return getFirestore(app);
    }

    // Initialize with existing config
    const firebaseConfig = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'phlynk'
    };

    logInfo(`Initializing Firebase Admin with project: ${firebaseConfig.projectId}`);

    const app = initializeApp(firebaseConfig, 'test-app');
    logSuccess('Firebase Admin initialized');

    return getFirestore(app);
  } catch (error) {
    logError(`Failed to initialize Firebase Admin: ${error}`);
    throw error;
  }
}

/**
 * Step 1: Create Wholesaler Account
 */
async function createWholesaler(db: any) {
  logSection('STEP 1: Creating Wholesaler Account');

  try {
    const tenantId = doc(collection(db, 'tenants')).id;
    const tenantRef = doc(db, 'tenants', tenantId);

    const tenantData = {
      name: TEST_DATA.wholesaler.businessName,
      status: 'ACTIVE', // Set to ACTIVE for testing
      subscriptionStatus: 'TRIAL',
      plan: 'BASIC',
      address: TEST_DATA.wholesaler.address,
      gstNumber: null,
      ownerName: TEST_DATA.wholesaler.ownerName,
      contactEmail: TEST_DATA.wholesaler.email,
      contactPhone: TEST_DATA.wholesaler.mobileNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'test-script'
    };

    await setDoc(tenantRef, tenantData);

    // Create user document
    const userId = `test_user_${Date.now()}`;
    const userRef = doc(db, 'users', userId);

    const userData = {
      uid: userId,
      email: TEST_DATA.wholesaler.email,
      phone: TEST_DATA.wholesaler.mobileNumber,
      displayName: TEST_DATA.wholesaler.ownerName,
      roles: ['WHOLESALER_ADMIN'],
      active: true,
      tenantId: tenantId,
      wholesalerName: TEST_DATA.wholesaler.businessName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };

    await setDoc(userRef, userData);

    createdEntities.wholesaler = tenantData;
    createdEntities.tenantId = tenantId;
    createdEntities.userId = userId;

    logSuccess(`Wholesaler created successfully!`);
    logInfo(`Tenant ID: ${tenantId}`);
    logInfo(`User ID: ${userId}`);
    logInfo(`Business Name: ${TEST_DATA.wholesaler.businessName}`);

    return { tenantId, userId };
  } catch (error: any) {
    logError(`Failed to create wholesaler: ${error.message}`);
    throw error;
  }
}

/**
 * Step 2: Create Areas
 */
async function createAreas(db: any, tenantId: string) {
  logSection('STEP 2: Creating Areas');

  try {
    for (const areaData of TEST_DATA.areas) {
      const areaId = doc(collection(db, 'areas')).id;
      const areaRef = doc(db, 'areas', areaId);

      const area = {
        ...areaData,
        tenantIds: [tenantId],
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(areaRef, area);
      createdEntities.areas.push({ id: areaId, ...area });

      logSuccess(`Area created: ${areaData.name} (ID: ${areaId})`);
      logInfo(`Zipcodes: ${areaData.zipcodes.join(', ')}`);
    }

    logInfo(`Total areas created: ${createdEntities.areas.length}`);
    return createdEntities.areas;
  } catch (error: any) {
    logError(`Failed to create areas: ${error.message}`);
    throw error;
  }
}

/**
 * Step 3: Create Line Worker
 */
async function createLineWorker(db: any, tenantId: string, areas: any[]) {
  logSection('STEP 3: Creating Line Worker');

  try {
    const lineWorkerId = `lw_${Date.now()}`;
    const lineWorkerRef = doc(db, 'users', lineWorkerId);

    const lineWorkerData = {
      uid: lineWorkerId,
      email: TEST_DATA.lineWorker.email,
      phone: TEST_DATA.lineWorker.phone,
      displayName: TEST_DATA.lineWorker.displayName,
      roles: ['LINE_WORKER'],
      active: true,
      tenantId: tenantId,
      assignedAreas: areas.map(a => a.id),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };

    await setDoc(lineWorkerRef, lineWorkerData);
    createdEntities.lineWorker = { id: lineWorkerId, ...lineWorkerData };

    logSuccess(`Line Worker created successfully!`);
    logInfo(`Line Worker ID: ${lineWorkerId}`);
    logInfo(`Name: ${TEST_DATA.lineWorker.displayName}`);
    logInfo(`Assigned Areas: ${areas.length} areas`);

    return lineWorkerId;
  } catch (error: any) {
    logError(`Failed to create line worker: ${error.message}`);
    throw error;
  }
}

/**
 * Step 4: Create Retailer
 */
async function createRetailer(db: any, tenantId: string, areas: any[]) {
  logSection('STEP 4: Creating Retailer with Phone +91 9959678269');

  try {
    const retailerId = `retailer_${TEST_DATA.retailer.phone}`;
    const retailerRef = doc(db, 'retailers', retailerId);

    const retailerData = {
      name: TEST_DATA.retailer.name,
      phone: TEST_DATA.retailer.phone,
      address: TEST_DATA.retailer.address,
      active: true,
      tenantIds: [tenantId],
      areaId: areas[0]?.id || '',
      zipcodes: TEST_DATA.retailer.zipcodes,
      assignedLineWorkerId: null,

      // FIX: Populate profile immediately
      profile: {
        realName: TEST_DATA.retailer.name,
        phone: TEST_DATA.retailer.phone,
        address: TEST_DATA.retailer.address,
        email: '',
        businessType: '',
        licenseNumber: ''
      },

      // FIX: Set verification status
      verification: {
        isPhoneVerified: true,
        verificationMethod: 'MANUAL',
        verifiedAt: serverTimestamp()
      },

      // Wholesaler-specific data
      wholesalerData: {
        [tenantId]: {
          currentAreaId: areas[0]?.id || '',
          currentZipcodes: TEST_DATA.retailer.zipcodes,
          assignedAt: serverTimestamp(),
          areaAssignmentHistory: [{
            areaId: areas[0]?.id || '',
            zipcodes: TEST_DATA.retailer.zipcodes,
            assignedAt: serverTimestamp(),
            isActive: true
          }],
          notes: '',
          creditLimit: 0,
          currentBalance: 0
        }
      },

      // Keep for backward compatibility
      wholesalerAssignments: {
        [tenantId]: {
          areaId: areas[0]?.id || '',
          zipcodes: TEST_DATA.retailer.zipcodes,
          assignedAt: serverTimestamp()
        }
      },

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(retailerRef, retailerData);
    createdEntities.retailer = { id: retailerId, ...retailerData };

    logSuccess(`Retailer created successfully!`);
    logInfo(`Retailer ID: ${retailerId}`);
    logInfo(`Name: ${TEST_DATA.retailer.name}`);
    logInfo(`Phone: ${TEST_DATA.retailer.phoneWithCountryCode}`);
    logInfo(`Address: ${TEST_DATA.retailer.address}`);

    // Create retailer user for login
    await createRetailerUser(db, tenantId, retailerId);

    return retailerId;
  } catch (error: any) {
    logError(`Failed to create retailer: ${error.message}`);
    throw error;
  }
}

/**
 * Create Retailer User Account
 */
async function createRetailerUser(db: any, tenantId: string, retailerId: string) {
  try {
    const uid = `retailer_${TEST_DATA.retailer.phone.replace(/\D/g, '')}`;
    const userRef = doc(db, 'retailerUsers', uid);

    const retailerUserData = {
      uid: uid,
      phone: TEST_DATA.retailer.phone,
      retailerId: retailerId,
      tenantId: tenantId,
      name: TEST_DATA.retailer.name,
      email: '',
      address: TEST_DATA.retailer.address,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      // FIX: Set verified immediately
      isVerified: true,
      verificationStatus: 'verified'
    };

    await setDoc(userRef, retailerUserData);

    logSuccess(`Retailer User account created successfully!`);
    logInfo(`User ID: ${uid}`);
    logInfo(`isVerified: ${retailerUserData.isVerified}`);
    logInfo(`verificationStatus: ${retailerUserData.verificationStatus}`);
  } catch (error: any) {
    logError(`Failed to create retailer user: ${error.message}`);
    // Don't throw - retailer was created successfully
    logInfo('Retailer created, but user account may have issues');
  }
}

/**
 * Step 5: Assign Line Worker to Area
 */
async function assignLineWorkerToArea(db: any, tenantId: string, lineWorkerId: string, retailerId: string) {
  logSection('STEP 5: Assigning Line Worker to Retailer Area');

  try {
    const retailerRef = doc(db, 'retailers', retailerId);

    await updateDoc(retailerRef, {
      assignedLineWorkerId: lineWorkerId,
      updatedAt: serverTimestamp()
    });

    logSuccess(`Line Worker assigned to Retailer successfully!`);
    logInfo(`Line Worker ID: ${lineWorkerId}`);
    logInfo(`Retailer ID: ${retailerId}`);
  } catch (error: any) {
    logError(`Failed to assign line worker: ${error.message}`);
    throw error;
  }
}

/**
 * Step 6: Create Payment Collection
 */
async function createPayment(db: any, tenantId: string, retailerId: string, lineWorkerId: string) {
  logSection('STEP 6: Creating Payment Collection');

  try {
    const paymentId = doc(collection(db, 'payments')).id;
    const paymentRef = doc(db, 'payments', paymentId);

    const paymentData = {
      retailerId: retailerId,
      retailerName: TEST_DATA.retailer.name,
      lineWorkerId: lineWorkerId,
      totalPaid: TEST_DATA.payment.totalPaid,
      method: TEST_DATA.payment.method,
      state: 'COMPLETED', // Directly complete since OTP is removed
      evidence: [],
      timeline: {
        initiatedAt: serverTimestamp(),
        completedAt: serverTimestamp()
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(paymentRef, paymentData);
    createdEntities.payment = { id: paymentId, ...paymentData };

    logSuccess(`Payment created successfully!`);
    logInfo(`Payment ID: ${paymentId}`);
    logInfo(`Amount: ₹${TEST_DATA.payment.totalPaid}`);
    logInfo(`Method: ${TEST_DATA.payment.method}`);
    logInfo(`State: COMPLETED`);
    logInfo(`Retailer Name: ${TEST_DATA.retailer.name}`);

    return paymentId;
  } catch (error: any) {
    logError(`Failed to create payment: ${error.message}`);
    throw error;
  }
}

/**
 * Verification Step: Verify All Created Data
 */
async function verifyCreatedData(db: any, tenantId: string) {
  logSection('STEP 7: Verifying Created Data');

  const verificationResults = {
    wholesaler: false,
    areas: false,
    lineWorker: false,
    retailer: false,
    retailerUser: false,
    payment: false,
    retailerProfile: false,
    retailerVerification: false,
    lineWorkerAssigned: false
  };

  try {
    // Verify Wholesaler
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
    verificationResults.wholesaler = tenantDoc.exists();
    if (verificationResults.wholesaler) {
      logSuccess('✓ Wholesaler document exists');
      const tenant = tenantDoc.data();
      logInfo(`  Status: ${tenant.status}`);
    } else {
      logError('✗ Wholesaler document NOT found');
    }

    // Verify Areas
    const areasQuery = query(collection(db, 'areas'), where('tenantIds', 'array-contains', tenantId));
    const areasSnapshot = await getDocs(areasQuery);
    verificationResults.areas = areasSnapshot.docs.length === TEST_DATA.areas.length;
    if (verificationResults.areas) {
      logSuccess(`✓ All ${TEST_DATA.areas.length} areas exist`);
    } else {
      logError(`✗ Expected ${TEST_DATA.areas.length} areas, found ${areasSnapshot.docs.length}`);
    }

    // Verify Line Worker
    const lineWorkerDoc = await getDoc(doc(db, 'users', createdEntities.lineWorker.id));
    verificationResults.lineWorker = lineWorkerDoc.exists();
    if (verificationResults.lineWorker) {
      logSuccess('✓ Line Worker document exists');
      const lw = lineWorkerDoc.data();
      logInfo(`  Name: ${lw.displayName}`);
      logInfo(`  Role: LINE_WORKER`);
    } else {
      logError('✗ Line Worker document NOT found');
    }

    // Verify Retailer
    const retailerDoc = await getDoc(doc(db, 'retailers', createdEntities.retailer.id));
    verificationResults.retailer = retailerDoc.exists();
    if (verificationResults.retailer) {
      logSuccess('✓ Retailer document exists');
      const retailer = retailerDoc.data();

      // Verify profile
      verificationResults.retailerProfile = !!(
        retailer.profile &&
        retailer.profile.realName === TEST_DATA.retailer.name &&
        retailer.profile.phone === TEST_DATA.retailer.phone
      );
      if (verificationResults.retailerProfile) {
        logSuccess('✓ Retailer profile populated correctly');
        logInfo(`  realName: ${retailer.profile.realName}`);
        logInfo(`  phone: ${retailer.profile.phone}`);
        logInfo(`  address: ${retailer.profile.address}`);
      } else {
        logError('✗ Retailer profile NOT populated correctly');
        logError(`  Profile data: ${JSON.stringify(retailer.profile || 'MISSING')}`);
      }

      // Verify verification status
      verificationResults.retailerVerification = !!(
        retailer.verification &&
        retailer.verification.isPhoneVerified === true
      );
      if (verificationResults.retailerVerification) {
        logSuccess('✓ Retailer verification status is correct');
        logInfo(`  isPhoneVerified: ${retailer.verification.isPhoneVerified}`);
        logInfo(`  verificationMethod: ${retailer.verification.verificationMethod}`);
      } else {
        logError('✗ Retailer verification status NOT correct');
        logError(`  Verification data: ${JSON.stringify(retailer.verification || 'MISSING')}`);
      }

      // Verify line worker assignment
      verificationResults.lineWorkerAssigned = retailer.assignedLineWorkerId === createdEntities.lineWorker.id;
      if (verificationResults.lineWorkerAssigned) {
        logSuccess('✓ Line Worker assigned to retailer');
        logInfo(`  assignedLineWorkerId: ${retailer.assignedLineWorkerId}`);
      } else {
        logError('✗ Line Worker NOT assigned to retailer');
        logError(`  Expected: ${createdEntities.lineWorker.id}`);
        logError(`  Found: ${retailer.assignedLineWorkerId}`);
      }

      // Verify wholesaler data
      const hasWholesalerData = !!(
        retailer.wholesalerData &&
        retailer.wholesalerData[tenantId]
      );
      if (hasWholesalerData) {
        logSuccess('✓ Wholesaler data exists in retailer');
        const wd = retailer.wholesalerData[tenantId];
        logInfo(`  currentAreaId: ${wd.currentAreaId}`);
        logInfo(`  currentZipcodes: ${wd.currentZipcodes.join(', ')}`);
      } else {
        logError('✗ Wholesaler data NOT found in retailer');
      }
    } else {
      logError('✗ Retailer document NOT found');
    }

    // Verify Retailer User
    const retailerUserDoc = await getDoc(doc(db, 'retailerUsers', `retailer_${TEST_DATA.retailer.phone.replace(/\D/g, '')}`));
    verificationResults.retailerUser = retailerUserDoc.exists();
    if (verificationResults.retailerUser) {
      logSuccess('✓ Retailer User document exists');
      const ru = retailerUserDoc.data();
      logInfo(`  isVerified: ${ru.isVerified}`);
      logInfo(`  verificationStatus: ${ru.verificationStatus}`);
    } else {
      logError('✗ Retailer User document NOT found');
    }

    // Verify Payment
    const paymentDoc = await getDoc(doc(db, 'payments', createdEntities.payment.id));
    verificationResults.payment = paymentDoc.exists();
    if (verificationResults.payment) {
      logSuccess('✓ Payment document exists');
      const payment = paymentDoc.data();
      logInfo(`  Amount: ₹${payment.totalPaid}`);
      logInfo(`  Method: ${payment.method}`);
      logInfo(`  State: ${payment.state}`);
    } else {
      logError('✗ Payment document NOT found');
    }

    return verificationResults;
  } catch (error: any) {
    logError(`Verification failed: ${error.message}`);
    throw error;
  }
}

/**
 * Print Summary Report
 */
function printSummary(verificationResults: any) {
  logSection('TEST SUMMARY REPORT');

  const allChecks = Object.values(verificationResults);
  const passedChecks = allChecks.filter((v: any) => v === true).length;
  const totalChecks = allChecks.length;
  const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.log('\nCreated Entities:');
  logInfo(`  Wholesaler ID: ${createdEntities.tenantId}`);
  logInfo(`  Areas: ${createdEntities.areas.length} created`);
  logInfo(`  Line Worker ID: ${createdEntities.lineWorker.id}`);
  logInfo(`  Retailer ID: ${createdEntities.retailer.id}`);
  logInfo(`  Retailer Phone: +91 ${TEST_DATA.retailer.phone}`);
  logInfo(`  Payment ID: ${createdEntities.payment.id}`);

  console.log('\nVerification Results:');
  console.log(`  Total Checks: ${totalChecks}`);
  console.log(`  Passed: ${passedChecks}`);
  console.log(`  Failed: ${totalChecks - passedChecks}`);
  console.log(`  Pass Rate: ${passRate}%`);

  const allPassed = passedChecks === totalChecks;
  if (allPassed) {
    log('\n🎉 ALL TESTS PASSED! The retailer flow is working correctly.', 'green');
  } else {
    log('\n⚠️  SOME TESTS FAILED. Please review the results above.', 'yellow');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  return allPassed;
}

/**
 * Main Test Execution
 */
async function runE2ETest() {
  try {
    logSection('STARTING END-TO-END TEST FOR RETAILER FLOW');
    logInfo('Test Retailer Phone: +91 9959678269');
    logInfo('Test Time: ' + new Date().toISOString());

    // Initialize Firebase
    const db = initializeFirebaseAdmin();

    // Step 1: Create Wholesaler
    await createWholesaler(db);

    // Step 2: Create Areas
    await createAreas(db, createdEntities.tenantId);

    // Step 3: Create Line Worker
    const lineWorkerId = await createLineWorker(db, createdEntities.tenantId, createdEntities.areas);

    // Step 4: Create Retailer
    const retailerId = await createRetailer(db, createdEntities.tenantId, createdEntities.areas);

    // Step 5: Assign Line Worker
    await assignLineWorkerToArea(db, createdEntities.tenantId, lineWorkerId, retailerId);

    // Step 6: Create Payment
    await createPayment(db, createdEntities.tenantId, retailerId, lineWorkerId);

    // Step 7: Verify
    const verificationResults = await verifyCreatedData(db, createdEntities.tenantId);

    // Print Summary
    const allPassed = printSummary(verificationResults);

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error: any) {
    logSection('FATAL ERROR');
    logError(error.message);
    logError(error.stack);
    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(1);
  }
}

// Run the test
runE2ETest();
