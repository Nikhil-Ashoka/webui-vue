import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from '@/api/queryKeys';
import api, { getResponseCount } from '@/api';
import i18n from '@/i18n';
import { find } from 'lodash';

// ============================================================================
// CERTIFICATE TYPES CONSTANT
// ============================================================================

export const CERTIFICATE_TYPES = [
  {
    type: 'HTTPS Certificate',
    location: '/redfish/v1/Managers/bmc/NetworkProtocol/HTTPS/Certificates',
    label: 'HTTPS Certificate',
    limit: 1,
  },
  {
    type: 'LDAP Certificate',
    location: '/redfish/v1/AccountService/LDAP/Certificates',
    label: 'LDAP Certificate',
    limit: 1,
  },
  {
    type: 'TrustStore Certificate',
    location: '/redfish/v1/Managers/bmc/Truststore/Certificates',
    label: 'TrustStore Certificate',
  },
  {
    type: 'ServiceLogin Certificate',
    location: '/redfish/v1/AccountService/Accounts/service',
    label: 'ServiceLogin Certificate',
    limit: 1,
  },
];

// ============================================================================
// SESSIONS QUERIES
// ============================================================================

/**
 * Get sessions data
 */
export const useGetSessionsData = () => {
  return useQuery({
    queryKey: queryKeys.security.sessions(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/SessionService/Sessions');

      const sessionUris = data.Members.map(
        (sessionLogs) => sessionLogs['@odata.id'],
      );

      const sessionResponses = await Promise.all(
        sessionUris.map((sessionUri) => api.get(sessionUri)),
      );

      const allConnectionsData = sessionResponses.map((sessionUri) => {
        // For filtering IP address to IPv4
        const filteredIPAddress =
          sessionUri.data?.ClientOriginIPAddress.split('::ffff:').pop();
        return {
          isSelected: false,
          clientID: sessionUri.data?.Context,
          username: sessionUri.data?.UserName,
          ipAddress: filteredIPAddress,
          uri: sessionUri.data['@odata.id'],
        };
      });

      return allConnectionsData;
    },
  });
};

/**
 * Disconnect sessions
 */
export const useDisconnectSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uris) => {
      const promises = uris.map((uri) =>
        api.delete(uri).catch((error) => {
          console.log(error);
          return error;
        }),
      );

      const responses = await Promise.all(promises);
      return responses;
    },
    onSuccess: (responses) => {
      queryClient.invalidateQueries(queryKeys.security.sessions());

      const { successCount, errorCount } = getResponseCount(responses);
      const toastMessages = [];

      if (successCount) {
        const message = i18n.global.t(
          'pageSessions.toast.successDelete',
          successCount,
        );
        toastMessages.push({ type: 'success', message });
      }

      if (errorCount) {
        const message = i18n.global.t(
          'pageSessions.toast.errorDelete',
          errorCount,
        );
        toastMessages.push({ type: 'error', message });
      }

      return toastMessages;
    },
  });
};

// ============================================================================
// LDAP QUERIES
// ============================================================================

/**
 * Get account settings (LDAP and Active Directory)
 */
export const useGetAccountSettings = () => {
  return useQuery({
    queryKey: queryKeys.security.ldap(),
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/AccountService');

      const { LDAP = {}, ActiveDirectory = {} } = data;
      const ldapEnabled = LDAP.ServiceEnabled;
      const activeDirectoryEnabled = ActiveDirectory.ServiceEnabled;

      return {
        ldap: LDAP,
        activeDirectory: ActiveDirectory,
        isServiceEnabled: ldapEnabled || activeDirectoryEnabled,
        enabledRoleGroups:
          (ldapEnabled
            ? LDAP.RemoteRoleMapping
            : ActiveDirectory.RemoteRoleMapping) || [],
        isActiveDirectoryEnabled: activeDirectoryEnabled,
      };
    },
  });
};

/**
 * Save LDAP settings
 */
export const useSaveLdapSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (properties) => {
      // Get current settings to check if AD is enabled
      const { data } = await api.get('/redfish/v1/AccountService');

      // Disable Active Directory if enabled
      if (data.ActiveDirectory?.ServiceEnabled) {
        await api.patch('/redfish/v1/AccountService', {
          ActiveDirectory: { ServiceEnabled: false },
        });
      }

      await api.patch('/redfish/v1/AccountService', {
        LDAP: properties,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.security.ldap());
      return i18n.global.t('pageLdap.toast.successSaveLdapSettings');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageLdap.toast.errorSaveLdapSettings'));
    },
  });
};

