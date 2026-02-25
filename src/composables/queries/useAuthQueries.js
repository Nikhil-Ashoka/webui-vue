import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { useCookies } from 'vue3-cookies';
import Cookies from 'js-cookie';
import api from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { AuthenticationStore } from '@/store/modules/Authentication/AuthenticationStore';
import router from '@/router';

const { cookies } = useCookies();

// Query: Get Login Page Details
export const useGetLoginPageDetails = () => {
  const authStore = AuthenticationStore();

  return useQuery({
    queryKey: queryKeys.auth.loginPageDetails(),
    queryFn: async () => {
      const response = await api.get('/redfish/v1/');
      const data = response.data.Oem.IBM;
      const loginPageDetails = {
        dateTime: new Date(data.DateTime),
        model: data.Model,
        serial: data.SerialNumber,
        acfWindowActive: data.ACFWindowActive,
      };
      authStore.setLoginPageDetails(loginPageDetails);
      authStore.isGlobalMfaEnabled = data.MultiFactorAuthEnabled;
      return loginPageDetails;
    },
  });
};

// Query: Check Password Change Required
export const useCheckPasswordChangeRequired = (username) => {
  return useQuery({
    queryKey: queryKeys.auth.passwordChangeRequired(username),
    queryFn: async () => {
      const { data } = await api.get(
        `/redfish/v1/AccountService/Accounts/${username}`,
      );
      return data.PasswordChangeRequired;
    },
    enabled: !!username,
  });
};

// Mutation: Login
export const useLogin = () => {
  const authStore = AuthenticationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password, otpInfo = '' }) => {
      authStore.isGenerateOtpRequired = false;
      authStore.authError = false;
      authStore.unauthError = false;

      let requestBody = {};
      if (otpInfo === '') {
        requestBody = { UserName: username, Password: password };
      } else {
        requestBody = {
          UserName: username,
          Password: password,
          Token: otpInfo,
        };
      }

      const response = await api.post(
        '/redfish/v1/SessionService/Sessions',
        requestBody,
      );

      if (
        response.data['@Message.ExtendedInfo'] &&
        response.data['@Message.ExtendedInfo'][0].MessageId.endsWith(
          'GenerateSecretKeyRequired',
        )
      ) {
        authStore.isGenerateOtpRequired = true;
      }

      authStore.authSuccess();
      return response.data;
    },
    onError: (error) => {
      authStore.authError = true;
      throw error;
    },
    onSuccess: () => {
      // Invalidate all queries on successful login
      queryClient.invalidateQueries();
    },
  });
};

// Mutation: Logout
export const useLogout = () => {
  const authStore = AuthenticationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const headers = {
        'X-Xsrf-Token': cookies.get('X-XSRF-TOKEN'),
      };

      await api.post('/logout', { data: [] }, { headers: headers });

      Cookies.remove('XSRF-TOKEN');
      Cookies.remove('IsAuthenticated');
      localStorage.removeItem('storedModelType');
      localStorage.removeItem('storedUsername');
      localStorage.removeItem('storedCurrentUser');
      localStorage.removeItem('storedHmcManagedValue');
      localStorage.removeItem('storedLanguage');

      authStore.xsrfCookie = undefined;
      authStore.isAuthenticatedCookie = undefined;
      authStore.logoutRemove();
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
      router.replace('/login');
    },
    onError: (error) => {
      console.log(error);
      authStore.logoutRemove();
    },
  });
};

// Mutation: Unauthorized Login
export const useUnauthLogin = () => {
  const authStore = AuthenticationStore();

  return useMutation({
    mutationFn: async () => {
      authStore.unauthError = true;
    },
  });
};

// Made with Bob
