# TanStack Vue Query Migration - Completion Roadmap

## 🎯 Current Status: 17.5% Complete

**Completed:** 7 of 40 stores migrated
**Remaining:** 33 stores + 100+ components
**Estimated Effort:** 80-120 hours for full completion

## 📋 Phase-by-Phase Completion Plan

### Phase 2: Complete Core Store Migrations (40-60 hours)

#### Week 1: Security & Sessions (8-10 hours)
**Priority: HIGH** - User-facing features

1. **SessionsStore** (2 hours)
   - `useGetSessions()` - Session list
   - `useDisconnectSessions()` - Bulk disconnect
   - Pattern: Similar to UserManagement bulk operations

2. **LdapStore** (3 hours)
   - `useGetLdapConfig()` - LDAP configuration
   - `useUpdateLdapConfig()` - Update settings
   - `useGetRoleGroups()` - Role group mappings
   - `useAddRoleGroup()`, `useDeleteRoleGroup()` - CRUD operations

3. **CertificatesStore** (3 hours)
   - `useGetCertificates()` - All certificates
   - `useUploadCertificate()` - Upload new cert
   - `useDeleteCertificate()` - Delete cert
   - `useGenerateCSR()` - Generate CSR

4. **PoliciesStore** (2 hours)
   - `useGetPolicies()` - Security policies
   - `useUpdatePolicies()` - Update policies

#### Week 2: Operations Stores (12-15 hours)
**Priority: HIGH** - Critical system operations

1. **FirmwareStore** (4 hours)
   - `useGetFirmware()` - Firmware inventory
   - `useGetActiveFirmware()` - Active BMC/Host firmware
   - `useUploadFirmware()` - Upload firmware file
   - `useUpdateFirmware()` - Apply firmware update
   - Complex: Multiple firmware types, boot side management

2. **BootSettingsStore** (3 hours)
   - `useGetBootSettings()` - Boot configuration
   - `useUpdateBootSettings()` - Update boot settings
   - `useGetOperatingMode()` - Operating mode settings

3. **ControlStore** (3 hours)
   - `useServerPowerOn()` - Power on
   - `useServerPowerOff()` - Power off (graceful/immediate)
   - `useServerReboot()` - Reboot operations
   - `useBmcReboot()` - BMC reboot
   - Pattern: Watch for server status changes

4. **NetworkSettingsStore** (2 hours)
   - `useGetNetworkSettings()` - Network configuration
   - `useUpdateNetworkSettings()` - Update network

#### Week 3: Hardware Stores (10-12 hours)
**Priority: MEDIUM** - Inventory and monitoring

1. **BmcStore** (2 hours)
   - `useGetBmc()` - BMC information
   - Pattern: Similar to SystemStore

2. **ChassisStore** (2 hours)
   - `useGetChassis()` - Chassis information
   - Pattern: Similar to SystemStore

3. **PowerSupplyStore** (2 hours)
   - `useGetPowerSupplies()` - Power supply list
   - `useUpdatePowerSupplyLed()` - LED control

4. **AssemblyStore** (2 hours)
   - `useGetAssemblies()` - Assembly information
   - Pattern: Similar to other hardware stores

5. **SensorsStore** (2 hours)
   - `useGetSensors()` - Sensor readings
   - Pattern: May need polling for real-time data

#### Week 4: Settings & Resources (10-12 hours)
**Priority: MEDIUM** - Configuration management

1. **NetworkStore** (4 hours)
   - `useGetNetworkInterfaces()` - Network interfaces
   - `useUpdateNetworkInterface()` - Update interface
   - `useGetDhcpSettings()` - DHCP configuration
   - Complex: Multiple interfaces, IPv4/IPv6

2. **PowerPolicyStore** (2 hours)
   - `useGetPowerPolicy()` - Power policy settings
   - `useUpdatePowerPolicy()` - Update policy

3. **PowerControlStore** (3 hours)
   - `useGetPowerControl()` - Power control settings
   - `useUpdatePowerCap()` - Power cap settings
   - `useGetPowerMode()` - Performance modes

4. **SystemParametersStore** (3 hours)
   - `useGetSystemParameters()` - System parameters
   - `useUpdateSystemParameters()` - Update parameters

### Phase 3: Component Migration (30-40 hours)

#### Priority 1: Authentication & Core (8-10 hours)
1. **Login.vue** (3 hours)
   - Replace store calls with `useLogin()`, `useGetLoginPageDetails()`
   - Test MFA flow
   - Verify OTP generation