/**
 * Save Active Directory settings
 */
export const useSaveActiveDirectorySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (properties) => {
      // Get current settings to check if LDAP is enabled
      const { data } = await api.get('/redfish/v1/AccountService');

      // Disable LDAP if enabled
      if (data.LDAP?.ServiceEnabled) {
        await api.patch('/redfish/v1/AccountService', {
          LDAP: { ServiceEnabled: false },
        });
      }

      await api.patch('/redfish/v1/AccountService', {
        ActiveDirectory: properties,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.security.ldap());
      return i18n.global.t('pageLdap.toast.successSaveActiveDirectorySettings');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageLdap.toast.errorSaveActiveDirectorySettings'),
      );
    },
  });
};

/**
 * Save account settings (wrapper for LDAP or Active Directory)
 */
export const useSaveAccountSettings = () => {
  const saveLdap = useSaveLdapSettings();
  const saveActiveDirectory = useSaveActiveDirectorySettings();

  return useMutation({
    mutationFn: async ({
      serviceEnabled,
      serviceAddress,
      activeDirectoryEnabled,
      bindDn,
      bindPassword,
      baseDn,
      userIdAttribute,
      groupIdAttribute,
    }) => {
      const data = {
        ServiceEnabled: serviceEnabled,
        ServiceAddresses: [serviceAddress],
        Authentication: {
          Username: bindDn,
          Password: bindPassword,
        },
        LDAPService: {
          SearchSettings: {
            BaseDistinguishedNames: [baseDn],
            GroupsAttribute: groupIdAttribute,
            UsernameAttribute: userIdAttribute,
          },
        },
      };

      if (activeDirectoryEnabled) {
        return await saveActiveDirectory.mutateAsync(data);
      } else {
        return await saveLdap.mutateAsync(data);
      }
    },
  });
};

/**
 * Add new role group
 */
export const useAddNewRoleGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupName, groupPrivilege }) => {
      const { data } = await api.get('/redfish/v1/AccountService');
      const { LDAP = {}, ActiveDirectory = {} } = data;

      const isActiveDirectoryEnabled = ActiveDirectory.ServiceEnabled;
      const enabledRoleGroups = isActiveDirectoryEnabled
        ? ActiveDirectory.RemoteRoleMapping || []
        : LDAP.RemoteRoleMapping || [];

      const RemoteRoleMapping = [
        ...enabledRoleGroups,
        {
          LocalRole: groupPrivilege,
          RemoteGroup: groupName,
        },
      ];

      const patchData = {};
      if (isActiveDirectoryEnabled) {
        patchData.ActiveDirectory = { RemoteRoleMapping };
      } else {
        patchData.LDAP = { RemoteRoleMapping };
      }

      await api.patch('/redfish/v1/AccountService', patchData);
      return groupName;
    },
    onSuccess: (groupName) => {
      queryClient.invalidateQueries(queryKeys.security.ldap());
      return i18n.global.t('pageLdap.toast.successAddRoleGroup', {
        groupName,
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageLdap.toast.errorAddRoleGroup'));
    },
  });
};

/**
 * Save role group
 */
export const useSaveRoleGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupNamePreviously, groupName, groupPrivilege }) => {
      const { data } = await api.get('/redfish/v1/AccountService');
      const { LDAP = {}, ActiveDirectory = {} } = data;

      const isActiveDirectoryEnabled = ActiveDirectory.ServiceEnabled;
      const enabledRoleGroups = isActiveDirectoryEnabled
        ? ActiveDirectory.RemoteRoleMapping || []
        : LDAP.RemoteRoleMapping || [];

      const RemoteRoleMapping = enabledRoleGroups.map((group) => {
        if (group.RemoteGroup === groupNamePreviously) {
          return {
            RemoteGroup: groupName,
            LocalRole: groupPrivilege,
          };
        } else {
          return {};
        }
      });

      const patchData = {};
      if (isActiveDirectoryEnabled) {
        patchData.ActiveDirectory = { RemoteRoleMapping };
      } else {
        patchData.LDAP = { RemoteRoleMapping };
      }

      await api.patch('/redfish/v1/AccountService', patchData);
      return groupName;
    },
    onSuccess: (groupName) => {
      queryClient.invalidateQueries(queryKeys.security.ldap());
      return i18n.global.t('pageLdap.toast.successSaveRoleGroup', {
        groupName,
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageLdap.toast.errorSaveRoleGroup'));
    },
  });
};

