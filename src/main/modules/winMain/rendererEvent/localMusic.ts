import { LOCAL_MUSIC_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import getStore from '@main/utils/store'
import { checkPath, basename, extname } from '@common/utils/nodejs'
import { formatPlayTime } from '@common/utils/common'
import fs from 'node:fs'
import {
  scanDirectory,
  parseM3UPlaylist,
  parseM3UPlaylistDetail,
  generateId,
  buildLyricsPreview,
} from '@common/utils/localMusic'
import { setMeta } from '@common/utils/musicMeta'
import path from 'node:path'

const LOCAL_MUSIC_STORE_NAME = 'localMusic'
const LOCAL_MUSIC_VIEW_STATE_KEY = 'viewState'
const LOCAL_MUSIC_SONGS_CACHE_FILE_NAME = '.lx_music_songs.json'
const LOCAL_MUSIC_PLAYLISTS_CACHE_FILE_NAME = '.lx_music_playlists.json'
const LOCAL_MUSIC_CONFIG_FILE_NAME = '.lx_music_config.json'
const LOCAL_MUSIC_CACHE_VERSION = 1

interface LocalMusicPlaylistCacheDetail {
  musicFilePaths: string[]
  invalidCount: number
  invalidFilePaths: string[]
}

interface LocalMusicSongsCache {
  version: number
  dirPath: string
  generatedAt: number
  musicFiles: LX.Music.MusicInfoLocal[]
}

interface LocalMusicPlaylistsCache {
  version: number
  dirPath: string
  generatedAt: number
  playlistFiles: string[]
  playlistDetails: Record<string, LocalMusicPlaylistCacheDetail>
}

interface LocalMusicDirectoryConfigFile extends LX.LocalMusic.LocalMusicDirectoryConfig {
  version: number
  dirPath: string
  updatedAt: number
}

const getViewState = (store: ReturnType<typeof getStore>) => {
  const state = store.get<LX.LocalMusic.LocalMusicViewState>(LOCAL_MUSIC_VIEW_STATE_KEY) ?? {
    currentDirectoryId: null,
    currentPlaylistPath: null,
  }
  return {
    currentDirectoryId: state.currentDirectoryId ?? null,
    currentPlaylistPath: state.currentPlaylistPath ?? null,
  }
}

const setViewState = (store: ReturnType<typeof getStore>, state: LX.LocalMusic.LocalMusicViewState) => {
  store.set(LOCAL_MUSIC_VIEW_STATE_KEY, state)
}

const getSongsCachePath = (dirPath: string) => path.join(dirPath, LOCAL_MUSIC_SONGS_CACHE_FILE_NAME)
const getPlaylistsCachePath = (dirPath: string) => path.join(dirPath, LOCAL_MUSIC_PLAYLISTS_CACHE_FILE_NAME)
const getDirectoryConfigPath = (dirPath: string) => path.join(dirPath, LOCAL_MUSIC_CONFIG_FILE_NAME)

const getDefaultDirectoryConfig = (): LX.LocalMusic.LocalMusicDirectoryConfig => ({
  currentPlaylistPath: null,
  selectedColumnKeys: [],
  sortState: {
    key: null,
    order: 'asc',
  },
})

const normalizeDirectoryConfig = (
  config?: Partial<LX.LocalMusic.LocalMusicDirectoryConfig> | null,
  playlistFiles?: string[],
): LX.LocalMusic.LocalMusicDirectoryConfig => {
  const defaultConfig = getDefaultDirectoryConfig()
  const currentPlaylistPath = typeof config?.currentPlaylistPath == 'string'
    ? config.currentPlaylistPath
    : null
  const selectedColumnKeys = Array.isArray(config?.selectedColumnKeys)
    ? config.selectedColumnKeys.filter((key): key is string => typeof key == 'string')
    : defaultConfig.selectedColumnKeys
  const sortState = {
    key: typeof config?.sortState?.key == 'string' || config?.sortState?.key == null
      ? config?.sortState?.key ?? null
      : null,
    order: config?.sortState?.order === 'desc' ? 'desc' : 'asc',
  } as const
  const keywordSearchFields = Array.isArray(config?.keywordSearchFields)
    ? config.keywordSearchFields.filter((key): key is string => typeof key == 'string')
    : undefined
  return {
    currentPlaylistPath: currentPlaylistPath && playlistFiles?.includes(currentPlaylistPath) === false ? null : currentPlaylistPath,
    selectedColumnKeys,
    sortState,
    ...(keywordSearchFields != null ? { keywordSearchFields } : {}),
  }
}

const writeJsonFileAtomic = async(filePath: string, data: unknown) => {
  const tempPath = `${filePath}.${Math.random().toString().slice(2, 10)}.temp`
  try {
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, '\t'), 'utf8')
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, '\t'), 'utf8')
  }
  await fs.promises.rename(tempPath, filePath)
}

