import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from '@/api/queryKeys';
import api from '@/api';
import i18n from '@/i18n';
import { watch } from 'vue';
import { GlobalStore } from '@/store/modules/GlobalStore';
import { BootSettingsStore } from '@/store/modules/Operations/BootSettingsStore';
import { ControlStore } from '@/store/modules/Operations/ControlStore';
import { FirmwareStore } from '@/store/modules/Operations/FirmwareStore';
import { FactoryResetStore } from '@/store/modules/Operations/FactoryResetStore';
import { KeyClearStore } from '@/store/modules/Operations/KeyClearStore';
import { NetworkSettingsStore } from '@/store/modules/Operations/NetworkSettingsStore';

// ============================================================================
// BOOT SETTINGS QUERIES
// ============================================================================

/**
 * Fetch operating mode settings (PowerRestorePolicy, AutomaticRetryConfig, StopBootOnFault)
 */
export const useGetOperatingModeSettings = () => {
  const bootSettingsStore = BootSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.bootSettings(), 'operatingMode'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');

      // Update Pinia store for backward compatibility
      bootSettingsStore.powerRestorePolicyValue = data.PowerRestorePolicy;
      bootSettingsStore.automaticRetryConfigValue =
        data.Boot.AutomaticRetryConfig;
      bootSettingsStore.bootFault = data.Boot.StopBootOnFault;

      return {
        powerRestorePolicy: data.PowerRestorePolicy,
        automaticRetryConfig: data.Boot.AutomaticRetryConfig,
        stopBootOnFault: data.Boot.StopBootOnFault,
      };
    },
  });
};

/**
 * Fetch BIOS attributes for boot settings
 */
export const useGetBiosAttributes = () => {
  const bootSettingsStore = BootSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.bootSettings(), 'biosAttributes'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');

      const filteredAttributes = bootSettingsStore.attributeKeys
        .filter((key) => Object.keys(data.Attributes).includes(key))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: data.Attributes[key],
          };
        }, {});

      // Update Pinia store for backward compatibility
      bootSettingsStore.biosAttributes = filteredAttributes;
      bootSettingsStore.disabled = false;

      return filteredAttributes;
    },
    onError: () => {
      bootSettingsStore.disabled = false;
    },
  });
};

/**
 * Fetch BIOS attribute values and limits from registry
 */
export const useGetBiosAttributeValues = () => {
  const bootSettingsStore = BootSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.bootSettings(), 'attributeValues'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const { Attributes } = data.RegistryEntries;

      // Extract Linux KVM percentage values
      const linuxPercentObj = Attributes.find(
        (itm) => itm.AttributeName === 'pvm_linux_kvm_percentage',
      );
      const linuxPercentCurrentObj = Attributes.find(
        (itm) => itm.AttributeName === 'pvm_linux_kvm_percentage_current',
      );
      const linuxValue = linuxPercentObj?.CurrentValue / 10;
      const linuxPercentCurrentValue =
        linuxPercentCurrentObj?.CurrentValue / 10;

      // Extract IBMi values
      const ibmi_load_source = Attributes.find(
        (itm) => itm.AttributeName === 'pvm_ibmi_load_source',
      );
      const ibmi_alt_load_source = Attributes.find(
        (itm) => itm.AttributeName === 'pvm_ibmi_alt_load_source',
      );
      const ibmi_console = Attributes.find(
        (itm) => itm.AttributeName === 'pvm_ibmi_console',
      );

      // Update Pinia store
      bootSettingsStore.linuxKvmPercentageValue = linuxValue;
      bootSettingsStore.linuxKvmPercentageInitialValue = linuxValue;
      bootSettingsStore.linuxKvmPercentageCurrentValue =
        linuxPercentCurrentValue;

      if (ibmi_load_source?.CurrentValue !== undefined) {
        bootSettingsStore.pvm_ibmi_load_source = ibmi_load_source.CurrentValue;
      }
      if (ibmi_alt_load_source?.CurrentValue !== undefined) {
        bootSettingsStore.pvm_ibmi_alt_load_source =
          ibmi_alt_load_source.CurrentValue;
      }
      if (ibmi_console?.CurrentValue !== undefined) {
        bootSettingsStore.pvm_ibmi_console = ibmi_console.CurrentValue;
      }

      // Create filtered attribute values
      const filteredAttributeValues = bootSettingsStore.attributeKeys
        .reduce((arr, attriValue) => {
          return [
            ...arr,
            ...Attributes.filter((value) => {
              return (
                attriValue !== 'pvm_sys_dump_active' &&
                attriValue === value.AttributeName
              );
            }),
          ];
        }, [])
        .reduce((obj, attributeObj) => {
          return {
            ...obj,
            [attributeObj?.AttributeName]: attributeObj.Value.map((item) => {
              return {
                value: item.ValueName,
                text:
                  [
                    'pvm_default_os_type',
                    'pvm_os_boot_type',
                    'pvm_rpa_boot_mode',
                    'pvm_stop_at_standby',
                    'pvm_system_operating_mode',
                    'pvm_linux_kvm_memory',
                  ].indexOf(attributeObj.AttributeName) >= 0
                    ? i18n.global.t(
                        `pageServerPowerOperations.biosSettings.attributeValues.${attributeObj.AttributeName}.${item.ValueName}`,
                      )
                    : item.ValueName,
              };
            }),
          };
        }, {});

      bootSettingsStore.attributeValues = filteredAttributeValues;

      return {
        attributeValues: filteredAttributeValues,
        linuxKvmPercentage: linuxValue,
        linuxKvmPercentageCurrent: linuxPercentCurrentValue,
        ibmiLoadSource: ibmi_load_source?.CurrentValue,
        ibmiAltLoadSource: ibmi_alt_load_source?.CurrentValue,
        ibmiConsole: ibmi_console?.CurrentValue,
      };
    },
  });
};

