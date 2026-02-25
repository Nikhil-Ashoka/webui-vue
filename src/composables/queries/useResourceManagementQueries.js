import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from '@/api/queryKeys';
import api from '@/api';
import i18n from '@/i18n';
import { PowerControlStore } from '@/store/modules/ResourceManagement/PowerControlStore';
import { ResourceMemoryStore } from '@/store/modules/ResourceManagement/ResourceMemoryStore';
import { SystemParametersStore } from '@/store/modules/ResourceManagement/SystemParametersStore';
import { FieldCoreOverrideStore } from '@/store/modules/ResourceManagement/FieldCoreOverrideStore';
import { LicenseStore } from '@/store/modules/ResourceManagement/LicenseStore';

// ============================================================================
// POWER CONTROL QUERIES
// ============================================================================

/**
 * Get power control data (consumption, mode, cap)
 */
export const useGetPowerControl = () => {
  const powerControlStore = PowerControlStore();

  return useQuery({
    queryKey: [...queryKeys.resources.powerControl(), 'data'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Chassis/chassis/EnvironmentMetrics',
      );

      // Update Pinia store for backward compatibility
      powerControlStore.powerConsumption = data.PowerWatts?.Reading;
      powerControlStore.powerControlMode = data.PowerLimitWatts?.ControlMode;
      powerControlStore.powerCap = data.PowerLimitWatts?.SetPoint;
      powerControlStore.powerCapMin = data.PowerLimitWatts?.AllowableMin;
      powerControlStore.powerCapMax = data.PowerLimitWatts?.AllowableMax;

      return {
        powerConsumption: data.PowerWatts?.Reading,
        powerControlMode: data.PowerLimitWatts?.ControlMode,
        powerCap: data.PowerLimitWatts?.SetPoint,
        powerCapMin: data.PowerLimitWatts?.AllowableMin,
        powerCapMax: data.PowerLimitWatts?.AllowableMax,
      };
    },
  });
};

/**
 * Set power control mode and cap
 */
export const useSetPowerControlAndCap = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ powerControlMode, powerCap }) => {
      await api.patch('/redfish/v1/Chassis/chassis/EnvironmentMetrics', {
        PowerLimitWatts: {
          ControlMode: powerControlMode,
          SetPoint: powerCap,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.powerControl(),
        'data',
      ]);
      return i18n.global.t(
        'pageServerPowerOperations.toast.successSaveSettings',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Get power performance mode
 */
export const useGetPowerPerformanceMode = () => {
  const powerControlStore = PowerControlStore();

  return useQuery({
    queryKey: [...queryKeys.resources.powerControl(), 'performanceMode'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');

      // Update Pinia store
      powerControlStore.powerPerformanceMode = data.PowerMode;
      powerControlStore.powerPerformanceModeValues =
        data['PowerMode@Redfish.AllowableValues'];

      return {
        powerPerformanceMode: data.PowerMode,
        powerPerformanceModeValues: data['PowerMode@Redfish.AllowableValues'],
      };
    },
  });
};

/**
 * Set power performance mode
 */
export const useSetPowerPerformanceMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (powerPerformanceMode) => {
      await api.patch('/redfish/v1/Systems/system', {
        PowerMode: powerPerformanceMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.powerControl(),
        'performanceMode',
      ]);
      return i18n.global.t('pagePower.toast.successPowerPerformanceModes');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePower.toast.errorPowerPerformanceModes'),
      );
    },
  });
};

/**
 * Get idle power saver data
 */
export const useGetIdlePowerSaverData = () => {
  const powerControlStore = PowerControlStore();

  return useQuery({
    queryKey: [...queryKeys.resources.powerControl(), 'idlePowerSaver'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');

      const idlePowerSaverData = data.IdlePowerSaver;
      powerControlStore.idlePowerSaverData = idlePowerSaverData;

      return idlePowerSaverData;
    },
  });
};

/**
 * Set idle power saver data
 */
export const useSetIdlePowerSaverData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idlePowerSaverData) => {
      await api.patch('/redfish/v1/Systems/system', {
        IdlePowerSaver: {
          Enabled: idlePowerSaverData.isIdlePowerSaverEnabled,
          EnterDwellTimeSeconds: idlePowerSaverData.enterDwellTimeSeconds,
          ExitDwellTimeSeconds: idlePowerSaverData.exitDwellTimeSeconds,
          EnterUtilizationPercent: idlePowerSaverData.enterUtilizationPercent,
          ExitUtilizationPercent: idlePowerSaverData.exitUtilizationPercent,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.powerControl(),
        'idlePowerSaver',
      ]);
      return i18n.global.t('pagePower.toast.successIdlePower');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pagePower.toast.errorIdlePower'));
    },
  });
};

