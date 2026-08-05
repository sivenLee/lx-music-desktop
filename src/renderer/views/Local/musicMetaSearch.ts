import musicSdk from '@renderer/utils/musicSdk'
import { toNewMusicInfo } from '@common/utils/tools'
import { getPicPath, getLyricInfo } from '@renderer/core/music'
import type { MusicMetaSearchResultPayload } from './musicMetaEditTypes'

export interface MusicMetaSearchResultItem {
  name: string
  singer: string
  albumName: string
  interval?: string
  source: LX.OnlineSource
  songmid?: string | number
  hash?: string
  img?: string
  lrc?: string | null
  year?: string
  track?: string
  disc?: string
  genre?: string
  language?: string
  types?: Array<{ type: string, size?: string }>
  [key: string]: any
}

export const getMusicMetaSearchSources = () => {
  return (musicSdk.sources as Array<{ id: string, name: string }>)
    .filter(item => item.id !== 'xm' && musicSdk[item.id as LX.OnlineSource]?.musicSearch)
    .map(item => ({
      id: item.id as LX.OnlineSource,
      name: item.name,
    }))
}

export const getDefaultMusicMetaSearchSource = (): LX.OnlineSource => {
  const sources = getMusicMetaSearchSources()
  if (sources.some(item => item.id === 'tx')) return 'tx'
  return sources[0]?.id ?? 'tx'
}

export const searchMusicMetaResults = async(params: {
  title: string
  artist: string
  album?: string
  source?: LX.OnlineSource
  limit?: number
}): Promise<MusicMetaSearchResultItem[]> => {
  const name = params.title.trim()
  const singer = params.artist.trim()
  const album = `${params.album ?? ''}`.trim()
  if (!name && !singer && !album) {
    throw new Error('请至少填写标题或艺术家')
  }

  const source = params.source ?? getDefaultMusicMetaSearchSource()
  const api = musicSdk[source]?.musicSearch
  if (!api?.search) throw new Error('当前搜索源不可用')

  const keyword = `${name || album} ${singer}`.trim()
  const data = await api.search(keyword, 1, params.limit ?? 5) as { list?: MusicMetaSearchResultItem[] } | null
  const merged = (data?.list ?? []).filter(item => item?.name)
  const albumKeyword = album.toLowerCase()
  if (!albumKeyword) return merged
  return [
    ...merged.filter(item => `${item.albumName ?? ''}`.toLowerCase().includes(albumKeyword)),
    ...merged.filter(item => !`${item.albumName ?? ''}`.toLowerCase().includes(albumKeyword)),
  ]
}

export const buildMusicMetaSearchPayload = async(
  item: MusicMetaSearchResultItem,
): Promise<MusicMetaSearchResultPayload> => {
  const musicInfo = toNewMusicInfo(item) as LX.Music.MusicInfoOnline
  let coverUrl = item.img ?? ''
  let lyrics = ''
  try {
    const picUrl = await getPicPath({ musicInfo, isRefresh: true })
    if (picUrl) coverUrl = picUrl
  } catch (err) {
    console.log(err)
  }
  try {
    const lyricInfo = await getLyricInfo({ musicInfo, isRefresh: true })
    lyrics = lyricInfo.lyric ?? ''
  } catch (err) {
    console.log(err)
  }
  return {
    title: item.name ?? '',
    artist: item.singer ?? '',
    album: item.albumName ?? '',
    year: item.year ?? '',
    track: item.track ?? '',
    disc: item.disc ?? '',
    genre: item.genre ?? '',
    language: item.language ?? '',
    coverUrl,
    lyrics,
  }
}
