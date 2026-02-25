# Query Composable Template

This template provides a standardized structure for creating new query composables. Follow this pattern to ensure consistency across the codebase.

## File Naming Convention

- File name: `use[StoreName]Queries.js`
- Example: `useFirmwareQueries.js`, `useNetworkQueries.js`

## Template Structure

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api, { getResponseCount } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { [StoreName]Store } from '@/store/modules/[Category]/[StoreName]Store';
import i18n from '@/i18n';

// ============================================================================
// HELPER FUNCTIONS (if needed)
// ============================================================================

/**
 * Helper function description
 * @param {type} param - Parameter description
 * @returns {type} Return description
 */
const helperFunction = (param) => {
  // Implementation
};

// ============================================================================
// QUERIES (GET requests)
// ============================================================================

/**
 * Query: Get [Resource Name]
 * Fetches [resource] data from the API
 * @returns {UseQueryResult} Query result with data, isLoading, error, etc.
 */
export const useGet[ResourceName] = () => {
  const store = [StoreName]Store();

  return useQuery({
    queryKey: queryKeys.[category].[resource](),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/path/to/resource');
      const data = response.data;

      // Transform data if needed
      const transformedData = data.Members.map((item) => ({
        id: item.Id,
        name: item.Name,
        // ... other fields
      }));

      // Update Pinia store if needed for backward compatibility
      store.resourceData = transformedData;

      return transformedData;
    },
    // Optional: Add query options
    staleTime: 5 * 60 * 1000, // 5 minutes
    // enabled: computed(() => !!someCondition), // Conditional fetching
    // refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
};

/**
 * Query: Get [Resource Name] with parameter
 * @param {string} id - Resource ID
 * @returns {UseQueryResult} Query result
 */
export const useGet[ResourceName]ById = (id) => {
  return useQuery({
    queryKey: [...queryKeys.[category].[resource](), id],
    queryFn: async () => {
      const response = await api.get(`/redfish/v1/path/to/resource/${id}`);
      return response.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
};

// ============================================================================
// MUTATIONS (POST/PATCH/DELETE requests)
// ============================================================================

/**
 * Mutation: Create [Resource Name]
 * Creates a new [resource]
 * @returns {UseMutationResult} Mutation result with mutate function
 */
export const useCreate[ResourceName] = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/redfish/v1/path/to/resource', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(queryKeys.[category].[resource]());

      // Return success message for toast
      return i18n.global.t('page[Page].toast.successCreate[Resource]');
    },
    onError: (error) => {
      console.log(error);
      // Throw error with i18n message for toast
      throw new Error(
        i18n.global.t('page[Page].toast.errorCreate[Resource]')
      );
    },
  });
};

/**
 * Mutation: Update [Resource Name]
 * Updates an existing [resource]
 * @returns {UseMutationResult} Mutation result
 */