/**
 * Fetch location codes from PCIe slots
 */
export const useGetLocationCodes = () => {
  const bootSettingsStore = BootSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.bootSettings(), 'locationCodes'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Chassis?$expand=.($levels=2)',
      );

      const locationCodes = [];
      data.Members.forEach((chassis) => {
        chassis.PCIeSlots.Slots.forEach((pcieSlot) => {
          if (
            pcieSlot?.Links?.PCIeDevice &&
            pcieSlot?.Links?.PCIeDevice.length > 0 &&
            pcieSlot?.Location?.PartLocation?.ServiceLabel
          ) {
            locationCodes.push(pcieSlot.Location.PartLocation.ServiceLabel);
          }
        });
      });

      bootSettingsStore.locationCodes = locationCodes;
      return locationCodes;
    },
  });
};

/**
 * Save BIOS settings
 */
export const useSaveBiosSettings = () => {
  const queryClient = useQueryClient();
  const bootSettingsStore = BootSettingsStore();

  return useMutation({
    mutationFn: async ({ biosSettings }) => {
      bootSettingsStore.disabled = true;

      // Save BIOS settings
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: biosSettings,
      });

      // Save operating mode settings
      await api.patch('/redfish/v1/Systems/system', {
        PowerRestorePolicy: bootSettingsStore.powerRestorePolicyValue,
        Boot: {
          AutomaticRetryConfig: bootSettingsStore.automaticRetryConfigValue,
          StopBootOnFault: bootSettingsStore.bootFault,
        },
      });

      // Update store
      bootSettingsStore.biosAttributes = biosSettings;
      bootSettingsStore.disabled = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.operations.bootSettings());
      return i18n.global.t(
        'pageServerPowerOperations.toast.successSaveSettings',
      );
    },
    onError: () => {
      bootSettingsStore.disabled = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Standby to runtime transition
 */
export const useStandbyToRuntime = () => {
  return useMutation({
    mutationFn: async () => {
      await api.post(
        '/redfish/v1/Systems/hypervisor/Actions/ComputerSystem.Reset',
        {
          ResetType: 'On',
        },
      );
    },
    onSuccess: () => {
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

// ============================================================================
// CONTROL QUERIES (Server Power Operations)
// ============================================================================

/**
 * Watch for serverStatus changes in GlobalStore module
 * to set isOperationInProgress state
 * Stop watching status changes and resolve Promise when
 * serverStatus value matches passed argument or after 5 minutes
 */
const checkForServerStatus = (serverStatus) => {
  const global = GlobalStore();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve();
      unwatch();
    }, 300000 /*5mins*/);
    const unwatch = watch(
      () => global.serverStatus,
      (value) => {
        if (value === serverStatus) {
          resolve();
          unwatch();
          clearTimeout(timer);
        }
      },
    );
  });
};

/**
 * Fetch last power operation time
 */
export const useGetLastPowerOperationTime = () => {
  const controlStore = ControlStore();

  return useQuery({
    queryKey: [...queryKeys.operations.control(), 'lastPowerOperation'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');

      const lastReset = data.LastResetTime;
      if (lastReset) {
        const lastPowerOperationTime = new Date(lastReset);
        controlStore.lastPowerOperationTime = lastPowerOperationTime;
        return lastPowerOperationTime;
      }
      return null;
    },
  });
};

/**
 * Fetch last BMC reboot time
 */
export const useGetLastBmcRebootTime = () => {
  const controlStore = ControlStore();

  return useQuery({
    queryKey: [...queryKeys.operations.control(), 'lastBmcReboot'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Managers/bmc');

      const lastBmcReset = data.LastResetTime;
      const lastBmcRebootTime = new Date(lastBmcReset);
      controlStore.lastBmcRebootTime = lastBmcRebootTime;
      return lastBmcRebootTime;
    },
  });
};

/**
 * Reboot BMC
 */
export const useRebootBmc = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/redfish/v1/Managers/bmc/Actions/Manager.Reset', {
        ResetType: 'GracefulRestart',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastBmcReboot',
      ]);
      return i18n.global.t('pageRebootBmc.toast.successRebootStart');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageRebootBmc.toast.errorRebootStart'));
    },
  });
};