/**
 * Reset idle power saver
 */
export const useResetIdlePowerSaver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system', {
        IdlePowerSaver: {
          ExitUtilizationPercent: 0,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.powerControl(),
        'idlePowerSaver',
      ]);
      return i18n.global.t('pagePower.toast.successIdlePowerReset');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pagePower.toast.errorIdlePowerReset'));
    },
  });
};

/**
 * Set idle power saver enable/disable
 */
export const useSetIdlePowerSaverEnable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idlePowerSaver) => {
      await api.patch('/redfish/v1/Systems/system', {
        IdlePowerSaver: {
          Enabled: idlePowerSaver,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.powerControl(),
        'idlePowerSaver',
      ]);
      return i18n.global.t('pagePower.toast.successPowerPerformanceModes');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePower.toast.errorPowerPerformanceModes'),
      );
    },
  });
};

// ============================================================================
// RESOURCE MEMORY QUERIES
// ============================================================================

/**
 * Get memory size options from BIOS registry
 */
export const useGetMemorySizeOptions = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'sizeOptions'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const memorySize = data.RegistryEntries.Attributes.find(
        (attr) => attr.AttributeName === 'hb_memory_region_size',
      );

      const memorySizeOptions = memorySize.Value.map(
        ({ ValueName }) => ValueName,
      );

      resourceMemoryStore.logicalMemorySizeOptions = memorySizeOptions;
      return memorySizeOptions;
    },
  });
};

/**
 * Get logical memory size
 */
export const useGetLogicalMemorySize = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'logicalSize'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios/');

      const logicalMemorySize = data.Attributes.hb_memory_region_size;
      resourceMemoryStore.logicalMemorySize = logicalMemorySize;

      return logicalMemorySize;
    },
  });
};

/**
 * Get HMC managed status
 */
export const useGetHmcManaged = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'hmcManaged'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const hmcManaged = data.RegistryEntries.Attributes.find(
        (attr) => attr.AttributeName === 'pvm_hmc_managed',
      );

      const hmcManagedValue = hmcManaged.CurrentValue;
      resourceMemoryStore.hmcManaged = hmcManagedValue;

      return hmcManagedValue;
    },
  });
};

/**
 * Get IO adapter capacity
 */
export const useGetIoAdapterCapacity = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'ioAdapterCapacity'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const { Attributes } = data.RegistryEntries;

      const ioAdapterCapacity = Attributes.find(
        (attr) => attr.AttributeName === 'hb_ioadapter_enlarged_capacity',
      );
      const ioEnlargedAdapterCapacity = ioAdapterCapacity.CurrentValue;
      resourceMemoryStore.ioAdapterCapacity = ioEnlargedAdapterCapacity;

      const dynamicIoDrawerCapacity = Attributes.find(
        (attr) =>
          attr.AttributeName === 'hb_storage_preallocation_for_drawer_attach',
      );
      if (dynamicIoDrawerCapacity) {
        resourceMemoryStore.dynamicIoDrawerCapacity =
          dynamicIoDrawerCapacity.CurrentValue;
        resourceMemoryStore.dynamicIoDrawerDefaultCapacity =
          dynamicIoDrawerCapacity.UpperBound;
      }

      return {
        ioAdapterCapacity: ioEnlargedAdapterCapacity,
        dynamicIoDrawerCapacity: dynamicIoDrawerCapacity?.CurrentValue,
        dynamicIoDrawerDefaultCapacity: dynamicIoDrawerCapacity?.UpperBound,
      };
    },
  });
};

/**
 * Get max number of huge pages
 */
export const useGetMaxNumHugePages = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'maxHugePages'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const maxNumberHugePages = data.RegistryEntries.Attributes.find(
        (attr) => attr.AttributeName === 'hb_max_number_huge_pages',
      );

      const maxNumberHugePagesLimit = maxNumberHugePages.CurrentValue;
      resourceMemoryStore.maxNumHugePages = maxNumberHugePagesLimit;

      return maxNumberHugePagesLimit;
    },
  });
};

/**
 * Get number of huge pages
 */
