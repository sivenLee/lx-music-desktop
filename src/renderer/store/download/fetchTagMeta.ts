import { httpFetch } from '@renderer/utils/request'
import { formatGenre } from '@renderer/utils/musicSdk/utils'
import { weapi } from '@renderer/utils/musicSdk/wy/utils/crypto'
import musicSdk from '@renderer/utils/musicSdk'

export interface DownloadTagMeta {
  year: string
  track: string
  disc: string
  genre: string
  language: string
  comment: string
}

interface HttpFetchResult {
  promise: Promise<{ body: any, statusCode?: number }>
}

const requestJson = async(url: string, options: Record<string, unknown>) => {
  const requestObj = httpFetch(url, options) as unknown as HttpFetchResult
  return requestObj.promise
}

const createEmptyTagMeta = (): DownloadTagMeta => ({
  year: '',
  track: '',
  disc: '',
  genre: '',
  language: '',
  comment: '',
})

const trimText = (value: unknown) => `${value ?? ''}`.trim()

const hasValue = (value: string) => Boolean(trimText(value))

const mergeTagMeta = (base: DownloadTagMeta, next: Partial<DownloadTagMeta>): DownloadTagMeta => {
  return {
    year: hasValue(base.year) ? base.year : trimText(next.year),
    track: hasValue(base.track) ? base.track : trimText(next.track),
    disc: hasValue(base.disc) ? base.disc : trimText(next.disc),
    genre: hasValue(base.genre) ? base.genre : trimText(next.genre),
    language: hasValue(base.language) ? base.language : trimText(next.language),
    comment: hasValue(base.comment) ? base.comment : trimText(next.comment),
  }
}

const OVERRIDE_REQUIRED_KEYS: Array<keyof DownloadTagMeta> = [
  'year',
  'track',
  'disc',
  'genre',
  'language',
  'comment',
]

const isTagMetaComplete = (meta: DownloadTagMeta) => {
  return OVERRIDE_REQUIRED_KEYS.every(key => hasValue(meta[key]))
}

const normalizeName = (value: unknown) => {
  return trimText(value)
    .toLowerCase()
    .replace(/\s|'|\.|,|，|&|"|、|\(|\)|（|）|`|~|-|<|>|\||\/|\]|\[|!|！/g, '')
}

const getIntervalSeconds = (interval: string | null | undefined) => {
  if (!interval) return 0
  const parts = `${interval}`.split(':')
  let total = 0
  let unit = 1
  while (parts.length) {
    total += (parseInt(parts.pop() || '0', 10) || 0) * unit
    unit *= 60
  }
  return total
}

const pickBestSearchItem = <T extends {
  name?: string
  singer?: string
  albumName?: string
  interval?: string
}>(list: T[], musicInfo: LX.Music.MusicInfoOnline): T | null => {
  if (!Array.isArray(list) || !list.length) return null

  const fName = normalizeName(musicInfo.name)
  const fSinger = normalizeName(musicInfo.singer)
  const fAlbum = normalizeName(musicInfo.meta.albumName)
  const fInterval = getIntervalSeconds(musicInfo.interval)

  const scored = list.map((item, index) => {
    const name = normalizeName(item.name)
    const singer = normalizeName(item.singer)
    const album = normalizeName(item.albumName)
    const interval = getIntervalSeconds(item.interval)
    let score = 0
    if (name && fName && name === fName) score += 8
    else if (name && fName && (name.includes(fName) || fName.includes(name))) score += 4
    if (singer && fSinger && singer === fSinger) score += 6
    else if (singer && fSinger && (singer.includes(fSinger) || fSinger.includes(singer))) score += 3
    if (album && fAlbum && album === fAlbum) score += 3
    if (fInterval && Math.abs(interval - fInterval) < 5) score += 2
    return { item, score, index }
  }).sort((a, b) => b.score - a.score || a.index - b.index)

  return scored[0]?.score > 0 ? scored[0].item : list[0]
}

const fetchTxDetailTagMeta = async(songmid: string | number): Promise<DownloadTagMeta> => {
  if (!songmid) return createEmptyTagMeta()
  const { body } = await requestJson('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'post',
    headers: {
      Referer: 'https://y.qq.com',
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
    },
    body: {
      comm: {
        ct: '19',
        cv: '1859',
        uin: '0',
      },
      req: {
        module: 'music.pf_song_detail_svr',
        method: 'get_song_detail_yqq',
        param: {
          song_type: 0,
          song_mid: `${songmid}`,
        },
      },
    },
  })
  if (body?.code != 0 || body?.req?.code != 0) return createEmptyTagMeta()

  const trackInfo = body.req?.data?.track_info
  const info = body.req?.data?.info
  const year = `${trackInfo?.time_public || trackInfo?.album?.time_public || ''}`.slice(0, 4)
  const track = trackInfo?.index_album > 0 ? `${trackInfo.index_album}` : ''
  const disc = trackInfo?.index_cd == null || trackInfo?.index_cd === ''
    ? ''
    : `${Number(trackInfo.index_cd) + 1}`
  const genre = formatGenre(info?.genre?.content, trackInfo?.label, trackInfo?.genre)
  const language = formatGenre(info?.lan?.content, trackInfo?.lan, trackInfo?.language)
  const comment = trimText(trackInfo?.subtitle || trackInfo?.title_extra)

  return {
    year,
    track,
    disc,
    genre,
    language,
    comment,
  }
}

