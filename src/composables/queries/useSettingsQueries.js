import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from '@/api/queryKeys';
import api, { getResponseCount } from '@/api';
import i18n from '@/i18n';
import { find } from 'lodash';
import { REGEX_MAPPINGS } from '@/utilities/GlobalConstants';

// ============================================================================
// NETWORK SETTINGS QUERIES
// ============================================================================

/**
 * Get ethernet data
 */
export const useGetEthernetData = () => {
  return useQuery({
    queryKey: queryKeys.settings.network(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Managers/bmc/EthernetInterfaces',
      );

      const ethernetInterfaceIds = data.Members.map(
        (ethernetInterface) => ethernetInterface['@odata.id'],
      );

      const ethernetInterfaces = await Promise.all(
        ethernetInterfaceIds.map((ethernetInterface) =>
          api.get(ethernetInterface),
        ),
      );

      const networkSettings = ethernetInterfaces.map(({ data }) => {
        const {
          DHCPv4,
          DHCPv6,
          HostName,
          Id,
          IPv4Addresses,
          IPv4StaticAddresses,
          IPv6StaticAddresses,
          IPv6Addresses,
          IPv6DefaultGateway,
          IPv6StaticDefaultGateways,
          MACAddress,
          StaticNameServers,
          StatelessAddressAutoConfig,
        } = data;
        return {
          defaultGateway: IPv4StaticAddresses[0]?.Gateway,
          dhcpAddress: IPv4Addresses.filter(
            (ipv4) => ipv4.AddressOrigin === 'DHCP',
          ),
          dhcpEnabled: DHCPv4.DHCPEnabled,
          hostname: HostName,
          id: Id,
          ipv4: IPv4Addresses,
          macAddress: MACAddress,
          staticAddress: IPv4StaticAddresses[0]?.Address,
          staticIpv4Addresses: IPv4StaticAddresses,
          staticNameServers: StaticNameServers,
          useDnsEnabled: DHCPv4.UseDNSServers,
          useDomainNameEnabled: DHCPv4.UseDomainName,
          useNtpEnabled: DHCPv4.UseNTPServers,
          staticIpv6Addresses: IPv6StaticAddresses ?? [],
          ipv6: IPv6Addresses ?? [],
          ipv6DefaultGateway: IPv6DefaultGateway ?? '',
          ipv6OperatingMode: DHCPv6?.OperatingMode ?? '',
          ipv6StaticDefaultGateways: IPv6StaticDefaultGateways ?? [],
          ipv6UseDnsEnabled: DHCPv6?.UseDNSServers ?? false,
          ipv6UseDomainNameEnabled: DHCPv6?.UseDomainName ?? false,
          ipv6UseNtpEnabled: DHCPv6?.UseNTPServers ?? false,
          ipv6AutoConfigEnabled:
            StatelessAddressAutoConfig?.IPv6AutoConfigEnabled ?? false,
        };
      });

      return networkSettings;
    },
  });
};

/**
 * Get LLDP data
 */
export const useGetLLDPData = () => {
  return useQuery({
    queryKey: [...queryKeys.settings.network(), 'lldp'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Managers/bmc/DedicatedNetworkPorts',
      );

      const ethernetInterfaceIds = data.Members.map(
        (ethernetInterface) => ethernetInterface['@odata.id'],
      );

      const lldpInterfaces = await Promise.all(
        ethernetInterfaceIds.map((lldpInterface) => api.get(lldpInterface)),
      );

      const lldpData = lldpInterfaces.map(
        (lldpInterface) => lldpInterface?.data?.Ethernet,
      );

      const lldpEnabledState = lldpData.map((data) => {
        const { LLDPEnabled } = data;
        return { lldpEnabled: LLDPEnabled };
      });

      return lldpEnabledState;
    },
  });
};

/**
 * Save domain name state
 */
export const useSaveDomainNameState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ domainState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          DHCPv4: {
            UseDomainName: domainState,
          },
        },
      );

      // Delay to allow settings to apply
      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.domainName'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.domainName'),
        }),
      );
    },
  });
};

/**
 * Save DNS state
 */
