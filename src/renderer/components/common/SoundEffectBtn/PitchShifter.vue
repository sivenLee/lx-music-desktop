<template>
  <div :class="$style.contnet">
    <div class="player__sound_effect_title" :class="$style.header">
      <h3>
        {{ $t('player__sound_effect_pitch_shifter') }}
        <svg-icon class="help-icon" name="information-slab-circle-outline" :aria-label="$t('player__sound_effect_pitch_shifter_tip')" />
      </h3>
      <base-btn min @click="handleReset">{{ $t('player__sound_effect_pitch_shifter_reset_btn') }}</base-btn>
    </div>
    <div :class="$style.eqList">
      <div :class="$style.eqItem">
        <span :class="$style.label">{{ semitoneLabel }}</span>
        <base-slider-bar
          :class="$style.slider"
          :value="pitchSemitones"
          :min="PITCH_SEMITONE_MIN"
          :max="PITCH_SEMITONE_MAX"
          :step="1"
          @change="handleUpdateSemitones"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import usePitchShifterSetting from '@renderer/utils/compositions/usePitchShifterSetting'
import {
  PITCH_SEMITONE_MAX,
  PITCH_SEMITONE_MIN,
  clampPitchSemitones,
  formatPitchSemitoneNum,
} from '@renderer/utils/pitchShifter'

const t = useI18n()
const { pitchSemitones, setPitchSemitones, resetPitch } = usePitchShifterSetting()

const semitoneLabel = computed(() => t('player__sound_effect_pitch_shifter_preset_semitones', {
  num: formatPitchSemitoneNum(pitchSemitones.value),
}))

const handleUpdateSemitones = (value) => {
  setPitchSemitones(clampPitchSemitones(value)).catch(() => {})
}

const handleReset = () => {
  resetPitch().catch(() => {})
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.contnet {
  padding-top: 15px;
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
  min-height: 0;
  flex: none;
  &:before {
    .mixin-after();
    position: absolute;
    top: 0;
    height: 1px;
    width: 100%;
    border-top: 1px dashed var(--color-primary-light-100-alpha-700);
  }
}
.header {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 5px;
  // padding-top: 5px;
}
.eqList {
  display: flex;
  flex-flow: column nowrap;
  gap: 15px;
  width: 100%;
}
.eqItem {
  display: flex;
  flex-flow: row nowrap;
  gap: 8px;
}
.label {
  flex: none;
  // width: 50px;
  font-size: 12px;
}
.value {
  flex: none;
  width: 40px;
  font-size: 12px;
  text-align: center;

  &.active {
    color: var(--color-primary-font);
  }
}

.footer {
  display: flex;
  flex-flow: row nowrap;
  // justify-content: space-between;
  justify-content: center;
  align-items: center;
  // font-size: 13px;
  span {
    line-height: 1.2;
  }
}

.slider {
  flex: auto;
}

.checkbox {
  margin-right: 10px;
  font-size: 13px;
}

.saveList {
  display: flex;
  flex-flow: row wrap;
  margin-top: 10px;
  gap: 10px;
}

</style>