/**
 * Delete role group
 */
export const useDeleteRoleGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleGroups = [] }) => {
      const { data } = await api.get('/redfish/v1/AccountService');
      const { LDAP = {}, ActiveDirectory = {} } = data;

      const isActiveDirectoryEnabled = ActiveDirectory.ServiceEnabled;
      const enabledRoleGroups = isActiveDirectoryEnabled
        ? ActiveDirectory.RemoteRoleMapping || []
        : LDAP.RemoteRoleMapping || [];

      const RemoteRoleMapping = enabledRoleGroups.map((group) => {
        if (find(roleGroups, { groupName: group.RemoteGroup })) {
          return null;
        } else {
          return {};
        }
      });

      const patchData = {};
      if (isActiveDirectoryEnabled) {
        patchData.ActiveDirectory = { RemoteRoleMapping };
      } else {
        patchData.LDAP = { RemoteRoleMapping };
      }

      await api.patch('/redfish/v1/AccountService', patchData);
      return roleGroups.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(queryKeys.security.ldap());
      return i18n.global.t('pageLdap.toast.successDeleteRoleGroup', count);
    },
    onError: (error, { roleGroups }) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageLdap.toast.errorDeleteRoleGroup', roleGroups.length),
      );
    },
  });
};

// ============================================================================
// CERTIFICATES QUERIES
// ============================================================================

/**
 * Helper functions
 */
const getCertificateProp = (type, prop) => {
  const certificate = CERTIFICATE_TYPES.find(
    (certificate) => certificate.type === type,
  );
  return certificate ? certificate[prop] : null;
};

const convertFileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

/**
 * Get ACF certificate
 */
export const useGetAcfCertificate = () => {
  return useQuery({
    queryKey: [...queryKeys.security.certificates(), 'acf'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/AccountService/Accounts/service',
      );

      const ACF = data.Oem?.IBM?.ACF;
      let acfCertificate = [];

      if (ACF?.ExpirationDate) {
        acfCertificate = [
          {
            type: '',
            location: '/redfish/v1/AccountService/Accounts/service',
            certificate: 'ServiceLogin Certificate',
            issuedBy: '',
            issuedTo: '',
            validFrom: '',
            validUntil: new Date(ACF.ExpirationDate),
          },
        ];
      }

      return acfCertificate;
    },
  });
};

/**
 * Get certificates
 */
export const useGetCertificates = () => {
  return useQuery({
    queryKey: queryKeys.security.certificates(),
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/CertificateService/CertificateLocations',
      );

      const certificateLocations = data.Links.Certificates.map(
        (certificate) => certificate['@odata.id'],
      );

      const responses = await Promise.all(
        certificateLocations.map((location) => api.get(location)),
      );

      const certificates = responses.map(({ data }) => {
        const {
          Name,
          ValidNotAfter,
          ValidNotBefore,
          Issuer = {},
          Subject = {},
        } = data;
        return {
          type: Name,
          location: data['@odata.id'],
          certificate: getCertificateProp(Name, 'label'),
          issuedBy: Issuer.CommonName,
          issuedTo: Subject.CommonName,
          validFrom: new Date(ValidNotBefore),
          validUntil: new Date(ValidNotAfter),
        };
      });

      return certificates;
    },
  });
};

/**
 * Get available upload types (computed from certificates)
 */
export const useGetAvailableUploadTypes = () => {
  const { data: acfCertificates = [] } = useGetAcfCertificate();
  const { data: certificates = [] } = useGetCertificates();

  const allCertificates = [...acfCertificates, ...certificates];

  const availableUploadTypes = CERTIFICATE_TYPES.filter((certificateType) => {
    const certificateCount = allCertificates.filter(
      (certificate) =>
        certificate.type === certificateType.type ||
        certificate.certificate === certificateType.type,
    ).length;
    return certificateType.limit !== certificateCount;
  });

  return availableUploadTypes;
};

