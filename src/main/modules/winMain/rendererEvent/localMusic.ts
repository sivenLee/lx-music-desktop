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
} from '@common/utils/localMusic'
import path from 'node:path'

// 本地音乐配置存储的名称
const LOCAL_MUSIC_STORE_NAME = 'localMusic'
const LOCAL_MUSIC_VIEW_STATE_KEY = 'viewState'

const getViewState = (store: ReturnType<typeof getStore>) => {
  return store.get<LX.LocalMusic.LocalMusicViewState>(LOCAL_MUSIC_VIEW_STATE_KEY) ?? {
    currentDirectoryId: null,
    currentPlaylistPath: null,
  }
}

const setViewState = (store: ReturnType<typeof getStore>, state: LX.LocalMusic.LocalMusicViewState) => {
  store.set(LOCAL_MUSIC_VIEW_STATE_KEY, state)
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

  let ext = extname(filePath)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  let name = (metadata.common.title || basename(filePath, ext)).trim()
  let singer = metadata.common.artists?.length ? metadata.common.artists.map(a => a.trim()).join('、') : ''
  let duration = metadata.format.duration ?? null
  let interval = duration ? formatPlayTime(duration) : ''
  let albumName = metadata.common.album?.trim() ?? ''
  let stats: fs.Stats | null = null
  try {
    stats = await fs.promises.stat(filePath)
  } catch (err) {
    console.log(err)
  }
  let comment = metadata.common.comment?.map(item => item.text?.trim() ?? '').filter(Boolean).join('\n') ?? ''

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
      ext: ext.replace(/^\./, ''),
      fileName: basename(filePath),
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

export default () => {
  // 获取已保存的目录列表
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

  // 添加新目录
  mainHandle<string, LX.LocalMusic.LocalMusicDirectory>(LOCAL_MUSIC_EVENT_NAME.add_directory, async({ params: dirPath }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    const directories = store.get<LX.LocalMusic.LocalMusicDirectory[]>('directories') ?? []

    const id = generateId(dirPath)
    const name = path.basename(dirPath)

    // 检查是否已存在相同路径
    if (directories.find(d => d.path === dirPath)) {
      return directories.find(d => d.path === dirPath)!
    }

    const newDir: LX.LocalMusic.LocalMusicDirectory = { id, path: dirPath, name }
    directories.push(newDir)
    store.set('directories', directories)

    return newDir
  })

  // 删除目录
  mainHandle<string>(LOCAL_MUSIC_EVENT_NAME.remove_directory, async({ params: dirId }) => {
    const store = getStore(LOCAL_MUSIC_STORE_NAME)
    let directories = store.get<LX.LocalMusic.LocalMusicDirectory[]>('directories') ?? []
    directories = directories.filter(d => d.id !== dirId)
    store.set('directories', directories)

    const viewState = getViewState(store)
    if (viewState.currentDirectoryId === dirId) {
      setViewState(store, {
        currentDirectoryId: directories[0]?.id ?? null,
        currentPlaylistPath: null,
      })
    }
  })

  // 扫描目录获取文件
  mainHandle<string, {
    musicFiles: LX.Music.MusicInfoLocal[]
    playlistFiles: string[]
  }>(LOCAL_MUSIC_EVENT_NAME.scan_directory, async({ params: dirPath }) => {
    const { musicFiles, playlistFiles } = await scanDirectory(dirPath)

    const musicInfos: LX.Music.MusicInfoLocal[] = []
    for (const filePath of musicFiles) {
      const musicInfo = await createLocalMusicInfo(filePath)
      if (musicInfo) musicInfos.push(musicInfo)
    }

    return {
      musicFiles: musicInfos,
      playlistFiles,
    }
  })

  // 解析播放列表
  mainHandle<string, LX.Music.MusicInfoLocal[]>(LOCAL_MUSIC_EVENT_NAME.parse_playlist, async({ params: playlistPath }) => {
    const musicFilePaths = await parseM3UPlaylist(playlistPath)

    const musicInfos: LX.Music.MusicInfoLocal[] = []
    for (const filePath of musicFilePaths) {
      const musicInfo = await createLocalMusicInfo(filePath)
      if (musicInfo) musicInfos.push(musicInfo)
    }

    return musicInfos
  })

  mainHandle<string, {
    validCount: number
    invalidCount: number
    invalidFilePaths: string[]
  }>(LOCAL_MUSIC_EVENT_NAME.get_playlist_detail, async({ params: playlistPath }) => {
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
  })

  mainHandle<{
    dirPath: string
    name: string
  }, string>(LOCAL_MUSIC_EVENT_NAME.create_playlist, async({ params }) => {
    const playlistPath = getPlaylistFilePath(params.dirPath, params.name)
    if (await checkPath(playlistPath)) throw new Error('Playlist already exists')
    await fs.promises.writeFile(playlistPath, '#EXTM3U\n', { encoding: 'utf8', flag: 'wx' })
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
  })
}
