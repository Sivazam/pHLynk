// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting retailer migration to multi-tenant structure...');
    
    const result = await retailerService.migrateRetailersToMultiTenant();
    
    console.log('✅ Migration completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Retailer migration completed successfully',
      migrated: result.migrated,
      errors: result.errors
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}