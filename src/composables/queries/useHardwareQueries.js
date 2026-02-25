import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from '@/api/queryKeys';
import api from '@/api';
import i18n from '@/i18n';

// ============================================================================
// BMC QUERIES
// ============================================================================

/**
 * Get BMC info
 */
export const useGetBmcInfo = () => {
  return useQuery({
    queryKey: queryKeys.hardware.bmc(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Managers/bmc');

      return {
        dateTime: new Date(data.DateTime),
        description: data.Description,
        health: data.Status.Health,
        id: data.Id,
        identifyLed: data.LocationIndicatorActive,
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
        model: data.Model,
        name: data.Name,
        partNumber: data.PartNumber,
        powerState: data.PowerState,
        serialNumber: data.SerialNumber,
        sparePartNumber: data.SparePartNumber,
        statusState: data.Status.State,
        uri: data['@odata.id'],
      };
    },
  });
};

/**
 * Update BMC identify LED
 */
export const useUpdateBmcIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return identifyLed;
    },
    onSuccess: (identifyLed) => {
      queryClient.invalidateQueries(queryKeys.hardware.bmc());
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// CHASSIS QUERIES
// ============================================================================

/**
 * Get chassis info
 */
export const useGetChassisInfo = () => {
  return useQuery({
    queryKey: queryKeys.hardware.chassis(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Chassis');

      const chassisIds = data.Members.map((member) => member['@odata.id']);
      const responses = await Promise.all(chassisIds.map((id) => api.get(id)));

      return responses.map(({ data }) => ({
        id: data.Id,
        health: data.Status?.Health,
        statusState: data.Status?.State,
        name: data.Name,
        identifyLed: data.LocationIndicatorActive,
        uri: data['@odata.id'],
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
        firmwareVersion: data.Version,
      }));
    },
  });
};

/**
 * Get chassis power state
 */
export const useGetChassisPowerState = () => {
  return useQuery({
    queryKey: [...queryKeys.hardware.chassis(), 'powerState'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Chassis/chassis');
      return data.PowerState;
    },
  });
};

/**
 * Update chassis identify LED
 */
export const useUpdateChassisIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return identifyLed;
    },
    onSuccess: (identifyLed) => {
      queryClient.invalidateQueries(queryKeys.hardware.chassis());
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// POWER SUPPLY QUERIES
// ============================================================================

/**
 * Get power supplies
 */
export const useGetPowerSupplies = (chassisUri) => {
  return useQuery({
    queryKey: [...queryKeys.hardware.powerSupplies(), chassisUri],
    queryFn: async () => {
      if (!chassisUri) return [];

      const { data: chassisData } = await api.get(chassisUri);
      const { data: powerSubsystemData } = await api.get(
        chassisData.PowerSubsystem['@odata.id'],
      );
      const { data: powerSuppliesData } = await api.get(
        powerSubsystemData.PowerSupplies['@odata.id'],
      );

      const powerSupplyIds = powerSuppliesData.Members.map(
        (member) => member['@odata.id'],
      );

      const responses = await Promise.all(
        powerSupplyIds.map((id) => api.get(id)),
      );

      return responses.map(({ data }) => ({
        id: data.Id,
        health: data.Status?.Health,
        partNumber: data.PartNumber,
        serialNumber: data.SerialNumber,
        firmwareVersion: data.FirmwareVersion,
        identifyLed: data.LocationIndicatorActive,
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
        model: data.Model,
        name: data.Name,
        sparePartNumber: data.SparePartNumber,
        status:
          data.Status?.State === 'Enabled' ? 'Present' : data.Status?.State,
        uri: data['@odata.id'],
      }));
    },
    enabled: !!chassisUri,
  });
};

/**
 * Update power supply identify LED
 */
export const useUpdatePowerSupplyIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed, chassisUri }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return { identifyLed, chassisUri };
    },
    onSuccess: ({ identifyLed, chassisUri }) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.powerSupplies(),
        chassisUri,
      ]);
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log(error);
      if (identifyLed) {
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

// ============================================================================
// ASSEMBLY QUERIES
// ============================================================================

/**
 * Get assembly info
 */
export const useGetAssemblyInfo = (chassisUri) => {
  return useQuery({
    queryKey: [...queryKeys.hardware.assembly(), chassisUri],
    queryFn: async () => {
      if (!chassisUri) return [];

      const { data } = await api.get(`${chassisUri}/Assembly`);

      return data.Assemblies.map((assembly) => ({
        id: assembly.MemberId,
        health: assembly.Status?.Health,
        partNumber: assembly.PartNumber,
        serialNumber: assembly.SerialNumber,
        sparePartNumber: assembly.SparePartNumber,
        model: assembly.Model,
        name: assembly.Name,
        locationNumber: assembly.Location?.PartLocation?.ServiceLabel,
        identifyLed: assembly.LocationIndicatorActive,
        status:
          assembly.Status?.State === 'Enabled'
            ? 'Present'
            : assembly.Status?.State,
        uri: assembly['@odata.id'],
      }));
    },
    enabled: !!chassisUri,
  });
};

/**
 * Update assembly identify LED
 */
export const useUpdateAssemblyIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, memberId, identifyLed, chassisUri }) => {
      await api.patch(uri, {
        Assemblies: [
          {
            MemberId: memberId,
            LocationIndicatorActive: identifyLed,
          },
        ],
      });
      return { identifyLed, chassisUri };
    },
    onSuccess: ({ identifyLed, chassisUri }) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.assembly(),
        chassisUri,
      ]);
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// MEMORY (DIMMS) QUERIES
// ============================================================================