export const useGetNumHugePages = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'numHugePages'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const numberHugePages = data.RegistryEntries.Attributes.find(
        (attr) => attr.AttributeName === 'hb_number_huge_pages',
      );

      const systemMemoryPageSetup = numberHugePages.CurrentValue;
      resourceMemoryStore.numHugePages = systemMemoryPageSetup;

      return systemMemoryPageSetup;
    },
  });
};

/**
 * Get active memory mirroring mode
 */
export const useGetActiveMemoryMirroring = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [...queryKeys.resources.resourceMemory(), 'memoryMirroring'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const activeMemoryMirroringMode = data.RegistryEntries.Attributes.find(
        (attr) => attr.AttributeName === 'hb_memory_mirror_mode',
      );

      if (activeMemoryMirroringMode) {
        const mirroringModeValue =
          activeMemoryMirroringMode.CurrentValue === 'Enabled';
        resourceMemoryStore.memoryMirroringMode = mirroringModeValue;
        return mirroringModeValue;
      }

      return null;
    },
  });
};

/**
 * Save active memory mirroring mode
 */
export const useSaveActiveMemoryMirroringMode = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async (activeMemoryMirroringModeValue) => {
      const updatedMirroringModeValue = activeMemoryMirroringModeValue
        ? 'Enabled'
        : 'Disabled';

      resourceMemoryStore.memoryMirroringMode = activeMemoryMirroringModeValue;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_memory_mirror_mode: updatedMirroringModeValue },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'memoryMirroring',
      ]);
      return i18n.global.t(
        'pageMemory.toast.successSavingActiveMemoryMirroringMode',
      );
    },
    onError: (error, activeMemoryMirroringModeValue) => {
      console.log(error);
      resourceMemoryStore.memoryMirroringMode = !activeMemoryMirroringModeValue;
      throw new Error(
        i18n.global.t('pageMemory.toast.errorSavingActiveMemoryMirroringMode'),
      );
    },
  });
};

/**
 * Get predictive dynamic memory deallocation
 */
export const useGetPredictiveDynamicMemoryDeallocation = () => {
  const resourceMemoryStore = ResourceMemoryStore();

  return useQuery({
    queryKey: [
      ...queryKeys.resources.resourceMemory(),
      'predictiveDeallocation',
    ],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const predictiveDynamicMemoryDeallocation =
        data.RegistryEntries.Attributes.find(
          (attr) => attr.AttributeName === 'hb_predictive_mem_guard',
        );

      if (predictiveDynamicMemoryDeallocation) {
        const predictiveMemValue =
          predictiveDynamicMemoryDeallocation.CurrentValue === 'Enabled';
        resourceMemoryStore.predictiveDynamicMemoryDeallocation =
          predictiveMemValue;
        return predictiveMemValue;
      }

      return null;
    },
  });
};

/**
 * Save predictive dynamic memory deallocation
 */
export const useSavePredictiveDynamicMemoryDeallocation = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async (activePredictiveDynamicMemoryDeallocationValue) => {
      const updatedMirroringModeValue =
        activePredictiveDynamicMemoryDeallocationValue ? 'Enabled' : 'Disabled';

      resourceMemoryStore.predictiveDynamicMemoryDeallocation =
        activePredictiveDynamicMemoryDeallocationValue;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_predictive_mem_guard: updatedMirroringModeValue },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'predictiveDeallocation',
      ]);
      return i18n.global.t(
        'pageMemory.toast.successSavingPredictiveDynamicMemoryDeallocation',
      );
    },
    onError: (error, activePredictiveDynamicMemoryDeallocationValue) => {
      console.log(error);
      resourceMemoryStore.predictiveDynamicMemoryDeallocation =
        !activePredictiveDynamicMemoryDeallocationValue;
      throw new Error(
        i18n.global.t(
          'pageMemory.toast.errorSavingPredictiveDynamicMemoryDeallocation',
        ),
      );
    },
  });
};

/**
 * Save page setup
 */
export const useSavePageSetup = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_number_huge_pages: resourceMemoryStore.numHugePages,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'numHugePages',
      ]);
      return i18n.global.t('pageMemory.toast.successSavingPageSetup');
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(i18n.global.t('pageMemory.toast.errorSavingPageSetup'));
    },
  });
};

/**
 * Save enlarged capacity
 */
