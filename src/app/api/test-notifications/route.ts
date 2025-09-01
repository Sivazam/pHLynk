import { NextRequest, NextResponse } from 'next/server';
import { realtimeNotificationService } from '@/services/realtime-notifications';

// Test endpoint to simulate notification events for debugging
export async function POST(request: NextRequest) {
  try {
    const { type, userId, tenantId, testData } = await request.json();
    
    if (!type || !userId || !tenantId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: type, userId, tenantId' 
      }, { status: 400 });
    }

    console.log('🧪 Testing notification system:', { type, userId, tenantId, testData });

    switch (type) {
      case 'WHOLESALER_PAYMENT':
        // Simulate a payment completion
        await simulateWholesalerPayment(userId, tenantId, testData);
        break;
      
      case 'WHOLESALER_INVOICE':
        // Simulate an invoice creation
        await simulateWholesalerInvoice(userId, tenantId, testData);
        break;
      
      case 'WHOLESALER_WORKER':
        // Simulate a worker update
        await simulateWholesalerWorker(userId, tenantId, testData);
        break;
      
      case 'RETAILER_INVOICE':
        // Simulate a retailer receiving an invoice
        await simulateRetailerInvoice(userId, tenantId, testData);
        break;
      
      case 'RETAILER_PAYMENT':
        // Simulate a retailer payment completion
        await simulateRetailerPayment(userId, tenantId, testData);
        break;
      
      default:
        return NextResponse.json({ 
          error: 'Unknown notification type' 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test notification of type ${type} sent successfully` 
    });

  } catch (error) {
    console.error('Error in test notification endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Simulate wholesaler payment notification
async function simulateWholesalerPayment(userId: string, tenantId: string, testData: any) {
  const payment = {
    state: 'COMPLETED',
    totalPaid: testData?.amount || 1500,
    lineWorkerName: testData?.workerName || 'Test Line Worker',
    retailerName: testData?.retailerName || 'Test Retailer',
    createdAt: new Date(),
    tenantId: tenantId
  };

  // Access the private method for testing
  const service = (realtimeNotificationService as any);
  if (service.handleWholesalerPaymentChange) {
    service.handleWholesalerPaymentChange(payment, 'test_payment_id', tenantId);
  }
}

// Simulate wholesaler invoice notification
async function simulateWholesalerInvoice(userId: string, tenantId: string, testData: any) {
  const invoice = {
    invoiceNumber: testData?.invoiceNumber || 'TEST-001',
    totalAmount: testData?.amount || 5000,
    retailerName: testData?.retailerName || 'Test Retailer',
    issueDate: new Date(),
    tenantId: tenantId
  };

  // Access the private method for testing
  const service = (realtimeNotificationService as any);
  if (service.handleWholesalerInvoiceChange) {
    service.handleWholesalerInvoiceChange(invoice, 'test_invoice_id', tenantId);
  }
}

// Simulate wholesaler worker notification
async function simulateWholesalerWorker(userId: string, tenantId: string, testData: any) {
  const worker = {
    displayName: testData?.workerName || 'Test Line Worker',
    assignedAreas: testData?.areas || ['Test Area 1', 'Test Area 2'],
    tenantId: tenantId
  };

  // Access the private method for testing
  const service = (realtimeNotificationService as any);
  if (service.handleWholesalerWorkerChange) {
    service.handleWholesalerWorkerChange(worker, 'test_worker_id', tenantId);
  }
}

// Simulate retailer invoice notification
async function simulateRetailerInvoice(userId: string, tenantId: string, testData: any) {
  const invoice = {
    invoiceNumber: testData?.invoiceNumber || 'TEST-001',
    totalAmount: testData?.amount || 5000,
    retailerName: testData?.retailerName || 'Test Retailer',
    issueDate: new Date(),
    tenantId: tenantId
  };

  console.log('🧪 Simulating retailer invoice notification:', { userId, tenantId, invoice });

  // Access the private method for testing
  const service = (realtimeNotificationService as any);
  if (service.handleRetailerInvoiceChange) {
    service.handleRetailerInvoiceChange(invoice, 'test_invoice_id', userId);
  }
}

// Simulate retailer payment notification
async function simulateRetailerPayment(userId: string, tenantId: string, testData: any) {
  const payment = {
    state: 'COMPLETED',
    totalPaid: testData?.amount || 1500,
    lineWorkerName: testData?.workerName || 'Test Line Worker',
    retailerName: testData?.retailerName || 'Test Retailer',
    createdAt: new Date(),
    tenantId: tenantId
  };

  console.log('🧪 Simulating retailer payment notification:', { userId, tenantId, payment });

  // Access the private method for testing
  const service = (realtimeNotificationService as any);
  if (service.handleRetailerPaymentChange) {
    service.handleRetailerPaymentChange(payment, 'test_payment_id', userId);
  }
}