const readSongsCache = async(dirPath: string): Promise<LocalMusicSongsCache | null> => {
  const cachePath = getSongsCachePath(dirPath)
  if (!await checkPath(cachePath)) return null
  try {
    const cache = JSON.parse(await fs.promises.readFile(cachePath, 'utf8')) as Partial<LocalMusicSongsCache>
    if (
      !cache ||
      typeof cache != 'object' ||
      cache.version !== LOCAL_MUSIC_CACHE_VERSION ||
      !Array.isArray(cache.musicFiles)
    ) return null
    const musicFiles = cache.musicFiles.map((musicInfo) => {
      const meta = musicInfo?.meta as LX.Music.MusicInfoMeta_local & { disk?: string | null } | undefined
      if (!meta || meta.disc != null || meta.disk == null) return musicInfo
      const { disk, ...restMeta } = meta
      return {
        ...musicInfo,
        meta: {
          ...restMeta,
          disc: disk,
        },
      }
    })
    return {
      version: LOCAL_MUSIC_CACHE_VERSION,
      dirPath: typeof cache.dirPath == 'string' ? cache.dirPath : dirPath,
      generatedAt: typeof cache.generatedAt == 'number' ? cache.generatedAt : Date.now(),
      musicFiles,
    }
  } catch (err) {
    console.error('Failed to read local music songs cache:', err)
    return null
  }
}

const readPlaylistsCache = async(dirPath: string): Promise<LocalMusicPlaylistsCache | null> => {
  const cachePath = getPlaylistsCachePath(dirPath)
  if (!await checkPath(cachePath)) return null
  try {
    const cache = JSON.parse(await fs.promises.readFile(cachePath, 'utf8')) as Partial<LocalMusicPlaylistsCache>
    if (
      !cache ||
      typeof cache != 'object' ||
      cache.version !== LOCAL_MUSIC_CACHE_VERSION ||
      !Array.isArray(cache.playlistFiles) ||
      !cache.playlistDetails ||
      typeof cache.playlistDetails != 'object'
    ) return null
    return {
      version: LOCAL_MUSIC_CACHE_VERSION,
      dirPath: typeof cache.dirPath == 'string' ? cache.dirPath : dirPath,
      generatedAt: typeof cache.generatedAt == 'number' ? cache.generatedAt : Date.now(),
      playlistFiles: cache.playlistFiles,
      playlistDetails: cache.playlistDetails,
    }
  } catch (err) {
    console.error('Failed to read local music playlists cache:', err)
    return null
  }
}

const readDirectoryConfig = async(
  dirPath: string,
  playlistFiles?: string[],
): Promise<LX.LocalMusic.LocalMusicDirectoryConfig> => {
  const configPath = getDirectoryConfigPath(dirPath)
  if (!await checkPath(configPath)) return normalizeDirectoryConfig(null, playlistFiles)
  try {
    const config = JSON.parse(await fs.promises.readFile(configPath, 'utf8')) as Partial<LocalMusicDirectoryConfigFile>
    return normalizeDirectoryConfig(config, playlistFiles)
  } catch (err) {
    console.error('Failed to read local music directory config:', err)
    return normalizeDirectoryConfig(null, playlistFiles)
  }
}

const writeSongsCache = async(cache: LocalMusicSongsCache) => {
  await writeJsonFileAtomic(getSongsCachePath(cache.dirPath), cache)
}

const writePlaylistsCache = async(cache: LocalMusicPlaylistsCache) => {
  await writeJsonFileAtomic(getPlaylistsCachePath(cache.dirPath), cache)
}

const writeDirectoryConfig = async(
  dirPath: string,
  config: LX.LocalMusic.LocalMusicDirectoryConfig,
  playlistFiles?: string[],
) => {
  const normalizedConfig = normalizeDirectoryConfig(config, playlistFiles)
  const fileConfig: LocalMusicDirectoryConfigFile = {
    version: LOCAL_MUSIC_CACHE_VERSION,
    dirPath,
    updatedAt: Date.now(),
    ...normalizedConfig,
  }
  await writeJsonFileAtomic(getDirectoryConfigPath(dirPath), fileConfig)
  return normalizedConfig
}