2. **Overview.vue** (3 hours)
   - Multiple query hooks for different cards
   - Parallel data loading
   - Event bus integration

3. **ChangePassword.vue** (2 hours)
   - Use `useUpdateUser()` mutation
   - Password validation

#### Priority 2: User Management (6-8 hours)
1. **UserManagement pages** (6 hours)
   - Already have composables
   - Update all CRUD operations
   - Test bulk operations
   - Verify MFA features

#### Priority 3: Hardware Inventory (8-10 hours)
1. **Inventory.vue** (4 hours)
   - Use hardware query hooks
   - LED control mutations
   - Service indicator updates

2. **Sensors.vue** (2 hours)
   - Real-time sensor data
   - May need polling

3. **PcieTopology.vue** (2 hours)
   - PCIe slot information
   - Link reset operations

#### Priority 4: Logs & Dumps (6-8 hours)
1. **EventLogs.vue** (3 hours)
   - Already have composables
   - Filter and sort operations
   - Bulk actions

2. **Dumps.vue** (3 hours)
   - Already have composables
   - Create/delete/download operations
   - Progress tracking

#### Priority 5: Operations (6-8 hours)
1. **Firmware.vue** (4 hours)
   - Firmware upload
   - Update operations
   - Progress tracking

2. **HostConsole.vue** (2 hours)
   - Console connection
   - May need special handling

### Phase 4: Testing & Validation (10-15 hours)

#### Unit Tests (4-6 hours)
- Test all query composables
- Test mutation callbacks
- Mock API responses
- Verify error handling

#### Integration Tests (4-6 hours)
- Test component integration
- Verify toast messages
- Check translations
- Validate styling

#### E2E Tests (2-3 hours)
- Critical user flows
- Login/logout
- CRUD operations
- Firmware updates

## 🛠️ Implementation Guidelines

### For Each Store Migration

1. **Read existing store** (15 min)
   - Understand data structure
   - Identify all actions
   - Note special handling

2. **Create composable** (30-60 min)
   - Use TEMPLATE.md
   - Implement queries
   - Implement mutations
   - Add error handling

3. **Update exports** (5 min)
   - Add to `index.js`
   - Update query keys if needed

4. **Test composable** (15-30 min)
   - Verify queries work
   - Test mutations
   - Check cache invalidation

### For Each Component Migration

1. **Identify store usage** (10 min)
   - Find all store calls
   - List required queries/mutations

2. **Import composables** (5 min)
   - Replace store imports
   - Import toast composable

3. **Update script** (20-40 min)
   - Replace store calls with hooks
   - Update mutation handlers
   - Add toast callbacks

4. **Update template** (10-20 min)
   - Use `isLoading` states
   - Handle errors
   - Update button states

5. **Test component** (15-30 min)
   - Verify all functionality
   - Check toast messages
   - Validate styling

## 📊 Progress Tracking

### Use the Migration Helper
```bash
npm run migration:status
```

This shows:
- Stores migrated vs remaining
- Components needing updates
- Overall progress percentage
- Next recommended steps

### Update MIGRATION_STATUS.md
After completing each store:
1. Mark store as complete in checklist
2. Update statistics
3. Note any issues or special cases

## 🎯 Success Criteria

### Store Migration Complete When:
- ✅ All queries implemented
- ✅ All mutations implemented
- ✅ Error handling with i18n
- ✅ Toast integration working
- ✅ Pinia store updated (if needed)
- ✅ Exported from index.js
- ✅ Query keys added/updated
- ✅ Follows established patterns

### Component Migration Complete When:
- ✅ All store calls replaced
- ✅ Loading states working
- ✅ Error handling working
- ✅ Toast messages displaying
- ✅ Styling preserved
- ✅ All functionality working
- ✅ No console errors

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Query Not Refetching
**Problem:** Data doesn't update after mutation
**Solution:** Ensure `invalidateQueries` in `onSuccess`
```javascript
onSuccess: () => {
  queryClient.invalidateQueries(queryKeys.category.resource());
}
```

### Pitfall 2: Multiple Requests
**Problem:** Same API call made multiple times
**Solution:** Ensure query keys are identical
```javascript
// ✅ Good
queryKeys.hardware.processors()

// ❌ Bad
['processors'] // Different from queryKeys
```

