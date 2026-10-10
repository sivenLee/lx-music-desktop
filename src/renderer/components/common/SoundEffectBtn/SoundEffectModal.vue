<template>
  <material-modal :show="show" :overlay="false" :teleport="teleport" @close="handleClose">
    <div :class="$style.content">
      <div :class="['scroll', $style.row]">
        <AudioConvolution />
        <PitchShifter />
        <AudioPanner />
      </div>
      <div :class="['scroll', $style.row]">
        <BiquadFilter />
      </div>
    </div>
    <p v-if="showTip" :class="$style.tip">{{ $t('player__sound_effect_features_tip') }}</p>
  </material-modal>
</template>

<script setup>
import { ref, watch } from '@common/utils/vueTools'
import BiquadFilter from './BiquadFilter.vue'
import AudioPanner from './AudioPanner.vue'
import AudioConvolution from './AudioConvolution.vue'
import PitchShifter from './PitchShifter.vue'
import { appSetting } from '@renderer/store/setting'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  teleport: {
    type: String,
    default: '#root',
  },
})

const emit = defineEmits(['update:show'])

const showTip = ref(false)

watch(() => props.show, (visible) => {
  if (visible) showTip.value = appSetting['player.mediaDeviceId'] != 'default'
})

const handleClose = () => {
  emit('update:show', false)
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.content {
  display: flex;
  flex-flow: row nowrap;
  padding: 0 5px;
  margin: 15px 0;
  gap: 10px;
  position: relative;
  min-height: 0;

  &:before {
    .mixin-after();
    position: absolute;
    left: 50%;
    height: 100%;
    border-left: 1px dashed var(--color-primary-light-100-alpha-700);
  }

  :global {
    .player__sound_effect_title {
      font-size: 14px;
      padding-bottom: 8px;
    }
  }
}

.row {
  width: 50%;
  display: flex;
  gap: 15px;
  flex-flow: column nowrap;
  padding: 0 10px;
}

.tip {
  padding: 0 15px 15px;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.25;
  color: var(--color-font);
}

</style>