export const useUpdate[ResourceName] = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.patch(
        `/redfish/v1/path/to/resource/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific query
      queryClient.invalidateQueries([
        ...queryKeys.[category].[resource](),
        variables.id,
      ]);

      return i18n.global.t('page[Page].toast.successUpdate[Resource]');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('page[Page].toast.errorUpdate[Resource]')
      );
    },
  });
};

/**
 * Mutation: Delete [Resource Name]
 * Deletes a [resource]
 * @returns {UseMutationResult} Mutation result
 */
export const useDelete[ResourceName] = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/redfish/v1/path/to/resource/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.[category].[resource]());
      return i18n.global.t('page[Page].toast.successDelete[Resource]');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('page[Page].toast.errorDelete[Resource]')
      );
    },
  });
};

/**
 * Mutation: Delete Multiple [Resource Names]
 * Deletes multiple [resources] in parallel
 * @returns {UseMutationResult} Mutation result
 */
export const useDeleteMultiple[ResourceNames] = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items) => {
      const promises = items.map((item) =>
        api.delete(`/redfish/v1/path/to/resource/${item.id}`)
          .catch((error) => error)
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.[category].[resource]());

      return {
        successCount,
        errorCount,
        message: errorCount > 0
          ? i18n.global.t('page[Page].toast.errorDelete[Resources]', {
              count: errorCount,
            })
          : i18n.global.t('page[Page].toast.successDelete[Resources]', {
              count: successCount,
            }),
      };
    },
  });
};

// ============================================================================
// EXPORT HELPER FUNCTIONS (if any)
// ============================================================================

export { helperFunction };
```

## Usage in Components

```vue
<script setup>
import {
  useGet[ResourceName],
  useCreate[ResourceName],
  useUpdate[ResourceName],
  useDelete[ResourceName],
} from '@/composables/queries';
import useToastComposable from '@/components/Composables/useToastComposable';

// Query
const { data, isLoading, error, refetch } = useGet[ResourceName]();

// Mutations
const { mutate: create, isPending: isCreating } = useCreate[ResourceName]();
const { mutate: update, isPending: isUpdating } = useUpdate[ResourceName]();
const { mutate: deleteItem, isPending: isDeleting } = useDelete[ResourceName]();

// Toast
const { successToast, errorToast } = useToastComposable();

// Handlers
const handleCreate = () => {
  create(formData, {
    onSuccess: (message) => {
      successToast(message);
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });
};

const handleUpdate = () => {
  update({ id: itemId, data: formData }, {
    onSuccess: (message) => {
      successToast(message);
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });
};

const handleDelete = () => {
  deleteItem(itemId, {
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
    <!-- Use data -->
    <button @click="handleCreate" :disabled="isCreating">Create</button>
  </div>
</template>
```

## Checklist for New Query Composables

- [ ] File named correctly: `use[StoreName]Queries.js`
- [ ] Imports all required dependencies
- [ ] Uses correct query keys from `queryKeys.js`
- [ ] Updates Pinia store if needed for backward compatibility
- [ ] All queries have proper JSDoc comments
- [ ] All mutations invalidate related queries
- [ ] Success/error messages use i18n
- [ ] Error handling includes console.log for debugging
- [ ] Exported from `src/composables/queries/index.js`
- [ ] Query keys added to `src/api/queryKeys.js` if new
- [ ] Follows existing code style and patterns

## Common Patterns

### Conditional Query Execution

```javascript
export const useGetResource = (id) => {
  return useQuery({
    queryKey: [...queryKeys.category.resource(), id],
    queryFn: async () => {
      const response = await api.get(`/path/${id}`);
      return response.data;
    },
    enabled: !!id, // Only run if id exists
  });
};
```

### Dependent Queries

```javascript
// First query
const { data: parent } = useGetParent();

// Second query depends on first
const { data: children } = useGetChildren({
  enabled: computed(() => !!parent.value),
});
```

### Polling/Auto-refetch

```javascript
export const useGetStatus = () => {
  return useQuery({
    queryKey: queryKeys.category.status(),
    queryFn: async () => {
      const response = await api.get("/status");
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};
```

### Optimistic Updates

```javascript
export const useUpdateResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      await api.patch(`/resource/${id}`, data);
      return { id, data };
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(queryKeys.category.resource());

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.category.resource());

      // Optimistically update
      queryClient.setQueryData(queryKeys.category.resource(), (old) => {
        return old.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        );
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.category.resource(), context.previous);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(queryKeys.category.resource());
    },
  });
};
```

## Tips

1. **Keep queries simple**: One query per endpoint
2. **Use descriptive names**: `useGetFirmwareInventory` not `useGetData`
3. **Handle errors gracefully**: Always include error handling
4. **Update stores when needed**: For backward compatibility
5. **Invalidate related queries**: After mutations
6. **Use i18n for messages**: All user-facing text
7. **Document complex logic**: Add comments for clarity
8. **Test thoroughly**: Verify all CRUD operations work
