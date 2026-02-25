import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api, { getResponseCount } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { DumpsStore } from '@/store/modules/Logs/DumpsStore';
import { REGEX_MAPPINGS } from '@/utilities/GlobalConstants';
import i18n from '@/i18n';

// Helper function to get BMC dump entries
const getBmcDumpEntries = async () => {
  const root = await api.get('/redfish/v1/');
  const managers = await api.get(root.data.Managers['@odata.id']);
  const bmc = await api.get(`${managers.data['@odata.id']}/bmc`);
  const logServices = await api.get(bmc.data.LogServices['@odata.id']);
  const dump = await api.get(`${logServices.data['@odata.id']}/Dump`);
  const entries = await api.get(dump.data.Entries['@odata.id']);
  return entries;
};

// Helper function to get System dump entries
const getSystemDumpEntries = async () => {
  const root = await api.get('/redfish/v1/');
  const systems = await api.get(root.data.Systems['@odata.id']);
  const system = await api.get(`${systems.data['@odata.id']}/system`);
  const logServices = await api.get(system.data.LogServices['@odata.id']);
  const dump = await api.get(`${logServices.data['@odata.id']}/Dump`);
  const entries = await api.get(dump.data.Entries['@odata.id']);
  return entries;
};

// Query: Get All Dumps
export const useGetAllDumps = () => {
  const dumpsStore = DumpsStore();

  return useQuery({
    queryKey: queryKeys.logs.dumps(),
    queryFn: async () => {
      const [bmcResponse, systemResponse] = await api.all([
        getBmcDumpEntries(),
        getSystemDumpEntries(),
      ]);

      const bmcDumpEntries = bmcResponse.data?.Members || [];
      const systemDumpEntries = systemResponse.data?.Members || [];
      const allDumps = [...bmcDumpEntries, ...systemDumpEntries];

      const dumps = allDumps.map((dump) => ({
        data: dump.AdditionalDataURI,
        dateTime: new Date(dump.Created),
        dumpType:
          dump.Name === 'System Dump Entry'
            ? dump.Id.startsWith('0')
              ? 'Hardware Dump Entry'
              : dump.Id.startsWith('2')
                ? 'Hostboot Dump Entry'
                : dump.Id.startsWith('3')
                  ? 'SBE Dump Entry'
                  : dump.Id.startsWith('4')
                    ? 'OCMB SBE Dump Entry'
                    : dump.Id.startsWith('A')
                      ? 'System Dump Entry'
                      : dump.Id.startsWith('B')
                        ? 'Resource Dump Entry'
                        : dump.Name
            : dump.Name,
        id: dump.Id,
        location: dump['@odata.id'],
        size: dump.AdditionalDataSizeBytes,
        actions: [
          {
            value: 'download',
          },
          {
            value: 'delete',
          },
        ],
      }));

      dumpsStore.allDumps = dumps;
      return dumps;
    },
  });
};

// Query: Get Task Service Tasks
export const useGetTasks = () => {
  return useQuery({
    queryKey: [...queryKeys.logs.dumps(), 'tasks'],
    queryFn: async () => {
      const response = await api.get('/redfish/v1/TaskService/Tasks');
      return response.data;
    },
  });
};

// Mutation: Create BMC Dump
export const useCreateBmcDump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dumpType) => {
      await api.post(
        '/redfish/v1/Managers/bmc/LogServices/Dump/Actions/LogService.CollectDiagnosticData',
        {
          DiagnosticDataType: 'Manager',
        },
      );
      return dumpType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.logs.dumps());
      return i18n.global.t('pageDumps.toast.successStartBmcDump');
    },
    onError: (error, dumpType) => {
      console.log(error);
      const errorMsg =
        error.response?.data?.error?.['@Message.ExtendedInfo']?.[0]?.MessageId;

      if (REGEX_MAPPINGS.resourceInUse.test(errorMsg)) {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartDumpAnotherInProgress', {
            dump: dumpType,
          }),
        );
      } else if (REGEX_MAPPINGS.resourceInStandby.test(errorMsg)) {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartDumpSystemNotReady', {
            dump: dumpType,
          }),
        );
      } else {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartBmcDump', {
            dump: dumpType,
          }),
        );
      }
    },
  });
};

// Mutation: Create System Dump
export const useCreateSystemDump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dumpType) => {
      await api.post(
        '/redfish/v1/Systems/system/LogServices/Dump/Actions/LogService.CollectDiagnosticData',
        {
          DiagnosticDataType: 'OEM',
          OEMDiagnosticDataType: dumpType,
        },
      );
      return dumpType;
    },
    onSuccess: (dumpType) => {
      queryClient.invalidateQueries(queryKeys.logs.dumps());
      return i18n.global.t('pageDumps.toast.successStartDump', {
        dump: dumpType,
      });
    },
    onError: (error, dumpType) => {
      console.log(error);
      const errorMsg =
        error.response?.data?.error?.['@Message.ExtendedInfo']?.[0]?.MessageId;

      if (REGEX_MAPPINGS.resourceInUse.test(errorMsg)) {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartDumpAnotherInProgress', {
            dump: dumpType,
          }),
        );
      } else if (REGEX_MAPPINGS.resourceInStandby.test(errorMsg)) {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartDumpSystemNotReady', {
            dump: dumpType,
          }),
        );
      } else {
        throw new Error(
          i18n.global.t('pageDumps.toast.errorStartDump', {
            dump: dumpType,
          }),
        );
      }
    },
  });
};

// Mutation: Delete Dumps
export const useDeleteDumps = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dumps) => {
      const promises = dumps.map((dump) =>
        api.delete(dump.location).catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.logs.dumps());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageDumps.toast.errorDeleteDumps', {
                count: errorCount,
              })
            : i18n.global.t('pageDumps.toast.successDeleteDumps', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Download Dump
export const useDownloadDump = () => {
  return useMutation({
    mutationFn: async (dumpUri) => {
      const response = await api.get(dumpUri, {
        responseType: 'blob',
      });
      return response.data;
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageDumps.toast.errorDownloadDump'));
    },
  });
};

// Mutation: Offload Dump to URI
export const useOffloadDump = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dumpId, uri }) => {
      await api.post(
        `/redfish/v1/Systems/system/LogServices/Dump/Entries/${dumpId}/Actions/LogEntry.OffloadToURI`,
        {
          URI: uri,
        },
      );
      return dumpId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.logs.dumps());
      return i18n.global.t('pageDumps.toast.successOffloadDump');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageDumps.toast.errorOffloadDump'));
    },
  });
};

// Made with Bob