export const useSaveDnsState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dnsState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          DHCPv4: {
            UseDNSServers: dnsState,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.dns'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.dns'),
        }),
      );
    },
  });
};

/**
 * Save NTP state
 */
export const useSaveNtpState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ntpState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          DHCPv4: {
            UseNTPServers: ntpState,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.ntp'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.ntp'),
        }),
      );
    },
  });
};

/**
 * Save DHCP enabled state
 */
export const useSaveDhcpEnabledState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dhcpState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          DHCPv4: {
            DHCPEnabled: dhcpState,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.dhcp'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.dhcp'),
        }),
      );
    },
  });
};

/**
 * Save LLDP state
 */
export const useSaveLLDPState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lldpState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/DedicatedNetworkPorts/${selectedInterfaceId}`,
        {
          Ethernet: {
            LLDPEnabled: lldpState,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.settings.network(), 'lldp']);
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.lldp'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.lldp'),
        }),
      );
    },
  });
};

/**
 * Save IPv6 DHCP enabled state
 */
export const useSaveIpv6DhcpEnabledState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dhcpState, selectedInterfaceId }) => {
      const updatedDhcpState = dhcpState ? 'Enabled' : 'Disabled';

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          DHCPv6: {
            OperatingMode: updatedDhcpState,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.dhcp'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.dhcp'),
        }),
      );
    },
  });
};

/**
 * Save IPv6 auto config state
 */
export const useSaveIpv6AutoConfigState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ipv6AutoConfigState, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          StatelessAddressAutoConfig: {
            IPv6AutoConfigEnabled: ipv6AutoConfigState,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.ipv6AutoConfig'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.ipv6AutoConfig'),
        }),
      );
    },
  });
};

/**
 * Update IPv4 address
 */
export const useUpdateIpv4Address = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newIpv4Address,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const updatedIpv4 = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(newIpv4Address, { Address: address })) {
          return null;
        } else {
          return {};
        }
      });

      const filteredAddress = newIpv4Address.filter(
        (item) => item.Subnet !== '',
      );

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          IPv4StaticAddresses: [...updatedIpv4, ...filteredAddress],
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.ipv4'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.ipv4'),
        }),
      );
    },
  });
};

/**
 * Update IPv6 address
 */
export const useUpdateIpv6Address = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newIpv6Address,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const updatedIpv6 = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(newIpv6Address, { Address: address })) {
          return null;
        } else {
          return {};
        }
      });

      const filteredAddress = newIpv6Address.filter(
        (item) => item.PrefixLength !== 0,
      );

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          IPv6StaticAddresses: [...updatedIpv6, ...filteredAddress],
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.ipv6'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.ipv6'),
        }),
      );
    },
  });
};

/**
 * Update IPv6 static default gateway address
 */
export const useUpdateIpv6StaticDefaultGatewayAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newIpv6StaticDefaultGatewayAddress,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const updatedIpv6 = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(newIpv6StaticDefaultGatewayAddress, { Address: address })) {
          return null;
        } else {
          return {};
        }
      });

      const filteredAddress = [newIpv6StaticDefaultGatewayAddress[0]];

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        {
          IPv6StaticDefaultGateways: [...updatedIpv6, ...filteredAddress],
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.ipv6StaticDefaultGateway'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.ipv6StaticDefaultGateway'),
        }),
      );
    },
  });
};

/**
 * Delete IPv4 address
 */
export const useDeleteIpv4Address = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updatedIpv4Array,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const newIpv4Array = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(updatedIpv4Array, { Address: address })) {
          return {};
        } else {
          return null;
        }
      });

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        { IPv4StaticAddresses: newIpv4Array },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successDeletingIpv4Server');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorDeletingIpv4Server'),
      );
    },
  });
};

/**
 * Delete IPv6 address
 */
export const useDeleteIpv6Address = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updatedIpv6Array,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const newIpv6Array = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(updatedIpv6Array, { Address: address })) {
          return {};
        } else {
          return null;
        }
      });

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        { IPv6StaticAddresses: newIpv6Array },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successDeletingIpv6Server');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorDeletingIpv6Server'),
      );
    },
  });
};

/**
 * Delete IPv6 static default gateway address
 */
export const useDeleteIpv6StaticDefaultGatewayAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updatedIpv6Array,
      originalAddresses,
      selectedInterfaceId,
    }) => {
      const newIpv6Array = originalAddresses.map((item) => {
        const address = item.Address;
        if (find(updatedIpv6Array, { Address: address })) {
          return {};
        } else {
          return null;
        }
      });

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        { IPv6StaticDefaultGateways: newIpv6Array },
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t(
        'pageNetwork.toast.successDeletingIpv6StaticDefaultGateway',
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t(
          'pageNetwork.toast.errorDeletingIpv6StaticDefaultGateway',
        ),
      );
    },
  });
};

/**
 * Save hostname
 */
export const useSaveHostname = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hostname, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        hostname,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successSaveNetworkSettings', {
        setting: i18n.global.t('pageNetwork.network'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorSaveNetworkSettings', {
          setting: i18n.global.t('pageNetwork.network'),
        }),
      );
    },
  });
};

/**
 * Save DNS address
 */
export const useSaveDnsAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dnsForm, originalAddresses, selectedInterfaceId }) => {
      const newDnsArray = originalAddresses.concat(dnsForm);

      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        { StaticNameServers: newDnsArray },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successAddingDnsServer');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageNetwork.toast.errorAddingDnsServer'));
    },
  });
};

/**
 * Edit DNS address
 */
export const useEditDnsAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dnsTableData, selectedInterfaceId }) => {
      await api.patch(
        `/redfish/v1/Managers/bmc/EthernetInterfaces/${selectedInterfaceId}`,
        { StaticNameServers: dnsTableData },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.network());
      return i18n.global.t('pageNetwork.toast.successDeletingDnsServer');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageNetwork.toast.errorDeletingDnsServer'),
      );
    },
  });
};

// ============================================================================
// POWER POLICY QUERIES
// ============================================================================

/**
 * Get power restore policies
 */
export const useGetPowerRestorePolicies = () => {
  return useQuery({
    queryKey: [...queryKeys.settings.powerPolicy(), 'policies'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/JsonSchemas/ComputerSystem');

      if (data?.Location?.length > 0 && data?.Location[0].Uri) {
        const schemaResponse = await api.get(data.Location[0].Uri);
        const { PowerRestorePolicyTypes = {} } =
          schemaResponse.data.definitions;

        const powerPoliciesData = PowerRestorePolicyTypes.enum.map(
          (powerState) => {
            const desc = `${i18n.global.t(
              `pagePowerRestorePolicy.policies.${powerState}`,
            )} - ${PowerRestorePolicyTypes.enumDescriptions[powerState]}`;
            return {
              state: powerState,
              desc,
            };
          },
        );

        return powerPoliciesData;
      }

      return [];
    },
  });
};

/**
 * Get power restore current policy
 */
export const useGetPowerRestoreCurrentPolicy = () => {
  return useQuery({
    queryKey: queryKeys.settings.powerPolicy(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');
      return data.PowerRestorePolicy;
    },
  });
};

/**
 * Set power restore policy
 */
export const useSetPowerRestorePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (powerPolicy) => {
      await api.patch('/redfish/v1/Systems/system', {
        PowerRestorePolicy: powerPolicy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.powerPolicy());
      return i18n.global.t('pagePowerRestorePolicy.toast.successSaveSettings');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePowerRestorePolicy.toast.errorSaveSettings'),
      );
    },
  });
};

// ============================================================================
// SNMP ALERTS QUERIES
// ============================================================================

/**
 * Get SNMP alert URL
 */
const getSnmpAlertUrl = async () => {
  const { data: rootData } = await api.get('/redfish/v1/');
  const { data: eventServiceData } = await api.get(
    rootData.EventService['@odata.id'],
  );
  const { data: subscriptionsData } = await api.get(
    eventServiceData.Subscriptions['@odata.id'],
  );
  return subscriptionsData['@odata.id'];
};

/**
 * Get SNMP details
 */
export const useGetSnmpDetails = () => {
  return useQuery({
    queryKey: queryKeys.settings.snmpAlerts(),
    queryFn: async () => {
      const snmpAlertUrl = await getSnmpAlertUrl();
      const { data } = await api.get(snmpAlertUrl);

      const userIds = data.Members.map((user) => user['@odata.id']);
      const users = await Promise.all(userIds.map((user) => api.get(user)));

      const snmpDetailsData = users.map((user) => user.data);
      const snmpDetailsDataFiltered = snmpDetailsData.filter(
        (item) => item.SubscriptionType === 'SNMPTrap',
      );

      const finalSNmpData = snmpDetailsDataFiltered.map((singleData) => {
        singleData.isSelected = false;
        return singleData;
      });

      return finalSNmpData;
    },
  });
};

/**
 * Delete destination
 */
export const useDeleteDestination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const snmpAlertUrl = await getSnmpAlertUrl();
      await api.delete(`${snmpAlertUrl}/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries(queryKeys.settings.snmpAlerts());
      return i18n.global.t('pageSnmpAlerts.toast.successDeleteDestination', {
        id,
      });
    },
    onError: (error, id) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageSnmpAlerts.toast.errorDeleteDestination', {
          id,
        }),
      );
    },
  });
};

