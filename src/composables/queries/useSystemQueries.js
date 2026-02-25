import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { SystemStore } from '@/store/modules/HardwareStatus/SystemStore';
import i18n from '@/i18n';

// Query: Get System
export const useGetSystem = () => {
  const systemStore = SystemStore();

  return useQuery({
    queryKey: queryKeys.hardware.system(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1');
      const systemResponse = await api.get(
        `${response.data.Systems['@odata.id']}/system`,
      );
      const data = systemResponse.data;

      const system = {};
      system.assetTag = data.AssetTag;
      system.name = data.Name;
      system.health = data.Status?.Health;
      system.totalSystemMemoryGiB = data.MemorySummary?.TotalSystemMemoryGiB;
      system.id = data.Id;
      system.lampTest = data.Oem?.IBM?.LampTest;
      system.sysAttentionLed =
        data.Oem?.IBM?.PartitionSystemAttentionIndicator ||
        data.Oem?.IBM?.PlatformSystemAttentionIndicator;
      system.locationIndicatorActive = data.LocationIndicatorActive;
      system.model = data.Model;
      system.processorSummaryCoreCount = data.ProcessorSummary?.CoreCount;
      system.processorSummaryCount = data.ProcessorSummary?.Count;
      system.powerState = data.PowerState;
      system.serialNumber = data.SerialNumber;
      system.statusState = data.Status?.State;

      systemStore.systems = [system];
      return system;
    },
  });
};

// Mutation: Change Identify LED State
export const useChangeIdentifyLedState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ledState) => {
      await api.patch('/redfish/v1/Systems/system', {
        LocationIndicatorActive: ledState,
      });
      return ledState;
    },
    onSuccess: (ledState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      if (ledState) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, ledState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      console.log('error', error);
      if (ledState) {
        throw new Error(
          i18n.global.t('pageInventory.toast.errorEnableIdentifyLed'),
        );
      } else {
        throw new Error(
          i18n.global.t('pageInventory.toast.errorDisableIdentifyLed'),
        );
      }
    },
  });
};

// Mutation: Change System Attention LED State
export const useChangeSystemAttentionLedState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ledState) => {
      await api.patch('/redfish/v1/Systems/system', {
        Oem: {
          IBM: {
            PartitionSystemAttentionIndicator: ledState,
            PlatformSystemAttentionIndicator: ledState,
          },
        },
      });
      return ledState;
    },
    onSuccess: (ledState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      if (!ledState) {
        return i18n.global.t(
          'pageInventory.toast.successDisableSystemAttentionLed',
        );
      }
    },
    onError: (error, ledState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      console.log('error', error);
      if (!ledState) {
        throw new Error(
          i18n.global.t('pageInventory.toast.errorDisableSystemAttentionLed'),
        );
      }
    },
  });
};

// Mutation: Change Lamp Test State
export const useChangeLampTestState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lampTestState) => {
      await api.patch('/redfish/v1/Systems/system', {
        Oem: {
          IBM: {
            LampTest: lampTestState,
          },
        },
      });
      return lampTestState;
    },
    onSuccess: (lampTestState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      if (lampTestState) {
        return i18n.global.t('pageInventory.toast.successEnableLampTest');
      }
    },
    onError: (error, lampTestState) => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      console.log('error', error);
      if (lampTestState) {
        throw new Error(
          i18n.global.t('pageInventory.toast.errorEnableLampTest'),
        );
      } else {
        throw new Error(
          i18n.global.t('pageInventory.toast.errorDisableLampTest'),
        );
      }
    },
  });
};

// Mutation: Save Asset Tag
export const useSaveAssetTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetTag) => {
      await api.patch('/redfish/v1/Systems/system', assetTag);
      return assetTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.hardware.system());
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return i18n.global.t('pageOverview.toast.successSaveAssetTag');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageOverview.toast.errorSaveAssetTag'));
    },
  });
};

// Made with Bob
