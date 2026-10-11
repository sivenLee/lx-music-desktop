import path from 'node:path'
import cp from 'node:child_process'
import fs from 'node:fs'
import { checkPath } from './nodejs'
import { setMeta } from './musicMeta'

export const LOCAL_MUSIC_SAVE_AS_SOURCE_EXTS = new Set([
  'wav', 'ape', 'flac', 'mp3', 'mp4', 'm4a',
])

export type LocalMusicSaveAsTargetFormat = 'flac' | 'mp3'

/** 0 表示保持源文件采样率 / 码率 */
export const SAVE_AS_SAMPLE_RATES = [
  8000, 11025, 16000, 22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000,
] as const

export const SAVE_AS_FLAC_BIT_DEPTHS = [16, 24] as const

export const SAVE_AS_FLAC_COMPRESSION_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

export const SAVE_AS_MP3_BITRATES_KBPS = [128, 192, 256, 320] as const

export const DEFAULT_FLAC_COMPRESSION_LEVEL = 5

export const DEFAULT_MP3_BITRATE_KBPS = 320

/** libmp3lame 支持的采样率 */
export const MP3_LAME_SAMPLE_RATES = [
  8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000,
] as const

export interface LocalMusicSaveAsSourceInfo {
  sampleRate: number
  bitsPerSample: number | null
  bitrateKbps: number | null
  codec: string
  container: string
  channels: number | null
  lossless: boolean | null
}

export interface LocalMusicSaveAsEncodeOptions {
  sampleRate: number
  flacBitDepth: 0 | 16 | 24
  flacCompressionLevel: number
  mp3BitrateKbps: number
  preserveMetadata: boolean
  preserveLyrics: boolean
}

export const isLocalMusicSaveAsSourceExt = (ext: string) => {
  return LOCAL_MUSIC_SAVE_AS_SOURCE_EXTS.has(ext.replace(/^\./, '').toLowerCase())
}

export const isLocalMusicSaveAsSourcePath = (filePath: string) => {
  return isLocalMusicSaveAsSourceExt(path.extname(filePath))
}

export const resolveFfmpegExecutable = (customPath: string) => {
  const trimmed = customPath.trim()
  return trimmed || 'ffmpeg'
}

export const normalizeSourceBitDepth = (bitsPerSample: number | null | undefined): 16 | 24 => {
  if (bitsPerSample == null || bitsPerSample <= 16) return 16
  return 24
}

export const pickDefaultMp3BitrateKbps = (sourceInfo: LocalMusicSaveAsSourceInfo): number => {
  if (sourceInfo.bitrateKbps == null) return DEFAULT_MP3_BITRATE_KBPS
  const kbps = sourceInfo.bitrateKbps
  const allowed = [...SAVE_AS_MP3_BITRATES_KBPS]
  if (allowed.includes(kbps as typeof SAVE_AS_MP3_BITRATES_KBPS[number])) return kbps
  return allowed.reduce((prev, cur) => (
    Math.abs(cur - kbps) < Math.abs(prev - kbps) ? cur : prev
  ))
}

const stringifyTagValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${value}`.trim()
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    const text = (value as { text?: unknown }).text
    return typeof text === 'string' ? text.trim() : ''
  }
  return ''
}

const extractEmbeddedNativeLyrics = (metadata: {
  native?: Record<string, Array<{ id?: string, value?: unknown }>>
}) => {
  const native = metadata.native ?? {}
  for (const fmt of Object.keys(native)) {
    const tags = native[fmt]
    if (!Array.isArray(tags)) continue
    for (const tag of tags) {
      const id = `${tag.id ?? ''}`.toUpperCase()
      if (id === 'LYRICS' || id === 'USLT' || id.endsWith(':LYRICS') || id.endsWith('/LYRICS')) {
        const text = stringifyTagValue(tag.value)
        if (text) return text
      }
    }
  }
  return ''
}

const readEmbeddedSourceLyrics = async(sourcePath: string): Promise<string> => {
  const { parseFile } = await import('music-metadata')
  let metadata
  try {
    metadata = await parseFile(sourcePath)
  } catch {
    return ''
  }
  const fromCommon = (metadata.common.lyrics
    ?.map(item => (typeof item === 'string' ? item : item.text ?? ''))
    .join('\n') ?? '').trim()
  if (fromCommon) return fromCommon
  return extractEmbeddedNativeLyrics(metadata)
}

const embedLyricsToOutputIfSupported = async(sourcePath: string, outputPath: string) => {
  const outExt = path.extname(outputPath).replace(/^\./, '').toLowerCase()
  if (outExt !== 'mp3' && outExt !== 'flac') return
  const lyrics = await readEmbeddedSourceLyrics(sourcePath)
  if (!lyrics) return

  const { parseFile } = await import('music-metadata')
  let metadata
  try {
    metadata = await parseFile(outputPath)
  } catch {
    return
  }
  const common = metadata.common
  const formatTrackDisc = (value?: { no: number | null, of: number | null }) => {
    if (value?.no == null) return null
    if (value.of == null) return `${value.no}`
    return `${value.no}/${value.of}`
  }
  await setMeta(outputPath, {
    title: common.title ?? path.basename(outputPath, path.extname(outputPath)),
    artist: common.artists?.length ? common.artists.join('、') : null,
    album: common.album ?? null,
    APIC: null,
    lyrics,
    year: common.year != null ? String(common.year) : null,
    track: formatTrackDisc(common.track),
    disc: formatTrackDisc(common.disk),
    genre: common.genre?.length ? common.genre.join(' / ') : null,
    language: common.language ?? null,
    comment: common.comment?.map(item => item.text?.trim() ?? '').filter(Boolean).join('\n') ?? null,
  })
}

export const probeSaveAsSourceInfo = async(filePath: string): Promise<LocalMusicSaveAsSourceInfo> => {
  const { parseFile } = await import('music-metadata')
  const metadata = await parseFile(filePath)
  const sampleRate = metadata.format.sampleRate ?? 44100
  const bitsPerSample = metadata.format.bitsPerSample ?? null
  const bitrate = metadata.format.bitrate
  return {
    sampleRate,
    bitsPerSample,
    bitrateKbps: bitrate != null ? Math.round(bitrate / 1000) : null,
    codec: metadata.format.codec ?? '',
    container: metadata.format.container ?? '',
    channels: metadata.format.numberOfChannels ?? null,
    lossless: metadata.format.lossless ?? null,
  }
}

export const isMp3LameSampleRateSupported = (rate: number) => {
  return (MP3_LAME_SAMPLE_RATES as readonly number[]).includes(rate)
}

/** 将任意采样率映射为 LAME 支持的采样率（用于 MP3 自动重采样） */
export const clampSampleRateForMp3 = (rate: number): number => {
  const rounded = Math.round(rate)
  if (isMp3LameSampleRateSupported(rounded)) return rounded
  const supported = [...MP3_LAME_SAMPLE_RATES]
  const atOrBelow = supported.filter(item => item <= rounded)
  const lastAtOrBelow = atOrBelow.at(-1)
  if (lastAtOrBelow != null) return lastAtOrBelow
  return supported.reduce((prev, cur) => (
    Math.abs(cur - rounded) < Math.abs(prev - rounded) ? cur : prev
  ))
}

export const getRawSelectedSampleRate = (
  encodeOptions: LocalMusicSaveAsEncodeOptions,
  sourceInfo: LocalMusicSaveAsSourceInfo,
) => (
  encodeOptions.sampleRate > 0 ? encodeOptions.sampleRate : Math.round(sourceInfo.sampleRate)
)

export const getEffectiveSampleRateForTarget = (
  targetFormat: LocalMusicSaveAsTargetFormat,
  encodeOptions: LocalMusicSaveAsEncodeOptions,
  sourceInfo: LocalMusicSaveAsSourceInfo,
) => {
  const raw = getRawSelectedSampleRate(encodeOptions, sourceInfo)
  if (targetFormat === 'mp3') return clampSampleRateForMp3(raw)
  return raw
}

const getEffectiveSampleRate = (
  targetFormat: LocalMusicSaveAsTargetFormat,
  encodeOptions: LocalMusicSaveAsEncodeOptions,
  sourceInfo: LocalMusicSaveAsSourceInfo,
) => getEffectiveSampleRateForTarget(targetFormat, encodeOptions, sourceInfo)

const getEffectiveFlacBitDepth = (
  encodeOptions: LocalMusicSaveAsEncodeOptions,
  sourceInfo: LocalMusicSaveAsSourceInfo,
): 16 | 24 => {
  const depth = encodeOptions.flacBitDepth
  if (depth === 16 || depth === 24) return depth
  return normalizeSourceBitDepth(sourceInfo.bitsPerSample)
}

const getEffectiveMp3BitrateKbps = (
  encodeOptions: LocalMusicSaveAsEncodeOptions,
  sourceInfo: LocalMusicSaveAsSourceInfo,
) => (
  encodeOptions.mp3BitrateKbps > 0
    ? encodeOptions.mp3BitrateKbps
    : pickDefaultMp3BitrateKbps(sourceInfo)
)

export const canStreamCopySaveAs = (options: {
  sourcePath: string
  targetFormat: LocalMusicSaveAsTargetFormat
  pitchSemitones: number
  encodeOptions: LocalMusicSaveAsEncodeOptions
  sourceInfo: LocalMusicSaveAsSourceInfo
}) => {
  const pitch = Math.round(options.pitchSemitones)
  if (pitch !== 0) return false
  const sourceExt = path.extname(options.sourcePath).replace(/^\./, '').toLowerCase()
  if (sourceExt !== options.targetFormat) return false
  const effectiveRate = getEffectiveSampleRateForTarget(
    options.targetFormat,
    options.encodeOptions,
    options.sourceInfo,
  )
  if (Math.round(options.sourceInfo.sampleRate) !== effectiveRate) {
    return false
  }
  if (options.targetFormat === 'mp3' && options.encodeOptions.sampleRate > 0 &&
    !isMp3LameSampleRateSupported(options.encodeOptions.sampleRate)) {
    return false
  }
  if (options.targetFormat === 'flac') {
    if (options.encodeOptions.flacBitDepth > 0 &&
      options.encodeOptions.flacBitDepth !== normalizeSourceBitDepth(options.sourceInfo.bitsPerSample)) {
      return false
    }
  }
  if (options.targetFormat === 'mp3' && options.encodeOptions.mp3BitrateKbps > 0) {
    const sourceKbps = pickDefaultMp3BitrateKbps(options.sourceInfo)
    if (options.encodeOptions.mp3BitrateKbps !== sourceKbps) return false
  }
  if (sourceExt === 'flac' && options.targetFormat === 'flac' &&
    options.encodeOptions.flacCompressionLevel !== DEFAULT_FLAC_COMPRESSION_LEVEL) {
    return false
  }
  return true
}

export const buildFfmpegSaveAsArgs = (options: {
  sourcePath: string
  outputPath: string
  targetFormat: LocalMusicSaveAsTargetFormat
  pitchSemitones: number
  encodeOptions: LocalMusicSaveAsEncodeOptions
  sourceInfo: LocalMusicSaveAsSourceInfo
}) => {
  const pitch = Math.round(options.pitchSemitones)
  const needPitch = pitch !== 0
  const targetFormat = options.targetFormat
  const { encodeOptions, sourceInfo } = options
  const streamCopy = !needPitch && canStreamCopySaveAs({
    sourcePath: options.sourcePath,
    targetFormat,
    pitchSemitones: pitch,
    encodeOptions,
    sourceInfo,
  })

  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    options.sourcePath,
  ]

  const audioFilters: string[] = []
  if (needPitch) audioFilters.push(`rubberband=pitch=${pitch}`)
  if (audioFilters.length) args.push('-af', audioFilters.join(','))

  if (streamCopy) {
    args.push('-c:a', 'copy')
  } else if (targetFormat === 'mp3') {
    const ar = getEffectiveSampleRate('mp3', encodeOptions, sourceInfo)
    const bitrate = getEffectiveMp3BitrateKbps(encodeOptions, sourceInfo)
    args.push('-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, '-ar', String(ar))
  } else {
    const ar = getEffectiveSampleRate('flac', encodeOptions, sourceInfo)
    const bitDepth = getEffectiveFlacBitDepth(encodeOptions, sourceInfo)
    args.push(
      '-c:a', 'flac',
      '-compression_level', String(encodeOptions.flacCompressionLevel),
      '-ar', String(ar),
      '-sample_fmt', bitDepth === 16 ? 's16' : 's32',
    )
  }

  if (encodeOptions.preserveMetadata) {
    args.push('-map_metadata', '0')
  } else {
    args.push('-map_metadata', '-1')
  }

  args.push(options.outputPath)
  return args
}

const runProcess = async(executable: string, args: string[]) => {
  await new Promise<void>((resolve, reject) => {
    const child = cp.spawn(executable, args, { windowsHide: true })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })
    child.on('error', (err) => {
      reject(err)
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      const detail = stderr.trim()
      reject(new Error(detail || `FFmpeg exited with code ${code ?? 'unknown'}`))
    })
  })
}

export const validateLocalMusicSaveAsParams = (options: {
  sourcePath: string
  outputPath: string
  targetFormat: LocalMusicSaveAsTargetFormat
  pitchSemitones: number
  encodeOptions: LocalMusicSaveAsEncodeOptions
  sourceInfo: LocalMusicSaveAsSourceInfo
}) => {
  const outputPath = path.resolve(options.outputPath.trim())
  const sourcePath = path.resolve(options.sourcePath)
  if (!options.outputPath.trim()) {
    throw new Error('Output path is required')
  }
  const baseName = path.basename(outputPath, path.extname(outputPath)).trim()
  if (!baseName) {
    throw new Error('Output file name is required')
  }
  if (sourcePath === outputPath) {
    throw new Error('Output path must differ from source file')
  }
  const outExt = path.extname(outputPath).replace(/^\./, '').toLowerCase()
  if (outExt !== options.targetFormat) {
    throw new Error('Output file extension does not match target format')
  }
  if (options.targetFormat === 'mp3' && options.encodeOptions.sampleRate > 0 &&
    !isMp3LameSampleRateSupported(options.encodeOptions.sampleRate)) {
    throw new Error(`MP3 sample rate must be one of: ${MP3_LAME_SAMPLE_RATES.join(', ')} Hz`)
  }
  if (options.encodeOptions.flacCompressionLevel < 0 || options.encodeOptions.flacCompressionLevel > 8) {
    throw new Error('FLAC compression level must be between 0 and 8')
  }
  if (options.targetFormat === 'mp3') {
    const bitrate = options.encodeOptions.mp3BitrateKbps > 0
      ? options.encodeOptions.mp3BitrateKbps
      : pickDefaultMp3BitrateKbps(options.sourceInfo)
    if (!(SAVE_AS_MP3_BITRATES_KBPS as readonly number[]).includes(bitrate)) {
      throw new Error('Invalid MP3 bitrate')
    }
  }
  const pitch = Math.round(options.pitchSemitones)
  if (pitch !== 0 && (pitch < -12 || pitch > 12)) {
    throw new Error('Pitch shift must be between -12 and +12 semitones')
  }
}

export const verifyFfmpegExecutable = async(executable: string) => {
  if (executable !== 'ffmpeg' && !await checkPath(executable)) {
    throw new Error('FFmpeg executable not found')
  }
  await runProcess(executable, ['-version'])
}

export const transcodeLocalMusicSaveAs = async(options: {
  sourcePath: string
  outputPath: string
  targetFormat: LocalMusicSaveAsTargetFormat
  pitchSemitones: number
  encodeOptions: LocalMusicSaveAsEncodeOptions
  ffmpegPath: string
}) => {
  const sourcePath = path.resolve(options.sourcePath)
  const outputPath = path.resolve(options.outputPath)
  if (!isLocalMusicSaveAsSourcePath(sourcePath)) {
    throw new Error('Unsupported source format')
  }
  if (!await checkPath(sourcePath)) {
    throw new Error('Source file not found')
  }
  if (sourcePath === outputPath) {
    throw new Error('Output path must differ from source file')
  }
  const outExt = path.extname(outputPath).replace(/^\./, '').toLowerCase()
  if (outExt !== options.targetFormat) {
    throw new Error('Output file extension does not match target format')
  }
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })

  const sourceInfo = await probeSaveAsSourceInfo(sourcePath)
  validateLocalMusicSaveAsParams({
    sourcePath,
    outputPath,
    targetFormat: options.targetFormat,
    pitchSemitones: options.pitchSemitones,
    encodeOptions: options.encodeOptions,
    sourceInfo,
  })
  const executable = resolveFfmpegExecutable(options.ffmpegPath)
  const args = buildFfmpegSaveAsArgs({
    sourcePath,
    outputPath,
    targetFormat: options.targetFormat,
    pitchSemitones: options.pitchSemitones,
    encodeOptions: options.encodeOptions,
    sourceInfo,
  })

  try {
    await runProcess(executable, args)
  } catch (err) {
    if (await checkPath(outputPath)) {
      await fs.promises.unlink(outputPath).catch(() => {})
    }
    throw err
  }

  if (options.encodeOptions.preserveLyrics) {
    await embedLyricsToOutputIfSupported(sourcePath, outputPath)
  }
}