export const useSaveEnlargedCapacity = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_ioadapter_enlarged_capacity: resourceMemoryStore.ioAdapterCapacity,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'ioAdapterCapacity',
      ]);
      return i18n.global.t(
        'pageMemory.toast.successSavingAdapterEnlargedCapacity',
      );
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t('pageMemory.toast.errorSavingAdapterEnlargedCapacity'),
      );
    },
  });
};

/**
 * Save dynamic capacity
 */
export const useSaveDynamicCapacity = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_storage_preallocation_for_drawer_attach:
            resourceMemoryStore.dynamicIoDrawerCapacity,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'ioAdapterCapacity',
      ]);
      return i18n.global.t(
        'pageMemory.toast.successSavingAdapterDynamicCapacity',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageMemory.toast.errorSavingAdapterDynamicCapacity'),
      );
    },
  });
};

/**
 * Save logical memory size settings
 */
export const useSaveMemorySettings = () => {
  const queryClient = useQueryClient();
  const resourceMemoryStore = ResourceMemoryStore();

  return useMutation({
    mutationFn: async (logicalMemorySize) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_memory_region_size: logicalMemorySize },
      });

      resourceMemoryStore.logicalMemorySize = logicalMemorySize;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.resourceMemory(),
        'logicalSize',
      ]);
      return i18n.global.t('pageMemory.toast.successSavingLogicalMemory');
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t('pageMemory.toast.errorSavingLogicalMemory'),
      );
    },
  });
};

// ============================================================================
// SYSTEM PARAMETERS QUERIES
// ============================================================================

/**
 * Get BIOS attributes registry for system parameters
 */
export const useGetBiosAttributesRegistry = () => {
  const systemParametersStore = SystemParametersStore();

  return useQuery({
    queryKey: queryKeys.resources.systemParameters(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const { Attributes } = data.RegistryEntries;
      systemParametersStore.registryEntries = data.RegistryEntries;

      // Aggressive Prefetch
      const aggressivePrefetch = Attributes.find(
        (attr) => attr.AttributeName === 'hb_proc_favor_aggressive_prefetch',
      );
      systemParametersStore.aggressivePrefetch =
        aggressivePrefetch?.CurrentValue === 'Enabled';

      // RPD Policy
      const rpdPolicy = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_policy',
      );
      systemParametersStore.rpdPolicy = rpdPolicy?.CurrentValue;
      systemParametersStore.pvmRpdPolicy = rpdPolicy?.CurrentValue;

      const rpdPolicyCurr = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_feature_current',
      );
      systemParametersStore.rpdPolicyCurrent = rpdPolicyCurr?.CurrentValue;

      // RPD Feature
      const rpdFeature = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_feature',
      );
      systemParametersStore.rpdFeature = rpdFeature?.CurrentValue;

      // Immediate Test Requested
      const immediateTestRequested = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_immediate_test',
      );
      systemParametersStore.immediateTestRequested =
        immediateTestRequested?.CurrentValue === 'Enabled';

      // Guard On Error
      const guardOnError = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_guard_policy',
      );
      systemParametersStore.guardOnError =
        guardOnError?.CurrentValue === 'Enabled';

      // RPD Policy Options
      const rpdPolicyOps = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_policy',
      );
      systemParametersStore.rpdPolicyOptions = rpdPolicyOps?.Value.map(
        ({ ValueName }) => ValueName,
      );

      // RPD Feature Options
      const rpdFeatureOps = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_feature',
      );
      systemParametersStore.rpdFeatureOptions = rpdFeatureOps?.Value.map(
        ({ ValueName }) => ValueName,
      );

      // RPD Scheduled Run
      const rpdScheduledRun = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_scheduled_tod',
      );
      if (rpdScheduledRun) {
        const hours = Math.floor(rpdScheduledRun.CurrentValue / 3600);
        const minutes = Math.floor((rpdScheduledRun.CurrentValue % 3600) / 60);
        systemParametersStore.rpdScheduledRun = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      // RPD Scheduled Run Duration
      const rpdScheduledRunDuration = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_rpd_scheduled_duration',
      );
      systemParametersStore.rpdScheduledRunDuration =
        rpdScheduledRunDuration?.CurrentValue;

      // Lateral Cast Out Mode
      const lateralCastOutMode = Attributes.find(
        (attr) => attr.AttributeName === 'hb_lateral_cast_out_mode',
      );
      systemParametersStore.lateralCastOutMode =
        lateralCastOutMode?.CurrentValue === 'Enabled';

      return data.RegistryEntries;
    },
  });
};

/**
 * Save aggressive prefetch
 */