### Pitfall 3: Store Not Updating
**Problem:** Pinia store doesn't reflect new data
**Solution:** Update store in queryFn
```javascript
queryFn: async () => {
  const data = await api.get('/path');
  store.data = data; // Update store
  return data;
}
```

### Pitfall 4: Toast Not Showing
**Problem:** Toast messages not displaying
**Solution:** Use callbacks in component
```javascript
mutate(data, {
  onSuccess: (message) => successToast(message),
  onError: (error) => errorToast(error.message),
});
```

### Pitfall 5: Loading State Issues
**Problem:** Loading state not working correctly
**Solution:** Use query/mutation states
```javascript
const { isLoading } = useGetData();
const { isPending } = useMutateData();
```

## 📚 Quick Reference

### Query Pattern
```javascript
export const useGetResource = () => {
  const store = ResourceStore();
  
  return useQuery({
    queryKey: queryKeys.category.resource(),
    queryFn: async () => {
      const response = await api.get('/path');
      store.data = response.data;
      return response.data;
    },
  });
};
```

### Mutation Pattern
```javascript
export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      await api.patch('/path', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.category.resource());
      return i18n.global.t('page.toast.success');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('page.toast.error'));
    },
  });
};
```

### Component Usage
```vue
<script setup>
import { useGetResource, useUpdateResource } from '@/composables/queries';
import useToastComposable from '@/components/Composables/useToastComposable';

const { data, isLoading, error } = useGetResource();
const { mutate: update, isPending } = useUpdateResource();
const { successToast, errorToast } = useToastComposable();

const handleUpdate = () => {
  update(formData, {
    onSuccess: (message) => successToast(message),
    onError: (error) => errorToast(error.message),
  });
};
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <!-- Use data -->
    <button @click="handleUpdate" :disabled="isPending">
      Update
    </button>
  </div>
</template>
```

## 🎓 Team Assignments (Suggested)

### Developer 1: Security & Sessions (Week 1)
- SessionsStore
- LdapStore
- CertificatesStore
- PoliciesStore

### Developer 2: Operations (Week 2)
- FirmwareStore
- BootSettingsStore
- ControlStore
- NetworkSettingsStore

### Developer 3: Hardware (Week 3)
- BmcStore, ChassisStore
- PowerSupplyStore
- AssemblyStore, SensorsStore

### Developer 4: Settings & Resources (Week 4)
- NetworkStore
- PowerPolicyStore
- PowerControlStore
- SystemParametersStore

### All Developers: Component Migration (Weeks 5-6)
- Divide components by feature area
- Pair programming for complex components
- Code reviews for all changes

## 📈 Milestones

### Milestone 1: Security Complete (End of Week 1)
- All security stores migrated
- Sessions page working
- User management fully functional

### Milestone 2: Operations Complete (End of Week 2)
- All operations stores migrated
- Firmware updates working
- Power operations functional

### Milestone 3: Hardware Complete (End of Week 3)
- All hardware stores migrated
- Inventory pages working
- LED controls functional

### Milestone 4: Settings Complete (End of Week 4)
- All settings stores migrated
- Network configuration working
- Power management functional

### Milestone 5: Components Complete (End of Week 6)
- All components migrated
- Full application functional
- All tests passing

### Milestone 6: Production Ready (End of Week 7)
- All testing complete
- Documentation updated
- Performance validated
- Ready for deployment

## 🎉 Definition of Done

The migration is complete when:
- ✅ All 40 stores have query composables
- ✅ All 100+ components use query hooks
- ✅ All tests passing
- ✅ No console errors
- ✅ Toast messages working
- ✅ Translations working
- ✅ Styling preserved
- ✅ WebSocket integration working
- ✅ Performance acceptable
- ✅ Documentation complete
- ✅ Team trained on new patterns

## 📞 Support & Resources

### Documentation
- `MIGRATION_GUIDE.md` - Patterns and examples
- `TEMPLATE.md` - Composable template
- `MIGRATION_STATUS.md` - Detailed status
- `README_TANSTACK_MIGRATION.md` - Quick start

### External Resources
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/vue/overview)
- [Gerrit 86842](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/86842)
- [Gerrit 87281](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/87281)

### Tools
- `npm run migration:status` - Progress tracker
- Vue Query DevTools - Debugging
- ESLint - Code quality

---

**Remember:** This is an incremental migration. Each store and component can be migrated independently without breaking existing functionality. Take it one step at a time, follow the patterns, and test thoroughly!