<template>
  <BModal
    id="modal-reset"
    ref="modal"
    v-model="modal"
    :title="$t(`pageFactoryReset.modal.${resetType}Title`)"
    title-tag="h2"
    @hidden="resetConfirm"
  >
    {{ $t(`pageFactoryReset.modal.${resetType}SettingsList`) }}
    <p class="mb-2">
      <strong>{{ $t(`pageFactoryReset.modal.${resetType}Header`) }}</strong>
    </p>
    <ul class="pl-3 mb-4">
      <li
        v-for="(item, index) in $t(
          `pageFactoryReset.modal.${resetType}SettingsList`,
        )"
        :key="index"
        class="mt-1 mb-1"
      >
        {{ item }}
        {{ index }}
      </li>
    </ul>

    <!-- Warning message -->
    <template v-if="!isServerOff">
      <p class="d-flex mb-2">
        <status-icon status="danger" />
        <span id="reset-to-default-warning" class="ml-1">
          {{ $t(`pageFactoryReset.modal.resetWarningMessage`) }}
        </span>
      </p>
      <BFormCheckbox
        v-model="confirm"
        aria-describedby="reset-to-default-warning"
        @input="$v.confirm.$touch()"
      >
        {{ $t(`pageFactoryReset.modal.resetWarningCheckLabel`) }}
      </BFormCheckbox>
      <BFormInvalidFeedback
        role="alert"
        :state="getValidationState(v$.confirm)"
      >
        {{ $t('global.form.fieldRequired') }}
      </BFormInvalidFeedback>
    </template>

    <template #modal-footer="{ cancel }">
      <BButton
        variant="secondary"
        data-test-id="factoryReset-button-cancel"
        @click="cancel()"
      >
        {{ $t('global.action.cancel') }}
      </BButton>
      <BButton
        type="sumbit"
        variant="primary"
        data-test-id="factoryReset-button-confirm"
        @click="handleConfirm"
      >
        {{ $t(`pageFactoryReset.modal.${resetType}SubmitText`) }}
      </BButton>
    </template>
  </BModal>
</template>

<script setup>
import { computed, defineProps, ref, defineEmits } from 'vue';
import { GlobalStore } from '@/store/modules/GlobalStore';
import useVuelidateComposable from '@/components/Composables/useVuelidateComposable';
import { useVuelidate } from '@vuelidate/core';
// import i18n from '@/i18n';

const { getValidationState } = useVuelidateComposable();
const Global = GlobalStore();
defineProps({
  resetType: {
    type: String,
    default: null,
  },
});
const modal = ref(false);
const confirm = ref(false);
const serverStatus = computed(() => Global.serverStatus);
const isServerOff = computed(() =>
  serverStatus.value === 'off' ? true : false,
);
const rules = {
  confirm: {
    mustBeTrue: (value) => isServerOff.value || value === true,
  },
};
const v$ = useVuelidate(rules, { confirm });
const emit = defineEmits(['okConfirm']);
function handleConfirm() {
  v$.value.$touch();
  if (v$.value.$invalid) return;
  emit('okConfirm');
  resetConfirm();
}
function resetConfirm() {
  confirm.value = false;
  v$.value.$reset();
}
</script>
