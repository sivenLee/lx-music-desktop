import { ref, computed } from 'vue'
import {
  localMusicGetDirectories,
  localMusicGetState,
  localMusicSetState,
  localMusicAddDirectory,
  localMusicRemoveDirectory,
  localMusicScanDirectory,
  localMusicParsePlaylist,
  localMusicCreatePlaylist,
  localMusicRenamePlaylist,
  localMusicDeletePlaylist,
  localMusicAddMusicToPlaylist,
  localMusicRemoveMusicFromPlaylist,
  showSelectDialog,
} from '@renderer/utils/ipc'
import path from 'node:path'
import { dialog } from '@renderer/plugins/Dialog'

export interface LocalMusicState {
  directories: LX.LocalMusic.LocalMusicDirectory[]
  currentDirectory: LX.LocalMusic.LocalMusicDirectory | null
  allMusicFiles: LX.Music.MusicInfoLocal[]
  musicFiles: LX.Music.MusicInfoLocal[]
  playlistFiles: string[]
  playlistCounts: Record<string, number>
  currentPlaylist: string | null
  searchText: string
  isLoading: boolean
  isInited: boolean
}

const createInitialState = (): LocalMusicState => ({
  directories: [],
  currentDirectory: null,
  allMusicFiles: [],
  musicFiles: [],
  playlistFiles: [],
  playlistCounts: {},
  currentPlaylist: null,
  searchText: '',
  isLoading: false,
  isInited: false,
})

const state = ref<LocalMusicState>(createInitialState())

