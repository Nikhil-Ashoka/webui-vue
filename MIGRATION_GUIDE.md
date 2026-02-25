# Vue Query Migration Guide

This document outlines the migration from Pinia-only stores to TanStack Vue Query + Pinia architecture.

## Overview

The migration follows these principles:
1. **Vue Query for server state**: All API calls and server data fetching/mutations use Vue Query
2. **Pinia for client state**: UI state, user preferences, and derived state remain in Pinia stores
3. **Backward compatibility**: Existing store structure maintained where possible

## Architecture Changes

### Before (Pinia Only)
```javascript
// Store handles both API calls and state
export const SystemStore = defineStore('system', {
  state: () => ({ systems: [] }),
  actions: {
    async getSystem() {
      const response = await api.get('/redfish/v1/Systems/system');
      this.systems = [response.data];
    }
  }
});
```

### After (Vue Query + Pinia)
```javascript
// Composable handles API calls
export const useGetSystem = () => {
  const systemStore = SystemStore();
  
  return useQuery({
    queryKey: queryKeys.hardware.system(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/Systems/system');
      systemStore.systems = [response.data]; // Update store if needed
      return response.data;
    },
  });
};

// Component usage
const { data, isLoading, error, refetch } = useGetSystem();
```

## Key Benefits

1. **Automatic caching**: No manual cache management
2. **Background refetching**: Keep data fresh automatically
3. **Optimistic updates**: Better UX for mutations
4. **Request deduplication**: Multiple components can use same query
5. **Loading/error states**: Built-in state management
6. **DevTools**: Better debugging with Vue Query DevTools

## File Structure

```
src/
├── api/
│   ├── index.js              # Axios instance and interceptors
│   └── queryKeys.js          # Centralized query key management
├── composables/
│   └── queries/
│       ├── index.js          # Export all query composables
│       ├── useGlobalQueries.js
│       ├── useAuthQueries.js
│       ├── useSystemQueries.js
│       └── useUserManagementQueries.js
└── store/
    ├── api.js                # Re-exports from @/api for compatibility
    └── modules/              # Pinia stores (minimal state only)
```

## Query Keys Structure

Query keys follow a hierarchical structure for easy invalidation:

```javascript
queryKeys.hardware.all          // ['hardware']
queryKeys.hardware.system()     // ['hardware', 'system']
queryKeys.hardware.processors() // ['hardware', 'processors']
```

Invalidate all hardware queries:
```javascript
queryClient.invalidateQueries(queryKeys.hardware.all);
```

## Migration Patterns

### Pattern 1: Simple GET Request

**Before:**
```javascript
// In store
async getUsers() {
  const response = await api.get('/redfish/v1/AccountService/Accounts');
  this.allUsers = response.data.Members;
}

// In component
const userStore = UserManagementStore();
onMounted(() => {
  userStore.getUsers();
});
```

**After:**
```javascript
// In composable
export const useGetUsers = () => {
  const userStore = UserManagementStore();
  
  return useQuery({
    queryKey: queryKeys.security.users(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/AccountService/Accounts');
      userStore.allUsers = response.data.Members;
      return response.data.Members;
    },
  });
};

// In component
const { data: users, isLoading, error } = useGetUsers();
```

### Pattern 2: POST/PATCH/DELETE (Mutations)

**Before:**
```javascript
// In store
async createUser(userData) {
  await api.post('/redfish/v1/AccountService/Accounts', userData);
  await this.getUsers(); // Manually refresh
}

// In component
const userStore = UserManagementStore();
const createUser = async () => {
  await userStore.createUser(formData);
};
```

**After:**
```javascript
// In composable
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData) => {
      await api.post('/redfish/v1/AccountService/Accounts', userData);
    },
    onSuccess: () => {
      // Automatically invalidate and refetch
      queryClient.invalidateQueries(queryKeys.security.users());
    },
  });
};

// In component
const { mutate: createUser, isPending } = useCreateUser();
const handleSubmit = () => {
  createUser(formData, {
    onSuccess: () => {
      successToast('User created successfully');
    },
    onError: (error) => {
      errorToast('Failed to create user');
    },
  });
};
```

### Pattern 3: Dependent Queries

**Before:**
```javascript
// Manual chaining
async loadData() {
  await this.getSystem();
  await this.getProcessors();
}
```

**After:**
```javascript
// Automatic dependency management
const { data: system } = useGetSystem();
const { data: processors } = useGetProcessors({
  enabled: !!system, // Only run when system data is available
});
```

### Pattern 4: Polling/Auto-refresh

**Before:**
```javascript
// Manual interval
let interval;
onMounted(() => {
  interval = setInterval(() => {
    store.getStatus();
  }, 5000);
});
onUnmounted(() => clearInterval(interval));
```

**After:**
```javascript
// Built-in polling
const { data } = useGetStatus({
  refetchInterval: 5000,
});
```

## Component Migration Example

### Before (Pinia Only)

```vue
<script setup>
import { onMounted } from 'vue';
import stores from '@/store';

const systemStore = stores.SystemStore();
const loading = ref(true);

onMounted(async () => {
  try {
    await systemStore.getSystem();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
});

const handleUpdate = async () => {
  await systemStore.updateSystem(data);
  await systemStore.getSystem(); // Manual refresh
};
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else>{{ systemStore.systems[0] }}</div>
</template>
```

### After (Vue Query + Pinia)

```vue
<script setup>
import { useGetSystem, useSaveAssetTag } from '@/composables/queries';
import useToastComposable from '@/components/Composables/useToastComposable';

const { data: system, isLoading, error } = useGetSystem();
const { mutate: saveAssetTag, isPending } = useSaveAssetTag();
const { successToast, errorToast } = useToastComposable();

const handleUpdate = () => {
  saveAssetTag(data, {
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
  <div v-else>{{ system }}</div>
</template>
```

## Toast Integration

Toast messages are handled in mutation callbacks:

```javascript
const { mutate, isPending } = useCreateUser();
const { successToast, errorToast } = useToastComposable();

const handleCreate = () => {
  mutate(userData, {
    onSuccess: () => {
      successToast(i18n.global.t('pageUserManagement.toast.successCreateUser'));
    },
    onError: (error) => {
      errorToast(i18n.global.t('pageUserManagement.toast.errorCreateUser'));
    },
  });
};
```

## Best Practices

1. **Query Keys**: Always use the centralized `queryKeys` object
2. **Error Handling**: Handle errors in component callbacks, not in composables
3. **Loading States**: Use `isLoading` and `isPending` from queries/mutations
4. **Optimistic Updates**: Use for better UX on mutations
5. **Stale Time**: Configure appropriate stale times for different data types
6. **Cache Invalidation**: Invalidate related queries after mutations

## Configuration

Vue Query is configured in `main.js`:

```javascript
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

## Testing

```javascript
import { VueQueryPlugin } from '@tanstack/vue-query';
import { mount } from '@vue/test-utils';

const wrapper = mount(Component, {
  global: {
    plugins: [VueQueryPlugin],
  },
});
```

## Troubleshooting

### Query not refetching
- Check if query key is properly defined
- Verify `enabled` option is not false
- Check `staleTime` configuration

### Mutation not updating UI
- Ensure `invalidateQueries` is called in `onSuccess`
- Verify query keys match between query and invalidation

### Multiple requests for same data
- Check if query keys are identical
- Verify components are using the same composable

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/vue/overview)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
- [Pinia Documentation](https://pinia.vuejs.org/)