/**
 * Add new ACF certificate
 */
export const useAddNewACFCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type }) => {
      const base64File = await convertFileToBase64(file);

      await api.patch(
        getCertificateProp(type, 'location'),
        {
          Oem: {
            IBM: {
              ACF: {
                ACFFile: base64File.split('base64,')[1],
              },
            },
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      return i18n.global.t('pageCertificates.toast.successAddCertificate', {
        certificate: getCertificateProp(type, 'label'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorAddCertificate'),
      );
    },
  });
};

/**
 * Add new ACF certificate on login page (no auth required)
 */
export const useAddNewACFCertificateOnLoginPage = () => {
  return useMutation({
    mutationFn: async ({ file, type }) => {
      const base64File = await convertFileToBase64(file);

      await api.patch(
        getCertificateProp(type, 'location'),
        {
          Oem: {
            IBM: {
              ACF: {
                ACFFile: base64File.split('base64,')[1],
              },
            },
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      return type;
    },
    onSuccess: (type) => {
      return i18n.global.t('pageCertificates.toast.successAddCertificate', {
        certificate: getCertificateProp(type, 'label'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorAddCertificate'),
      );
    },
  });
};

/**
 * Add new certificate
 */
export const useAddNewCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type }) => {
      await api.post(getCertificateProp(type, 'location'), file, {
        headers: { 'Content-Type': 'application/x-pem-file' },
      });

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      const typeOfCertificate = getCertificateProp(type, 'label');

      if (typeOfCertificate === 'HTTPS Certificate') {
        return i18n.global.t(
          'pageCertificates.toast.successAddedHTTPCertificate',
          {
            certificate: getCertificateProp(type, 'label'),
          },
        );
      } else {
        return i18n.global.t('pageCertificates.toast.successAddCertificate', {
          certificate: getCertificateProp(type, 'label'),
        });
      }
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorAddCertificate'),
      );
    },
  });
};

/**
 * Replace ACF certificate
 */
export const useReplaceACFCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type, location }) => {
      const base64File = await convertFileToBase64(file);

      await api.patch(
        location,
        {
          Oem: {
            IBM: {
              ACF: {
                ACFFile: base64File.split('base64,')[1],
              },
            },
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      return i18n.global.t('pageCertificates.toast.successReplaceCertificate', {
        certificate: getCertificateProp(type, 'label'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorReplaceCertificate'),
      );
    },
  });
};

/**
 * Replace certificate
 */
export const useReplaceCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificateString, location, type }) => {
      await api.post(
        '/redfish/v1/CertificateService/Actions/CertificateService.ReplaceCertificate',
        {
          CertificateString: certificateString,
          CertificateType: 'PEM',
          CertificateUri: { '@odata.id': location },
        },
      );

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      const typeOfCertificate = getCertificateProp(type, 'label');

      if (typeOfCertificate === 'HTTPS Certificate') {
        return i18n.global.t(
          'pageCertificates.toast.successReplacedHTTPCertificate',
          {
            certificate: getCertificateProp(type, 'label'),
          },
        );
      } else {
        return i18n.global.t(
          'pageCertificates.toast.successReplaceCertificate',
          {
            certificate: getCertificateProp(type, 'label'),
          },
        );
      }
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorReplaceCertificate'),
      );
    },
  });
};

/**
 * Delete ACF certificate
 */
export const useDeleteACFCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, location }) => {
      await api.patch(location, {
        Oem: {
          IBM: {
            ACF: {
              ACFFile: '',
            },
          },
        },
      });

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      return i18n.global.t('pageCertificates.toast.successDeleteCertificate', {
        certificate: getCertificateProp(type, 'label'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorDeleteCertificate'),
      );
    },
  });
};

/**
 * Delete certificate
 */
export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, location }) => {
      await api.delete(location);
      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries(queryKeys.security.certificates());
      return i18n.global.t('pageCertificates.toast.successDeleteCertificate', {
        certificate: getCertificateProp(type, 'label'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageCertificates.toast.errorDeleteCertificate'),
      );
    },
  });
};

/**
 * Generate CSR
 */
