import { checkPath, joinPath, extname, basename, readFile, getFileStats } from '@common/utils/nodejs'
import { formatPlayTime, sizeFormate, dateFormat, encodePath } from '@common/utils/common'
import { decodeKrc } from '@common/utils/lyricUtils/kg'
import { type IAudioMetadata } from 'music-metadata'

export const checkDownloadFileAvailable = async(musicInfo: LX.Download.ListItem, savePath: string): Promise<boolean> => {
  return musicInfo.isComplate && !/\.ape$/.test(musicInfo.metadata.fileName) &&
    (await checkPath(musicInfo.metadata.filePath) || await checkPath(joinPath(savePath, musicInfo.metadata.fileName)))
}

export const checkLocalFileAvailable = async(musicInfo: LX.Music.MusicInfoLocal): Promise<boolean> => {
  return checkPath(musicInfo.meta.filePath)
}

/**
 * 检查音乐文件是否存在
 * @param musicInfo
 * @param savePath
 */
export const checkMusicFileAvailable = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, savePath: string): Promise<boolean> => {
  if ('progress' in musicInfo) {
    return checkDownloadFileAvailable(musicInfo, savePath)
  } else if (musicInfo.source == 'local') {
    return checkLocalFileAvailable(musicInfo)
  } else return true
}

export const getDownloadFilePath = async(musicInfo: LX.Download.ListItem, savePath: string): Promise<string> => {
  if (musicInfo.isComplate && !/\.ape$/.test(musicInfo.metadata.fileName)) {
    if (await checkPath(musicInfo.metadata.filePath)) return musicInfo.metadata.filePath
    const path = joinPath(savePath, musicInfo.metadata.fileName)
    if (await checkPath(path)) return path
  }
  return ''
}

export const getLocalFilePath = async(musicInfo: LX.Music.MusicInfoLocal): Promise<string> => {
  return (await checkPath(musicInfo.meta.filePath)) ? musicInfo.meta.filePath : ''
}


/**
 * 获取音乐文件路径
 * @param musicInfo
 * @param savePath
 * @returns
 */
export const getMusicFilePath = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, savePath: string): Promise<string> => {
  if ('progress' in musicInfo) {
    return getDownloadFilePath(musicInfo, savePath)
  } else if (musicInfo.source == 'local') {
    return getLocalFilePath(musicInfo)
  }
  return ''
}

/**
 * 创建本地音乐信息对象
 * @param path 文件路径
 * @returns
 */
export const createLocalMusicInfo = async(path: string): Promise<LX.Music.MusicInfoLocal | null> => {
  if (!await checkPath(path)) return null
  const { parseFile } = await import('music-metadata')

  let metadata
  try {
    metadata = await parseFile(path)
  } catch (err) {
    console.log(err)
    return null
  }

  // console.log(metadata)
  let ext = extname(path)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  let name = (metadata.common.title || basename(path, ext)).trim()
  let singer = metadata.common.artists?.length ? metadata.common.artists.map(a => a.trim()).join('、') : ''
  let duration = metadata.format.duration ?? null
  let interval = duration ? formatPlayTime(duration) : ''
  let albumName = metadata.common.album?.trim() ?? ''
  let stats = await getFileStats(path)
  let comment = metadata.common.comment?.map(item => item.text?.trim() ?? '').filter(Boolean).join('\n') ?? ''

  return {
    id: path,
    name,
    singer,
    source: 'local',
    interval,
    meta: {
      albumName,
      filePath: path,
      songId: path,
      picUrl: '',
      ext: ext.replace(/^\./, ''),
      fileName: basename(path),
      duration,
      year: metadata.common.year ?? null,
      genre: metadata.common.genre?.map(item => item.trim()).filter(Boolean).join(' / ') ?? '',
      comment,
      createTime: stats?.birthtimeMs ?? null,
      modifyTime: stats?.mtimeMs ?? null,
      fileSize: stats?.size ?? null,
      sampleRate: metadata.format.sampleRate ?? null,
      bitrate: metadata.format.bitrate ?? null,
      channels: metadata.format.numberOfChannels ?? null,
      codec: metadata.format.codec ?? metadata.format.container ?? '',
      tagTypes: metadata.format.tagTypes ?? [],
      bitsPerSample: metadata.format.bitsPerSample ?? null,
    },
  }
}