const ensureDirectoryConfig = async(dirPath: string, playlistFiles: string[]) => {
  const config = await readDirectoryConfig(dirPath, playlistFiles)
  const configPath = getDirectoryConfigPath(dirPath)
  if (!await checkPath(configPath)) {
    await writeDirectoryConfig(dirPath, config, playlistFiles)
  }
  return config
}

const assertValidPlaylistName = (name: string) => {
  const trimName = name.trim()
  if (!trimName) throw new Error('Invalid playlist name')
  if (/[\\/:*?"<>|]/.test(trimName)) throw new Error('Invalid playlist name')
  return trimName
}

const getPlaylistFilePath = (dirPath: string, name: string) => {
  const base = assertValidPlaylistName(name)
  const fileName = /\.(m3u|m3u8)$/i.test(base) ? base : `${base}.m3u8`
  const playlistPath = path.join(dirPath, fileName)
  const resolvedDir = path.resolve(dirPath) + path.sep
  const resolvedFile = path.resolve(playlistPath)
  if (!resolvedFile.startsWith(resolvedDir)) throw new Error('Invalid playlist path')
  return resolvedFile
}

const normalizePlaylistMusicFilePaths = (playlistPath: string, musicFilePaths: string[]) => {
  const pathSet = new Set<string>()
  const result: string[] = []
  const playlistDirPath = path.dirname(playlistPath)
  for (const filePath of musicFilePaths) {
    const resolvedPath = path.resolve(filePath)
    if (pathSet.has(resolvedPath)) continue
    pathSet.add(resolvedPath)
    const relativePath = path.relative(playlistDirPath, resolvedPath)
    result.push(relativePath.split(path.sep).join('/'))
  }
  return result
}

const writePlaylistMusicFilePaths = async(playlistPath: string, musicFilePaths: string[]) => {
  const lines = ['#EXTM3U', ...normalizePlaylistMusicFilePaths(playlistPath, musicFilePaths)]
  await fs.promises.writeFile(playlistPath, `${lines.join('\n')}\n`, { encoding: 'utf8' })
}

const stringifyTagValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value == 'string') return value.trim()
  if (typeof value == 'number') return Number.isFinite(value) ? `${value}` : ''
  if (Array.isArray(value)) return value.map(item => stringifyTagValue(item)).filter(Boolean).join(' / ')
  if (typeof value == 'object') {
    if ('text' in value && typeof (value as { text?: unknown }).text == 'string') {
      return ((value as { text: string }).text).trim()
    }
    if ('value' in value && typeof (value as { value?: unknown }).value == 'string') {
      return ((value as { value: string }).value).trim()
    }
  }
  return String(value).trim()
}

const extractNativeTagValue = (metadata: { native?: Record<string, Array<{ id?: string, value?: unknown }>> } | null | undefined, tagId: string) => {
  if (!metadata?.native) return ''
  const target = tagId.toUpperCase()
  for (const tags of Object.values(metadata.native)) {
    if (!Array.isArray(tags)) continue
    for (const tag of tags) {
      const id = `${tag.id ?? ''}`.toUpperCase()
      if (id === target || id.endsWith(`:${target}`) || id.endsWith(`/${target}`)) {
        return stringifyTagValue(tag.value)
      }
      if (id.includes('TXXX') || id.includes('USERDEFINEDTEXT')) {
        const value = tag.value as { description?: string, text?: string, value?: string } | string
        if (typeof value == 'object' && value && `${value.description ?? ''}`.toUpperCase() === target) {
          return stringifyTagValue(value.text ?? value.value)
        }
      }
    }
  }
  return ''
}

const getPreferredGenre = (metadata: {
  common?: { genre?: string[] }
  native?: Record<string, Array<{ id?: string, value?: unknown }>>
} | null | undefined) => {
  if (!metadata) return ''
  const native = metadata.native ?? {}
  for (const fmt of ['ID3v2.4', 'ID3v2.3', 'ID3v2.2', 'vorbis']) {
    const tags = native[fmt]
    if (!Array.isArray(tags)) continue
    for (const tag of tags) {
      const id = `${tag.id ?? ''}`.toUpperCase()
      if (id === 'TCON' || id === 'TCO' || id === 'GENRE' || id.endsWith(':GENRE') || id.endsWith('/GENRE')) {
        const text = stringifyTagValue(tag.value)
        if (text) return text
      }
    }
  }
  return metadata.common?.genre?.map(item => item.trim()).filter(Boolean).join(' / ') ?? ''
}