export function useLocalMusic() {
  const filteredMusicFiles = computed(() => {
    if (!state.value.searchText.trim()) {
      return state.value.musicFiles
    }
    const searchText = state.value.searchText.toLowerCase()
    return state.value.musicFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(searchText) ||
        file.singer.toLowerCase().includes(searchText),
    )
  })

  const saveViewState = async() => {
    await localMusicSetState({
      currentDirectoryId: state.value.currentDirectory?.id ?? null,
      currentPlaylistPath: state.value.currentPlaylist,
    })
  }

  const init = async() => {
    if (state.value.isInited || state.value.isLoading) return
    state.value.isLoading = true
    try {
      const [directories, viewState] = await Promise.all([
        localMusicGetDirectories(),
        localMusicGetState(),
      ])
      state.value.directories = directories
      if (directories.length > 0) {
        const targetDirectory = directories.find(dir => dir.id === viewState.currentDirectoryId) ?? directories[0]
        await selectDirectory(targetDirectory)
        if (viewState.currentPlaylistPath && state.value.playlistFiles.includes(viewState.currentPlaylistPath)) {
          await selectPlaylist(viewState.currentPlaylistPath)
        }
      } else {
        await saveViewState()
      }
      state.value.isInited = true
    } catch (err) {
      console.error('Failed to init local music:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  const selectDirectory = async(directory: LX.LocalMusic.LocalMusicDirectory) => {
    state.value.currentDirectory = directory
    state.value.currentPlaylist = null
    state.value.isLoading = true
    try {
      const result = await localMusicScanDirectory(directory.path)
      state.value.allMusicFiles = result.musicFiles
      state.value.musicFiles = result.musicFiles
      state.value.playlistFiles = result.playlistFiles
      await refreshPlaylistCounts(result.playlistFiles)
      await saveViewState()
    } catch (err) {
      console.error('Failed to scan directory:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  const refreshDirectory = async() => {
    if (!state.value.currentDirectory) return
    await selectDirectory(state.value.currentDirectory)
  }

  const refreshPlaylistCounts = async(playlistPaths: string[]) => {
    const counts = await Promise.all(playlistPaths.map(async playlistPath => {
      try {
        const musicFiles = await localMusicParsePlaylist(playlistPath)
        return [playlistPath, musicFiles.length] as const
      } catch (err) {
        console.error('Failed to load playlist count:', err)
        return [playlistPath, 0] as const
      }
    }))
    state.value.playlistCounts = Object.fromEntries(counts)
  }

  const assertPlaylistName = (name: string) => {
    const trimName = name.trim()
    if (!trimName) throw new Error('list_name_empty')
    if (/[\\/:*?"<>|]/.test(trimName)) throw new Error('list_name_invalid')
    return trimName
  }

  const addDirectory = async() => {
    const result = await showSelectDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return
    const dirPath = result.filePaths[0]
    const dir = await localMusicAddDirectory(dirPath)
    state.value.directories.push(dir)
    await selectDirectory(dir)
  }

  const removeDirectory = async(directory: LX.LocalMusic.LocalMusicDirectory) => {
    await localMusicRemoveDirectory(directory.id)
    state.value.directories = state.value.directories.filter(
      (d) => d.id !== directory.id,
    )
    if (state.value.currentDirectory?.id === directory.id) {
      if (state.value.directories.length > 0) {
        await selectDirectory(state.value.directories[0])
      } else {
        state.value.currentDirectory = null
        state.value.allMusicFiles = []
        state.value.musicFiles = []
        state.value.playlistFiles = []
        state.value.playlistCounts = {}
        state.value.currentPlaylist = null
        await saveViewState()
      }
    }
  }

  const selectPlaylist = async(playlistPath: string) => {
    state.value.currentPlaylist = playlistPath
    state.value.isLoading = true
    try {
      const musicFiles = await localMusicParsePlaylist(playlistPath)
      state.value.musicFiles = musicFiles
      await saveViewState()
    } catch (err) {
      console.error('Failed to parse playlist:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  const showAllFiles = async() => {
    if (state.value.currentDirectory) {
      state.value.currentPlaylist = null
      state.value.musicFiles = state.value.allMusicFiles
      await saveViewState()
    }
  }

  const getPlaylistName = (playlistPath: string) => {
    return path.basename(playlistPath, path.extname(playlistPath))
  }

  const createPlaylist = async(name: string) => {
    if (!state.value.currentDirectory) {
      await dialog('请先选择目录')
      return false
    }
    let trimName: string
    try {
      trimName = assertPlaylistName(name)
    } catch (err) {
      await dialog('播放列表名称不合法')
      return false
    }
    const exists = state.value.playlistFiles.some(p => getPlaylistName(p).toLowerCase() === trimName.toLowerCase())
    if (exists) {
      await dialog('播放列表名称已存在')
      return false
    }
    try {
      const playlistPath = await localMusicCreatePlaylist({
        dirPath: state.value.currentDirectory.path,
        name: trimName,
      })
      state.value.playlistFiles.push(playlistPath)
      state.value.playlistCounts = {
        ...state.value.playlistCounts,
        [playlistPath]: 0,
      }
      return true
    } catch (err) {
      console.error('Failed to create playlist:', err)
      await dialog('创建播放列表失败')
      return false
    }
  }

  const renamePlaylist = async(playlistPath: string, name: string) => {
    let trimName: string
    try {
      trimName = assertPlaylistName(name)
    } catch (err) {
      await dialog('播放列表名称不合法')
      return null
    }
    const exists = state.value.playlistFiles.some(p =>
      p !== playlistPath && getPlaylistName(p).toLowerCase() === trimName.toLowerCase(),
    )
    if (exists) {
      await dialog('播放列表名称已存在')
      return null
    }
    try {
      const newPath = await localMusicRenamePlaylist({
        playlistPath,
        name: trimName,
      })
      state.value.playlistFiles = state.value.playlistFiles.map(p => p === playlistPath ? newPath : p)
      const oldCount = state.value.playlistCounts[playlistPath] ?? 0
      const { [playlistPath]: _removedCount, ...restCounts } = state.value.playlistCounts
      state.value.playlistCounts = {
        ...restCounts,
        [newPath]: oldCount,
      }
      if (state.value.currentPlaylist === playlistPath) state.value.currentPlaylist = newPath
      await saveViewState()
      return newPath
    } catch (err) {
      console.error('Failed to rename playlist:', err)
      await dialog('修改播放列表失败')
      return null
    }
  }

  const deletePlaylist = async(playlistPath: string) => {
    try {
      await localMusicDeletePlaylist(playlistPath)
      state.value.playlistFiles = state.value.playlistFiles.filter(p => p !== playlistPath)
      const { [playlistPath]: _removedCount, ...restCounts } = state.value.playlistCounts
      state.value.playlistCounts = { ...restCounts }
      if (state.value.currentPlaylist === playlistPath) {
        state.value.currentPlaylist = null
        state.value.musicFiles = state.value.allMusicFiles
        await saveViewState()
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err)
      await dialog('删除播放列表失败')
    }
  }

  const getPlaylistMusicFiles = async(playlistPath: string) => {
    return localMusicParsePlaylist(playlistPath)
  }

  const refreshPlaylistAfterMutation = async(playlistPath: string) => {
    const musicFiles = await getPlaylistMusicFiles(playlistPath)
    state.value.playlistCounts = {
      ...state.value.playlistCounts,
      [playlistPath]: musicFiles.length,
    }
    if (state.value.currentPlaylist === playlistPath) state.value.musicFiles = musicFiles
    return musicFiles
  }

  const addMusicToPlaylist = async(playlistPath: string, musicInfo: LX.Music.MusicInfoLocal) => {
    try {
      await localMusicAddMusicToPlaylist({
        playlistPath,
        musicFilePaths: [musicInfo.meta.filePath],
      })
      return await refreshPlaylistAfterMutation(playlistPath)
    } catch (err) {
      console.error('Failed to add music to playlist:', err)
      await dialog('添加到播放列表失败')
      return null
    }
  }

  const removeMusicFromPlaylist = async(playlistPath: string, musicInfo: LX.Music.MusicInfoLocal) => {
    try {
      await localMusicRemoveMusicFromPlaylist({
        playlistPath,
        musicFilePaths: [musicInfo.meta.filePath],
      })
      return await refreshPlaylistAfterMutation(playlistPath)
    } catch (err) {
      console.error('Failed to remove music from playlist:', err)
      await dialog('移出播放列表失败')
      return null
    }
  }

  return {
    state,
    filteredMusicFiles,
    init,
    selectDirectory,
    refreshDirectory,
    addDirectory,
    removeDirectory,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    selectPlaylist,
    showAllFiles,
    getPlaylistName,
    getPlaylistMusicFiles,
    addMusicToPlaylist,
    removeMusicFromPlaylist,
  }
}
