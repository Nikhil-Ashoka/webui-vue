import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import api from '@/store/api';
import {
  useRedfishRoot,
  supportsExpandQuery,
  supportsSelectQuery,
} from './useRedfishRoot';
import type { CollectionMember } from './useRedfishCollection';

/**
 * Generic Redfish resource with sub-resource collection
 */
interface ResourceWithCollection {
  '@odata.id': string;
  [key: string]: unknown;
}

/**
 * Fetches all parent resources and checks which have the sub-resource
 * Uses $select for efficiency if supported
 *
 * @param parentCollectionPath - Path to parent collection (e.g., '/redfish/v1/Chassis')
 * @param subResourceName - Name of sub-resource (e.g., 'Sensors')
 * @param canUseSelect - Whether BMC supports $select
 * @returns Array of parent resource URIs that have the sub-resource
 */
async function discoverParentsWithSubResource(
  parentCollectionPath: string,
  subResourceName: string,
  canUseSelect: boolean,
): Promise<string[]> {
  try {
    const selectParam = canUseSelect ? `?$select=${subResourceName}` : '';
    const { data } = await api.get(`${parentCollectionPath}${selectParam}`);

    if (!data.Members || !Array.isArray(data.Members)) {
      // Check if this is a single resource with the sub-resource
      if (data['@odata.id'] && data[subResourceName]) {
        return [data['@odata.id']];
      }
      return [];
    }

    if (
      canUseSelect &&
      data.Members.length > 0 &&
      data.Members[0][subResourceName]
    ) {
      return data.Members.filter(
        (member: ResourceWithCollection) => member[subResourceName],
      ).map((member: ResourceWithCollection) => member['@odata.id']);
    }

    const checkPromises = data.Members.map(async (member: CollectionMember) => {
      try {
        const { data: parentData } = await api.get<ResourceWithCollection>(
          member['@odata.id'],
        );
        return parentData[subResourceName] ? member['@odata.id'] : null;
      } catch (error) {
        console.error(
          `Error checking ${member['@odata.id']} for ${subResourceName}:`,
          error,
        );
        return null;
      }
    });

    const results = await Promise.all(checkPromises);
    const foundParents = results.filter(
      (uri: string | null): uri is string => uri !== null,
    );
    return foundParents;
  } catch (error) {
    console.error(`Error discovering parents with ${subResourceName}:`, error);
    return [];
  }
}

/**
 * Fetches sub-resources from a single parent
 * Uses $expand if supported, falls back to individual fetches
 *
 * @param parentUri - Parent resource URI
 * @param subResourceName - Name of sub-resource collection
 * @param canExpand - Whether BMC supports $expand
 * @param queryClient - TanStack Query client for incremental updates
 * @param queryKey - Query key for cache updates
 * @returns Array of sub-resources
 */
async function fetchSubResourcesFromParent<T>(
  parentUri: string,
  subResourceName: string,
  canExpand: boolean,
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
): Promise<T[]> {
  const subResourcePath = `${parentUri}/${subResourceName}`;

  try {
    if (canExpand) {
      const { data } = await api.get(`${subResourcePath}?$expand=.($levels=1)`);

      if (data.Members && Array.isArray(data.Members)) {
        queryClient.setQueryData(queryKey, (oldData: T[] = []) => [
          ...oldData,
          ...data.Members,
        ]);
        return data.Members;
      }
    }

    const { data: collection } = await api.get(subResourcePath);

    if (!collection.Members || !Array.isArray(collection.Members)) {
      return [];
    }

    const memberPromises = collection.Members.map(
      async (member: CollectionMember) => {
        try {
          const { data: memberData } = await api.get<T>(member['@odata.id']);
          queryClient.setQueryData(queryKey, (oldData: T[] = []) => [
            ...oldData,
            memberData,
          ]);
          return memberData;
        } catch (error) {
          console.error(`Error fetching ${member['@odata.id']}:`, error);
          return null;
        }
      },
    );

    const members = await Promise.all(memberPromises);
    return members.filter((m: T | null): m is T => m !== null);
  } catch (error) {
    // Silently handle 404 - sub-resource may not exist on this parent
    if (
      (error as { response?: { status?: number } }).response?.status !== 404
    ) {
      console.error(
        `Error fetching ${subResourceName} from ${parentUri}:`,
        error,
      );
    }
    return [];
  }
}