export const useSaveAggressivePrefetch = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (updatedAggressivePrefetch) => {
      const updatedModeValue = updatedAggressivePrefetch
        ? 'Enabled'
        : 'Disabled';
      systemParametersStore.aggressivePrefetch = updatedAggressivePrefetch;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_proc_favor_aggressive_prefetch: updatedModeValue,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t(
        'pageSystemParameters.toast.successSavingAggressivePrefetch',
      );
    },
    onError: (error, updatedAggressivePrefetch) => {
      console.log(error);
      systemParametersStore.aggressivePrefetch = !updatedAggressivePrefetch;
      throw new Error(
        i18n.global.t(
          'pageSystemParameters.toast.errorSavingAggressivePrefetch',
        ),
      );
    },
  });
};

/**
 * Save RPD policy
 */
export const useSaveRpdPolicy = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (rpdPolicyValue) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_rpd_policy: rpdPolicyValue },
      });

      systemParametersStore.rpdPolicy = rpdPolicyValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t('pageSystemParameters.toast.successSavingRpdPolicy');
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingRpdPolicy'),
      );
    },
  });
};

/**
 * Save RPD feature
 */
export const useSaveRpdFeature = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (rpdFeatureValue) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_rpd_feature: rpdFeatureValue },
      });

      systemParametersStore.rpdFeature = rpdFeatureValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t(
        'pageSystemParameters.toast.successSavingRpdFeature',
      );
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingRpdFeature'),
      );
    },
  });
};

/**
 * Save immediate test requested
 */
export const useSaveImmediateTestRequested = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async ({ value }) => {
      systemParametersStore.immediateTestRequested = value === 'Enabled';

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_rpd_immediate_test: value },
      });

      return value;
    },
    onSuccess: (value) => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      if (value === 'Enabled') {
        return i18n.global.t(
          'pageSystemParameters.toast.successStartingDiagnosticTestRun',
        );
      } else {
        return i18n.global.t(
          'pageSystemParameters.toast.successStoppingDiagnosticTestRun',
        );
      }
    },
    onError: (error, { value }) => {
      console.log(error);
      systemParametersStore.immediateTestRequested = value !== 'Enabled';
      if (value === 'Enabled') {
        throw new Error(
          i18n.global.t(
            'pageSystemParameters.toast.errorStartingDiagnosticTestRun',
          ),
        );
      } else {
        throw new Error(
          i18n.global.t(
            'pageSystemParameters.toast.errorStoppingDiagnosticTestRun',
          ),
        );
      }
    },
  });
};

/**
 * Save guard on error
 */
export const useSaveGuardOnError = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (updatedImmediateTestRequested) => {
      const updatedValue = updatedImmediateTestRequested
        ? 'Enabled'
        : 'Disabled';
      systemParametersStore.guardOnError = updatedImmediateTestRequested;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_rpd_guard_policy: updatedValue },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t(
        'pageSystemParameters.toast.successSavingGuardOnError',
      );
    },
    onError: (error, updatedImmediateTestRequested) => {
      console.log(error);
      systemParametersStore.guardOnError = !updatedImmediateTestRequested;
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingGuardOnError'),
      );
    },
  });
};

/**
 * Save RPD scheduled run
 */
export const useSaveRpdScheduledRun = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (payload) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          pvm_rpd_scheduled_tod: payload.totalSeconds,
          pvm_rpd_scheduled_duration: payload.duration,
        },
      });

      systemParametersStore.rpdScheduledRun = payload.startTime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t('pageSystemParameters.toast.successSavingRpdRun');
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingRpdRun'),
      );
    },
  });
};

/**
 * Save lateral cast out mode
 */
export const useSaveLateralCastOutMode = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async (lateralCastOutModeValue) => {
      const updatedModeValue = lateralCastOutModeValue ? 'Enabled' : 'Disabled';
      systemParametersStore.lateralCastOutMode = lateralCastOutModeValue;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_lateral_cast_out_mode: updatedModeValue },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.systemParameters());
      return i18n.global.t(
        'pageSystemParameters.toast.successSavingLateralCastOut',
      );
    },
    onError: (error, lateralCastOutModeValue) => {
      console.log(error);
      systemParametersStore.lateralCastOutMode = !lateralCastOutModeValue;
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingLateralCastOut'),
      );
    },
  });
};

/**
 * Get frequency cap
 */