/**
 * Server power on
 */
export const useServerPowerOn = () => {
  const queryClient = useQueryClient();
  const controlStore = ControlStore();

  return useMutation({
    mutationFn: async () => {
      controlStore.isOperationInProgress = true;

      await api.post(
        '/redfish/v1/Systems/system/Actions/ComputerSystem.Reset',
        {
          ResetType: 'On',
        },
      );

      controlStore.displayInfoToast = true;

      // Wait for server status to change
      await checkForServerStatus('on');
      controlStore.isOperationInProgress = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastPowerOperation',
      ]);
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return controlStore.displayInfoToast;
    },
    onError: (error) => {
      console.log(error);
      controlStore.displayInfoToast = false;
      controlStore.isOperationInProgress = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Server soft reboot
 */
export const useServerSoftReboot = () => {
  const queryClient = useQueryClient();
  const controlStore = ControlStore();

  return useMutation({
    mutationFn: async () => {
      controlStore.isOperationInProgress = true;

      await api.post(
        '/redfish/v1/Systems/system/Actions/ComputerSystem.Reset',
        {
          ResetType: 'GracefulRestart',
        },
      );

      controlStore.displayInfoToast = true;

      await checkForServerStatus('on');
      controlStore.isOperationInProgress = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastPowerOperation',
      ]);
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return controlStore.displayInfoToast;
    },
    onError: (error) => {
      console.log(error);
      controlStore.displayInfoToast = false;
      controlStore.isOperationInProgress = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Server hard reboot
 */
export const useServerHardReboot = () => {
  const queryClient = useQueryClient();
  const controlStore = ControlStore();

  return useMutation({
    mutationFn: async () => {
      controlStore.isOperationInProgress = true;

      await api.post(
        '/redfish/v1/Systems/system/Actions/ComputerSystem.Reset',
        {
          ResetType: 'ForceRestart',
        },
      );

      controlStore.displayInfoToast = true;

      await checkForServerStatus('on');
      controlStore.isOperationInProgress = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastPowerOperation',
      ]);
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return controlStore.displayInfoToast;
    },
    onError: (error) => {
      console.log(error);
      controlStore.displayInfoToast = false;
      controlStore.isOperationInProgress = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Server soft power off
 */
export const useServerSoftPowerOff = () => {
  const queryClient = useQueryClient();
  const controlStore = ControlStore();

  return useMutation({
    mutationFn: async () => {
      controlStore.isOperationInProgress = true;

      await api.post(
        '/redfish/v1/Systems/system/Actions/ComputerSystem.Reset',
        {
          ResetType: 'GracefulShutdown',
        },
      );

      controlStore.displayInfoToast = true;

      await checkForServerStatus('off');
      controlStore.isOperationInProgress = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastPowerOperation',
      ]);
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return controlStore.displayInfoToast;
    },
    onError: (error) => {
      console.log(error);
      controlStore.displayInfoToast = false;
      controlStore.isOperationInProgress = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

/**
 * Server hard power off
 */
export const useServerHardPowerOff = () => {
  const queryClient = useQueryClient();
  const controlStore = ControlStore();

  return useMutation({
    mutationFn: async () => {
      controlStore.isOperationInProgress = true;

      await api.post(
        '/redfish/v1/Systems/system/Actions/ComputerSystem.Reset',
        {
          ResetType: 'ForceOff',
        },
      );

      controlStore.displayInfoToast = true;

      await checkForServerStatus('off');
      controlStore.isOperationInProgress = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.control(),
        'lastPowerOperation',
      ]);
      queryClient.invalidateQueries(queryKeys.global.systemInfo());
      return controlStore.displayInfoToast;
    },
    onError: (error) => {
      console.log(error);
      controlStore.displayInfoToast = false;
      controlStore.isOperationInProgress = false;
      throw new Error(
        i18n.global.t('pageServerPowerOperations.toast.errorSaveSettings'),
      );
    },
  });
};

// ============================================================================
// FIRMWARE QUERIES
// ============================================================================

/**
 * Get lowest supported firmware version
 */
export const useGetLowestSupportedFirmwareVersion = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: [...queryKeys.operations.firmware(), 'lowestSupported'],
    queryFn: async () => {
      const { data: bmcData } = await api.get('/redfish/v1/Managers/bmc');
      const { data: imageData } = await api.get(
        bmcData.Links.ActiveSoftwareImage['@odata.id'],
      );

      let lowestSupportedFirmware;
      if (Object.keys(imageData).includes('LowestSupportedVersion')) {
        firmwareStore.showAlert = true;
        lowestSupportedFirmware = imageData.LowestSupportedVersion;
      } else {
        firmwareStore.showAlert = false;
      }

      firmwareStore.lowestSupportedFirmwareVersion = lowestSupportedFirmware;
      return lowestSupportedFirmware;
    },
  });
};

/**
 * Get active BMC firmware ID
 */
export const useGetActiveBmcFirmware = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: [...queryKeys.operations.firmware(), 'activeBmc'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Managers/bmc');
      const id = data.Links?.ActiveSoftwareImage['@odata.id'].split('/').pop();
      firmwareStore.bmcActiveFirmwareId = id;
      return id;
    },
  });
};