export const useGenerateCsr = () => {
  return useMutation({
    mutationFn: async (userData) => {
      const {
        certificateType,
        country,
        state,
        city,
        companyName,
        companyUnit,
        commonName,
        keyPairAlgorithm,
        keyBitLength,
        keyCurveId,
        contactPerson,
        emailAddress,
        alternateName,
      } = userData;

      const data = {
        CertificateCollection: {
          '@odata.id': getCertificateProp(certificateType, 'location'),
        },
        Country: country,
        State: state,
        City: city,
        Organization: companyName,
        OrganizationalUnit: companyUnit,
        CommonName: commonName,
        KeyPairAlgorithm: keyPairAlgorithm,
        AlternativeNames: alternateName,
      };

      if (keyCurveId) data.KeyCurveId = keyCurveId;
      if (keyBitLength) data.KeyBitLength = parseInt(keyBitLength);
      if (contactPerson) data.ContactPerson = contactPerson;
      if (emailAddress) data.Email = emailAddress;

      await api.post(
        '/redfish/v1/CertificateService/Actions/CertificateService.GenerateCSR',
        data,
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(i18n.global.t('pageCertificates.toast.errorGenerateCsr'));
    },
  });
};

// ============================================================================
// POLICIES QUERIES
// ============================================================================

/**
 * Get network protocol status
 */
export const useGetNetworkProtocolStatus = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'networkProtocol'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/Managers/bmc/NetworkProtocol',
      );

      const sshProtocol = data.SSH.ProtocolEnabled;
      const ipmiProtocol = data.IPMI.ProtocolEnabled;

      return {
        sshProtocolEnabled: sshProtocol,
        ipmiProtocolEnabled: ipmiProtocol,
      };
    },
  });
};

/**
 * Get USB firmware update policy
 */
export const useGetUsbFirmwareUpdatePolicy = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'usbFirmwareUpdate'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Managers/bmc');
      return data.Oem.IBM.USBCodeUpdateEnabled;
    },
  });
};

/**
 * Get unauthenticated ACF upload enablement
 */
export const useGetUnauthenticatedACFUploadEnablement = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'acfUpload'],
    queryFn: async () => {
      const { data } = await api.get(
        '/redfish/v1/AccountService/Accounts/service',
      );
      return data?.Oem?.IBM?.ACF?.AllowUnauthACFUpload;
    },
  });
};

/**
 * Get basic auth status
 */
export const useGetBasicAuth = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'basicAuth'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/AccountService');
      return data?.Oem?.OpenBMC?.AuthMethods?.BasicAuth;
    },
  });
};

/**
 * Get BIOS status (RTAD, VTPM, SVLE, Host USB)
 */
export const useGetBiosStatus = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'bios'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system/Bios');

      const rtadEnabled = data.Attributes.pvm_rtad === 'Enabled';
      const vtpmEnabled = data.Attributes.pvm_vtpm === 'Enabled';
      const svleEnabled =
        data.Attributes.hb_secure_ver_lockin_enabled === 'Enabled';
      const hostUsbEnabled =
        data.Attributes.hb_host_usb_enablement === 'Enabled';

      return {
        rtadEnabled,
        vtpmEnabled,
        svleEnabled,
        hostUsbEnabled,
      };
    },
  });
};

/**
 * Get TPM policy
 */
export const useGetTpmPolicy = () => {
  return useQuery({
    queryKey: [...queryKeys.security.policies(), 'tpm'],
    queryFn: async () => {
      const { data } = await api.get('/redfish/v1/Systems/system');
      const tpmState = data.Boot.TrustedModuleRequiredToBoot;
      return tpmState === 'Required';
    },
  });
};

/**
 * Save TPM policy
 */
export const useSaveTpmPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (protocolEnabled) => {
      await api.patch('/redfish/v1/Systems/system', {
        Boot: {
          TrustedModuleRequiredToBoot: protocolEnabled,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.security.policies(), 'tpm']);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.hostTpm'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.hostTpm'),
        }),
      );
    },
  });
};

/**
 * Save USB firmware update policy
 */
export const useSaveUsbFirmwareUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedUsbCode) => {
      await api.patch('/redfish/v1/Managers/bmc', {
        Oem: {
          IBM: {
            USBCodeUpdateEnabled: updatedUsbCode,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.security.policies(),
        'usbFirmwareUpdate',
      ]);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.usbFirmwareUpdatePolicy'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.usbFirmwareUpdatePolicy'),
        }),
      );
    },
  });
};

