import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import api, { getResponseCount } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { UserManagementStore } from '@/store/modules/SecurityAndAccess/UserManagementStore';
import i18n from '@/i18n';

// Query: Get Users
export const useGetUsers = () => {
  const userStore = UserManagementStore();

  return useQuery({
    queryKey: queryKeys.security.users(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/AccountService/Accounts');
      const userIds = response.data.Members.map((user) => user['@odata.id']);

      const users = await api.all(userIds.map((user) => api.get(user)));
      const userData = users.map((user) => user.data);

      userStore.allUsers = userData.map((user) => ({
        ...user,
        isSelected: false,
      }));

      return userStore.allUsers;
    },
    onError: (error) => {
      console.log(error);
      let message = '';
      if (
        error.response?.data?.['@Message.ExtendedInfo'] &&
        error.response.data['@Message.ExtendedInfo'][0].MessageId.endsWith(
          'InsufficientPrivilege',
        )
      ) {
        message = i18n.global.t(
          'pageUserManagement.toast.errorLoadUsersPrivilege',
        );
      } else {
        message = i18n.global.t('pageUserManagement.toast.errorLoadUsers');
      }
      throw new Error(message);
    },
  });
};

// Query: Get Account Service
export const useGetAccountService = () => {
  const userStore = UserManagementStore();

  return useQuery({
    queryKey: [...queryKeys.security.all, 'accountService'],
    queryFn: async () => {
      const response = await api.get('/redfish/v1/AccountService');
      const data = response.data;

      userStore.accountLockoutDuration = data.AccountLockoutDuration;
      userStore.accountLockoutThreshold = data.AccountLockoutThreshold;
      userStore.accountMinPasswordLength = data.MinPasswordLength;
      userStore.accountMaxPasswordLength = data.MaxPasswordLength;
      userStore.accountRoles = data.Oem?.OpenBMC?.AccountTypes || [];
      userStore.isGlobalMfaEnabled = data.Oem?.IBM?.MultiFactorAuthEnabled;

      return data;
    },
  });
};

// Query: Get Secret Key Info
export const useGetSecretKeyInfo = (username) => {
  const userStore = UserManagementStore();

  return useQuery({
    queryKey: [...queryKeys.security.users(), 'secretKey', username],
    queryFn: async () => {
      const response = await api.get(
        `/redfish/v1/AccountService/Accounts/${username}`,
      );
      userStore.secretKeyInfo = response.data.Oem?.IBM?.SecretKeyInfo;
      userStore.isCurrentUserMfaBypassed =
        response.data.Oem?.IBM?.MFABypass || false;
      return userStore.secretKeyInfo;
    },
    enabled: !!username,
  });
};

// Mutation: Create User
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password, privilege, status }) => {
      const data = {
        UserName: username,
        Password: password,
        RoleId: privilege,
        Enabled: status,
      };
      await api.post('/redfish/v1/AccountService/Accounts', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return i18n.global.t('pageUserManagement.toast.successCreateUser');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorCreateUser'),
      );
    },
  });
};

// Mutation: Update User
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      originalUsername,
      username,
      password,
      privilege,
      status,
      locked,
    }) => {
      const data = {};
      if (username) data.UserName = username;
      if (password) data.Password = password;
      if (privilege) data.RoleId = privilege;
      if (status !== undefined) data.Enabled = status;
      if (locked !== undefined) data.Locked = locked;

      await api.patch(
        `/redfish/v1/AccountService/Accounts/${originalUsername}`,
        data,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return i18n.global.t('pageUserManagement.toast.successUpdateUser');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorUpdateUser'),
      );
    },
  });
};

// Mutation: Delete User
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username) => {
      await api.delete(`/redfish/v1/AccountService/Accounts/${username}`);
      return username;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return i18n.global.t('pageUserManagement.toast.successDeleteUser');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorDeleteUser'),
      );
    },
  });
};

// Mutation: Delete Multiple Users
export const useDeleteMultipleUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (users) => {
      const promises = users.map((user) =>
        api
          .delete(`/redfish/v1/AccountService/Accounts/${user.UserName}`)
          .catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageUserManagement.toast.errorDeleteUsers', {
                count: errorCount,
              })
            : i18n.global.t('pageUserManagement.toast.successDeleteUsers', {
                count: successCount,
              }),
      };
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorDeleteUsers'),
      );
    },
  });
};

// Mutation: Enable Multiple Users
export const useEnableMultipleUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (users) => {
      const promises = users.map((user) =>
        api
          .patch(`/redfish/v1/AccountService/Accounts/${user.UserName}`, {
            Enabled: true,
          })
          .catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageUserManagement.toast.errorEnableUsers', {
                count: errorCount,
              })
            : i18n.global.t('pageUserManagement.toast.successEnableUsers', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Disable Multiple Users
export const useDisableMultipleUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (users) => {
      const promises = users.map((user) =>
        api
          .patch(`/redfish/v1/AccountService/Accounts/${user.UserName}`, {
            Enabled: false,
          })
          .catch((error) => error),
      );
      const responses = await api.all(promises);
      return getResponseCount(responses);
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries(queryKeys.security.users());
      return {
        successCount,
        errorCount,
        message:
          errorCount > 0
            ? i18n.global.t('pageUserManagement.toast.errorDisableUsers', {
                count: errorCount,
              })
            : i18n.global.t('pageUserManagement.toast.successDisableUsers', {
                count: successCount,
              }),
      };
    },
  });
};

// Mutation: Save Account Settings
export const useSaveAccountSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lockoutThreshold, lockoutDuration }) => {
      const data = {
        AccountLockoutThreshold: lockoutThreshold,
        AccountLockoutDuration: lockoutDuration,
      };
      await api.patch('/redfish/v1/AccountService', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([
        ...queryKeys.security.all,
        'accountService',
      ]);
      return i18n.global.t('pageUserManagement.toast.successSaveSettings');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorSaveSettings'),
      );
    },
  });
};

// Mutation: Generate Secret Key
export const useGenerateSecretKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username) => {
      const response = await api.post(
        `/redfish/v1/AccountService/Accounts/${username}/Actions/OemIBMAccountService.GenerateSecretKey`,
        {},
      );
      return response.data;
    },
    onSuccess: (data, username) => {
      queryClient.invalidateQueries([
        ...queryKeys.security.users(),
        'secretKey',
        username,
      ]);
      return data;
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorGenerateSecretKey'),
      );
    },
  });
};

// Mutation: Delete Secret Key
export const useDeleteSecretKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username) => {
      await api.post(
        `/redfish/v1/AccountService/Accounts/${username}/Actions/OemIBMAccountService.DeleteSecretKey`,
        {},
      );
      return username;
    },
    onSuccess: (username) => {
      queryClient.invalidateQueries([
        ...queryKeys.security.users(),
        'secretKey',
        username,
      ]);
      return i18n.global.t('pageUserManagement.toast.successDeleteSecretKey');
    },
    onError: (error) => {
      console.log(error);
      throw new Error(
        i18n.global.t('pageUserManagement.toast.errorDeleteSecretKey'),
      );
    },
  });
};

// Made with Bob