const createLocalMusicInfo = async(filePath: string): Promise<LX.Music.MusicInfoLocal | null> => {
  if (!await checkPath(filePath)) return null
  const { parseFile } = await import('music-metadata')

  let metadata
  try {
    metadata = await parseFile(filePath)
  } catch (err) {
    console.log(err)
    return null
  }

  const ext = extname(filePath)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const name = (metadata.common.title || basename(filePath, ext)).trim()
  const singer = metadata.common.artists?.length ? metadata.common.artists.map(a => a.trim()).join('、') : ''
  const duration = metadata.format.duration ?? null
  const interval = duration ? formatPlayTime(duration) : ''
  const albumName = metadata.common.album?.trim() ?? ''
  let stats: fs.Stats | null = null
  try {
    stats = await fs.promises.stat(filePath)
  } catch (err) {
    console.log(err)
  }
  const comment = metadata.common.comment?.map(item => item.text?.trim() ?? '').filter(Boolean).join('\n') ?? ''
  const formatTrackDisc = (value?: { no: number | null, of: number | null }) => {
    if (value?.no == null) return null
    if (value.of == null) return `${value.no}`
    return `${value.no}/${value.of}`
  }

  const fileExt = ext.replace(/^\./, '')
  const sidecarBase = filePath.slice(0, filePath.length - ext.length)
  const [hasSidecarJpg, hasSidecarPng, hasSidecarLrc, hasSidecarKrc] = await Promise.all([
    checkPath(`${sidecarBase}.jpg`),
    checkPath(`${sidecarBase}.png`),
    checkPath(`${sidecarBase}.lrc`),
    checkPath(`${sidecarBase}.krc`),
  ])
  const hasEmbeddedCover = Boolean(metadata.common.picture?.length)
  const embeddedLyricText = (() => {
    const fromCommon = (metadata.common.lyrics
      ?.map(item => (typeof item == 'string' ? item : item.text ?? ''))
      .join('\n') ?? '').trim()
    if (fromCommon) return fromCommon
    const fromLyricsTag = extractNativeTagValue(metadata, 'LYRICS')
    if (fromLyricsTag) return fromLyricsTag
    return extractNativeTagValue(metadata, 'USLT')
  })()
  let lyricsText = embeddedLyricText
  if (!lyricsText && hasSidecarLrc) {
    try {
      lyricsText = (await fs.promises.readFile(`${sidecarBase}.lrc`, { encoding: 'utf8' })).trim()
    } catch (err) {
      console.log(err)
    }
  }
  const lyricsPreview = buildLyricsPreview(lyricsText)
  const hasLyrics = Boolean(lyricsText) || hasSidecarKrc

  return {
    id: filePath,
    name,
    singer,
    source: 'local',
    interval,
    meta: {
      albumName,
      filePath,
      songId: filePath,
      picUrl: '',
      ext: fileExt,
      fileName: basename(filePath),
      duration,
      year: metadata.common.year ?? null,
      track: formatTrackDisc(metadata.common.track),
      disc: formatTrackDisc(metadata.common.disk),
      genre: getPreferredGenre(metadata),
      language: metadata.common.language?.trim() ?? '',
      comment,
      customTags: extractNativeTagValue(metadata, 'CUSTOM_TAGS'),
      hasCover: hasEmbeddedCover || hasSidecarJpg || hasSidecarPng,
      hasLyrics,
      lyricsPreview,
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

const createLocalMusicInfos = async(filePaths: string[]) => {
  const musicInfos: LX.Music.MusicInfoLocal[] = []
  for (const filePath of filePaths) {
    const musicInfo = await createLocalMusicInfo(filePath)
    if (musicInfo) musicInfos.push(musicInfo)
  }
  return musicInfos
}

const collectPlaylistDetails = async(playlistFiles: string[]) => {
  const details = await Promise.all(playlistFiles.map(async playlistPath => {
    const detail = await parseM3UPlaylistDetail(playlistPath)
    return [playlistPath, detail] as const
  }))
  return Object.fromEntries(details) as Record<string, LocalMusicPlaylistCacheDetail>
}

const mergePlaylistOrder = (savedOrder: string[], scannedFiles: string[]) => {
  const scannedPathMap = new Map(scannedFiles.map(filePath => [path.resolve(filePath), filePath]))
  const ordered: string[] = []
  const usedResolvedPaths = new Set<string>()

  for (const filePath of savedOrder) {
    const resolvedPath = path.resolve(filePath)
    const matchedPath = scannedPathMap.get(resolvedPath)
    if (!matchedPath || usedResolvedPaths.has(resolvedPath)) continue
    ordered.push(matchedPath)
    usedResolvedPaths.add(resolvedPath)
  }

  for (const filePath of scannedFiles) {
    const resolvedPath = path.resolve(filePath)
    if (usedResolvedPaths.has(resolvedPath)) continue
    ordered.push(filePath)
    usedResolvedPaths.add(resolvedPath)
  }

  return ordered
}

const buildDirectoryCaches = async(
  dirPath: string,
  previousPlaylistsCache?: LocalMusicPlaylistsCache | null,
) => {
  const { musicFiles, playlistFiles: scannedPlaylistFiles } = await scanDirectory(dirPath)
  const playlistFiles = mergePlaylistOrder(
    previousPlaylistsCache?.playlistFiles ?? [],
    scannedPlaylistFiles,
  )
  const [musicInfos, playlistDetails] = await Promise.all([
    createLocalMusicInfos(musicFiles),
    collectPlaylistDetails(playlistFiles),
  ])
  const songsCache: LocalMusicSongsCache = {
    version: LOCAL_MUSIC_CACHE_VERSION,
    dirPath,
    generatedAt: Date.now(),
    musicFiles: musicInfos,
  }
  const playlistsCache: LocalMusicPlaylistsCache = {
    version: LOCAL_MUSIC_CACHE_VERSION,
    dirPath,
    generatedAt: Date.now(),
    playlistFiles,
    playlistDetails,
  }
  return { songsCache, playlistsCache }
}

const getCachedPlaylistData = async(playlistPath: string) => {
  const dirPath = path.dirname(playlistPath)
  const [songsCache, playlistsCache] = await Promise.all([
    readSongsCache(dirPath),
    readPlaylistsCache(dirPath),
  ])
  if (!songsCache || !playlistsCache) return null
  const detail = playlistsCache.playlistDetails[playlistPath]
  if (!detail) return null
  return { songsCache, playlistsCache, detail }
}

const resolveMusicInfosFromFilePaths = async(
  musicFilePaths: string[],
  cachedMusicFiles: LX.Music.MusicInfoLocal[],
) => {
  const musicInfoMap = new Map(cachedMusicFiles.map(musicInfo => [path.resolve(musicInfo.meta.filePath), musicInfo]))
  const musicInfos: LX.Music.MusicInfoLocal[] = []
  for (const filePath of musicFilePaths) {
    const cachedMusicInfo = musicInfoMap.get(path.resolve(filePath))
    if (cachedMusicInfo) {
      musicInfos.push(cachedMusicInfo)
      continue
    }
    const musicInfo = await createLocalMusicInfo(filePath)
    if (musicInfo) musicInfos.push(musicInfo)
  }
  return musicInfos
}

const syncPlaylistsCacheAfterPlaylistChange = async(playlistPath: string) => {
  const dirPath = path.dirname(playlistPath)
  const playlistsCache = await readPlaylistsCache(dirPath)
  if (!playlistsCache) return
  const exists = await checkPath(playlistPath)
  if (!exists) {
    playlistsCache.playlistFiles = playlistsCache.playlistFiles.filter(filePath => filePath !== playlistPath)
    const { [playlistPath]: _removedDetail, ...restPlaylistDetails } = playlistsCache.playlistDetails
    playlistsCache.playlistDetails = restPlaylistDetails
    playlistsCache.generatedAt = Date.now()
    await writePlaylistsCache(playlistsCache)
    return
  }
  const detail = await parseM3UPlaylistDetail(playlistPath)
  if (!playlistsCache.playlistFiles.includes(playlistPath)) playlistsCache.playlistFiles.push(playlistPath)
  playlistsCache.playlistDetails[playlistPath] = detail
  playlistsCache.generatedAt = Date.now()
  await writePlaylistsCache(playlistsCache)
}

const syncPlaylistsCacheAfterPlaylistRename = async(oldPath: string, newPath: string) => {
  const dirPath = path.dirname(newPath)
  const playlistsCache = await readPlaylistsCache(dirPath)
  if (!playlistsCache) return
  playlistsCache.playlistFiles = playlistsCache.playlistFiles.map(filePath => filePath === oldPath ? newPath : filePath)
  const oldDetail = playlistsCache.playlistDetails[oldPath]
  const { [oldPath]: _removedDetail, ...restPlaylistDetails } = playlistsCache.playlistDetails
  playlistsCache.playlistDetails = {
    ...restPlaylistDetails,
    [newPath]: oldDetail ?? {
      musicFilePaths: [],
      invalidCount: 0,
      invalidFilePaths: [],
    },
  }
  playlistsCache.generatedAt = Date.now()
  await writePlaylistsCache(playlistsCache)
}

const updateDirectoryConfig = async(
  dirPath: string,
  updater: (config: LX.LocalMusic.LocalMusicDirectoryConfig, playlistFiles: string[]) => LX.LocalMusic.LocalMusicDirectoryConfig,
) => {
  const playlistsCache = await readPlaylistsCache(dirPath)
  const playlistFiles = playlistsCache?.playlistFiles ?? []
  const currentConfig = await readDirectoryConfig(dirPath, playlistFiles)
  const nextConfig = updater(currentConfig, playlistFiles)
  return writeDirectoryConfig(dirPath, nextConfig, playlistFiles)
}

export default () => {
  mainHandle(LOCAL_MUSIC_EVENT_NAME.get_directories, async() => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    return store.get<LX.LocalMusic.LocalMusicDirectory[]>('directories') ?? []
  })

  mainHandle(LOCAL_MUSIC_EVENT_NAME.get_state, async() => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    return getViewState(store)
  })

  mainHandle<LX.LocalMusic.LocalMusicViewState>(LOCAL_MUSIC_EVENT_NAME.set_state, async({ params }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    setViewState(store, params)
  })

  mainHandle<string, LX.LocalMusic.LocalMusicDirectory>(LOCAL_MUSIC_EVENT_NAME.add_directory, async({ params: dirPath }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    const directories = store.get<LX.LocalMusic.LocalMusicDirectory[]>('directories') ?? []

    const id = generateId(dirPath)
    const name = path.basename(dirPath)

    if (directories.find(d => d.path === dirPath)) {
      return directories.find(d => d.path === dirPath)!
    }

    const newDir: LX.LocalMusic.LocalMusicDirectory = { id, path: dirPath, name }
    directories.push(newDir)
    store.set('directories', directories)

    return newDir
  })

  mainHandle<string>(LOCAL_MUSIC_EVENT_NAME.remove_directory, async({ params: dirId }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    let directories = store.get<LX.LocalMusic.LocalMusicDirectory[]>('directories') ?? []
    directories = directories.filter(d => d.id !== dirId)
    store.set('directories', directories)

    const viewState = getViewState(store)
    if (viewState.currentDirectoryId === dirId) {
      setViewState(store, {
        ...viewState,
        currentDirectoryId: directories[0]?.id ?? null,
        currentPlaylistPath: null,
      })
    }
  })

  mainHandle<{
    dirPath: string
    forceRefresh?: boolean
  }, {
    musicFiles: LX.Music.MusicInfoLocal[]
    playlistFiles: string[]
    playlistDetails: Record<string, {
      validCount: number
      invalidCount: number
      invalidFilePaths: string[]
    }>
    directoryConfig: LX.LocalMusic.LocalMusicDirectoryConfig
  }>(LOCAL_MUSIC_EVENT_NAME.scan_directory, async({ params }) => {
    const { dirPath, forceRefresh = false } = params
    const previousPlaylistsCache = await readPlaylistsCache(dirPath)
    const [cachedSongs, cachedPlaylists] = forceRefresh
      ? [null, null]
      : await Promise.all([readSongsCache(dirPath), readPlaylistsCache(dirPath)])
    const { songsCache, playlistsCache } = cachedSongs && cachedPlaylists
      ? { songsCache: cachedSongs, playlistsCache: cachedPlaylists }
      : await buildDirectoryCaches(dirPath, previousPlaylistsCache)
    if (!cachedSongs || !cachedPlaylists) {
      await Promise.all([
        writeSongsCache(songsCache),
        writePlaylistsCache(playlistsCache),
      ])
    }
    const directoryConfig = await ensureDirectoryConfig(dirPath, playlistsCache.playlistFiles)
    return {
      musicFiles: songsCache.musicFiles,
      playlistFiles: playlistsCache.playlistFiles,
      playlistDetails: Object.fromEntries(playlistsCache.playlistFiles.map(playlistPath => {
        const detail = playlistsCache.playlistDetails[playlistPath] ?? {
          musicFilePaths: [],
          invalidCount: 0,
          invalidFilePaths: [],
        }
        return [playlistPath, {
          validCount: detail.musicFilePaths.length,
          invalidCount: detail.invalidCount,
          invalidFilePaths: detail.invalidFilePaths,
        }]
      })),
      directoryConfig,
    }
  })

  mainHandle<{
    dirPath: string
    config: LX.LocalMusic.LocalMusicDirectoryConfig
  }, LX.LocalMusic.LocalMusicDirectoryConfig>(LOCAL_MUSIC_EVENT_NAME.save_directory_config, async({ params }) => {
    const playlistsCache = await readPlaylistsCache(params.dirPath)
    return writeDirectoryConfig(params.dirPath, params.config, playlistsCache?.playlistFiles)
  })

  mainHandle<string, LX.Music.MusicInfoLocal[]>(LOCAL_MUSIC_EVENT_NAME.parse_playlist, async({ params: playlistPath }) => {
    const cachedPlaylistData = await getCachedPlaylistData(playlistPath)
    if (cachedPlaylistData) {
      return resolveMusicInfosFromFilePaths(
        cachedPlaylistData.detail.musicFilePaths,
        cachedPlaylistData.songsCache.musicFiles,
      )
    }
    const musicFilePaths = await parseM3UPlaylist(playlistPath)
    return createLocalMusicInfos(musicFilePaths)
  })

  mainHandle<string, {
    validCount: number
    invalidCount: number
    invalidFilePaths: string[]
  }>(LOCAL_MUSIC_EVENT_NAME.get_playlist_detail, async({ params: playlistPath }) => {
    const cachedPlaylistData = await getCachedPlaylistData(playlistPath)
    if (cachedPlaylistData) {
      return {
        validCount: cachedPlaylistData.detail.musicFilePaths.length,
        invalidCount: cachedPlaylistData.detail.invalidCount,
        invalidFilePaths: cachedPlaylistData.detail.invalidFilePaths,
      }
    }
    const { musicFilePaths, invalidCount, invalidFilePaths } = await parseM3UPlaylistDetail(playlistPath)
    return {
      validCount: musicFilePaths.length,
      invalidCount,
      invalidFilePaths,
    }
  })

  mainHandle<string, string>(LOCAL_MUSIC_EVENT_NAME.read_playlist_text, async({ params: playlistPath }) => {
    if (!await checkPath(playlistPath)) throw new Error('Playlist not exists')
    return fs.promises.readFile(playlistPath, 'utf8')
  })

  mainHandle<{
    playlistPath: string
    content: string
  }>(LOCAL_MUSIC_EVENT_NAME.write_playlist_text, async({ params }) => {
    if (!await checkPath(params.playlistPath)) throw new Error('Playlist not exists')
    await fs.promises.writeFile(params.playlistPath, params.content, { encoding: 'utf8' })
    await syncPlaylistsCacheAfterPlaylistChange(params.playlistPath)
  })

  mainHandle<{
    dirPath: string
    name: string
  }, string>(LOCAL_MUSIC_EVENT_NAME.create_playlist, async({ params }) => {
    const playlistPath = getPlaylistFilePath(params.dirPath, params.name)
    if (await checkPath(playlistPath)) throw new Error('Playlist already exists')
    await fs.promises.writeFile(playlistPath, '#EXTM3U\n', { encoding: 'utf8', flag: 'wx' })
    await syncPlaylistsCacheAfterPlaylistChange(playlistPath)
    return playlistPath
  })

  mainHandle<{
    playlistPath: string
    name: string
  }, string>(LOCAL_MUSIC_EVENT_NAME.rename_playlist, async({ params }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    const oldPath = params.playlistPath
    if (!await checkPath(oldPath)) throw new Error('Playlist not exists')
    const dirPath = path.dirname(oldPath)
    const newPath = getPlaylistFilePath(dirPath, params.name)
    if (oldPath === newPath) return newPath
    if (await checkPath(newPath)) throw new Error('Playlist already exists')
    await fs.promises.rename(oldPath, newPath)
    await syncPlaylistsCacheAfterPlaylistRename(oldPath, newPath)
    await updateDirectoryConfig(dirPath, config => ({
      ...config,
      currentPlaylistPath: config.currentPlaylistPath === oldPath ? newPath : config.currentPlaylistPath,
    }))
    const viewState = getViewState(store)
    if (viewState.currentPlaylistPath === oldPath) {
      setViewState(store, {
        ...viewState,
        currentPlaylistPath: newPath,
      })
    }
    return newPath
  })

  mainHandle<string>(LOCAL_MUSIC_EVENT_NAME.delete_playlist, async({ params: playlistPath }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    if (!await checkPath(playlistPath)) return
    await fs.promises.unlink(playlistPath)
    await syncPlaylistsCacheAfterPlaylistChange(playlistPath)
    await updateDirectoryConfig(path.dirname(playlistPath), config => ({
      ...config,
      currentPlaylistPath: config.currentPlaylistPath === playlistPath ? null : config.currentPlaylistPath,
    }))
    const viewState = getViewState(store)
    if (viewState.currentPlaylistPath === playlistPath) {
      setViewState(store, {
        ...viewState,
        currentPlaylistPath: null,
      })
    }
  })

  mainHandle<{
    playlistPath: string
    musicFilePaths: string[]
  }>(LOCAL_MUSIC_EVENT_NAME.add_music_to_playlist, async({ params }) => {
    if (!await checkPath(params.playlistPath)) throw new Error('Playlist not exists')
    const currentMusicFilePaths = await parseM3UPlaylist(params.playlistPath)
    await writePlaylistMusicFilePaths(params.playlistPath, [
      ...currentMusicFilePaths,
      ...params.musicFilePaths,
    ])
    await syncPlaylistsCacheAfterPlaylistChange(params.playlistPath)
  })

  mainHandle<{
    playlistPath: string
    musicFilePaths: string[]
  }>(LOCAL_MUSIC_EVENT_NAME.remove_music_from_playlist, async({ params }) => {
    if (!await checkPath(params.playlistPath)) throw new Error('Playlist not exists')
    const removePathSet = new Set(params.musicFilePaths.map(filePath => path.resolve(filePath)))
    const currentMusicFilePaths = await parseM3UPlaylist(params.playlistPath)
    await writePlaylistMusicFilePaths(
      params.playlistPath,
      currentMusicFilePaths.filter(filePath => !removePathSet.has(path.resolve(filePath))),
    )
    await syncPlaylistsCacheAfterPlaylistChange(params.playlistPath)
  })

  mainHandle<{
    dirPath: string
    playlistFiles: string[]
  }, string[]>(LOCAL_MUSIC_EVENT_NAME.save_playlist_order, async({ params }) => {
    const playlistsCache = await readPlaylistsCache(params.dirPath)
    if (!playlistsCache) return params.playlistFiles
    const playlistPathSet = new Set(playlistsCache.playlistFiles.map(filePath => path.resolve(filePath)))
    const ordered: string[] = []
    const usedResolvedPaths = new Set<string>()
    for (const filePath of params.playlistFiles) {
      const resolvedPath = path.resolve(filePath)
      if (!playlistPathSet.has(resolvedPath) || usedResolvedPaths.has(resolvedPath)) continue
      ordered.push(filePath)
      usedResolvedPaths.add(resolvedPath)
    }
    for (const filePath of playlistsCache.playlistFiles) {
      const resolvedPath = path.resolve(filePath)
      if (usedResolvedPaths.has(resolvedPath)) continue
      ordered.push(filePath)
      usedResolvedPaths.add(resolvedPath)
    }
    playlistsCache.playlistFiles = ordered
    playlistsCache.generatedAt = Date.now()
    await writePlaylistsCache(playlistsCache)
    return ordered
  })

  mainHandle<{
    dirPath: string
    filePath: string
    meta: LX.Music.MusicFileMeta
  }, LX.Music.MusicInfoLocal>(LOCAL_MUSIC_EVENT_NAME.write_music_meta, async({ params }) => {
    const ext = extname(params.filePath).replace(/^\./, '').toLowerCase()
    if (ext !== 'mp3' && ext !== 'flac') throw new Error('Only MP3 and FLAC are supported')
    if (!await checkPath(params.filePath)) throw new Error('Music file not exists')

    await setMeta(params.filePath, params.meta)

    const musicInfo = await createLocalMusicInfo(params.filePath)
    if (!musicInfo) throw new Error('Failed to read music info after writing meta')

    const songsCache = await readSongsCache(params.dirPath)
    if (songsCache) {
      const targetPath = path.resolve(params.filePath)
      const index = songsCache.musicFiles.findIndex(item => path.resolve(item.meta.filePath) === targetPath)
      if (index >= 0) {
        songsCache.musicFiles[index] = musicInfo
      } else {
        songsCache.musicFiles.push(musicInfo)
      }
      songsCache.generatedAt = Date.now()
      await writeSongsCache(songsCache)
    }

    return musicInfo
  })
}
