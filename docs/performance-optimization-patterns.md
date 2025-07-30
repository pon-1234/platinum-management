# Performance Optimization Patterns

## Parallel Processing with Promise.all

### Pattern 1: Converting Sequential Awaits to Parallel

**Before (Sequential):**
```typescript
// Inefficient: Each query waits for the previous one to complete
async function loadDashboardData() {
  const stats = await getStats();
  const alerts = await getAlerts();
  const activities = await getActivities();
  return { stats, alerts, activities };
}
// Total time: sum of all query times
```

**After (Parallel):**
```typescript
// Efficient: All queries execute simultaneously
async function loadDashboardData() {
  const [stats, alerts, activities] = await Promise.all([
    getStats(),
    getAlerts(),
    getActivities()
  ]);
  return { stats, alerts, activities };
}
// Total time: max of all query times
```

### Pattern 2: Robust Error Handling with Promise.allSettled

**When you need all results even if some fail:**
```typescript
async function loadDashboardDataWithErrorHandling() {
  const results = await Promise.allSettled([
    getStats(),
    getAlerts(),
    getActivities()
  ]);
  
  return {
    stats: results[0].status === 'fulfilled' ? results[0].value : null,
    alerts: results[1].status === 'fulfilled' ? results[1].value : [],
    activities: results[2].status === 'fulfilled' ? results[2].value : [],
    errors: results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason)
  };
}
```

### Pattern 3: Conditional Parallel Processing

**When some queries depend on others:**
```typescript
async function loadCustomerDashboard(customerId: string) {
  // First, get customer data
  const customer = await getCustomer(customerId);
  
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Then load related data in parallel
  const [visits, orders, bottleKeeps] = await Promise.all([
    getCustomerVisits(customerId),
    getCustomerOrders(customerId),
    getCustomerBottleKeeps(customerId)
  ]);
  
  return { customer, visits, orders, bottleKeeps };
}
```

### Pattern 4: Batch Operations

**Processing multiple items efficiently:**
```typescript
async function updateMultipleItems(items: Item[]) {
  // Process all updates in parallel
  const results = await Promise.allSettled(
    items.map(item => updateItem(item.id, item.data))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { successful, failed, total: items.length };
}
```

## Applied Examples in Our Codebase

### 1. Attendance Dashboard Optimization
```typescript
// Already optimized in attendance-reporting.service.ts
const [
  weekAttendanceResult,
  pendingShiftRequestsResult,
  correctionsResult,
] = await Promise.all([
  attendanceTrackingService.search({
    startDate: weekStartStr,
    endDate: today,
  }),
  shiftRequestService.getPendingCount(),
  attendanceTrackingService.getCorrectionRequestsCount(),
]);
```

### 2. Customer Search Optimization
```typescript
// Optimized in customer.service.ts
// When search results return IDs, fetch full details in parallel
const customerDetails = await Promise.all(
  customerIds.map(id => getCustomerById(id))
);
```

## Performance Tips

1. **Identify Independent Operations**: Look for sequential awaits that don't depend on each other
2. **Use Promise.all for Speed**: When all operations must succeed
3. **Use Promise.allSettled for Resilience**: When you want results even if some fail
4. **Avoid Over-Parallelization**: Be mindful of database connection limits
5. **Consider Rate Limiting**: When making external API calls in parallel

## Common Anti-Patterns to Avoid

### Anti-Pattern 1: Unnecessary Sequential Processing
```typescript
// Bad: Sequential when parallel would work
for (const id of ids) {
  const item = await getItem(id); // Each waits for the previous
  items.push(item);
}

// Good: Parallel processing
const items = await Promise.all(ids.map(id => getItem(id)));
```

### Anti-Pattern 2: Not Handling Partial Failures
```typescript
// Bad: One failure crashes everything
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);

// Good: Handle partial failures gracefully
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);
```

### Anti-Pattern 3: Creating Too Many Concurrent Requests
```typescript
// Bad: May overwhelm the database
const results = await Promise.all(
  thousandsOfIds.map(id => fetchItem(id))
);

// Good: Batch processing with concurrency control
const batchSize = 10;
const results = [];
for (let i = 0; i < thousandsOfIds.length; i += batchSize) {
  const batch = thousandsOfIds.slice(i, i + batchSize);
  const batchResults = await Promise.all(
    batch.map(id => fetchItem(id))
  );
  results.push(...batchResults);
}
```

## Measuring Performance Improvements

```typescript
// Simple performance measurement
const startTime = Date.now();
const results = await Promise.all([...queries]);
const endTime = Date.now();
console.log(`Queries completed in ${endTime - startTime}ms`);
```