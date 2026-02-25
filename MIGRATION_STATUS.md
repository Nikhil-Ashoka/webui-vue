# TanStack Vue Query Migration Status

## Overview

This repository is being migrated from a Pinia-only architecture to TanStack Vue Query + Pinia architecture for better server state management.

## Completed Work

### ✅ Infrastructure Setup

1. **Installed Dependencies**
   - `@tanstack/vue-query` added to package.json
   - Vue Query plugin configured in `main.js`

2. **API Layer**
   - Created `src/api/index.js` - Centralized Axios instance with interceptors
   - Created `src/api/queryKeys.js` - Hierarchical query key structure
   - Updated `src/store/api.js` to re-export from new API directory

3. **Query Composables Created**
   - `src/composables/queries/useGlobalQueries.js` - Global state queries
   - `src/composables/queries/useAuthQueries.js` - Authentication queries
   - `src/composables/queries/useSystemQueries.js` - System/Hardware queries
   - `src/composables/queries/useUserManagementQueries.js` - User management queries
   - `src/composables/queries/index.js` - Central export point

4. **Documentation**
   - `MIGRATION_GUIDE.md` - Comprehensive migration patterns and examples
   - `MIGRATION_STATUS.md` - This file

### ✅ Vue Query Configuration

```javascript
// main.js
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  },
});
```

## Remaining Work

### 🔄 Additional Query Composables Needed

The following store modules need to be migrated to Vue Query composables:

#### Hardware Status
- [ ] `useBmcQueries.js` - BMC store
- [ ] `useChassisQueries.js` - Chassis store
- [ ] `useProcessorQueries.js` - Processor store
- [ ] `useMemoryQueries.js` - Memory store
- [ ] `useFanQueries.js` - Fan store
- [ ] `usePowerSupplyQueries.js` - Power supply store
- [ ] `useAssemblyQueries.js` - Assembly store
- [ ] `usePcieSlotsQueries.js` - PCIe slots store
- [ ] `usePcieTopologyQueries.js` - PCIe topology store
- [ ] `useFabricAdaptersQueries.js` - Fabric adapters store
- [ ] `useSensorsQueries.js` - Sensors store
- [ ] `useConcurrentMaintenanceQueries.js` - Concurrent maintenance store

#### Logs
- [ ] `useEventLogQueries.js` - Event logs store
- [ ] `useAuditLogsQueries.js` - Audit logs store
- [ ] `usePostCodeLogsQueries.js` - Post code logs store
- [ ] `useDumpsQueries.js` - Dumps store
- [ ] `useDeconfigurationRecordsQueries.js` - Deconfiguration records store
- [ ] `useIBMiServiceFunctionsQueries.js` - IBMi service functions store

#### Operations
- [ ] `useFirmwareQueries.js` - Firmware store
- [ ] `useBootSettingsQueries.js` - Boot settings store
- [ ] `useControlQueries.js` - Control store
- [ ] `useFactoryResetQueries.js` - Factory reset store
- [ ] `useKeyClearQueries.js` - Key clear store
- [ ] `useNetworkSettingsQueries.js` - Network settings store

#### Resource Management
- [ ] `usePowerControlQueries.js` - Power control store
- [ ] `useResourceMemoryQueries.js` - Resource memory store
- [ ] `useSystemParametersQueries.js` - System parameters store
- [ ] `useFieldCoreOverrideQueries.js` - Field core override store
- [ ] `useLicenseQueries.js` - License store

#### Security and Access
- [ ] `useSessionsQueries.js` - Sessions store
- [ ] `useLdapQueries.js` - LDAP store
- [ ] `useCertificatesQueries.js` - Certificates store
- [ ] `usePoliciesQueries.js` - Policies store

#### Settings
- [ ] `useNetworkQueries.js` - Network store
- [ ] `usePowerPolicyQueries.js` - Power policy store
- [ ] `useSnmpAlertsQueries.js` - SNMP alerts store
- [ ] `useDateTimeQueries.js` - Date/time store
- [ ] `useHardwareDeconfigurationQueries.js` - Hardware deconfiguration store

### 🔄 Component Updates

All Vue components need to be updated to use the new query composables instead of directly calling store actions. Priority components:

#### High Priority (Core Functionality)
- [ ] `src/views/Login/Login.vue` - Use `useLogin`, `useGetLoginPageDetails`
- [ ] `src/views/Overview/Overview.vue` - Use multiple query hooks
- [ ] `src/views/Overview/OverviewServer.vue` - Use `useGetSystem`, `useGetSystemInfo`
- [ ] `src/views/HardwareStatus/Inventory/Inventory.vue` - Use hardware queries
- [ ] `src/views/SecurityAndAccess/UserManagement/*.vue` - Use user management queries

#### Medium Priority
- [ ] All `src/views/Logs/*` components
- [ ] All `src/views/Operations/*` components
- [ ] All `src/views/ResourceManagement/*` components
- [ ] All `src/views/Settings/*` components

