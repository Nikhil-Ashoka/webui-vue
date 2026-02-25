import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { GlobalStore, serverStateMapper } from '@/store/modules/GlobalStore';

// Query: Get BMC Time
export const useGetBmcTime = () => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.bmcTime(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/Managers/bmc');
      const bmcDateTime = response.data.DateTime;
      const date = new Date(bmcDateTime);
      globalStore.bmcTime = date;
      return date;
    },
  });
};

// Query: Get Service Login
export const useGetServiceLogin = () => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.serviceLogin(),
    queryFn: async () => {
      const response = await api.get(
        '/redfish/v1/AccountService/Accounts/service',
      );
      globalStore.acfInstalled = response.data.Oem.IBM.ACF.ACFInstalled;
      globalStore.expirationDate = response.data.Oem.IBM.ACF.ExpirationDate;
      globalStore.isServiceLoginEnabled = response.data.Enabled;
      return response.data;
    },
  });
};

// Query: Get Current User
export const useGetCurrentUser = (username) => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.currentUser(username),
    queryFn: async () => {
      try {
        const { data } = await api.get(
          `/redfish/v1/AccountService/Accounts/${username}`,
        );
        globalStore.currentUser = data;
        localStorage.setItem('storedCurrentUser', JSON.stringify(data));
        return data;
      } catch (error) {
        console.log(error);
        // Fallback to account service
        const response = await api.get('/redfish/v1/AccountService');
        if (response.data?.LDAP?.RemoteRoleMapping?.length > 0) {
          return response.data;
        }
        throw error;
      }
    },
    enabled: !!username,
  });
};

// Query: Get HMC Managed
export const useGetHmcManaged = () => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.hmcManaged(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );
      const hmcManaged = data.RegistryEntries.Attributes.filter(
        (Attribute) => Attribute.AttributeName == 'pvm_hmc_managed',
      );
      const hmcManagedValue = hmcManaged[0].CurrentValue;
      globalStore.hmcManaged = hmcManagedValue;
      localStorage.setItem('storedHmcManagedValue', hmcManagedValue);
      return hmcManagedValue;
    },
  });
};

// Query: Get Safe Mode
export const useGetSafeMode = () => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.safeMode(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Systems/system/Processors?$expand=.($levels=2)',
      );
      let safeMode = false;
      for (let member of data.Members) {
        if (
          member?.Throttled &&
          member?.ThrottleCauses.includes('ManagementDetectedFault')
        ) {
          safeMode = true;
          break;
        }
      }
      globalStore.safeMode = safeMode;
      return safeMode;
    },
  });
};

// Query: Get System Info
export const useGetSystemInfo = () => {
  const globalStore = GlobalStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.global.systemInfo(),
    queryFn: async () => {
      const {
        data: {
          AssetTag,
          Model,
          PowerState,
          SerialNumber,
          Status: { State } = {},
        } = {},
      } = await api.get('/redfish/v1/Systems/system');

      globalStore.assetTag = AssetTag;
      globalStore.serialNumber = SerialNumber;
      globalStore.modelType = Model;
      localStorage.setItem('storedModelType', Model);

      if (State === 'Quiesced' || State === 'InTest') {
        globalStore.serverStatus = serverStateMapper(State);
      } else {
        globalStore.serverStatus = serverStateMapper(PowerState);
      }

      // Trigger safe mode query
      queryClient.invalidateQueries(queryKeys.global.safeMode());

      return {
        AssetTag,
        Model,
        PowerState,
        SerialNumber,
        State,
      };
    },
  });
};

// Query: Get Boot Progress
export const useGetBootProgress = () => {
  const globalStore = GlobalStore();

  return useQuery({
    queryKey: queryKeys.global.bootProgress(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');
      const bootProgress = data.BootProgress.LastState;
      globalStore.bootProgress = bootProgress;
      return bootProgress;
    },
  });
};

// Query: Get Current Task
export const useGetCurrentTask = (task) => {
  return useQuery({
    queryKey: queryKeys.global.currentTask(task),
    queryFn: async () => {
      const { data } = await api.get(task);
      return data;
    },
    enabled: !!task,
  });
};

// Mutation: Set UTC Time
export const useSetUtcTime = () => {
  const globalStore = GlobalStore();

  return useMutation({
    mutationFn: async (isUtcDisplay) => {
      globalStore.isUtcDisplay = isUtcDisplay;
      return isUtcDisplay;
    },
  });
};

// Made with Bob
