// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { migrateRetailerTenants } from '@/lib/migrate-retailer-tenants';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Retailer tenant migration API called');
    
    // Add security check - only allow super admins
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer super-admin-migration-key') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await migrateRetailerTenants();
    
    if (result.success) {
      return NextResponse.json({
        message: 'Retailer tenant migration completed successfully',
        ...result
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Migration failed',
          details: result.error 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in retailer tenant migration API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}