#### Low Priority
- [ ] Overview card components
- [ ] Modal components
- [ ] Form components

### 🔄 Store Cleanup

After component migration, Pinia stores should be simplified to only contain:
- Client-side state (UI state, preferences)
- Computed/derived state
- Simple state setters

Remove all API call actions from stores as they'll be handled by Vue Query.

### 🔄 Testing

- [ ] Update unit tests to work with Vue Query
- [ ] Test all CRUD operations
- [ ] Test error handling and toast messages
- [ ] Test loading states
- [ ] Test cache invalidation
- [ ] Test WebSocket integration

### 🔄 Documentation Updates

- [ ] Update component documentation
- [ ] Update API documentation
- [ ] Add Vue Query DevTools setup instructions
- [ ] Document query key conventions

## Migration Strategy

### Phase 1: Core Infrastructure (✅ COMPLETED)
- Set up Vue Query
- Create base query composables
- Document patterns

### Phase 2: Create All Query Composables (🔄 IN PROGRESS)
- Create composables for all remaining stores
- Follow patterns from existing composables
- Ensure proper error handling and toast integration

### Phase 3: Component Migration (⏳ PENDING)
- Update components one module at a time
- Start with Login and Overview
- Test thoroughly after each module

### Phase 4: Store Cleanup (⏳ PENDING)
- Remove API actions from stores
- Keep only client state
- Update store documentation

### Phase 5: Testing & Validation (⏳ PENDING)
- Comprehensive testing
- Performance validation
- User acceptance testing

## How to Continue Migration

### For Query Composables

1. Choose a store from the "Remaining Work" list
2. Read the existing store file in `src/store/modules/`
3. Create a new composable file in `src/composables/queries/`
4. Follow the pattern from existing composables:
   - Use `useQuery` for GET requests
   - Use `useMutation` for POST/PATCH/DELETE
   - Update Pinia store state if needed
   - Invalidate queries after mutations
   - Handle i18n messages
5. Export from `src/composables/queries/index.js`
6. Update query keys in `src/api/queryKeys.js` if needed

### For Component Updates

1. Import query composables: `import { useGetSystem } from '@/composables/queries'`
2. Replace store calls with query hooks: `const { data, isLoading, error } = useGetSystem()`
3. Update template to use query states: `v-if="isLoading"`, `v-else-if="error"`
4. For mutations, use callbacks for toast messages:
   ```javascript
   mutate(data, {
     onSuccess: () => successToast(message),
     onError: (error) => errorToast(error.message),
   })
   ```
5. Remove manual loading state management
6. Remove manual error handling (use query error state)

## Example: Complete Migration Flow

### 1. Create Query Composable

```javascript
// src/composables/queries/useFirmwareQueries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { FirmwareStore } from '@/store/modules/Operations/FirmwareStore';
import i18n from '@/i18n';

export const useGetFirmware = () => {
  const firmwareStore = FirmwareStore();
  
  return useQuery({
    queryKey: queryKeys.operations.firmware(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/UpdateService/FirmwareInventory');
      const data = response.data.Members;
      firmwareStore.firmware = data;
      return data;
    },
  });
};

export const useUploadFirmware = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/redfish/v1/UpdateService', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.operations.firmware());
      return i18n.global.t('pageFirmware.toast.successUpload');
    },
    onError: (error) => {
      throw new Error(i18n.global.t('pageFirmware.toast.errorUpload'));
    },
  });
};
```

### 2. Update Component

```vue
<script setup>
import { useGetFirmware, useUploadFirmware } from '@/composables/queries';
import useToastComposable from '@/components/Composables/useToastComposable';

const { data: firmware, isLoading, error, refetch } = useGetFirmware();
const { mutate: uploadFirmware, isPending } = useUploadFirmware();
const { successToast, errorToast } = useToastComposable();

const handleUpload = (file) => {
  uploadFirmware(file, {
    onSuccess: (message) => {
      successToast(message);
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });
};
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <!-- Use firmware data -->
    <button @click="handleUpload" :disabled="isPending">
      Upload Firmware
    </button>
  </div>
</template>
```

### 3. Update Store (Minimal State Only)

```javascript
// src/store/modules/Operations/FirmwareStore.js
import { defineStore } from 'pinia';

export const FirmwareStore = defineStore('firmware', {
  state: () => ({
    firmware: [],
    // Keep only client state, remove all API actions
  }),
  getters: {
    firmwareGetter: (state) => state.firmware,
  },
  // Remove all actions - handled by Vue Query
});
```

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Gerrit Implementation 86842](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/86842)
- [Gerrit Implementation 87281](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/87281)

## Notes

- All existing functionality must be preserved
- Toast messages must work exactly as before
- Translations must be maintained
- Styling must remain unchanged
- WebSocket integration must continue to work
- The migration should be done incrementally to minimize risk