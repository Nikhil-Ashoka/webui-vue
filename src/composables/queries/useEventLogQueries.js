import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api, { getResponseCount } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { EventLogStore } from '@/store/modules/Logs/EventLogStore';
import i18n from '@/i18n';

// Helper functions
const getHealthStatus = (events, loadedEvents) => {
  let status = loadedEvents ? 'OK' : '';
  for (const event of events) {
    if (event.severity === 'Critical' && !event.status) {
      status = 'Critical';
      break;
    } else if (event.severity === 'Warning' && !event.status) {
      status = 'Warning';
    }
  }
  return status;
};

const getHighPriorityEvents = (events) =>
  events.filter(({ severity }) => severity === 'Critical');

// Query: Get Event Log Data
export const useGetEventLogData = () => {
  const eventLogStore = EventLogStore();

  return useQuery({
    queryKey: queryKeys.logs.eventLogs(),
    queryFn: async () => {
      const { data: { Members = [] } = {} } = await api.get(
        '/redfish/v1/Systems/system/LogServices/EventLog/Entries',
      );

      const eventLogs = Members.map((log) => {
        const {
          Id,
          EventId,
          Severity,
          Created,
          EntryType,
          Message,
          Name,
          Modified,
          Resolution,
          Resolved,
          AdditionalDataURI,
        } = log;
        return {
          id: Id,
          eventId: EventId,
          severity: Severity,
          date: new Date(Created),
          type: EntryType,
          description: Message,
          name: Name,
          modifiedDate: new Date(Modified),
          resolution: Resolution,
          toggleDetails: false,
          rowSelected: false,
          uri: log['@odata.id'],
          filterByStatus: Resolved ? 'Resolved' : 'Unresolved',
          status: Resolved,
          additionalDataUri: AdditionalDataURI,
          actions: [
            {
              value: 'download',
            },
            {
              value: 'delete',
            },
          ],
        };
      });

      eventLogStore.eventlogs = eventLogs;
      eventLogStore.allEvents = eventLogs;
      eventLogStore.loadedEvents = true;

      return eventLogs;
    },
  });
};

// Query: Get CE Log Data
export const useGetCELogData = () => {
  const eventLogStore = EventLogStore();

  return useQuery({
    queryKey: [...queryKeys.logs.eventLogs(), 'ceLogs'],
    queryFn: async () => {
      const { data: { Members = [] } = {} } = await api.get(
        '/redfish/v1/Systems/system/LogServices/CELog/Entries',
      );

      const ceLogs = Members.map((log) => {
        const {
          Id,
          EventId,
          Severity,
          Created,
          EntryType,
          Message,
          Name,
          Modified,
          Resolution,
          Resolved,
          AdditionalDataURI,
        } = log;
        return {
          id: Id,
          eventId: EventId,
          severity: Severity,
          date: new Date(Created),
          type: EntryType,
          description: Message,
          name: Name,
          modifiedDate: new Date(Modified),
          resolution: Resolution,
          toggleDetails: false,
          rowSelected: false,
          uri: log['@odata.id'],
          filterByStatus: Resolved ? 'Resolved' : 'Unresolved',
          status: Resolved,
          additionalDataUri: AdditionalDataURI,
          actions: [
            {
              value: 'download',
            },
            {
              value: 'delete',
            },
          ],
        };
      });

      eventLogStore.ceLogs = ceLogs;
      return ceLogs;
    },
  });
};

// Mutation: Delete Event Logs
export const useDeleteEventLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uris) => {
      const promises = uris.map((uri) =>
        api.delete(uri).catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.logs.eventLogs());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageEventLogs.toast.errorDeleteLogs', {
                count: errorCount,
              })
            : i18n.global.t('pageEventLogs.toast.successDeleteLogs', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Resolve Event Logs
export const useResolveEventLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uris) => {
      const promises = uris.map((uri) =>
        api.patch(uri, { Resolved: true }).catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.logs.eventLogs());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageEventLogs.toast.errorResolveLogs', {
                count: errorCount,
              })
            : i18n.global.t('pageEventLogs.toast.successResolveLogs', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Unresolve Event Logs
export const useUnresolveEventLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uris) => {
      const promises = uris.map((uri) =>
        api.patch(uri, { Resolved: false }).catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.logs.eventLogs());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageEventLogs.toast.errorUnresolveLogs', {
                count: errorCount,
              })
            : i18n.global.t('pageEventLogs.toast.successUnresolveLogs', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Download Event Log
export const useDownloadEventLog = () => {
  return useMutation({
    mutationFn: async (additionalDataUri) => {
      const response = await api.get(additionalDataUri, {
        responseType: 'blob',
      });
      return response.data;
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageEventLogs.toast.errorDownloadEventLog'),
      );
    },
  });
};

// Export helper functions for use in components
export { getHealthStatus, getHighPriorityEvents };

// Made with Bob
