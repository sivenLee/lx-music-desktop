<template>
  <material-modal :show="visible" movable teleport="#view" width="720px" max-width="94%" @close="handleClose">
    <main :class="$style.modal">
      <div :class="$style.titleRow">
        <h2 :class="$style.title" data-modal-drag>{{ $t('local_music_save_as_title') }}</h2>
        <base-btn min :disabled="!musicInfo || isSaving" @click="handlePlay">{{ $t('list__play') }}</base-btn>
      </div>
      <div :class="$style.filePath" :title="sourcePath">{{ sourcePath || '-' }}</div>

      <section v-if="sourceInfo" :class="$style.section">
        <h3 :class="$style.sectionTitle">{{ $t('local_music_save_as_source_info') }}</h3>
        <div :class="$style.sourceInfoGrid">
          <div v-for="(row, index) in sourceInfoRows" :key="index" :class="$style.sourceInfoRow">
            <span :class="$style.sourceInfoLabel">{{ row.label }}</span>
            <span :class="$style.sourceInfoValue">{{ row.value }}</span>
          </div>
        </div>
      </section>

      <section :class="$style.section">
        <h3 :class="$style.sectionTitle">{{ $t('local_music_save_as_format') }}</h3>
        <div :class="$style.formatRow">
          <label :class="$style.radioLabel">
            <input v-model="targetFormat" type="radio" value="flac" />
            <span>FLAC</span>
          </label>
          <label :class="$style.radioLabel">
            <input v-model="targetFormat" type="radio" value="mp3" />
            <span>MP3</span>
          </label>
        </div>
      </section>

      <section v-if="targetFormat === 'flac'" :class="$style.section">
        <h3 :class="$style.sectionTitle">{{ $t('local_music_save_as_encode_options') }}</h3>
        <div :class="$style.optionGrid">
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_sample_rate') }}</label>
          <base-selection
            :class="$style.optionSelect"
            :model-value="sampleRate"
            :list="flacSampleRateOptions"
            item-key="id"
            item-name="label"
            @update:model-value="sampleRate = $event"
          />
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_bit_depth') }}</label>
          <base-selection
            :class="$style.optionSelect"
            :model-value="flacBitDepth"
            :list="flacBitDepthOptions"
            item-key="id"
            item-name="label"
            @update:model-value="flacBitDepth = $event"
          />
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_compression') }}</label>
          <base-selection
            :class="$style.optionSelect"
            :model-value="flacCompressionLevel"
            :list="flacCompressionOptions"
            item-key="id"
            item-name="label"
            @update:model-value="flacCompressionLevel = $event"
          />
        </div>
      </section>

      <section v-else :class="$style.section">
        <h3 :class="$style.sectionTitle">{{ $t('local_music_save_as_encode_options') }}</h3>
        <div :class="$style.optionGrid">
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_sample_rate') }}</label>
          <base-selection
            :class="$style.optionSelect"
            :model-value="sampleRate"
            :list="mp3SampleRateOptions"
            item-key="id"
            item-name="label"
            @update:model-value="sampleRate = $event"
          />
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_bitrate') }}</label>
          <base-selection
            :class="$style.optionSelect"
            :model-value="mp3BitrateKbps"
            :list="mp3BitrateOptions"
            item-key="id"
            item-name="label"
            @update:model-value="mp3BitrateKbps = $event"
          />
        </div>
        <p v-if="mp3ResampleHint" :class="$style.resampleHint">{{ mp3ResampleHint }}</p>
      </section>

      <div :class="$style.checkRow">
        <label :class="$style.checkLabel">
          <input v-model="preserveMetadata" type="checkbox" />
          <span>{{ $t('local_music_save_as_preserve_metadata') }}</span>
        </label>
        <label :class="$style.checkLabel">
          <input v-model="preserveLyrics" type="checkbox" />
          <span>{{ $t('local_music_save_as_preserve_lyrics') }}</span>
        </label>
      </div>

      <PitchShifter />

      <section :class="$style.section">
        <h3 :class="$style.sectionTitle">{{ $t('local_music_save_as_output') }}</h3>
        <div :class="$style.optionGrid">
          <label :class="$style.optionLabel">{{ $t('local_music_save_as_file_name') }}</label>
          <input
            v-model="outputFileBaseName"
            :class="$style.textInput"
            type="text"
            :disabled="isSaving"
            :placeholder="defaultOutputBaseName"
          />
        </div>
        <div :class="$style.outputRow">
          <input :class="$style.outputInput" type="text" readonly :value="outputPath" :placeholder="$t('local_music_save_as_output_placeholder')" />
          <base-btn min :disabled="isSaving" @click="handleBrowseOutput">{{ $t('local_music_save_as_browse') }}</base-btn>
        </div>
      </section>

      <div :class="$style.footer">
        <base-btn :disabled="isSaving" @click="handleClose">{{ $t('local_music_save_as_cancel') }}</base-btn>
        <base-btn :disabled="isSaving || !canSave" @click="handleSave">{{ isSaving ? `${$t('loading')}...` : $t('local_music_save_as_ok') }}</base-btn>
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { computed, ref, watch } from '@common/utils/vueTools'
import { basename, extname, dirname, joinPath } from '@common/utils/nodejs'
import { filterFileName } from '@renderer/utils'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'
import { openSaveDir, localMusicSaveAsAudio, localMusicGetSaveAsSourceInfo } from '@renderer/utils/ipc'
import usePitchShifterSetting from '@renderer/utils/compositions/usePitchShifterSetting'
import PitchShifter from '@renderer/components/common/SoundEffectBtn/PitchShifter.vue'
import {
  SAVE_AS_SAMPLE_RATES,
  SAVE_AS_FLAC_BIT_DEPTHS,
  SAVE_AS_FLAC_COMPRESSION_LEVELS,
  SAVE_AS_MP3_BITRATES_KBPS,
  MP3_LAME_SAMPLE_RATES,
  DEFAULT_FLAC_COMPRESSION_LEVEL,
  DEFAULT_MP3_BITRATE_KBPS,
  getRawSelectedSampleRate,
  clampSampleRateForMp3,
  isMp3LameSampleRateSupported,
  validateLocalMusicSaveAsParams,
} from '@common/utils/ffmpegAudioSaveAs'