/**
 * Delete multiple destinations
 */
export const useDeleteMultipleDestinations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (destinations) => {
      const snmpAlertUrl = await getSnmpAlertUrl();
      const promises = destinations.map(({ id }) => {
        return api.delete(`${snmpAlertUrl}/${id}`).catch((error) => {
          console.log(error);
          return error;
        });
      });

      const responses = await Promise.all(promises);
      return responses;
    },
    onSuccess: (responses) => {
      queryClient.invalidateQueries(queryKeys.settings.snmpAlerts());

      const { successCount, errorCount } = getResponseCount(responses);
      const toastMessages = [];

      if (successCount) {
        const message = i18n.global.t(
          'pageSnmpAlerts.toast.successBatchDelete',
          successCount,
        );
        toastMessages.push({ type: 'success', message });
      }

      if (errorCount) {
        const message = i18n.global.t(
          'pageSnmpAlerts.toast.errorBatchDelete',
          errorCount,
        );
        toastMessages.push({ type: 'error', message });
      }

      return toastMessages;
    },
  });
};

/**
 * Add destination
 */
export const useAddDestination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const snmpAlertUrl = await getSnmpAlertUrl();
      await api.post(snmpAlertUrl, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.settings.snmpAlerts());
      return i18n.global.t('pageSnmpAlerts.toast.successAddDestination');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageSnmpAlerts.toast.errorAddDestination'),
      );
    },
  });
};

