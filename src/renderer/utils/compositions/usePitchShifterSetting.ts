import { computed } from '@common/utils/vueTools'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import {
  clampPitchSemitones,
  playbackRateToSemitones,
  semitonesToPlaybackRate,
} from '@renderer/utils/pitchShifter'

export default () => {
  const pitchPlaybackRate = computed(() => appSetting['player.soundEffect.pitchShifter.playbackRate'])
  const pitchSemitones = computed(() => playbackRateToSemitones(pitchPlaybackRate.value))

  const setPitchPlaybackRate = async(value: number) => {
    if (appSetting['player.mediaDeviceId'] != 'default') {
      await setMediaDeviceId('default').catch(_ => _)
      saveMediaDeviceId('default')
    }
    updateSetting({ 'player.soundEffect.pitchShifter.playbackRate': value })
  }

  const setPitchSemitones = async(semitones: number) => {
    const clamped = clampPitchSemitones(semitones)
    await setPitchPlaybackRate(semitonesToPlaybackRate(clamped))
  }

  const resetPitch = async() => setPitchPlaybackRate(1)

  return {
    pitchPlaybackRate,
    pitchSemitones,
    setPitchPlaybackRate,
    setPitchSemitones,
    resetPitch,
  }
}
