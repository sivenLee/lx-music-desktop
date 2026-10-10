export const PITCH_SEMITONE_MIN = -12
export const PITCH_SEMITONE_MAX = 12

/** 半音 → phase vocoder 的 pitchFactor */
export function semitonesToPlaybackRate(semitones: number): number {
  return 2 ** (semitones / 12)
}

export function playbackRateToSemitones(playbackRate: number): number {
  if (playbackRate === 1) return 0
  const semitones = Math.log2(playbackRate) * 12
  return Math.max(
    PITCH_SEMITONE_MIN,
    Math.min(PITCH_SEMITONE_MAX, Math.round(semitones)),
  )
}

export function clampPitchSemitones(semitones: number): number {
  return Math.max(PITCH_SEMITONE_MIN, Math.min(PITCH_SEMITONE_MAX, Math.round(semitones)))
}

export function formatPitchSemitoneNum(semitones: number): string {
  return semitones > 0 ? `+${semitones}` : `${semitones}`
}