// ============================================================================
// DATE TIME QUERIES
// ============================================================================

/**
 * Get NTP data
 */
export const useGetNtpData = () => {
  return useQuery({
    queryKey: queryKeys.settings.dateTime(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Managers/bmc/NetworkProtocol',
      );

      return {
        ntpServers: data.NTP.NTPServers,
        isNtpProtocolEnabled: data.NTP.ProtocolEnabled,
        networkSuppliedServers: data?.NTP?.NetworkSuppliedServers,
      };
    },
  });
};

/**
 * Update date time
 */
export const useUpdateDateTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dateTimeForm) => {
      const ntpData = {
        NTP: {
          ProtocolEnabled: dateTimeForm.ntpProtocolEnabled,
        },
      };

      if (dateTimeForm.ntpProtocolEnabled) {
        ntpData.NTP.NTPServers = dateTimeForm.ntpServersArray;
      }

      await api.patch('/redfish/v1/Managers/bmc/NetworkProtocol', ntpData);

      if (!dateTimeForm.ntpProtocolEnabled) {
        const dateTimeData = {
          DateTime: dateTimeForm.updatedDateTime,
        };

        // Get current NTP status to determine timeout
        const { data } = await api.get(
          '/redfish/v1/Managers/bmc/NetworkProtocol',
        );
        const isNtpProtocolEnabled = data.NTP.ProtocolEnabled;
        const timeoutVal = isNtpProtocolEnabled ? 20000 : 0;

        await new Promise((resolve, reject) => {
          setTimeout(() => {
            api
              .patch('/redfish/v1/Managers/bmc', dateTimeData)
              .then(() => resolve())
              .catch(() => reject());
          }, timeoutVal);
        });
      }

      return dateTimeForm.ntpProtocolEnabled;
    },
    onSuccess: (ntpEnabled) => {
      queryClient.invalidateQueries(queryKeys.settings.dateTime());
      if (ntpEnabled) {
        return i18n.global.t(
          'pageDateTime.toast.successSaveDateTimeForNtpServer',
        );
      } else {
        return i18n.global.t('pageDateTime.toast.successSaveDateTime');
      }
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageDateTime.toast.errorSaveDateTime'));
    },
  });
};