/**
 * Get DIMMs
 */
export const useGetDimms = () => {
  return useQuery({
    queryKey: queryKeys.hardware.memory(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Memory');

      const dimmIds = data.Members.map((item) => item['@odata.id']);
      const responses = await Promise.all(dimmIds.map((id) => api.get(id)));

      return responses.map(({ data }) => ({
        id: data.Id,
        health: data.Status?.Health,
        capacityMiB: data.CapacityMiB,
        enabled: data.Enabled,
        name: data.Name,
        partNumber: data.PartNumber,
        serialNumber: data.SerialNumber,
        status:
          data.Status?.State === 'Enabled' ? 'Present' : data.Status?.State,
        sparePartNumber: data.SparePartNumber,
        model: data.Model,
        identifyLed: data.LocationIndicatorActive,
        uri: data['@odata.id'],
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
      }));
    },
  });
};

/**
 * Update DIMM identify LED
 */
export const useUpdateDimmIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return identifyLed;
    },
    onSuccess: (identifyLed) => {
      queryClient.invalidateQueries(queryKeys.hardware.memory());
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// PROCESSOR QUERIES
// ============================================================================

/**
 * Get processors
 */
export const useGetProcessors = () => {
  return useQuery({
    queryKey: queryKeys.hardware.processors(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Processors');

      const processorIds = data.Members.map((member) => member['@odata.id']);
      const responses = await Promise.all(
        processorIds.map((id) => api.get(id)),
      );

      return responses.map(({ data }) => ({
        id: data.Id,
        health: data.Status?.Health,
        partNumber: data.PartNumber,
        sparePartNumber: data.SparePartNumber,
        serialNumber: data.SerialNumber,
        status:
          data.Status?.State === 'Enabled' ? 'Present' : data.Status?.State,
        model: data.Model,
        name: data.Name,
        processorType: data.ProcessorType,
        totalCores: data.TotalCores,
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
        identifyLed: data.LocationIndicatorActive,
        uri: data['@odata.id'],
      }));
    },
  });
};

/**
 * Update processor identify LED
 */
export const useUpdateProcessorIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return identifyLed;
    },
    onSuccess: (identifyLed) => {
      queryClient.invalidateQueries(queryKeys.hardware.processors());
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// FAN QUERIES
// ============================================================================

/**
 * Get fans
 */
export const useGetFans = (chassisUri) => {
  return useQuery({
    queryKey: [...queryKeys.hardware.fans(), chassisUri],
    queryFn: async () => {
      if (!chassisUri) return [];

      const { data: chassisData } = await api.get(chassisUri);
      const { data: thermalSubsystemData } = await api.get(
        chassisData.ThermalSubsystem['@odata.id'],
      );
      const { data: fansData } = await api.get(
        thermalSubsystemData.Fans['@odata.id'],
      );

      const fanIds = fansData.Members.map((member) => member['@odata.id']);
      const responses = await Promise.all(fanIds.map((id) => api.get(id)));

      return responses.map(({ data }) => ({
        id: data.Id,
        health: data.Status?.Health,
        partNumber: data.PartNumber,
        serialNumber: data.SerialNumber,
        identifyLed: data.LocationIndicatorActive,
        locationNumber: data.Location?.PartLocation?.ServiceLabel,
        model: data.Model,
        name: data.Name,
        sparePartNumber: data.SparePartNumber,
        status:
          data.Status?.State === 'Enabled' ? 'Present' : data.Status?.State,
        uri: data['@odata.id'],
      }));
    },
    enabled: !!chassisUri,
  });
};

/**
 * Update fan identify LED
 */
export const useUpdateFanIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed, chassisUri }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return { identifyLed, chassisUri };
    },
    onSuccess: ({ identifyLed, chassisUri }) => {
      queryClient.invalidateQueries([...queryKeys.hardware.fans(), chassisUri]);
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log(error);
      if (identifyLed) {
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

// ============================================================================
// SENSORS QUERIES
// ============================================================================

/**
 * Get chassis collection for sensors
 */
const getChassisCollection = async () => {
  const { data: rootData } = await api.get('/redfish/v1/');
  const { data: chassisData } = await api.get(rootData.Chassis['@odata.id']);
  return chassisData.Members.map((member) => member['@odata.id']);
};

/**
 * Get sensors for a chassis
 */
const getSensorsForChassis = async (chassisId) => {
  const { data } = await api.get(`${chassisId}/Sensors?$expand=.($levels=1)`);

  return data.Members.map((sensor) => ({
    isSelected: false,
    name: sensor.Name,
    status: sensor.Status?.Health,
    currentValue: sensor.Reading,
    units: sensor.ReadingUnits,
  }));
};

/**
 * Get all sensors
 */
export const useGetAllSensors = () => {
  return useQuery({
    queryKey: queryKeys.hardware.sensors(),
    queryFn: async () => {
      const chassisCollection = await getChassisCollection();
      if (!chassisCollection) return [];

      const sensorsArrays = await Promise.all(
        chassisCollection.map((chassis) => getSensorsForChassis(chassis)),
      );

      return sensorsArrays.flat();
    },
  });
};

// ============================================================================
// PCIE SLOTS QUERIES
// ============================================================================

/**
 * Get PCIe slots
 */
export const useGetPcieSlots = (chassisUri) => {
  return useQuery({
    queryKey: [...queryKeys.hardware.pcieSlots(), chassisUri],
    queryFn: async () => {
      if (!chassisUri) return [];

      const { data } = await api.get(`${chassisUri}/PCIeSlots`);

      return data.Slots.map((slot) => ({
        type: slot.SlotType,
        identifyLed: slot.LocationIndicatorActive,
        locationNumber: slot.Location?.PartLocation?.ServiceLabel,
      }));
    },
    enabled: !!chassisUri,
  });
};

/**
 * Update PCIe slot identify LED
 */
export const useUpdatePcieSlotIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, locationNumber, identifyLed, allSlots }) => {
      const updatedSlots = allSlots.map((slot) => {
        if (slot.locationNumber === locationNumber) {
          return { LocationIndicatorActive: identifyLed };
        } else {
          return {};
        }
      });

      await api.patch(`${uri}/PCIeSlots`, {
        Slots: updatedSlots,
      });

      return { identifyLed, uri };
    },
    onSuccess: ({ identifyLed, uri }) => {
      queryClient.invalidateQueries([...queryKeys.hardware.pcieSlots(), uri]);
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// FABRIC ADAPTERS QUERIES
// ============================================================================

/**
 * Get fabric adapters
 */
export const useGetFabricAdapters = (chassisUri) => {
  return useQuery({
    queryKey: [...queryKeys.hardware.fabricAdapters(), chassisUri],
    queryFn: async () => {
      if (!chassisUri) return [];

      const { data: pcieSlotsData } = await api.get(`${chassisUri}/PCIeSlots`);
      const { data: fabricAdaptersData } = await api.get(
        '/redfish/v1/Systems/system/FabricAdapters',
      );

      const fabricAdapterPromises = fabricAdaptersData.Members.map((member) =>
        api.get(member['@odata.id']),
      );
      const fabricAdapterResponses = await Promise.all(fabricAdapterPromises);

      const matchedAdapters = [];

      fabricAdapterResponses.forEach(({ data: adapterData }) => {
        if (adapterData?.Links?.PCIeDevices?.length > 0) {
          const adapterPcieDevice =
            adapterData.Links.PCIeDevices[0]['@odata.id'];

          const matchingSlot = pcieSlotsData.Slots.find(
            (slot) =>
              slot.Links?.PCIeDevice?.[0]?.['@odata.id'] === adapterPcieDevice,
          );

          if (matchingSlot) {
            matchedAdapters.push(adapterData);
          }
        } else {
          // Handle motherboard adapters
          if (
            adapterData['@odata.id'].includes('motherboard') &&
            chassisUri.endsWith('chassis')
          ) {
            matchedAdapters.push(adapterData);
          }
        }
      });

      return matchedAdapters.map((adapter) => ({
        health: adapter.Status?.Health,
        id: adapter.Id,
        identifyLed: adapter.LocationIndicatorActive,
        locationNumber: adapter.Location?.PartLocation?.ServiceLabel,
        model: adapter.Model,
        name: adapter.Name,
        partNumber: adapter.PartNumber,
        serialNumber: adapter.SerialNumber,
        sparePartNumber: adapter.SparePartNumber,
        status:
          adapter.Status?.State === 'Enabled'
            ? 'Present'
            : adapter.Status?.State,
        uri: adapter['@odata.id'],
      }));
    },
    enabled: !!chassisUri,
  });
};

/**
 * Update fabric adapter identify LED
 */
export const useUpdateFabricAdapterIdentifyLed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, identifyLed, chassisUri }) => {
      await api.patch(uri, {
        LocationIndicatorActive: identifyLed,
      });
      return { identifyLed, chassisUri };
    },
    onSuccess: ({ identifyLed, chassisUri }) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.fabricAdapters(),
        chassisUri,
      ]);
      if (identifyLed) {
        return i18n.global.t('pageInventory.toast.successEnableIdentifyLed');
      } else {
        return i18n.global.t('pageInventory.toast.successDisableIdentifyLed');
      }
    },
    onError: (error, { identifyLed }) => {
      console.log('error', error);
      if (identifyLed) {
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

// ============================================================================
// CONCURRENT MAINTENANCE QUERIES
// ============================================================================

/**
 * Get ready to remove state (TOD)
 */
export const useGetReadyToRemove = () => {
  return useQuery({
    queryKey: [...queryKeys.hardware.concurrentMaintenance(), 'tod'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Chassis/chassis/Assembly');

      const todEntry = data.Assemblies.find(
        (entry) =>
          Object.hasOwn(entry?.Oem?.OpenBMC || {}, 'ReadyToRemove') &&
          entry?.Location?.PartLocation?.ServiceLabel?.endsWith?.('P0-C0-E0'),
      );

      if (todEntry) {
        return {
          readyToRemove: todEntry.Oem.OpenBMC.ReadyToRemove,
          todObject: todEntry,
        };
      }

      return { readyToRemove: null, todObject: {} };
    },
  });
};

/**
 * Get control panel ready to remove state
 */
export const useGetControlPanelReadyToRemove = () => {
  return useQuery({
    queryKey: [...queryKeys.hardware.concurrentMaintenance(), 'controlPanel'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Chassis/chassis/Assembly');

      const controlPanelEntry = data.Assemblies.find(
        (entry) =>
          Object.hasOwn(entry?.Oem?.OpenBMC || {}, 'ReadyToRemove') &&
          entry?.Location?.PartLocation?.ServiceLabel?.endsWith?.('D0'),
      );

      if (controlPanelEntry) {
        return {
          readyToRemove: controlPanelEntry.Oem.OpenBMC.ReadyToRemove,
          controlPanel: controlPanelEntry,
        };
      }

      return { readyToRemove: null, controlPanel: {} };
    },
  });
};

/**
 * Get control panel display ready to remove state
 */
export const useGetControlPanelDispReadyToRemove = () => {
  return useQuery({
    queryKey: [
      ...queryKeys.hardware.concurrentMaintenance(),
      'controlPanelDisp',
    ],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Chassis/chassis/Assembly');

      const controlPanelDispEntry = data.Assemblies.find(
        (entry) =>
          Object.hasOwn(entry?.Oem?.OpenBMC || {}, 'ReadyToRemove') &&
          entry?.Location?.PartLocation?.ServiceLabel?.endsWith?.('D1'),
      );

      if (controlPanelDispEntry) {
        return {
          readyToRemove: controlPanelDispEntry.Oem.OpenBMC.ReadyToRemove,
          controlPanelDisp: controlPanelDispEntry,
        };
      }

      return { readyToRemove: null, controlPanelDisp: {} };
    },
  });
};

/**
 * Save ready to remove state (TOD)
 */
export const useSaveReadyToRemoveState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updatedReadyToRemove, memberId }) => {
      await api.patch('/redfish/v1/Chassis/chassis/Assembly', {
        Assemblies: [
          {
            MemberId: memberId,
            Oem: {
              OpenBMC: {
                ReadyToRemove: updatedReadyToRemove,
              },
            },
          },
        ],
      });
      return updatedReadyToRemove;
    },
    onSuccess: (updatedReadyToRemove) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.concurrentMaintenance(),
        'tod',
      ]);
      return i18n.global.t(
        'pageConcurrentMaintenance.toast.successSaveReadyToRemove',
        {
          state: updatedReadyToRemove ? 'enabled' : 'disabled',
        },
      );
    },
    onError: (error, { updatedReadyToRemove }) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageConcurrentMaintenance.toast.errorSaveReadyToRemove',
          {
            state: updatedReadyToRemove ? 'enabling' : 'disabling',
          },
        ),
      );
    },
  });
};