/**
 * Save unauthenticated ACF upload enablement
 */
export const useSaveUnauthenticatedACFUploadEnablement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedAcfUploadEnablement) => {
      await api.patch('/redfish/v1/AccountService/Accounts/service', {
        Oem: {
          IBM: {
            ACF: {
              AllowUnauthACFUpload: updatedAcfUploadEnablement,
            },
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.security.policies(),
        'acfUpload',
      ]);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.acfUploadEnablement'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.acfUploadEnablement'),
        }),
      );
    },
  });
};

/**
 * Save IPMI protocol state
 */
export const useSaveIpmiProtocolState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (protocolEnabled) => {
      await api.patch('/redfish/v1/Managers/bmc/NetworkProtocol', {
        IPMI: {
          ProtocolEnabled: protocolEnabled,
        },
      });

      // Delay to allow protocol to enable/disable
      setTimeout(() => {
        queryClient.invalidateQueries([
          ...queryKeys.security.policies(),
          'networkProtocol',
        ]);
      }, 30000);
    },
    onSuccess: () => {
      return i18n.global.t(
        'pagePolicies.toast.successIpmiNetworkPolicyUpdate',
        {
          policy: i18n.global.t('pagePolicies.ipmi'),
        },
      );
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.ipmi'),
        }),
      );
    },
  });
};

/**
 * Save SSH protocol state
 */
export const useSaveSshProtocolState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (protocolEnabled) => {
      await api.patch('/redfish/v1/Managers/bmc/NetworkProtocol', {
        SSH: {
          ProtocolEnabled: protocolEnabled,
        },
      });

      return protocolEnabled;
    },
    onSuccess: (protocolEnabled) => {
      queryClient.invalidateQueries([
        ...queryKeys.security.policies(),
        'networkProtocol',
      ]);
      if (protocolEnabled) {
        return i18n.global.t('pagePolicies.toast.successEnableBmcShell');
      } else {
        return i18n.global.t('pagePolicies.toast.successDisableBmcShell');
      }
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.ssh'),
        }),
      );
    },
  });
};

/**
 * Save RTAD state
 */
export const useSaveRtadState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedRtad) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          pvm_rtad: updatedRtad,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.security.policies(), 'bios']);
      return i18n.global.t('pagePolicies.toast.successNextBootToast', {
        policy: i18n.global.t('pagePolicies.rtad'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.rtad'),
        }),
      );
    },
  });
};

/**
 * Save VTPM state
 */
export const useSaveVtpmState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedVtpm) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          pvm_vtpm: updatedVtpm,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.security.policies(), 'bios']);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.vtpm'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.vtpm'),
        }),
      );
    },
  });
};

/**
 * Save SVLE state
 */
export const useSaveSvleState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedSvle) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_secure_ver_lockin_enabled: updatedSvle,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.security.policies(), 'bios']);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.secureVersion'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.secureVersion'),
        }),
      );
    },
  });
};

/**
 * Save Host USB enabled
 */
export const useSaveHostUsbEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedHostUsb) => {
      await api.patch('/redfish/v1/Systems/system/Bios/Settings', {
        Attributes: {
          hb_host_usb_enablement: updatedHostUsb,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([...queryKeys.security.policies(), 'bios']);
      return i18n.global.t('pagePolicies.toast.successNextBootToast', {
        policy: i18n.global.t('pagePolicies.hostUsb'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.hostUsb'),
        }),
      );
    },
  });
};

/**
 * Save basic auth enabled
 */
export const useSaveBasicAuthEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedBasicAuth) => {
      await api.patch('/redfish/v1/AccountService', {
        Oem: { OpenBMC: { AuthMethods: { BasicAuth: updatedBasicAuth } } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.security.policies(),
        'basicAuth',
      ]);
      return i18n.global.t('pagePolicies.toast.successNetworkPolicyUpdate', {
        policy: i18n.global.t('pagePolicies.basicAuth'),
      });
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pagePolicies.toast.errorNetworkPolicyUpdate', {
          policy: i18n.global.t('pagePolicies.basicAuth'),
        }),
      );
    },
  });
};

// Made with Bob