let prevFileInfo: {
  path: string
  promise: Promise<LX.MusicMetadataModule.IAudioMetadata | null>
} = {
  path: '',
  promise: Promise.resolve(null),
}
const getFileMetadata = async(path: string) => {
  if (prevFileInfo.path == path) return prevFileInfo.promise
  prevFileInfo.path = path
  return prevFileInfo.promise = checkPath(path).then(async(isExist) => {
    return isExist ? import('music-metadata').then(async({ parseFile }) => parseFile(path)).catch(err => {
      console.log(err)
      return null
    }) : null
  })
}

export interface LocalMusicDetailField {
  label: string
  value: string
}

export interface LocalMusicDetailInfo {
  fileInfo: LocalMusicDetailField[]
  metaInfo: LocalMusicDetailField[]
  audioInfo: LocalMusicDetailField[]
  customFields: LocalMusicDetailField[]
  coverUrl: string
  lyric: string
}

const EMPTY_DETAIL_VALUE = '-'
const detailCommonFieldNames = new Set([
  'title',
  'artists',
  'artist',
  'album',
  'picture',
  'year',
  'genre',
  'comment',
  'lyrics',
])

const stringifyDetailValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value == 'string') return value.trim()
  if (typeof value == 'number') return Number.isFinite(value) ? `${value}` : ''
  if (typeof value == 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) {
    return value.map(item => stringifyDetailValue(item)).filter(Boolean).join(' / ')
  }
  if (Buffer.isBuffer(value)) return `二进制数据 (${sizeFormate(value.length)})`
  if (typeof value == 'object') {
    if ('text' in value && typeof value.text == 'string') return value.text.trim()
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value).trim()
}

const createDetailField = (label: string, value: unknown): LocalMusicDetailField => {
  const text = stringifyDetailValue(value)
  return {
    label,
    value: text || EMPTY_DETAIL_VALUE,
  }
}

const getDetailCoverUrl = async(path: string) => {
  const picture = await getLocalMusicFilePic(path)
  if (!picture) return ''
  if (typeof picture == 'string') return encodePath(picture)
  return `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`
}

export const getLocalMusicCoverUrl = async(path: string) => {
  return getDetailCoverUrl(path)
}

const getDetailCustomFields = (metadata: IAudioMetadata | null): LocalMusicDetailField[] => {
  if (!metadata) return []
  return Object.entries(metadata.common).map(([key, value]) => {
    if (detailCommonFieldNames.has(key)) return null
    const text = stringifyDetailValue(value)
    if (!text) return null
    return {
      label: key,
      value: text,
    }
  }).filter((item): item is LocalMusicDetailField => item != null)
}

export const getLocalMusicDetailInfo = async(path: string): Promise<LocalMusicDetailInfo | null> => {
  if (!await checkPath(path)) return null

  const [stats, metadata, lyricInfo, coverUrl] = await Promise.all([
    getFileStats(path),
    getFileMetadata(path),
    getLocalMusicFileLyric(path),
    getDetailCoverUrl(path),
  ])
  if (!stats) return null

  const common = metadata?.common
  const format = metadata?.format
  const ext = extname(path).replace(/^\./, '')
  const comment = common?.comment?.map(item => stringifyDetailValue(item)).filter(Boolean).join('\n')

  return {
    fileInfo: [
      createDetailField('文件名称', basename(path)),
      createDetailField('文件类型', ext ? ext.toUpperCase() : ''),
      createDetailField('文件路径', path),
      createDetailField('文件大小', `${sizeFormate(stats.size)} (${stats.size} B)`),
      createDetailField('创建时间', dateFormat(stats.birthtimeMs)),
      createDetailField('修改时间', dateFormat(stats.mtimeMs)),
    ],
    metaInfo: [
      createDetailField('标题', common?.title ?? basename(path, extname(path))),
      createDetailField('艺术家', common?.artists?.join('、') || common?.artist),
      createDetailField('专辑名', common?.album),
      createDetailField('时长', format?.duration ? formatPlayTime(format.duration) : ''),
      createDetailField('年代', common?.year),
      createDetailField('流派', common?.genre?.join(' / ')),
      createDetailField('注释', comment),
    ],
    audioInfo: [
      createDetailField('采样率', format?.sampleRate ? `${format.sampleRate} Hz` : ''),
      createDetailField('声道数', format?.numberOfChannels),
      createDetailField('比特率', format?.bitrate ? `${Math.round(format.bitrate / 1000)} kbps` : ''),
      createDetailField('编码方式', format?.codec || format?.container),
      createDetailField('标签类型', format?.tagTypes?.join(', ')),
      createDetailField('位深', format?.bitsPerSample ? `${format.bitsPerSample} bit` : ''),
    ],
    customFields: getDetailCustomFields(metadata),
    coverUrl,
    lyric: lyricInfo?.lyric?.trim() ?? '',
  }
}
/**
 * 获取歌曲文件封面图片
 * @param path 路径
 */