// ============================================================================
// HARDWARE DECONFIGURATION QUERIES
// ============================================================================

/**
 * Get processors collection
 */
const getProcessorsCollection = async () => {
  const { data } = await api.get(
    '/redfish/v1/Systems/system/Processors?$expand=.($levels=2)',
  );
  return data.Members;
};

/**
 * Get cores for a processor
 */
const getCores = async (processor) => {
  const locationCode = processor.Location.PartLocation.ServiceLabel;
  const procId = processor.Id;

  const { data } = await api.get(
    `${processor['@odata.id']}/SubProcessors?$expand=.($levels=2)`,
  );
  const cores = data.Members;

  if (!cores) return [];

  const coreData = cores.map((data) => {
    let msgArgs = 'None';
    let eventId = '';
    const conditionsArray = data.Status?.Conditions;

    if (Array.isArray(conditionsArray) && conditionsArray.length) {
      const messageArgsArray = conditionsArray[0].MessageArgs;
      if (Array.isArray(messageArgsArray) && messageArgsArray.length) {
        msgArgs = messageArgsArray[0];
      }
      const logEntry = conditionsArray[0].LogEntry;
      if (logEntry) {
        const eventIdUrl = logEntry['@odata.id'];
        const splitUrl = eventIdUrl.split('/');
        eventId = splitUrl[splitUrl.length - 1];
      }
    }

    const deconfigurationTypeMap = {
      'By Association': i18n.global.t(
        'pageDeconfigurationHardware.table.filter.byAssociation',
      ),
      Error: i18n.global.t('pageDeconfigurationHardware.table.filter.error'),
      Fatal: i18n.global.t('pageDeconfigurationHardware.table.filter.fatal'),
      'FCO-Deconfigured': i18n.global.t(
        'pageDeconfigurationHardware.table.filter.fcoDeconfigured',
      ),
      Invalid: i18n.global.t(
        'pageDeconfigurationHardware.table.filter.invalid',
      ),
      Manual: i18n.global.t('pageDeconfigurationHardware.table.filter.manual'),
      None: i18n.global.t('pageDeconfigurationHardware.table.filter.none'),
      Predictive: i18n.global.t(
        'pageDeconfigurationHardware.table.filter.predictive',
      ),
      Recovered: i18n.global.t(
        'pageDeconfigurationHardware.table.filter.recovered',
      ),
      Unknown: i18n.global.t(
        'pageDeconfigurationHardware.table.filter.unknown',
      ),
    };

    return {
      name: data.Name,
      status: data.Status.Health,
      id: data.Id,
      location: locationCode,
      functionalState: data.Status?.Health,
      settings: data.Enabled,
      uri: data['@odata.id'],
      deconfigurationType: deconfigurationTypeMap[msgArgs] || msgArgs,
      processorId: procId,
      eventID: eventId,
    };
  });

  return coreData;
};

/**
 * Get processors (cores)
 */
export const useGetProcessors = () => {
  return useQuery({
    queryKey: [...queryKeys.settings.hardwareDeconfiguration(), 'cores'],
    queryFn: async () => {
      const collection = await getProcessorsCollection();
      if (!collection) return [];

      const coresPromises = collection.map((processor) => getCores(processor));
      const coresArrays = await Promise.all(coresPromises);
      const totalCores = [].concat(...coresArrays);

      return totalCores;
    },
  });
};

/**
 * Get DIMMs
 */
