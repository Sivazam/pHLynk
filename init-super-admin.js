// Simple script to initialize super admin
const { initializeSuperAdmin } = require('./src/lib/init-super-admin.ts');

// Run the initialization
initializeSuperAdmin()
  .then(() => {
    console.log('✅ Super admin initialized successfully!');
    console.log('📧 Email: superadmin@pharmalynk.com');
    console.log('🔑 Password: SuperAdmin123!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error initializing super admin:', error);
    process.exit(1);
  });