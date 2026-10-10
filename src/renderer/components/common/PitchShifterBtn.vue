<template>
  <material-popup-btn :class="$style.btnContent">
    <button
      :class="[$style.btn, { [$style.active]: pitchSemitones != 0 }]"
      :aria-label="playbarLabel"
      @click.stop="openSoundEffectModal"
    >
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="90%" viewBox="0 0 24 24" space="preserve">
        <use xlink:href="#icon-tune-variant" />
      </svg>
    </button>
    <template #content>
      <div :class="$style.setting">
        <div :class="$style.info">
          <span>{{ semitoneLabel }}</span>
          <base-btn min @click="handleReset">{{ $t('player__sound_effect_pitch_shifter_reset_btn') }}</base-btn>
        </div>
        <base-slider-bar
          :class="$style.slider"
          :value="pitchSemitones"
          :min="PITCH_SEMITONE_MIN"
          :max="PITCH_SEMITONE_MAX"
          :step="1"
          @change="handleUpdateSemitones"
        />
      </div>
    </template>
  </material-popup-btn>
  <SoundEffectModal v-model:show="soundEffectVisible" />
</template>

<script setup>
import { computed, ref } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import SoundEffectModal from './SoundEffectBtn/SoundEffectModal.vue'
import usePitchShifterSetting from '@renderer/utils/compositions/usePitchShifterSetting'
import {
  PITCH_SEMITONE_MAX,
  PITCH_SEMITONE_MIN,
  clampPitchSemitones,
  formatPitchSemitoneNum,
} from '@renderer/utils/pitchShifter'

const t = useI18n()
const { pitchSemitones, setPitchSemitones, resetPitch } = usePitchShifterSetting()

const soundEffectVisible = ref(false)

const playbarLabel = computed(() => t('player__sound_effect_playbar_label', {
  num: formatPitchSemitoneNum(pitchSemitones.value),
}))

const semitoneLabel = computed(() => t('player__sound_effect_pitch_shifter_preset_semitones', {
  num: formatPitchSemitoneNum(pitchSemitones.value),
}))

const openSoundEffectModal = () => {
  soundEffectVisible.value = true
}

const handleUpdateSemitones = (value) => {
  setPitchSemitones(clampPitchSemitones(value)).catch(() => {})
}

const handleReset = () => {
  resetPitch().catch(() => {})
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btnContent {
  flex: none;
  height: 100%;
}

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

  &.active {
    svg {
      color: var(--color-primary);
      opacity: .8;
    }
  }
}

.setting {
  display: flex;
  flex-flow: column nowrap;
  padding: 2px 3px;
  gap: 8px;
  width: 300px;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  span {
    line-height: 1.2;
  }
}

.slider {
  width: 100%;
}

</style>
