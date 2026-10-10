<template>
  <button :class="$style.btn" :aria-label="$t('player__sound_effect')" @click="visible = true">
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="90%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-tune-variant" />
    </svg>
  </button>
  <SoundEffectModal v-model:show="visible" :teleport="teleport" />
</template>

<script setup>
import { ref } from '@common/utils/vueTools'
import SoundEffectModal from './SoundEffectModal.vue'

defineProps({
  teleport: {
    type: String,
    default: '#root',
  },
})

const visible = ref(false)

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btn {
  position: relative;
  justify-content: center;
  align-items: center;
  transition: color @transition-normal;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 24px;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;

  svg {
    transition: opacity @transition-fast;
    opacity: .6;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    svg {
      opacity: .9;
    }
  }
  &:active {
    svg {
      opacity: 1;
    }
  }
}

</style>
