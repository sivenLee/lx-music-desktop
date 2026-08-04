import { setMeta } from '@common/utils/musicMeta'
import { buildLyrics } from './lrcTool'

export const writeMeta = ({ filePath, isEmbedLyricLx, isEmbedLyricT, isEmbedLyricR, ...meta }: {
  filePath: string
  isEmbedLyricLx: boolean
  isEmbedLyricT: boolean
  isEmbedLyricR: boolean
  title: string
  artist: string
  album: string
  APIC: string | null
  year?: string | null
  track?: string | null
  disc?: string | null
  genre?: string | null
  language?: string | null
  comment?: string | null
  CUSTOM_TAGS?: string | null
}, lyric: LX.Music.LyricInfo, proxy?: { host: string, port: number }) => {
  void setMeta(filePath, { ...meta, lyrics: buildLyrics(lyric, isEmbedLyricLx, isEmbedLyricT, isEmbedLyricR) }, proxy)
}

export { saveLrc } from './utils'