export const useGetFrequencyCap = () => {
  const systemParametersStore = SystemParametersStore();

  return useQuery({
    queryKey: [...queryKeys.resources.systemParameters(), 'frequencyCap'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');

      const frequencyCapData = {
        frequencyMax: data.Attributes.hb_cap_freq_mhz_max,
        frequencyMin: data.Attributes.hb_cap_freq_mhz_min,
        frequencyRequest: data.Attributes.hb_cap_freq_mhz_request,
        frequencyRequestCurrent:
          data.Attributes.hb_cap_freq_mhz_request_current,
      };

      systemParametersStore.frequencyCap = frequencyCapData;
      systemParametersStore.frequencyRequestCurrentToggle =
        frequencyCapData.frequencyRequest !== 0;

      return frequencyCapData;
    },
  });
};

/**
 * Save frequency cap
 */
export const useSaveFrequencyCap = () => {
  const queryClient = useQueryClient();
  const systemParametersStore = SystemParametersStore();

  return useMutation({
    mutationFn: async ({ frequency, state }) => {
      systemParametersStore.frequencyRequestCurrentToggle = state;

      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_cap_freq_mhz_request: Number(frequency) },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.resources.systemParameters(),
        'frequencyCap',
      ]);
      return i18n.global.t(
        'pageSystemParameters.toast.successSavingFrequencyCap',
      );
    },
    onError: (error, { state }) => {
      console.log(error);
      systemParametersStore.frequencyRequestCurrentToggle = !state;
      throw new Error(
        i18n.global.t('pageSystemParameters.toast.errorSavingFrequencyCap'),
      );
    },
  });
};

// ============================================================================
// FIELD CORE OVERRIDE QUERIES
// ============================================================================

/**
 * Get BIOS attributes for field core override
 */
export const useGetFieldCoreBiosAttributes = () => {
  const fieldCoreOverrideStore = FieldCoreOverrideStore();

  return useQuery({
    queryKey: queryKeys.resources.fieldCoreOverride(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');

      const attributes = data.Attributes || {};
      fieldCoreOverrideStore.fieldCoreOverridePending =
        attributes.hb_field_core_override;
      fieldCoreOverrideStore.fieldCoreOverrideCurrent =
        attributes.hb_field_core_override_current;

      return {
        fieldCoreOverridePending: attributes.hb_field_core_override,
        fieldCoreOverrideCurrent: attributes.hb_field_core_override_current,
      };
    },
  });
};

/**
 * Set field core override
 */
export const useSetFieldCoreOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coreOverride) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_field_core_override: +coreOverride,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.fieldCoreOverride());
      return i18n.global.t(
        'pageFieldCoreOverride.toast.configurationChangeSuccess',
      );
    },
    onError: (error) => {
      console.log('Field core override', error);
      throw new Error(
        i18n.global.t('pageFieldCoreOverride.toast.configurationChangeError'),
      );
    },
  });
};

// ============================================================================
// LICENSE QUERIES
// ============================================================================

/**
 * Helper function to parse license data
 */
const parseData = (data) => {
  const [resourceId = '--', sequenceNumber = '--'] =
    data?.SerialNumber?.split('-') || '';
  const expirationDate = data?.ExpirationDate
    ? new Date(data.ExpirationDate)
    : '--';
  const licensed = data?.LicenseScope?.MaxNumberOfDevices || '--';

  return {
    licensed,
    resourceId,
    sequenceNumber,
    expirationDate,
  };
};

/**
 * Get licenses
 */
export const useGetLicenses = () => {
  const licenseStore = LicenseStore();

  return useQuery({
    queryKey: queryKeys.resources.license(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/LicenseService/Licenses');

      const licensePromises = data.Members.map((member) =>
        api.get(member['@odata.id']),
      );

      const responses = await Promise.all(licensePromises);

      const licenses = responses.reduce((acc, { data }) => {
        acc[data.Id] = data;
        return acc;
      }, {});

      licenseStore.licenses = licenses;

      return licenses;
    },
  });
};

/**
 * Activate license
 */
export const useActivateLicense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (licenseKey) => {
      await api.post('/redfish/v1/LicenseService/Licenses', {
        LicenseString: licenseKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.resources.license());
      return i18n.global.t('pageCapacityOnDemand.activation.toast.success');
    },
    onError: (error) => {
      console.log('Licenses', error);
      throw new Error(
        i18n.global.t('pageCapacityOnDemand.activation.toast.error'),
      );
    },
  });
};

// Made with Bob
