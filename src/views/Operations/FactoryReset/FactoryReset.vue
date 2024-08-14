<template>
  <BContainer fluid="xl">
    <page-title
      :title="$t('appPageTitle.factoryReset')"
      :description="$t('pageFactoryReset.description')"
    />
    <BRow>
      <BCol md="8" xl="6">
        <alert variant="info" class="mb-4">
          <span>
            {{ $t('pageFactoryReset.alert') }}
          </span>
        </alert>
      </BCol>
    </BRow>
    <!-- Reset Form -->
    <BForm id="factory-reset" @submit.prevent="onResetSubmit">
      <BRow>
        <BCol md="8">
          <BFormGroup :label="$t('pageFactoryReset.form.resetOptionsLabel')">
            <BFormRadioGroup
              id="factory-reset-options"
              v-model="resetOption"
              stacked
            >
              <BFormRadio
                class="mb-1"
                value="resetBios"
                aria-describedby="reset-bios"
                :disabled="serverStatus !== 'off'"
                data-test-id="factoryReset-radio-resetBios"
              >
                {{ $t('pageFactoryReset.form.resetBiosOptionLabel') }}
              </BFormRadio>
              <BFormText id="reset-bios" class="ml-4 mb-3">
                {{ $t('pageFactoryReset.form.resetBiosOptionHelperText') }}
              </BFormText>

              <BFormRadio
                class="mb-1"
                value="resetToDefaults"
                aria-describedby="reset-to-defaults"
                data-test-id="factoryReset-radio-resetToDefaults"
                :disabled="serverStatus !== 'off'"
              >
                {{ $t('pageFactoryReset.form.resetToDefaultsOptionLabel') }}
              </BFormRadio>
              <BFormText id="reset-to-defaults" class="ml-4 mb-3">
                {{
                  $t('pageFactoryReset.form.resetToDefaultsOptionHelperText')
                }}
              </BFormText>
            </BFormRadioGroup>
          </BFormGroup>
          <BButton
            v-b-modal.modal-reset
            type="submit"
            variant="primary"
            :disabled="serverStatus !== 'off'"
            data-test-id="factoryReset-button-submit"
          >
            {{ $t('global.action.reset') }}
          </BButton>
        </BCol>
      </BRow>
    </BForm>

    <!-- Modals -->
    <modal-reset :reset-type="resetOption" @okConfirm="onOkConfirm" />
  </BContainer>
</template>

<script setup>
import { ref, onMounted, computed, defineEmits } from 'vue';
import Alert from '../../../components/Global/Alert.vue';
import PageTitle from '../../../components/Global/PageTitle.vue';
import { GlobalStore } from '@/store/modules/GlobalStore';
import ModalReset from './FactoryResetModal.vue';
import useLoadingBar from '@/components/Composables/useLoadingBarComposable';
import useToastComposable from '@/components/Composables/useToastComposable';
import AuthenticationStore from '../../../store/modules/Authentication/AuthenticationStore';
import FactoryResetStore from '@/store/modules/Operations/FactoryResetStore';

const Global = GlobalStore();
const Authentication = AuthenticationStore();
const FactoryReset = FactoryResetStore();
const Toast = useToastComposable();
const Modal = ModalReset;
const { hideLoader, startLoader, endLoader } = useLoadingBar();
const resetOption = ref('resetBios');
const serverStatus = computed(() => {
  return Global.serverStatus;
});
onMounted(() => {
  hideLoader();
  emit('loading-bar-status', true);
});

const emit = defineEmits(['loading-bar-status']);

const onResetSubmit = () => {
  Modal;
};
const onOkConfirm = () => {
  if (resetOption.value === 'resetBios') {
    onResetBiosConfirm();
  } else {
    onResetToDefaultsConfirm();
  }
};
const onResetBiosConfirm = () => {
  FactoryReset.resetBios
    .then((message) => {
      Toast.successToast(message);
    })
    .catch(({ message }) => {
      Toast.errorToast('', {
        title: message,
      });
    });
};
const onResetToDefaultsConfirm = () => {
  startLoader();
  FactoryReset.resetBios
    .then(() => {
      return FactoryReset.resetToDefaults;
    })
    .then((message) => {
      Toast.successToast(message);
      setTimeout(() => {
        Authentication.logout;
      }, 3000);
    })
    .catch(({ message }) => Toast.errorToast(message))
    .finally(() => endLoader());
};
</script>