/**
 * Deduplicates resources by @odata.id
 * Prevents duplicate entries when the same resource is referenced by multiple parents
 *
 * @param items - Array of resources to deduplicate
 * @returns Deduplicated array
 */
function deduplicateByOdataId<T>(items: T[]): T[] {
  if (items.length === 0) return items;

  const seen = new Set<string>();
  const deduplicated: T[] = [];

  for (const item of items) {
    const id = (item as any)['@odata.id'];
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    deduplicated.push(item);
  }

  return deduplicated;
}

/**
 * Fetches all sub-resources from all parent resources
 *
 * @param parentUris - Array of parent resource URIs
 * @param subResourceName - Name of sub-resource collection
 * @param canExpand - Whether BMC supports $expand
 * @param queryClient - TanStack Query client
 * @param queryKey - Query key for cache updates
 * @returns Array of all sub-resources (deduplicated by @odata.id)
 * @throws Error if all requests fail and no data is retrieved
 */
async function fetchAllSubResources<T>(
  parentUris: string[],
  subResourceName: string,
  canExpand: boolean,
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
): Promise<T[]> {
  queryClient.setQueryData(queryKey, []);

  const fetchPromises = parentUris.map((parentUri) =>
    fetchSubResourcesFromParent<T>(
      parentUri,
      subResourceName,
      canExpand,
      queryClient,
      queryKey,
    ),
  );

  const results = await Promise.all(fetchPromises);
  const allResources = results.flat();

  // Deduplicate by @odata.id
  const deduplicated = deduplicateByOdataId(allResources);

  // Final update with deduplicated data
  queryClient.setQueryData(queryKey, deduplicated);

  return deduplicated;
}

/**
 * TanStack Query hook for fetching all sub-resources from all parent resources
 *
 * This composable provides a generic pattern for fetching nested Redfish resources:
 * 1. Discovers which parent resources have the sub-resource collection
 * 2. Fetches sub-resources from each parent (with OData $expand if supported)
 * 3. Deduplicates results by @odata.id
 * 4. Provides incremental loading updates via TanStack Query cache
 *
 * @param parentCollectionPath - Path to parent collection (e.g., '/redfish/v1/Chassis')
 * @param subResourceName - Name of sub-resource collection (e.g., 'Sensors')
 * @param options - Additional query options
 * @returns TanStack Query result with all sub-resources
 *
 * @example
 * // Fetch all Sensors from all Chassis
 * const { data: sensors } = useAllSubResources('/redfish/v1/Chassis', 'Sensors');
 *
 * @example
 * // Fetch all Memory from all Systems
 * const { data: memory } = useAllSubResources('/redfish/v1/Systems', 'Memory');
 */
export function useAllSubResources<T = unknown>(
  parentCollectionPath: string,
  subResourceName: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  },
) {
  const queryClient = useQueryClient();
  const { data: serviceRoot } = useRedfishRoot();

  const canExpand = computed(() => supportsExpandQuery(serviceRoot.value));
  const canSelect = computed(() => supportsSelectQuery(serviceRoot.value));

  return useQuery({
    queryKey: [
      'redfish',
      'allSubResources',
      parentCollectionPath,
      subResourceName,
    ],
    queryFn: async () => {
      // Step 1: Discover which parents have the sub-resource
      const parentUris = await discoverParentsWithSubResource(
        parentCollectionPath,
        subResourceName,
        canSelect.value,
      );

      if (parentUris.length === 0) {
        return [];
      }

      // Step 2: Fetch sub-resources from all parents
      const queryKey = [
        'redfish',
        'allSubResources',
        parentCollectionPath,
        subResourceName,
      ];

      return fetchAllSubResources<T>(
        parentUris,
        subResourceName,
        canExpand.value,
        queryClient,
        queryKey,
      );
    },
    staleTime: options?.staleTime ?? 30000, // 30 seconds default
    gcTime: options?.gcTime ?? 300000, // 5 minutes default
    enabled: options?.enabled ?? true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Made with Bob