export const useGetDimms = () => {
  return useQuery({
    queryKey: [...queryKeys.settings.hardwareDeconfiguration(), 'dimms'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Systems/system/Memory?$expand=.($levels=2)',
      );
      const dimms = data.Members;

      if (!dimms) return [];

      const dimmsData = dimms.map((data) => {
        let msgArgs = 'None';
        let eventId = '';
        const conditionsArray = data.Status?.Conditions;

        if (Array.isArray(conditionsArray) && conditionsArray.length) {
          const messageArgsArray = conditionsArray[0].MessageArgs;
          if (Array.isArray(messageArgsArray) && messageArgsArray.length) {
            msgArgs = messageArgsArray[0];
          }
          const logEntry = conditionsArray[0].LogEntry;
          if (logEntry) {
            const eventIdUrl = logEntry['@odata.id'];
            const splitUrl = eventIdUrl.split('/');
            eventId = splitUrl[splitUrl.length - 1];
          }
        }

        const deconfigurationTypeMap = {
          'By Association': i18n.global.t(
            'pageDeconfigurationHardware.table.filter.byAssociation',
          ),
          Error: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.error',
          ),
          Fatal: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.fatal',
          ),
          'FCO-Deconfigured': i18n.global.t(
            'pageDeconfigurationHardware.table.filter.fcoDeconfigured',
          ),
          Invalid: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.invalid',
          ),
          Manual: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.manual',
          ),
          None: i18n.global.t('pageDeconfigurationHardware.table.filter.none'),
          Predictive: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.predictive',
          ),
          Recovered: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.recovered',
          ),
          Unknown: i18n.global.t(
            'pageDeconfigurationHardware.table.filter.unknown',
          ),
        };

        return {
          id: data.Id,
          name: data.Name,
          functionalState: data.Status?.Health,
          size: data.CapacityMiB,
          locationCode: data.Location?.PartLocation?.ServiceLabel,
          deconfigurationType: deconfigurationTypeMap[msgArgs] || msgArgs,
          settings: data.Enabled,
          uri: data['@odata.id'],
          available: data.Status?.State,
          eventID: eventId,
        };
      });

      const dimmsDataFiltered = dimmsData.filter(
        (item) => item.available !== 'Absent',
      );

      return dimmsDataFiltered;
    },
  });
};

/**
 * Update settings state (DIMM)
 */
export const useUpdateSettingsState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsState) => {
      await api.patch(settingsState.uri, {
        Enabled: settingsState.settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.settings.hardwareDeconfiguration(),
        'dimms',
      ]);
    },
    onError: (error, settingsState) => {
      console.log('error', error);
      const messageId =
        error.response.data.error['@Message.ExtendedInfo'][0].MessageId;

      if (REGEX_MAPPINGS.resourceCannotBeDeleted.test(messageId)) {
        throw new Error(
          i18n.global.t('pageDeconfigurationHardware.toast.deleteReqFailed'),
        );
      } else if (settingsState.settings) {
        throw new Error(
          i18n.global.t(
            'pageDeconfigurationHardware.toast.errorConfiguringDIMM',
          ),
        );
      } else {
        throw new Error(
          i18n.global.t(
            'pageDeconfigurationHardware.toast.errorDeconfiguringDIMM',
          ),
        );
      }
    },
  });
};

/**
 * Update cores settings state
 */
export const useUpdateCoresSettingsState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsState) => {
      await api.patch(settingsState.uri, {
        Enabled: settingsState.settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.settings.hardwareDeconfiguration(),
        'cores',
      ]);
    },
    onError: (error, settingsState) => {
      console.log('error', error);
      const messageId =
        error.response.data.error['@Message.ExtendedInfo'][0].MessageId;

      if (REGEX_MAPPINGS.resourceCannotBeDeleted.test(messageId)) {
        throw new Error(
          i18n.global.t('pageDeconfigurationHardware.toast.deleteReqFailed'),
        );
      } else if (settingsState.settings) {
        throw new Error(
          i18n.global.t(
            'pageDeconfigurationHardware.toast.errorConfiguringProcessorCore',
          ),
        );
      } else {
        throw new Error(
          i18n.global.t(
            'pageDeconfigurationHardware.toast.errorDeconfiguringProcessorCore',
          ),
        );
      }
    },
  });
};

// Made with Bob