/**
 * Save control panel ready to remove state
 */
export const useSaveControlPanelReadyToRemove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updatedControlPanel, memberId }) => {
      await api.patch('/redfish/v1/Chassis/chassis/Assembly', {
        Assemblies: [
          {
            MemberId: memberId,
            Oem: {
              OpenBMC: {
                ReadyToRemove: updatedControlPanel,
              },
            },
          },
        ],
      });
      return updatedControlPanel;
    },
    onSuccess: (updatedControlPanel) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.concurrentMaintenance(),
        'controlPanel',
      ]);
      return i18n.global.t(
        'pageConcurrentMaintenance.toast.successSaveReadyToRemove',
        {
          state: updatedControlPanel ? 'enabled' : 'disabled',
        },
      );
    },
    onError: (error, { updatedControlPanel }) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageConcurrentMaintenance.toast.errorSaveReadyToRemove',
          {
            controlPanel: updatedControlPanel ? 'enabling' : 'disabling',
          },
        ),
      );
    },
  });
};

/**
 * Save control panel display ready to remove state
 */
export const useSaveControlPanelDispReadyToRemove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updatedControlPanelDisp, memberId }) => {
      await api.patch('/redfish/v1/Chassis/chassis/Assembly', {
        Assemblies: [
          {
            MemberId: memberId,
            Oem: {
              OpenBMC: {
                ReadyToRemove: updatedControlPanelDisp,
              },
            },
          },
        ],
      });
      return updatedControlPanelDisp;
    },
    onSuccess: (updatedControlPanelDisp) => {
      queryClient.invalidateQueries([
        ...queryKeys.hardware.concurrentMaintenance(),
        'controlPanelDisp',
      ]);
      return i18n.global.t(
        'pageConcurrentMaintenance.toast.successSaveReadyToRemove',
        {
          state: updatedControlPanelDisp ? 'enabled' : 'disabled',
        },
      );
    },
    onError: (error, { updatedControlPanelDisp }) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageConcurrentMaintenance.toast.errorSaveReadyToRemove',
          {
            controlPanelDisp: updatedControlPanelDisp
              ? 'enabling'
              : 'disabling',
          },
        ),
      );
    },
  });
};

// Made with Bob