interface MusicSaveAsModalEmit {
  (event: 'update:visible', value: boolean): void
  (event: 'saved', payload: { outputPath: string }): void
  (event: 'play', payload: LX.Music.MusicInfoLocal): void
}

export default {
  name: 'MusicSaveAsModal',
  components: {
    PitchShifter,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    musicInfo: {
      type: Object as () => LX.Music.MusicInfoLocal | null,
      default: null,
    },
  },
  emits: ['update:visible', 'saved', 'play'],
  setup(props: {
    visible: boolean
    musicInfo: LX.Music.MusicInfoLocal | null
  }, { emit }: { emit: MusicSaveAsModalEmit }) {
    const t = useI18n()
    const targetFormat = ref<'flac' | 'mp3'>('flac')
    const { pitchSemitones } = usePitchShifterSetting()
    const outputPath = ref('')
    const outputDir = ref('')
    const outputFileBaseName = ref('')
    const isSaving = ref(false)
    const sourceInfo = ref<LX.LocalMusic.SaveAsSourceInfo | null>(null)

    const sampleRate = ref(0)
    const flacBitDepth = ref<0 | 16 | 24>(0)
    const flacCompressionLevel = ref(DEFAULT_FLAC_COMPRESSION_LEVEL)
    const mp3BitrateKbps = ref(0)
    const preserveMetadata = ref(true)
    const preserveLyrics = ref(true)

    const sourcePath = computed(() => props.musicInfo?.meta.filePath ?? '')

    const defaultOutputBaseName = computed(() => {
      const filePath = sourcePath.value
      if (!filePath) return 'audio'
      const base = basename(filePath, extname(filePath))
      return filterFileName(base) || 'audio'
    })

    const flacSampleRateOptions = computed(() => {
      const rates = new Set<number>([...SAVE_AS_SAMPLE_RATES])
      if (sourceInfo.value?.sampleRate) {
        rates.add(Math.round(sourceInfo.value.sampleRate))
      }
      const sorted = [...rates].sort((a, b) => a - b)
      return [
        { id: 0, label: t('local_music_save_as_rate_source') },
        ...sorted.map(id => ({ id, label: `${id} Hz` })),
      ]
    })

    const mp3SampleRateOptions = computed(() => [
      { id: 0, label: t('local_music_save_as_rate_source') },
      ...MP3_LAME_SAMPLE_RATES.map(id => ({ id, label: `${id} Hz` })),
    ])

    const sourceInfoRows = computed(() => {
      const info = sourceInfo.value
      if (!info) return []
      const unknown = t('local_music_save_as_source_unknown')
      return [
        {
          label: t('local_music_save_as_source_sample_rate'),
          value: info.sampleRate ? `${Math.round(info.sampleRate)} Hz` : unknown,
        },
        {
          label: t('local_music_save_as_source_bit_depth'),
          value: info.bitsPerSample != null ? `${info.bitsPerSample} bit` : unknown,
        },
        {
          label: t('local_music_save_as_source_bitrate'),
          value: info.bitrateKbps != null ? `${info.bitrateKbps} kbps` : unknown,
        },
        {
          label: t('local_music_save_as_source_codec'),
          value: info.codec?.trim() || unknown,
        },
        {
          label: t('local_music_save_as_source_channels'),
          value: info.channels != null ? String(info.channels) : unknown,
        },
        {
          label: t('local_music_save_as_source_lossless'),
          value: info.lossless == null
            ? unknown
            : (info.lossless ? t('local_music_save_as_source_yes') : t('local_music_save_as_source_no')),
        },
      ]
    })

    const mp3ResampleHint = computed(() => {
      if (targetFormat.value !== 'mp3' || !sourceInfo.value) return ''
      const raw = getRawSelectedSampleRate({
        sampleRate: sampleRate.value,
        flacBitDepth: flacBitDepth.value,
        flacCompressionLevel: flacCompressionLevel.value,
        mp3BitrateKbps: mp3BitrateKbps.value,
        preserveMetadata: preserveMetadata.value,
        preserveLyrics: preserveLyrics.value,
      }, sourceInfo.value)
      const resolved = clampSampleRateForMp3(raw)
      if (raw === resolved) return ''
      return t('local_music_save_as_mp3_resample_hint', { from: raw, to: resolved })
    })

    const flacBitDepthOptions = computed(() => [
      { id: 0, label: t('local_music_save_as_depth_source') },
      ...SAVE_AS_FLAC_BIT_DEPTHS.map(id => ({ id, label: `${id} bit` })),
    ])

    const flacCompressionOptions = computed(() => (
      SAVE_AS_FLAC_COMPRESSION_LEVELS.map(id => ({ id, label: String(id) }))
    ))

    const mp3BitrateOptions = computed(() => [
      { id: 0, label: t('local_music_save_as_bitrate_source') },
      ...SAVE_AS_MP3_BITRATES_KBPS.map(id => ({ id, label: `${id} kbps` })),
    ])

    const resetEncodeOptions = () => {
      sampleRate.value = 0
      flacBitDepth.value = 0
      flacCompressionLevel.value = DEFAULT_FLAC_COMPRESSION_LEVEL
      preserveMetadata.value = true
      preserveLyrics.value = true
      const ext = extname(sourcePath.value).replace(/^\./, '').toLowerCase()
      mp3BitrateKbps.value = ext === 'mp3' ? 0 : DEFAULT_MP3_BITRATE_KBPS
    }

    const loadSourceInfo = async() => {
      const filePath = sourcePath.value
      if (!filePath) {
        sourceInfo.value = null
        return
      }
      try {
        sourceInfo.value = await localMusicGetSaveAsSourceInfo(filePath)
      } catch (err) {
        console.error(err)
        sourceInfo.value = {
          sampleRate: 44100,
          bitsPerSample: 16,
          bitrateKbps: null,
          codec: '',
          container: '',
          channels: null,
          lossless: null,
        }
      }
    }

    const syncOutputPathFromParts = () => {
      if (!sourcePath.value) {
        outputPath.value = ''
        return
      }
      const dir = outputDir.value || dirname(sourcePath.value)
      const rawName = outputFileBaseName.value.trim() || defaultOutputBaseName.value
      const safeName = filterFileName(rawName) || defaultOutputBaseName.value
      outputPath.value = joinPath(dir, `${safeName}.${targetFormat.value}`)
    }

    const initOutputLocation = () => {
      if (!sourcePath.value) return
      outputDir.value = dirname(sourcePath.value)
      outputFileBaseName.value = defaultOutputBaseName.value
      syncOutputPathFromParts()
    }

    watch(() => props.visible, (visible) => {
      if (!visible) return
      targetFormat.value = 'flac'
      resetEncodeOptions()
      initOutputLocation()
      loadSourceInfo().catch((err) => {
        console.error(err)
      })
    })

    watch(targetFormat, () => {
      if (targetFormat.value === 'mp3' && sampleRate.value > 0 &&
        !isMp3LameSampleRateSupported(sampleRate.value)) {
        sampleRate.value = 0
      }
      syncOutputPathFromParts()
      if (targetFormat.value === 'mp3') {
        const ext = extname(sourcePath.value).replace(/^\./, '').toLowerCase()
        if (ext !== 'mp3' && mp3BitrateKbps.value === 0) {
          mp3BitrateKbps.value = DEFAULT_MP3_BITRATE_KBPS
        }
      }
    })

    watch(sourcePath, () => {
      if (!props.visible) return
      resetEncodeOptions()
      initOutputLocation()
      loadSourceInfo().catch((err) => {
        console.error(err)
      })
    })

    watch([outputFileBaseName, sampleRate], () => {
      if (!props.visible) return
      syncOutputPathFromParts()
    })

    const canSave = computed(() => {
      const name = filterFileName(outputFileBaseName.value.trim()) || defaultOutputBaseName.value
      return Boolean(sourcePath.value && name && outputPath.value.trim())
    })

    const handleClose = () => {
      if (isSaving.value) return
      emit('update:visible', false)
    }

    const handlePlay = () => {
      if (!props.musicInfo || isSaving.value) return
      emit('play', props.musicInfo)
    }

    const handleBrowseOutput = async() => {
      if (!outputPath.value) syncOutputPathFromParts()
      const result = await openSaveDir({
        title: window.i18n.t('local_music_save_as_output'),
        defaultPath: outputPath.value || undefined,
        filters: [
          { name: targetFormat.value.toUpperCase(), extensions: [targetFormat.value] },
        ],
      })
      if (result.canceled || !result.filePath) return
      let filePath = result.filePath
      const ext = extname(filePath).replace(/^\./, '').toLowerCase()
      if (ext !== targetFormat.value) {
        filePath = `${filePath}.${targetFormat.value}`
      }
      outputPath.value = filePath
      outputDir.value = dirname(filePath)
      outputFileBaseName.value = basename(filePath, extname(filePath))
    }

    const handleSave = async() => {
      syncOutputPathFromParts()
      const src = sourcePath.value
      const out = outputPath.value.trim()
      if (!src || !out || isSaving.value) return
      const info = sourceInfo.value ?? await localMusicGetSaveAsSourceInfo(src).catch(() => null)
      if (!info) {
        await dialog(t('local_music_save_as_failed', { message: t('local_music_save_as_source_unknown') }))
        return
      }
      const encodeOptions = {
        sampleRate: sampleRate.value,
        flacBitDepth: flacBitDepth.value,
        flacCompressionLevel: flacCompressionLevel.value,
        mp3BitrateKbps: mp3BitrateKbps.value,
        preserveMetadata: preserveMetadata.value,
        preserveLyrics: preserveLyrics.value,
      }
      try {
        validateLocalMusicSaveAsParams({
          sourcePath: src,
          outputPath: out,
          targetFormat: targetFormat.value,
          pitchSemitones: pitchSemitones.value,
          encodeOptions,
          sourceInfo: info,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await dialog(t('local_music_save_as_failed', { message }))
        return
      }
      isSaving.value = true
      try {
        await localMusicSaveAsAudio({
          sourcePath: src,
          outputPath: out,
          targetFormat: targetFormat.value,
          pitchSemitones: pitchSemitones.value,
          encodeOptions,
        })
        emit('saved', { outputPath: out })
        emit('update:visible', false)
        await dialog(window.i18n.t('local_music_save_as_success'))
      } catch (err) {
        console.error(err)
        const message = err instanceof Error ? err.message : String(err)
        await dialog(window.i18n.t('local_music_save_as_failed', { message }))
      } finally {
        isSaving.value = false
      }
    }

    return {
      targetFormat,
      outputPath,
      outputFileBaseName,
      defaultOutputBaseName,
      isSaving,
      sourcePath,
      sourceInfo,
      sourceInfoRows,
      mp3ResampleHint,
      sampleRate,
      flacBitDepth,
      flacCompressionLevel,
      mp3BitrateKbps,
      preserveMetadata,
      preserveLyrics,
      flacSampleRateOptions,
      mp3SampleRateOptions,
      flacBitDepthOptions,
      flacCompressionOptions,
      mp3BitrateOptions,
      canSave,
      handleClose,
      handleBrowseOutput,
      handleSave,
      handlePlay,
    }
  },
}
</script>

<style lang="less" module>
.modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px 18px;
  min-height: 0;
}
.titleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.filePath {
  font-size: 12px;
  opacity: 0.75;
  word-break: break-all;
  line-height: 1.4;
}
.sourceInfoGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px 16px;
}
.sourceInfoRow {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  min-width: 0;
}
.sourceInfoLabel {
  flex: none;
  opacity: 0.7;
}
.sourceInfoValue {
  min-width: 0;
  word-break: break-word;
}
.resampleHint {
  margin: 0;
  font-size: 12px;
  opacity: 0.85;
  color: var(--color-primary-font);
}
.textInput {
  width: 100%;
  max-width: 420px;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--color-primary-light-100-alpha-700);
  border-radius: 4px;
  background: transparent;
  color: inherit;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sectionTitle {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}
.formatRow {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.radioLabel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
.optionGrid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 12px;
  align-items: center;
}
.optionLabel {
  font-size: 13px;
  white-space: nowrap;
}
.optionSelect {
  min-width: 0;
  max-width: 280px;
}
.checkRow {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
}
.checkLabel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.outputRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.outputInput {
  flex: 1 1 200px;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--color-primary-light-100-alpha-700);
  border-radius: 4px;
  background: transparent;
  color: inherit;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}
</style>
