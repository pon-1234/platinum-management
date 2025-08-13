# Migration Guide: Attendance Store Split

## Overview

The monolithic `useAttendanceStore` has been split into 4 specialized stores for better performance and maintainability:

1. **useAttendanceDashboardStore** - Dashboard data and statistics
2. **useAttendanceScheduleStore** - Weekly schedules and shift templates
3. **useShiftRequestStore** - Shift requests management
4. **useAttendanceTimeClockStore** - Clock in/out and time tracking

## Migration Examples

### Before (Monolithic Store)

```typescript
import { useAttendanceStore } from "@/stores";

function DashboardComponent() {
  const { dashboardData, dashboardLoading, fetchDashboard } =
    useAttendanceStore();

  // ...
}
```

### After (Split Stores)

```typescript
import { useAttendanceDashboardStore } from "@/stores/attendance-dashboard.store";

function DashboardComponent() {
  const { dashboardData, isLoading, fetchDashboard } =
    useAttendanceDashboardStore();

  // ...
}
```

## Store Mapping

### Dashboard Related

- `dashboardData` → `useAttendanceDashboardStore().dashboardData`
- `dashboardLoading` → `useAttendanceDashboardStore().isLoading`
- `fetchDashboard()` → `useAttendanceDashboardStore().fetchDashboard()`

### Schedule Related

- `weeklySchedule` → `useAttendanceScheduleStore().weeklySchedule`
- `scheduleLoading` → `useAttendanceScheduleStore().isLoading`
- `fetchWeeklySchedule()` → `useAttendanceScheduleStore().fetchWeeklySchedule()`

### Shift Requests

- `shiftRequests` → `useShiftRequestStore().shiftRequests`
- `requestsLoading` → `useShiftRequestStore().isLoading`
- `fetchShiftRequests()` → `useShiftRequestStore().fetchShiftRequests()`
- `createShiftRequest()` → `useShiftRequestStore().createShiftRequest()`
- `approveShiftRequest()` → `useShiftRequestStore().approveShiftRequest()`
- `rejectShiftRequest()` → `useShiftRequestStore().rejectShiftRequest()`

### Time Clock

- `todayRecord` → `useAttendanceTimeClockStore().todayRecord`
- `recordLoading` → `useAttendanceTimeClockStore().isLoading`
- `clockIn()` → `useAttendanceTimeClockStore().clockIn()`
- `clockOut()` → `useAttendanceTimeClockStore().clockOut()`
- `startBreak()` → `useAttendanceTimeClockStore().startBreak()`
- `endBreak()` → `useAttendanceTimeClockStore().endBreak()`

## Benefits

1. **Better Performance**: Components only subscribe to the data they need
2. **Improved Type Safety**: Each store has focused types
3. **Easier Maintenance**: Smaller, focused stores are easier to understand
4. **Reduced Re-renders**: Changes in one area don't trigger re-renders in unrelated components

## Next Steps

1. Update all components using `useAttendanceStore`
2. Remove the old monolithic store after migration
3. Update tests to use the new stores
