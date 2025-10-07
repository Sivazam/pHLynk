# OTP Storage Performance Analysis

## Scale Scenarios

### Small Scale (100 retailers, 10 OTPs/day each)
- **Separate Collection**: 1,000 OTP docs/day
- **Retailer Document**: 100 retailers with 10 OTP arrays each
- **Winner**: Retailer Document (simpler)

### Medium Scale (1,000 retailers, 20 OTPs/day each)  
- **Separate Collection**: 20,000 OTP docs/day
- **Retailer Document**: Risk of hitting document size limits
- **Winner**: Separate Collection (safer)

### Large Scale (10,000 retailers, 30 OTPs/day each)
- **Separate Collection**: 300,000 OTP docs/day
- **Retailer Document**: Definitely hits limits, performance degrades
- **Winner**: Separate Collection (only viable option)

## Query Performance

### Separate Collection Queries
```javascript
// Optimized query for retailer's active OTPs
const q = query(
  collection(db, 'secure_otps'),
  where('retailerId', '==', retailerId),
  where('isUsed', '==', false),
  orderBy('createdAt', 'desc'),
  limit(10) // Only recent OTPs
);
```

**Performance**: 
- ✅ Indexed on `retailerId` and `isUsed`
- ✅ Only reads relevant OTPs
- ✅ Supports pagination
- ✅ Automatic cleanup of expired OTPs

### Retailer Document Queries
```javascript
// Single document read
const retailerDoc = await getDoc(doc(db, 'retailers', retailerId));
const otps = retailerDoc.data().activeOTPs || [];
```

**Performance**:
- ✅ Single document read
- ❌ Reads entire document even for small changes
- ❌ No pagination - loads all OTPs
- ❌ Manual cleanup required

## Real-time Performance

### Separate Collection
- ✅ Targeted real-time updates
- ✅ Only pushes changes when OTPs change
- ✅ Separate listeners don't interfere
- ❌ Requires two listeners (OTP + Payment)

### Retailer Document  
- ✅ Single listener for all data
- ❌ Triggers for any retailer document change
- ❌ Higher bandwidth usage
- ❌ More client-side filtering needed

## Security & Compliance

### Separate Collection
- ✅ Encrypted OTP storage
- ✅ Access control at collection level
- ✅ Audit trails for OTP operations
- ✅ Rate limiting and breach detection
- ✅ GDPR compliant (data minimization)

### Retailer Document
- ❌ Plain text OTPs in retailer data
- ❌ No access control separation
- ❌ No audit trails
- ❌ Compliance risks

## Recommendation

**For Production Scale**: Separate Collection is the clear winner.

**Optimizations Needed**:
1. **Composite Index**: Create on `(retailerId, isUsed, createdAt)`
2. **TTL Policy**: Auto-delete expired OTPs after 24 hours
3. **Caching**: Memory cache for frequently accessed OTPs
4. **Batch Operations**: Clean up multiple OTPs in single write

## Cost Analysis

### Separate Collection
- **Reads**: $0.06 per 100k document reads
- **Writes**: $0.18 per 100k document writes  
- **Storage**: $0.18 per GB/month
- **Estimated Monthly**: $5-15 for medium scale

### Retailer Document
- **Reads**: Same document read repeatedly
- **Writes**: Larger documents = higher write costs
- **Storage**: Bloated retailer documents
- **Estimated Monthly**: $8-25 for medium scale

**Conclusion**: Separate collection is 30-40% more cost-effective at scale.