/**
 * Get active host firmware ID
 */
export const useGetActiveHostFirmware = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: [...queryKeys.operations.firmware(), 'activeHost'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');
      const id = data.Links?.ActiveSoftwareImage['@odata.id'].split('/').pop();
      firmwareStore.hostActiveFirmwareId = id;
      return id;
    },
  });
};

/**
 * Get firmware boot side
 */
export const useGetFirmwareBootSide = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: [...queryKeys.operations.firmware(), 'bootSide'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');
      const fwBootSide = data.Attributes.fw_boot_side_current;
      firmwareStore.firmwareBootSide = fwBootSide;
      return fwBootSide;
    },
  });
};

/**
 * Get firmware inventory
 */
export const useGetFirmwareInventory = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: queryKeys.operations.firmware(),
    queryFn: async () => {
      const { data: inventoryData } = await api.get(
        '/redfish/v1/UpdateService/FirmwareInventory',
      );

      const inventoryList = inventoryData.Members.map((item) =>
        api.get(item['@odata.id']),
      );

      const responses = await Promise.all(inventoryList);

      const bmcFirmware = [];
      const hostFirmware = [];

      responses.forEach(({ data }) => {
        const firmwareType = data?.RelatedItem?.[0]?.['@odata.id']
          .split('/')
          .pop();
        const item = {
          version: data?.Version,
          id: data?.Id,
          location: data?.['@odata.id'],
          status: data?.Status?.Health,
        };

        if (firmwareType === 'bmc') {
          bmcFirmware.push(item);
        } else if (firmwareType === 'Bios') {
          hostFirmware.push(item);
        }
      });

      firmwareStore.bmcFirmware = bmcFirmware;
      firmwareStore.hostFirmware = hostFirmware;

      return { bmcFirmware, hostFirmware };
    },
  });
};

