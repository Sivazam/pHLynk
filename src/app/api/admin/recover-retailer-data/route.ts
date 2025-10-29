// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { checkRetailerDataIntegrity, recoverWholesalerDataForTenant } from '@/lib/restore-retailer-wholesaler-data';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Retailer data recovery API called');
    
    const { tenantId, action } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    if (!action || !['check', 'recover'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "check" or "recover"' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Performing ${action} operation for tenant: ${tenantId}`);
    
    if (action === 'check') {
      const integrity = await checkRetailerDataIntegrity(tenantId);
      
      return NextResponse.json({
        success: true,
        message: `Data integrity check completed for tenant ${tenantId}`,
        data: {
          summary: {
            total: integrity.total,
            intact: integrity.intact,
            hasIssues: integrity.total - integrity.intact,
            missingWholesalerData: integrity.missingWholesalerData,
            missingWholesalerAssignments: integrity.missingWholesalerAssignments
          },
          details: integrity.issues,
          recoveryRecommended: integrity.missingWholesalerData > 0 || integrity.missingWholesalerAssignments > 0
        }
      });
      
    } else if (action === 'recover') {
      // First check what needs to be recovered
      const checkResult = await checkRetailerDataIntegrity(tenantId);
      
      if (checkResult.missingWholesalerData === 0 && checkResult.missingWholesalerAssignments === 0) {
        return NextResponse.json({
          success: true,
          message: 'No data recovery needed - all retailer data is intact',
          data: {
            recovered: 0,
            failed: 0,
            errors: [],
            alreadyIntact: checkResult.intact
          }
        });
      }
      
      // Perform recovery
      const recovery = await recoverWholesalerDataForTenant(tenantId);
      
      return NextResponse.json({
        success: true,
        message: `Data recovery completed for tenant ${tenantId}`,
        data: {
          ...recovery,
          summary: {
            total: checkResult.total,
            recovered: recovery.recovered,
            failed: recovery.failed,
            alreadyIntact: checkResult.intact
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error in retailer data recovery API:', error);
    return NextResponse.json(
      { 
        error: 'Recovery operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}