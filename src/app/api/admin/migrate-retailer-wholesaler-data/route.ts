// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { migrateRetailerToWholesalerData } from '@/lib/migrate-retailer-to-wholesaler-data';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting retailer to wholesalerData migration API');
    
    // Run the migration
    const result = await migrateRetailerToWholesalerData();
    
    if (result.success) {
      console.log('✅ Migration completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Retailer to wholesalerData migration completed successfully',
        summary: {
          total: result.total,
          migrated: result.migrated,
          skipped: result.skipped,
          errors: result.errors
        }
      });
    } else {
      console.error('❌ Migration failed:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Migration failed',
          details: result.error 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in migration API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}