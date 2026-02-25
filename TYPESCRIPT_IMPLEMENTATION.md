# TypeScript Implementation Guide

## Overview

This document describes the TypeScript support implementation in the webui-vue project, following the architecture from the Gerrit review (https://gerrit.openbmc.org/c/openbmc/webui-vue/+/86842).

## What Was Implemented

### 1. TypeScript Configuration

**File: `tsconfig.json`**
- Target: ES2020 for modern JavaScript features
- Module: ESNext for tree-shaking and optimal bundling
- Strict mode enabled for type safety
- Path aliases configured (`@/*` → `src/*`)
- Includes all `.ts`, `.tsx`, and `.vue` files in `src/`

### 2. Build Configuration

**File: `vite.config.js`**
- Added TypeScript file extensions to resolve configuration
- Integrated `@vitejs/plugin-vue-jsx` for JSX/TSX support
- Vue plugin configured with TypeScript-friendly options

**File: `.eslintrc.cjs`**
- Updated parser to `@typescript-eslint/parser`
- Added `@typescript-eslint` plugin
- Configured overrides for `.ts` and `.tsx` files

### 3. Type Definitions

**File: `src/api/types/redfish.ts`**

Comprehensive Redfish type definitions including:
- `RedfishStatus` - Status object with State, Health, HealthRollup
- `SensorThresholds` - Threshold definitions for sensors
- `Sensor` - Complete sensor resource with modern and legacy properties
- `Memory` - Memory module resource
- `Drive` - Storage drive resource
- `Processor` - CPU resource
- `Chassis` - Chassis resource
- `System` - System resource

All types preserve Redfish PascalCase property names for API compatibility.

**File: `src/store/api.d.ts`**

Type declaration for the existing JavaScript API module, providing TypeScript types for axios instance.

### 4. TypeScript Composables

#### **File: `src/api/composables/useRedfishRoot.ts`**

Fetches and caches the Redfish ServiceRoot with:
- `ServiceRoot` interface with OData protocol features
- `useRedfishRoot()` - TanStack Query hook with infinite caching
- Helper functions:
  - `supportsExpandQuery()` - Check OData $expand support
  - `supportsSelectQuery()` - Check OData $select support
  - `supportsFilterQuery()` - Check OData $filter support
  - `getMaxExpandLevels()` - Get max expand depth

**Key Features:**
- Infinite stale time (ServiceRoot rarely changes)
- Exponential backoff retry strategy
- 3 retry attempts with max 30s delay

#### **File: `src/api/composables/useRedfishCollection.ts`**

Generic collection fetcher with OData support:
- `RedfishCollection<T>` - Generic collection interface
- `RedfishQueryParameters` - OData query parameter types
- `buildQuery()` - Constructs URLs with OData parameters
- `useRedfishCollection<T>()` - Fetch any Redfish collection
- `useRedfishCollectionWithExpand<T>()` - Auto-detect and use $expand

**Key Features:**
- Proper OData syntax encoding (e.g., `$expand=.($levels=2)`)
- Normalized query parameters for cache stability
- Smart retry logic (skips 4xx errors)
- 30s stale time, 5min garbage collection

#### **File: `src/api/composables/useAllSubResources.ts`**

Generic pattern for fetching nested resources:
- `useAllSubResources<T>()` - Fetch all sub-resources from all parents
- Automatic parent discovery
- OData $expand optimization when supported
- Deduplication by `@odata.id`
- Incremental loading updates

**Key Features:**
- Works with any parent/sub-resource combination
- Example: `useAllSubResources('/redfish/v1/Chassis', 'Sensors')`
- Graceful fallback when OData not supported
- Parallel fetching with error aggregation

## Usage Examples

### Example 1: Fetch All Sensors

```typescript
import { useAllSubResources } from '@/api/composables/useAllSubResources';
import type { Sensor } from '@/api/types/redfish';

export function useSensors() {
  const { data, isLoading, isError, error } = 
    useAllSubResources<Sensor>('/redfish/v1/Chassis', 'Sensors');
  
  return { data, isLoading, isError, error };
}
```

### Example 2: Fetch Memory Modules

```typescript
import { useAllSubResources } from '@/api/composables/useAllSubResources';
import type { Memory } from '@/api/types/redfish';

export function useMemory() {
  return useAllSubResources<Memory>('/redfish/v1/Systems', 'Memory');
}
```

### Example 3: Fetch Collection with Custom Options

```typescript
import { useRedfishCollection } from '@/api/composables/useRedfishCollection';
import type { Chassis } from '@/api/types/redfish';

export function useChassis() {
  return useRedfishCollection<Chassis>(
    '/redfish/v1/Chassis',
    { $expand: '*' },
    { staleTime: 60000 } // 1 minute
  );
}
```

### Example 4: Check OData Support

```typescript
import { useRedfishRoot, supportsExpandQuery } from '@/api/composables/useRedfishRoot';

export function useODataFeatures() {
  const { data: serviceRoot } = useRedfishRoot();
  const canExpand = computed(() => supportsExpandQuery(serviceRoot.value));
  
  return { canExpand };
}
```

## Benefits

### 1. Type Safety
- Catch errors at compile time
- IntelliSense/autocomplete in IDEs
- Refactoring confidence

### 2. Reusability
- Generic composables work with any Redfish resource
- No boilerplate Vuex store code needed
- Consistent patterns across the codebase

### 3. Performance
- Automatic OData optimization
- Smart caching and deduplication
- Parallel fetching with error handling

### 4. Developer Experience
- Clear type definitions
- Comprehensive JSDoc comments
- Self-documenting code

## Migration Path

### For New Features
Use TypeScript composables directly:
```typescript
// In your Vue component
import { useAllSubResources } from '@/api/composables/useAllSubResources';
import type { Sensor } from '@/api/types/redfish';

const { data: sensors } = useAllSubResources<Sensor>('/redfish/v1/Chassis', 'Sensors');
```

### For Existing Features
Gradually migrate from Vuex stores to TypeScript composables:
1. Create TypeScript composable for data fetching
2. Update component to use composable
3. Remove Vuex store module (if no longer needed)

## Testing

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Unit Tests
TypeScript files work seamlessly with existing Vitest setup.

## Best Practices

### 1. Always Specify Generic Types
```typescript
// Good
const { data } = useAllSubResources<Sensor>('/redfish/v1/Chassis', 'Sensors');

// Avoid
const { data } = useAllSubResources('/redfish/v1/Chassis', 'Sensors');
```

### 2. Use Type Imports
```typescript
// Good
import type { Sensor } from '@/api/types/redfish';

// Avoid (imports at runtime)
import { Sensor } from '@/api/types/redfish';
```

### 3. Leverage Computed Properties
```typescript
const { data: rawSensors } = useAllSubResources<Sensor>(...);

const formattedSensors = computed(() => 
  rawSensors.value?.map(sensor => ({
    name: sensor.Name,
    value: sensor.Reading,
    // ...
  }))
);
```

### 4. Handle Loading and Error States
```typescript
const { data, isLoading, isError, error } = useAllSubResources<Sensor>(...);

// In template
<div v-if="isLoading">Loading...</div>
<div v-else-if="isError">Error: {{ error.message }}</div>
<div v-else>{{ data }}</div>
```

## Troubleshooting

### Issue: "Cannot find module '@/store/api'"
**Solution:** The `src/store/api.d.ts` type declaration file should resolve this. Restart your TypeScript server if needed.

### Issue: TypeScript errors in .vue files
**Solution:** Ensure your IDE has the Vue Language Features (Volar) extension installed.

### Issue: "Property does not exist on type"
**Solution:** Check that you're using the correct type from `src/api/types/redfish.ts`. Redfish uses PascalCase property names.

## Future Enhancements

1. **Migrate More Resources**
   - Processors, Drives, Power, Thermal, etc.
   - Follow the same pattern as Sensors

2. **Add More Type Definitions**
   - Expand `redfish.ts` with additional resource types
   - Add union types for discriminated unions

3. **Improve Error Handling**
   - Structured error aggregation
   - Partial success states

4. **Add Mutations**
   - Create TypeScript composables for POST/PATCH/DELETE operations
   - Type-safe mutation functions

## References

- [Gerrit Review](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/86842)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Redfish Specification](https://www.dmtf.org/standards/redfish)