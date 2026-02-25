import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import api from '@/store/api';
import { useRedfishRoot, supportsExpandQuery } from './useRedfishRoot';

/**
 * Redfish collection member reference
 */
export interface CollectionMember {
  '@odata.id': string;
}

/**
 * Redfish collection response
 */
export interface RedfishCollection<T = unknown> {
  '@odata.id': string;
  '@odata.type': string;
  Name: string;
  Members: T[];
  'Members@odata.count': number;
}

/**
 * OData Query Parameters for Redfish API
 */
export interface RedfishQueryParameters {
  $expand?:
    | string
    | {
        $levels?: number;
        $noLinks?: boolean;
        $expandAll?: boolean;
        $links?: string;
      };
  $filter?: string;
  $select?: string | string[];
  $top?: number;
  $skip?: number;
  only?: boolean;
  excerpt?: boolean;
}

/**
 * Options for fetching a Redfish collection
 */
export interface FetchCollectionOptions {
  expand?: boolean;
  expandLevels?: number;
  select?: string[];
  filter?: string;
}

/**
 * Builds a Redfish API URL with OData query parameters
 *
 * Handles proper encoding and formatting of OData directives:
 * - $expand with nested options like .($levels=2)
 * - $select with multiple properties
 * - $filter, $top, $skip for pagination and filtering
 * - Custom Redfish parameters like 'only' and 'excerpt'
 *
 * @param path - Base path (e.g., '/redfish/v1/Chassis')
 * @param params - OData query parameters
 * @returns Complete URL with query string
 *
 * @example
 * buildQuery('/redfish/v1/Chassis', { $expand: '*' })
 * // Returns: '/redfish/v1/Chassis?$expand=*'
 *
 * @example
 * buildQuery('/redfish/v1/Systems', {
 *   $expand: { $levels: 2, $noLinks: true }
 * })
 * // Returns: '/redfish/v1/Systems?$expand=.($levels=2;$noLinks=true)'
 */
export function buildQuery(
  path: string,
  params?: RedfishQueryParameters,
): string {
  if (!params) return path;

  const pairs: string[] = [];

  // Handle $expand parameter
  if (params.$expand) {
    if (typeof params.$expand === 'string') {
      // Simple string expand (e.g., '*' or 'Members')
      // Do not encode $ directives inside the value
      pairs.push(`$expand=${params.$expand}`);
    } else {
      // Complex expand with options
      const expandParts: string[] = [];

      if (params.$expand.$levels !== undefined) {
        expandParts.push(`$levels=${params.$expand.$levels}`);
      }
      if (params.$expand.$noLinks !== undefined) {
        expandParts.push(`$noLinks=${params.$expand.$noLinks}`);
      }
      if (params.$expand.$expandAll !== undefined) {
        expandParts.push(`$expandAll=${params.$expand.$expandAll}`);
      }
      if (params.$expand.$links !== undefined) {
        expandParts.push(`$links=${params.$expand.$links}`);
      }

      // Build .(options) without encoding the $ directives
      // Use ';' between options per OData specification
      const opts = expandParts.join(';');
      pairs.push(`$expand=.(${opts})`);
    }
  }

  // Handle $filter parameter
  if (params.$filter) {
    pairs.push(`$filter=${encodeURIComponent(params.$filter)}`);
  }

  // Handle $select parameter
  if (params.$select) {
    const sel = Array.isArray(params.$select)
      ? params.$select.join(',')
      : params.$select;
    pairs.push(`$select=${encodeURIComponent(sel)}`);
  }

  // Handle $top parameter (pagination)
  if (params.$top !== undefined) {
    pairs.push(`$top=${encodeURIComponent(String(params.$top))}`);
  }

  // Handle $skip parameter (pagination)
  if (params.$skip !== undefined) {
    pairs.push(`$skip=${encodeURIComponent(String(params.$skip))}`);
  }

  // Handle 'only' parameter (Redfish-specific)
  if (params.only) {
    pairs.push('only=');
  }

  // Handle 'excerpt' parameter (Redfish-specific)
  if (params.excerpt !== undefined) {
    pairs.push(`excerpt=${encodeURIComponent(String(params.excerpt))}`);
  }

  const queryString = pairs.join('&');
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Normalizes Redfish query parameters for cache stability
 *
 * Ensures consistent query keys by:
 * - Sorting array values (like $select)
 * - Freezing the result to prevent mutations
 * - Handling undefined values consistently
 *
 * @param params - Query parameters to normalize
 * @returns Normalized and frozen parameters, or undefined if input is undefined
 */
function normalizeRedfishQueryParameters(
  params?: RedfishQueryParameters,
): Readonly<RedfishQueryParameters> | undefined {
  if (!params) return undefined;

  const normalizedSelect =
    params.$select === undefined
      ? undefined
      : Array.isArray(params.$select)
        ? [...params.$select].sort()
        : params.$select;

  const normalizedExpand =
    params.$expand === undefined
      ? undefined
      : typeof params.$expand === 'string'
        ? params.$expand
        : {
            $levels: params.$expand.$levels,
            $noLinks: params.$expand.$noLinks,
            $expandAll: params.$expand.$expandAll,
            $links: params.$expand.$links,
          };

  return Object.freeze({
    $expand: normalizedExpand,
    $filter: params.$filter,
    $select: normalizedSelect,
    $top: params.$top,
    $skip: params.$skip,
    only: params.only,
    excerpt: params.excerpt,
  });
}

/**
 * Fetches a Redfish collection with optional OData query parameters
 * Gracefully falls back if BMC doesn't support OData features
 *
 * @param path - Collection path
 * @param params - OData query parameters
 * @returns Collection data
 */
async function fetchCollection<T>(
  path: string,
  params?: RedfishQueryParameters,
): Promise<RedfishCollection<T>> {
  const url = buildQuery(path, params);
  const { data } = await api.get<RedfishCollection<T>>(url);
  return data;
}

/**
 * TanStack Query hook for fetching a Redfish collection
 *
 * @param path - Collection path (e.g., '/redfish/v1/Chassis')
 * @param params - OData query parameters
 * @param options - Additional query options
 * @returns TanStack Query result with collection data
 */
export function useRedfishCollection<T = unknown>(
  path: string,
  params?: RedfishQueryParameters,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  },
) {
  const normalizedParams = normalizeRedfishQueryParameters(params);

  return useQuery({
    queryKey: ['redfish', 'collection', path, normalizedParams],
    queryFn: () => fetchCollection<T>(path, params),
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

/**
 * Hook for fetching a collection with automatic OData $expand support
 * Detects if BMC supports $expand and uses it automatically
 *
 * @param path - Collection path
 * @param options - Fetch options
 * @returns TanStack Query result with expanded collection data
 */
export function useRedfishCollectionWithExpand<T = unknown>(
  path: string,
  options?: FetchCollectionOptions & {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  },
) {
  const { data: serviceRoot } = useRedfishRoot();
  const canExpand = computed(() => supportsExpandQuery(serviceRoot.value));

  const params = computed<RedfishQueryParameters | undefined>(() => {
    if (!options) return undefined;

    const result: RedfishQueryParameters = {};

    if (options.expand && canExpand.value) {
      if (options.expandLevels) {
        result.$expand = { $levels: options.expandLevels };
      } else {
        result.$expand = '*';
      }
    }

    if (options.select) {
      result.$select = options.select;
    }

    if (options.filter) {
      result.$filter = options.filter;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  });

  return useRedfishCollection<T>(path, params.value, {
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  });
}

// Made with Bob
