# TanStack Vue Query Migration - OpenBMC WebUI

## 🎯 Project Overview

This repository has been migrated to use **TanStack Vue Query** (formerly React Query) for server state management, while maintaining **Pinia** for client-side state. This provides better caching, automatic refetching, and improved developer experience.

## 📚 Documentation

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Comprehensive guide with patterns and examples
- **[MIGRATION_STATUS.md](./MIGRATION_STATUS.md)** - Current migration status and remaining work
- **[Gerrit Reference 86842](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/86842)** - Original implementation reference
- **[Gerrit Reference 87281](https://gerrit.openbmc.org/c/openbmc/webui-vue/+/87281)** - Additional implementation reference

## 🚀 Quick Start

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Development

```bash
npm run serve
```

### Check Migration Status

```bash
npm run migration:status
```

This will show:
- Which stores have been migrated
- Which components need updating
- Overall progress percentage

## 🏗️ Architecture

### New Structure

```
src/
├── api/                          # API layer
│   ├── index.js                  # Axios instance with interceptors
│   └── queryKeys.js              # Centralized query keys
│
├── composables/
│   └── queries/                  # Vue Query composables
│       ├── index.js              # Export all composables
│       ├── useGlobalQueries.js   # Global state queries
│       ├── useAuthQueries.js     # Authentication
│       ├── useSystemQueries.js   # System/Hardware
│       └── useUserManagementQueries.js
│
├── store/
│   ├── api.js                    # Re-exports from @/api (compatibility)
│   └── modules/                  # Pinia stores (client state only)
│
└── components/
    └── Composables/              # Existing composables
        └── useToastComposable.js # Toast notifications
```

### Key Principles

1. **Vue Query for Server State**
   - All API calls (GET, POST, PATCH, DELETE)
   - Automatic caching and refetching
   - Loading and error states
   - Request deduplication

2. **Pinia for Client State**
   - UI state (modals, selections)
   - User preferences
   - Derived/computed state
   - Local storage sync

3. **Backward Compatibility**
   - Existing store structure maintained
   - Components can be migrated incrementally
   - No breaking changes to existing functionality

## 📖 Usage Examples

### Query (GET Request)

```vue
<script setup>
import { useGetSystem } from '@/composables/queries';

// Automatic fetching, caching, and refetching
const { data: system, isLoading, error, refetch } = useGetSystem();
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <h1>{{ system.name }}</h1>
    <button @click="refetch">Refresh</button>
  </div>
</template>
```

### Mutation (POST/PATCH/DELETE)

```vue
<script setup>
import { useCreateUser } from '@/composables/queries';
import useToastComposable from '@/components/Composables/useToastComposable';

const { mutate: createUser, isPending } = useCreateUser();
const { successToast, errorToast } = useToastComposable();

const handleSubmit = () => {
  createUser(formData, {
    onSuccess: () => {
      successToast('User created successfully');
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- form fields -->
    <button type="submit" :disabled="isPending">
      {{ isPending ? 'Creating...' : 'Create User' }}
    </button>
  </form>
</template>
```

### Multiple Queries

```vue
<script setup>
import { useGetSystem, useGetProcessors, useGetMemory } from '@/composables/queries';

// All queries run in parallel
const { data: system, isLoading: systemLoading } = useGetSystem();
const { data: processors, isLoading: processorsLoading } = useGetProcessors();
const { data: memory, isLoading: memoryLoading } = useGetMemory();

const isLoading = computed(() => 
  systemLoading.value || processorsLoading.value || memoryLoading.value
);
</script>
```

### Dependent Queries

```vue
<script setup>
import { useGetUser, useGetUserPermissions } from '@/composables/queries';

const username = ref('admin');

// First query
const { data: user } = useGetUser(username);

// Second query only runs when user data is available
const { data: permissions } = useGetUserPermissions(username, {
  enabled: computed(() => !!user.value),
});
</script>
```

## 🔑 Query Keys

Query keys are centralized in `src/api/queryKeys.js`:

```javascript
// Hierarchical structure for easy invalidation
queryKeys.hardware.all          // ['hardware']
queryKeys.hardware.system()     // ['hardware', 'system']
queryKeys.hardware.processors() // ['hardware', 'processors']

// Invalidate all hardware queries
queryClient.invalidateQueries(queryKeys.hardware.all);

// Invalidate specific query
queryClient.invalidateQueries(queryKeys.hardware.system());
```

## 🎨 Component Migration Checklist

When migrating a component:

- [ ] Import query composables instead of stores
- [ ] Replace store actions with query hooks
- [ ] Use `isLoading` instead of manual loading state
- [ ] Use `error` from query instead of try/catch
- [ ] Handle mutations with `onSuccess`/`onError` callbacks
- [ ] Remove manual refetch calls (automatic with invalidation)
- [ ] Update template to use query states
- [ ] Test all functionality
- [ ] Verify toast messages work
- [ ] Check styling is preserved

## 🧪 Testing

### Unit Tests

```javascript
import { VueQueryPlugin } from '@tanstack/vue-query';
import { mount } from '@vue/test-utils';

const wrapper = mount(MyComponent, {
  global: {
    plugins: [VueQueryPlugin],
  },
});
```

### Integration Tests

```bash
npm run test
```

## 🔧 Configuration

Vue Query is configured in `src/main.js`:

```javascript
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,  // Don't refetch on window focus
        retry: false,                  // Don't retry failed requests
        staleTime: 5 * 60 * 1000,     // Data is fresh for 5 minutes
      },
    },
  },
});
```

Adjust these settings based on your needs:
- `staleTime`: How long data is considered fresh
- `cacheTime`: How long unused data stays in cache
- `refetchInterval`: Auto-refetch interval (for polling)
- `retry`: Number of retry attempts for failed requests

## 📊 Benefits

### Before (Pinia Only)
- ❌ Manual cache management
- ❌ Manual loading states
- ❌ Manual error handling
- ❌ Manual refetch after mutations
- ❌ Duplicate requests from multiple components
- ❌ Complex state synchronization

### After (Vue Query + Pinia)
- ✅ Automatic caching
- ✅ Built-in loading/error states
- ✅ Automatic refetching
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Background refetching
- ✅ Better developer experience
- ✅ Vue Query DevTools

## 🐛 Troubleshooting

### Query not refetching after mutation

**Problem:** Data doesn't update after creating/updating/deleting

**Solution:** Ensure you're invalidating the correct query keys:

```javascript
const { mutate } = useCreateUser();

mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries(queryKeys.security.users());
  },
});
```

### Multiple requests for same data

**Problem:** Same API call made multiple times

**Solution:** Ensure query keys are identical across components:

```javascript
// ✅ Good - same query key
const { data } = useGetSystem();

// ❌ Bad - different query keys
const { data } = useQuery({
  queryKey: ['system'],  // Different from queryKeys.hardware.system()
  // ...
});
```

### Data not updating in store

**Problem:** Pinia store not reflecting latest data

**Solution:** Update store in query function:

```javascript
export const useGetSystem = () => {
  const systemStore = SystemStore();
  
  return useQuery({
    queryKey: queryKeys.hardware.system(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/Systems/system');
      systemStore.systems = [response.data]; // Update store
      return response.data;
    },
  });
};
```

## 📝 Contributing

When adding new features:

1. Create query composable in `src/composables/queries/`
2. Add query keys to `src/api/queryKeys.js`
3. Export from `src/composables/queries/index.js`
4. Update components to use new composable
5. Add tests
6. Update documentation

## 🔗 Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
- [Vue Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

## 📞 Support

For questions or issues:
1. Check [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
2. Check [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)
3. Review Gerrit implementations
4. Ask the team

## 🎉 Migration Progress

Run `npm run migration:status` to see current progress.

Current status:
- ✅ Infrastructure setup complete
- ✅ Core query composables created
- 🔄 Additional composables in progress
- 🔄 Component migration in progress
- ⏳ Testing and validation pending

---

**Note:** This is an ongoing migration. Components can be updated incrementally without breaking existing functionality.