/**
 * Get update service settings
 */
export const useGetUpdateServiceSettings = () => {
  const firmwareStore = FirmwareStore();

  return useQuery({
    queryKey: [...queryKeys.operations.firmware(), 'updateService'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/UpdateService');
      const applyTime = data.HttpPushUriOptions.HttpPushUriApplyTime.ApplyTime;
      firmwareStore.applyTime = applyTime;
      return applyTime;
    },
  });
};

/**
 * Set apply time to immediate
 */
export const useSetApplyTimeImmediate = () => {
  const queryClient = useQueryClient();
  const firmwareStore = FirmwareStore();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/UpdateService', {
        HttpPushUriOptions: {
          HttpPushUriApplyTime: {
            ApplyTime: 'Immediate',
          },
        },
      });
      firmwareStore.applyTime = 'Immediate';
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.firmware(),
        'updateService',
      ]);
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageFirmware.toast.errorUploadFirmware'));
    },
  });
};

/**
 * Upload firmware
 */
export const useUploadFirmware = () => {
  const queryClient = useQueryClient();
  const firmwareStore = FirmwareStore();
  const setApplyTimeImmediate = useSetApplyTimeImmediate();

  return useMutation({
    mutationFn: async (image) => {
      // ApplyTime must be set to Immediate before making request to update firmware
      if (firmwareStore.applyTime !== 'Immediate') {
        await setApplyTimeImmediate.mutateAsync();
      }

      await api.post('/redfish/v1/UpdateService/update', image, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.operations.firmware());
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageFirmware.toast.errorUpdateFirmware'));
    },
  });
};

/**
 * Switch BMC firmware and reboot
 */
export const useSwitchBmcFirmwareAndReboot = () => {
  const queryClient = useQueryClient();
  const firmwareStore = FirmwareStore();

  return useMutation({
    mutationFn: async () => {
      const backupLocation = firmwareStore.backupBmcFirmware.location;

      await api.patch('/redfish/v1/Managers/bmc', {
        Links: {
          ActiveSoftwareImage: {
            '@odata.id': backupLocation,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.operations.firmware());
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageFirmware.toast.errorSwitchImages'));
    },
  });
};

// ============================================================================
// FACTORY RESET QUERIES
// ============================================================================

/**
 * Reset to defaults
 */
export const useResetToDefaults = () => {
  return useMutation({
    mutationFn: async () => {
      await api.post(
        '/redfish/v1/Managers/bmc/Actions/Manager.ResetToDefaults',
        {
          ResetType: 'ResetAll',
        },
      );
    },
    onSuccess: () => {
      return i18n.global.t('pageFactoryReset.toast.resetToDefaultsSuccess');
    },
    onError: (error) => {
      console.log('Factory Reset: ', error);
      throw new Error(
        i18n.global.t('pageFactoryReset.toast.resetToDefaultsError'),
      );
    },
  });
};

/**
 * Reset BIOS
 */
export const useResetBios = () => {
  return useMutation({
    mutationFn: async () => {
      await api.post('/redfish/v1/Systems/system/Bios/Actions/Bios.ResetBios');
    },
    onSuccess: () => {
      return i18n.global.t('pageFactoryReset.toast.resetBiosSuccess');
    },
    onError: (error) => {
      console.log('Factory Reset: ', error);
      throw new Error(i18n.global.t('pageFactoryReset.toast.resetBiosError'));
    },
  });
};

// ============================================================================
// KEY CLEAR QUERIES
// ============================================================================

/**
 * Clear encryption keys
 */
export const useClearEncryptionKeys = () => {
  return useMutation({
    mutationFn: async (selectedKey) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { hb_key_clear_request: selectedKey },
      });
    },
    onSuccess: () => {
      return i18n.global.t('pageKeyClear.toast.selectedKeyClearedSuccess');
    },
    onError: (error) => {
      console.log('Key clear', error);
      throw new Error(
        i18n.global.t('pageKeyClear.toast.selectedKeyClearedError'),
      );
    },
  });
};

// ============================================================================
// NETWORK SETTINGS QUERIES
// ============================================================================

/**
 * Get BIOS attributes for network settings
 */