const fetchWyDetailTagMeta = async(songId: string | number): Promise<DownloadTagMeta> => {
  if (!songId) return createEmptyTagMeta()

  const { body } = await requestJson('https://music.163.com/weapi/v3/song/detail', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      Referer: `https://music.163.com/song?id=${songId}`,
      origin: 'https://music.163.com',
    },
    form: weapi({
      c: `[{"id":${songId}}]`,
      ids: `[${songId}]`,
    }),
  })
  if (body?.code !== 200 || !body?.songs?.length) return createEmptyTagMeta()

  const song = body.songs[0]
  const publishTime = song.publishTime || song.al?.publishTime
  let year = ''
  if (typeof publishTime == 'number' && publishTime > 0) {
    year = `${new Date(publishTime).getFullYear()}`
  }
  const track = song.no > 0 ? `${song.no}` : ''
  const disc = song.cd && song.cd !== 'null' ? `${song.cd}` : ''
  const comment = Array.isArray(song.alia)
    ? song.alia.map((item: unknown) => trimText(item)).filter(Boolean).join(' / ')
    : ''

  let genre = formatGenre(song.genre, song.al?.genre, song.al?.genres)
  let language = formatGenre(song.language, song.lan)

  if (!genre || !language) {
    try {
      const { body: aboutBody } = await requestJson('https://music.163.com/weapi/song/play/about/block/page', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
          Referer: `https://music.163.com/song?id=${songId}`,
          origin: 'https://music.163.com',
        },
        form: weapi({ songId: `${songId}` }),
      })
      if (aboutBody?.code === 200) {
        const blocks = aboutBody?.data?.blocks || []
        const basic = blocks.find((block: any) => block?.code === 'SONG_PLAY_ABOUT_SONG_BASIC')
        const creatives = basic?.creatives || []
        const songTag = creatives.find((item: any) => item?.creativeType === 'songTag')
        const languageCreative = creatives.find((item: any) => item?.creativeType === 'language')
        if (!genre) {
          genre = formatGenre(
            songTag?.resources?.[0]?.uiElement?.mainTitle?.title,
            songTag?.uiElement?.mainTitle?.title,
          )
        }
        if (!language) {
          language = formatGenre(
            languageCreative?.uiElement?.textLinks?.[0]?.text,
            languageCreative?.resources?.[0]?.uiElement?.mainTitle?.title,
          )
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  return {
    year,
    track,
    disc,
    genre,
    language,
    comment,
  }
}

const fetchTxTagMetaBySearch = async(musicInfo: LX.Music.MusicInfoOnline): Promise<DownloadTagMeta> => {
  const keyword = `${musicInfo.name} ${musicInfo.singer || ''}`.trim()
  if (!keyword || !musicSdk.tx?.musicSearch?.search) return createEmptyTagMeta()
  const result = await musicSdk.tx.musicSearch.search(keyword, 1, 10) as { list?: any[] } | null
  const best = pickBestSearchItem(result?.list ?? [], musicInfo)
  if (!best) return createEmptyTagMeta()

  const fromSearch: DownloadTagMeta = {
    year: trimText(best.year),
    track: trimText(best.track),
    disc: trimText(best.disc),
    genre: trimText(best.genre),
    language: trimText(best.language),
    comment: trimText(best.subtitle || best.remark || best.comment),
  }
  if (!best.songmid || isTagMetaComplete(fromSearch)) return fromSearch
  const fromDetail = await fetchTxDetailTagMeta(best.songmid)
  return mergeTagMeta(fromSearch, fromDetail)
}

const fetchWyTagMetaBySearch = async(musicInfo: LX.Music.MusicInfoOnline): Promise<DownloadTagMeta> => {
  const keyword = `${musicInfo.name} ${musicInfo.singer || ''}`.trim()
  if (!keyword || !musicSdk.wy?.musicSearch?.search) return createEmptyTagMeta()
  const result = await musicSdk.wy.musicSearch.search(keyword, 1, 10) as { list?: any[] } | null
  const best = pickBestSearchItem(result?.list ?? [], musicInfo)
  if (!best) return createEmptyTagMeta()

  const fromSearch: DownloadTagMeta = {
    year: trimText(best.year),
    track: trimText(best.track),
    disc: trimText(best.disc),
    genre: trimText(best.genre),
    language: trimText(best.language),
    comment: trimText(best.remark || best.comment),
  }
  if (!best.songmid || isTagMetaComplete(fromSearch)) return fromSearch
  const fromDetail = await fetchWyDetailTagMeta(best.songmid)
  return mergeTagMeta(fromSearch, fromDetail)
}

/**
 * 下载完成后补充标签字段：优先 QQ 搜索/详情，网易云备选
 */
export const fetchDownloadTagMeta = async(musicInfo: LX.Music.MusicInfoOnline): Promise<DownloadTagMeta> => {
  let meta = createEmptyTagMeta()
  try {
    // 已是 QQ 源时优先走详情，减少一次搜索
    if (musicInfo.source === 'tx' && musicInfo.meta.songId) {
      meta = await fetchTxDetailTagMeta(musicInfo.meta.songId)
    }
    if (!isTagMetaComplete(meta)) {
      meta = mergeTagMeta(meta, await fetchTxTagMetaBySearch(musicInfo))
    }
  } catch (err) {
    console.log(err)
  }

  if (isTagMetaComplete(meta)) return meta

  try {
    if (musicInfo.source === 'wy' && musicInfo.meta.songId) {
      meta = mergeTagMeta(meta, await fetchWyDetailTagMeta(musicInfo.meta.songId))
    }
    if (!isTagMetaComplete(meta)) {
      meta = mergeTagMeta(meta, await fetchWyTagMetaBySearch(musicInfo))
    }
  } catch (err) {
    console.log(err)
  }

  return meta
}