export const getLocalMusicFilePic = async(path: string) => {
  const filePath = new RegExp('\\' + extname(path) + '$')
  let picPath = path.replace(filePath, '.jpg')
  let stats = await getFileStats(picPath)
  if (stats) return picPath
  picPath = path.replace(filePath, '.png')
  stats = await getFileStats(picPath)
  if (stats) return picPath
  const metadata = await getFileMetadata(path)
  if (!metadata) return null
  const { selectCover } = await import('music-metadata')
  return selectCover(metadata.common.picture)
}

// const timeExp = /^\[([\d:.]*)\]{1}/
/**
 * 解析歌词文件，分离可能存在的翻译、罗马音歌词
 * @param lrc 歌词内容
 * @returns
 */
// export const parseLyric = (lrc: string): LX.Music.LyricInfo => {
//   const lines = lrc.split(/\r\n|\r|\n/)
//   const lyrics: string[][] = []
//   const map = new Map<string, number>()

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i].trim()
//     let result = timeExp.exec(line)
//     if (result) {
//       const index = map.get(result[1]) ?? 0
//       if (!lyrics[index]) lyrics[index] = []
//       lyrics[index].push(line)
//       map.set(result[1], index + 1)
//     } else {
//       if (!lyrics[0]) lyrics[0] = []
//       lyrics[0].push(line)
//     }
//   }
//   const lyricInfo: LX.Music.LyricInfo = {
//     lyric: lyrics[0].join('\n'),
//     tlyric: '',
//   }
//   if (lyrics[1]) lyricInfo.tlyric = lyrics[1].join('\n')
//   if (lyrics[2]) lyricInfo.rlyric = lyrics[2].join('\n')

//   return lyricInfo
// }

type IComment = NonNullable<IAudioMetadata['common']['comment']> extends Array<infer U> ? U : never

/**
 * 获取歌曲文件歌词
 * @param path 路径
 */
export const getLocalMusicFileLyric = async(path: string): Promise<LX.Music.LyricInfo | null> => {
  // 尝试读取同目录下的同名lrc文件
  const filePath = new RegExp('\\' + extname(path) + '$')
  let lrcPath = path.replace(filePath, '.lrc')
  let stats = await getFileStats(lrcPath)
  // console.log(lrcPath, stats)
  if (stats && stats.size < 1024 * 1024 * 10) {
    const lrcBuf = await readFile(lrcPath)
    const { detect } = await import('jschardet')
    const { confidence, encoding } = detect(lrcBuf)
    console.log('lrc file encoding', confidence, encoding)
    if (confidence > 0.8) {
      const iconv = (await import('iconv-lite')).default
      if (iconv.encodingExists(encoding)) {
        const lrc = iconv.decode(lrcBuf, encoding)
        if (lrc) {
          return {
            lyric: lrc,
          }
        }
      }
    }
  }
  // 尝试读取同目录下的同名krc文件
  lrcPath = path.replace(filePath, '.krc')
  stats = await getFileStats(lrcPath)
  console.log(lrcPath, stats?.size)
  if (stats && stats.size < 1024 * 1024 * 10) {
    const lrcBuf = await readFile(lrcPath)
    try {
      return await decodeKrc(lrcBuf)
    } catch (e) {
      console.log(e)
    }
  }


  // 尝试读取文件内歌词
  const metadata = await getFileMetadata(path)
  // console.log(metadata?.common)
  if (!metadata) return null
  // let lyricInfo = metadata.common.lyrics?.[0]
  // if (lyricInfo) {
  //   let lyric: string | undefined
  //   if (typeof lyricInfo == 'object') lyric = lyricInfo.text
  //   else if (typeof lyricInfo == 'string') lyric = lyricInfo
  //   if (lyric && lyric.length > 10) {
  //     return { lyric }
  //   }
  // }
  // console.log(metadata)
  for (const info of Object.values(metadata.native)) {
    for (const ust of info) {
      switch (ust.id) {
        case 'LYRICS': {
          const value = typeof ust.value == 'string' ? ust.value : (ust as IComment).text
          if (value && value.length > 10) return { lyric: value }
          break
        }
        case 'USLT': {
          const value = ust.value as IComment
          if (value.text && value.text.length > 10) return { lyric: value.text }
          break
        }
      }
    }
  }
  return null
}