export const useGetNetworkBiosAttributes = () => {
  const networkSettingsStore = NetworkSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.networkSettings(), 'biosAttributes'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');

      const filteredAttributes = networkSettingsStore.requiredAttributes
        .filter((key) => Object.keys(data.Attributes).includes(key))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: data.Attributes[key],
          };
        }, {});

      networkSettingsStore.biosAttributes = filteredAttributes;
      return filteredAttributes;
    },
  });
};

/**
 * Get property limits for network settings
 */
export const useGetNetworkPropertyLimits = () => {
  const networkSettingsStore = NetworkSettingsStore();

  return useQuery({
    queryKey: [...queryKeys.operations.networkSettings(), 'propertyLimits'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Registries/BiosAttributeRegistry/BiosAttributeRegistry',
      );

      const { Attributes } = data.RegistryEntries;

      const nfsImageDir = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_ibmi_nfs_image_directory',
      );
      const initiatorName = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_ibmi_iscsi_initiator_name',
      );
      const targetName = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_ibmi_iscsi_target_name',
      );
      const targetPort = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_ibmi_iscsi_target_port',
      );
      const vlanTagId = Attributes.find(
        (attr) => attr.AttributeName === 'pvm_ibmi_vlan_tag_id',
      );

      const limits = {
        nfsImageDirMaxLength: nfsImageDir?.[0]?.MaxLength,
        initiatorNameMaxLength: initiatorName?.[0]?.MaxLength,
        targetNameMaxLength: targetName?.[0]?.MaxLength,
        targetPortUpperBound: targetPort?.[0]?.UpperBound,
        vlanTagIdUpperBound: vlanTagId?.[0]?.UpperBound,
      };

      // Update store
      networkSettingsStore.nfsImageDirMaxLength = limits.nfsImageDirMaxLength;
      networkSettingsStore.initiatorNameMaxLength =
        limits.initiatorNameMaxLength;
      networkSettingsStore.targetNameMaxLength = limits.targetNameMaxLength;
      networkSettingsStore.targetPortUpperBound = limits.targetPortUpperBound;
      networkSettingsStore.vlanTagIdUpperBound = limits.vlanTagIdUpperBound;

      return limits;
    },
  });
};

/**
 * Set D Mode
 */
export const useSetDMode = () => {
  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_os_boot_type: 'D_Mode' },
      });
    },
    onSuccess: () => {
      return i18n.global.t(
        'pageServerPowerOperations.modal.networkSettings.toast.successUpdateDMode',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageServerPowerOperations.modal.networkSettings.toast.errorUpdateDMode',
        ),
      );
    },
  });
};

/**
 * Restore default network settings
 */
export const useRestoreNetworkDefaults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: { pvm_ibmi_iscsi_initiator_name: '' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.operations.networkSettings(),
        'biosAttributes',
      ]);
      return i18n.global.t(
        'pageServerPowerOperations.modal.networkSettings.toast.successRestoreDefault',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageServerPowerOperations.modal.networkSettings.toast.errorRestoreDefault',
        ),
      );
    },
  });
};

/**
 * Save network BIOS settings
 */
export const useSaveNetworkBiosSettings = () => {
  return useMutation({
    mutationFn: async ({ form }) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: form,
      });
    },
    onSuccess: () => {
      return i18n.global.t(
        'pageServerPowerOperations.modal.networkSettings.toast.successSavedSetting',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageServerPowerOperations.modal.networkSettings.toast.errorSavedSettings',
        ),
      );
    },
  });
};

/**
 * Update CHAP data
 */
export const useUpdateChapData = () => {
  return useMutation({
    mutationFn: async ({ chapData }) => {
      await api.patch('/redfish/v1/Systems/system', {
        Oem: {
          IBM: {
            ChapData: {
              ChapName: chapData.chapName,
              ChapSecret: chapData.chapSecret,
            },
          },
        },
      });
    },
    onSuccess: () => {
      return i18n.global.t(
        'pageServerPowerOperations.modal.networkSettings.toast.successSavedSetting',
      );
    },
    onError: (error) => {
      console.log('error', error);
      throw new Error(
        i18n.global.t(
          'pageServerPowerOperations.modal.networkSettings.toast.errorSavedSettings',
        ),
      );
    },
  });
};

// Made with Bob
