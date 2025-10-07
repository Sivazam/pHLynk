# Retailer Data Architecture Proposal

## Current Problems

1. **Inconsistent Data**: Different dashboards show different outstanding amounts
2. **Performance Issues**: Real-time calculations from invoices/payments are slow
3. **Complexity**: Multiple places updating outstanding amounts leads to race conditions
4. **Scalability**: Query performance degrades with more data

## Proposed Architecture: Maintained Computed Fields

### Core Principle
**Single Source of Truth**: Retailer document contains pre-computed fields that are updated transactionally when related data changes.

### Retailer Document Structure

```typescript
interface RetailerComputedData {
  // Basic Info
  id: string;
  name: string;
  phone: string;
  address: string;
  
  // Financial Summary (Computed)
  currentOutstanding: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  creditLimit?: number;
  
  // Activity Tracking (Computed)
  lastInvoiceDate?: Timestamp;
  lastPaymentDate?: Timestamp;
  totalInvoicesCount: number;
  totalPaymentsCount: number;
  
  // Recent Activity (Computed - for quick display)
  recentInvoices: InvoiceSummary[]; // Last 5 invoices
  recentPayments: PaymentSummary[]; // Last 5 payments
  
  // Metadata
  updatedAt: Timestamp;
  computedAt: Timestamp; // When computed fields were last updated
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: Timestamp;
  status: string;
}

interface PaymentSummary {
  id: string;
  amount: number;
  method: string;
  date: Timestamp;
  state: string;
}
```

## Update Strategy

### 1. Invoice Creation
```typescript
async createInvoice(invoiceData) {
  // Create invoice document
  const invoiceId = await invoiceService.create(invoiceData);
  
  // Update retailer computed fields
  await retailerService.updateComputedFields(invoiceData.retailerId, {
    currentOutstanding: +invoiceData.totalAmount,
    totalInvoiceAmount: +invoiceData.totalAmount,
    totalInvoicesCount: +1,
    lastInvoiceDate: invoiceData.issueDate,
    recentInvoices: addInvoiceToRecentList(invoiceData),
    computedAt: Timestamp.now()
  });
}
```

### 2. Payment Processing
```typescript
async processPayment(paymentData) {
  // Create payment document
  const paymentId = await paymentService.create(paymentData);
  
  // Update retailer computed fields
  await retailerService.updateComputedFields(paymentData.retailerId, {
    currentOutstanding: -paymentData.totalPaid,
    totalPaidAmount: +paymentData.totalPaid,
    totalPaymentsCount: +1,
    lastPaymentDate: Timestamp.now(),
    recentPayments: addPaymentToRecentList(paymentData),
    computedAt: Timestamp.now()
  });
}
```

### 3. Batch Updates (for data correction/migration)
```typescript
async recomputeRetailerData(retailerId) {
  // Get all related data
  const invoices = await invoiceService.getInvoicesByRetailer(retailerId);
  const payments = await paymentService.getPaymentsByRetailer(retailerId);
  
  // Compute totals
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaidAmount = payments.filter(p => p.state === 'COMPLETED')
                               .reduce((sum, p) => sum + p.totalPaid, 0);
  const currentOutstanding = totalInvoiceAmount - totalPaidAmount;
  
  // Get recent items
  const recentInvoices = invoices
    .sort((a, b) => b.issueDate - a.issueDate)
    .slice(0, 5)
    .map(inv => ({ id: inv.id, invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount, issueDate: inv.issueDate, status: inv.status }));
  
  const recentPayments = payments
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map(p => ({ id: p.id, amount: p.totalPaid, method: p.method, date: p.createdAt, state: p.state }));
  
  // Update retailer with computed data
  await retailerService.update(retailerId, {
    currentOutstanding,
    totalInvoiceAmount,
    totalPaidAmount,
    totalInvoicesCount: invoices.length,
    totalPaymentsCount: payments.length,
    lastInvoiceDate: invoices.length > 0 ? invoices[0].issueDate : null,
    lastPaymentDate: payments.length > 0 ? payments[0].createdAt : null,
    recentInvoices,
    recentPayments,
    computedAt: Timestamp.now()
  });
}
```

## Benefits

### 1. **Consistency**
- All dashboards read from the same computed fields
- No more discrepancies between different views

### 2. **Performance**
- Single document read for retailer summary
- No complex joins or calculations at render time
- Recent activity already pre-computed

### 3. **Scalability**
- O(1) read complexity for retailer data
- Computed updates only when data changes
- Efficient for large datasets

### 4. **Maintainability**
- Clear update patterns
- Single responsibility for data computation
- Easy to debug and audit

### 5. **Offline Support**
- Computed data available offline
- No need for complex calculations when offline

## Implementation Plan

### Phase 1: Data Migration
1. Add new computed fields to retailer schema
2. Run batch computation for existing retailers
3. Verify data accuracy

### Phase 2: Update Operations
1. Modify invoice creation to update retailer computed fields
2. Modify payment processing to update retailer computed fields
3. Add transactional safety

### Phase 3: UI Updates
1. Update Line Worker Dashboard to use computed fields
2. Update Retailer Dashboard to use computed fields
3. Remove real-time calculation logic

### Phase 4: Monitoring & Validation
1. Add data consistency checks
2. Add audit logging for computed field updates
3. Set up alerts for data anomalies

## Data Consistency Strategy

### 1. Transactional Updates
```typescript
// Use Firestore batched writes
const batch = writeBatch(db);
batch.set(invoiceRef, invoiceData);
batch.update(retailerRef, retailerUpdate);
await batch.commit();
```

### 2. Periodic Validation
```typescript
// Nightly job to validate computed fields
async validateRetailerComputedFields() {
  const retailers = await retailerService.getAll();
  for (const retailer of retailers) {
    const computed = await computeRetailerData(retailer.id);
    if (!isDataEqual(retailer, computed)) {
      console.warn(`Data inconsistency detected for retailer ${retailer.id}`);
      await retailerService.update(retailer.id, computed);
    }
  }
}
```

### 3. Event-Driven Updates
```typescript
// Cloud Functions to handle updates
exports.onInvoiceCreated = functions.firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snap, context) => {
    const invoice = snap.data();
    await retailerService.updateComputedFields(invoice.retailerId, invoice);
  });
```

This architecture will solve the current data inconsistency issues and provide a scalable, performant solution for retailer data management.