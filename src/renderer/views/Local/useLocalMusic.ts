import { ref, computed } from 'vue'
import {
  localMusicGetDirectories,
  localMusicGetState,
  localMusicSetState,
  localMusicAddDirectory,
  localMusicRemoveDirectory,
  localMusicScanDirectory,
  localMusicSaveDirectoryConfig,
  localMusicParsePlaylist,
  localMusicGetPlaylistDetail,
  localMusicCreatePlaylist,
  localMusicRenamePlaylist,
  localMusicDeletePlaylist,
  localMusicAddMusicToPlaylist,
  localMusicRemoveMusicFromPlaylist,
  localMusicSavePlaylistOrder,
  localMusicReadPlaylistText,
  localMusicWritePlaylistText,
  showSelectDialog,
} from '@renderer/utils/ipc'
import path from 'node:path'
import { dialog } from '@renderer/plugins/Dialog'
import {
  DEFAULT_KEYWORD_SEARCH_FIELDS,
  KEYWORD_SEARCH_FIELD_OPTIONS,
  matchLocalMusicSearchExpression,
  normalizeKeywordSearchFields,
  type KeywordSearchFieldKey,
} from './localMusicSearch'

export interface LocalMusicState {
  directories: LX.LocalMusic.LocalMusicDirectory[]
  currentDirectory: LX.LocalMusic.LocalMusicDirectory | null
  directoryConfig: LX.LocalMusic.LocalMusicDirectoryConfig
  allMusicFiles: LX.Music.MusicInfoLocal[]
  musicFiles: LX.Music.MusicInfoLocal[]
  playlistFiles: string[]
  playlistCounts: Record<string, number>
  playlistInvalidCounts: Record<string, number>
  currentPlaylist: string | null
  searchText: string
  keywordSearchFields: KeywordSearchFieldKey[]
  isLoading: boolean
  isRefreshing: boolean
  isInited: boolean
}

const createInitialState = (): LocalMusicState => ({
  directories: [],
  currentDirectory: null,
  directoryConfig: {
    currentPlaylistPath: null,
    selectedColumnKeys: [],
    sortState: {
      key: null,
      order: 'asc',
    },
  },
  allMusicFiles: [],
  musicFiles: [],
  playlistFiles: [],
  playlistCounts: {},
  playlistInvalidCounts: {},
  currentPlaylist: null,
  searchText: '',
  keywordSearchFields: [...DEFAULT_KEYWORD_SEARCH_FIELDS],
  isLoading: false,
  isRefreshing: false,
  isInited: false,
})

const state = ref<LocalMusicState>(createInitialState())

export function useLocalMusic() {
  const filteredMusicFiles = computed(() => {
    const expression = state.value.searchText.trim()
    if (!expression) {
      return state.value.musicFiles
    }

    return state.value.musicFiles.filter(file => {
      return matchLocalMusicSearchExpression(expression, file, state.value.keywordSearchFields)
    })
  })

  const saveViewState = async() => {
    await localMusicSetState({
      currentDirectoryId: state.value.currentDirectory?.id ?? null,
      currentPlaylistPath: state.value.currentPlaylist,
    })
  }

  const saveDirectoryConfig = async(config: LX.LocalMusic.LocalMusicDirectoryConfig) => {
    if (!state.value.currentDirectory) return config
    const plainConfig: LX.LocalMusic.LocalMusicDirectoryConfig = {
      currentPlaylistPath: config.currentPlaylistPath ?? null,
      selectedColumnKeys: [...config.selectedColumnKeys],
      sortState: {
        key: config.sortState.key ?? null,
        order: config.sortState.order === 'desc' ? 'desc' : 'asc',
      },
      keywordSearchFields: Array.isArray(config.keywordSearchFields)
        ? [...config.keywordSearchFields]
        : [...state.value.keywordSearchFields],
    }
    const savedConfig = await localMusicSaveDirectoryConfig({
      dirPath: state.value.currentDirectory.path,
      config: plainConfig,
    })
    state.value.directoryConfig = savedConfig
    state.value.keywordSearchFields = normalizeKeywordSearchFields(savedConfig.keywordSearchFields)
    return savedConfig
  }

  const updateDirectoryConfig = async(patch: Partial<LX.LocalMusic.LocalMusicDirectoryConfig>) => {
    return saveDirectoryConfig({
      ...state.value.directoryConfig,
      ...patch,
      sortState: {
        ...state.value.directoryConfig.sortState,
        ...patch.sortState,
      },
    })
  }

  const toggleKeywordSearchField = async(key: KeywordSearchFieldKey) => {
    const current = new Set(state.value.keywordSearchFields)
    if (current.has(key)) current.delete(key)
    else current.add(key)
    const next = KEYWORD_SEARCH_FIELD_OPTIONS
      .map(item => item.key)
      .filter(item => current.has(item))
    state.value.keywordSearchFields = next.length ? next : []
    await updateDirectoryConfig({
      keywordSearchFields: [...state.value.keywordSearchFields],
    })
  }

  const applyPlaylistDetails = (playlistDetails: Record<string, {
    validCount: number
    invalidCount: number
  }>) => {
    state.value.playlistCounts = Object.fromEntries(Object.entries(playlistDetails).map(([playlistPath, detail]) => {
      return [playlistPath, detail.validCount]
    }))
    state.value.playlistInvalidCounts = Object.fromEntries(Object.entries(playlistDetails).map(([playlistPath, detail]) => {
      return [playlistPath, detail.invalidCount]
    }))
  }

  const loadDirectoryContent = async(directory: LX.LocalMusic.LocalMusicDirectory, forceRefresh = false) => {
    state.value.currentDirectory = directory
    state.value.currentPlaylist = null
    const result = await localMusicScanDirectory({
      dirPath: directory.path,
      forceRefresh,
    })
    state.value.allMusicFiles = result.musicFiles
    state.value.playlistFiles = result.playlistFiles
    state.value.directoryConfig = result.directoryConfig
    state.value.keywordSearchFields = normalizeKeywordSearchFields(result.directoryConfig.keywordSearchFields)
    applyPlaylistDetails(result.playlistDetails)
    if (result.directoryConfig.currentPlaylistPath && result.playlistFiles.includes(result.directoryConfig.currentPlaylistPath)) {
      state.value.currentPlaylist = result.directoryConfig.currentPlaylistPath
      state.value.musicFiles = await localMusicParsePlaylist(result.directoryConfig.currentPlaylistPath)
    } else {
      state.value.musicFiles = result.musicFiles
    }
    await saveViewState()
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
        await loadDirectoryContent(targetDirectory)
        if (!state.value.currentPlaylist && viewState.currentPlaylistPath && state.value.playlistFiles.includes(viewState.currentPlaylistPath)) {
          state.value.currentPlaylist = viewState.currentPlaylistPath
          state.value.musicFiles = await localMusicParsePlaylist(viewState.currentPlaylistPath)
          await updateDirectoryConfig({
            currentPlaylistPath: viewState.currentPlaylistPath,
          })
          await saveViewState()
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

  const selectDirectory = async(directory: LX.LocalMusic.LocalMusicDirectory, forceRefresh = false) => {
    if (state.value.isLoading) return
    state.value.isLoading = true
    try {
      await loadDirectoryContent(directory, forceRefresh)
    } catch (err) {
      console.error('Failed to scan directory:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  const refreshDirectory = async() => {
    if (!state.value.currentDirectory || state.value.isLoading) return
    state.value.isLoading = true
    state.value.isRefreshing = true
    state.value.playlistFiles = []
    state.value.playlistCounts = {}
    state.value.playlistInvalidCounts = {}
    state.value.allMusicFiles = []
    state.value.musicFiles = []
    state.value.currentPlaylist = null
    try {
      await loadDirectoryContent(state.value.currentDirectory, true)
    } catch (err) {
      console.error('Failed to refresh directory:', err)
    } finally {
      state.value.isRefreshing = false
      state.value.isLoading = false
    }
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
        state.value.directoryConfig = createInitialState().directoryConfig
        state.value.keywordSearchFields = [...DEFAULT_KEYWORD_SEARCH_FIELDS]
        state.value.allMusicFiles = []
        state.value.musicFiles = []
        state.value.playlistFiles = []
        state.value.playlistCounts = {}
        state.value.playlistInvalidCounts = {}
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
      await updateDirectoryConfig({
        currentPlaylistPath: playlistPath,
      })
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
      await updateDirectoryConfig({
        currentPlaylistPath: null,
      })
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
      state.value.playlistInvalidCounts = {
        ...state.value.playlistInvalidCounts,
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
      const oldInvalidCount = state.value.playlistInvalidCounts[playlistPath] ?? 0
      const { [playlistPath]: _removedCount, ...restCounts } = state.value.playlistCounts
      const { [playlistPath]: _removedInvalidCount, ...restInvalidCounts } = state.value.playlistInvalidCounts
      state.value.playlistCounts = {
        ...restCounts,
        [newPath]: oldCount,
      }
      state.value.playlistInvalidCounts = {
        ...restInvalidCounts,
        [newPath]: oldInvalidCount,
      }
      if (state.value.currentPlaylist === playlistPath) {
        state.value.currentPlaylist = newPath
        await updateDirectoryConfig({
          currentPlaylistPath: newPath,
        })
      }
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
      const { [playlistPath]: _removedInvalidCount, ...restInvalidCounts } = state.value.playlistInvalidCounts
      state.value.playlistCounts = { ...restCounts }
      state.value.playlistInvalidCounts = { ...restInvalidCounts }
      if (state.value.currentPlaylist === playlistPath) {
        state.value.currentPlaylist = null
        state.value.musicFiles = state.value.allMusicFiles
        await updateDirectoryConfig({
          currentPlaylistPath: null,
        })
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
    const [musicFiles, detail] = await Promise.all([
      getPlaylistMusicFiles(playlistPath),
      localMusicGetPlaylistDetail(playlistPath),
    ])
    state.value.playlistCounts = {
      ...state.value.playlistCounts,
      [playlistPath]: detail.validCount,
    }
    state.value.playlistInvalidCounts = {
      ...state.value.playlistInvalidCounts,
      [playlistPath]: detail.invalidCount,
    }
    if (state.value.currentPlaylist === playlistPath) state.value.musicFiles = musicFiles
    return musicFiles
  }

  const readPlaylistText = async(playlistPath: string) => {
    return localMusicReadPlaylistText(playlistPath)
  }

  const writePlaylistText = async(playlistPath: string, content: string) => {
    await localMusicWritePlaylistText({
      playlistPath,
      content,
    })
    return refreshPlaylistAfterMutation(playlistPath)
  }

  const getPlaylistDetail = async(playlistPath: string) => {
    return localMusicGetPlaylistDetail(playlistPath)
  }

  const addMusicsToPlaylist = async(playlistPath: string, musicInfos: LX.Music.MusicInfoLocal[]) => {
    try {
      await localMusicAddMusicToPlaylist({
        playlistPath,
        musicFilePaths: [...new Set(musicInfos.map(musicInfo => musicInfo.meta.filePath))],
      })
      return await refreshPlaylistAfterMutation(playlistPath)
    } catch (err) {
      console.error('Failed to add music to playlist:', err)
      await dialog('添加到播放列表失败')
      return null
    }
  }

  const addMusicToPlaylist = async(playlistPath: string, musicInfo: LX.Music.MusicInfoLocal) => {
    return addMusicsToPlaylist(playlistPath, [musicInfo])
  }

  const removeMusicsFromPlaylist = async(playlistPath: string, musicInfos: LX.Music.MusicInfoLocal[]) => {
    try {
      await localMusicRemoveMusicFromPlaylist({
        playlistPath,
        musicFilePaths: [...new Set(musicInfos.map(musicInfo => musicInfo.meta.filePath))],
      })
      return await refreshPlaylistAfterMutation(playlistPath)
    } catch (err) {
      console.error('Failed to remove music from playlist:', err)
      await dialog('移出播放列表失败')
      return null
    }
  }

  const removeMusicFromPlaylist = async(playlistPath: string, musicInfo: LX.Music.MusicInfoLocal) => {
    return removeMusicsFromPlaylist(playlistPath, [musicInfo])
  }

  const reorderPlaylists = async(playlistFiles: string[]) => {
    if (!state.value.currentDirectory) return playlistFiles
    state.value.playlistFiles = [...playlistFiles]
    try {
      const ordered = await localMusicSavePlaylistOrder({
        dirPath: state.value.currentDirectory.path,
        playlistFiles,
      })
      state.value.playlistFiles = ordered
      return ordered
    } catch (err) {
      console.error('Failed to reorder playlists:', err)
      return state.value.playlistFiles
    }
  }

  const applyUpdatedMusicInfo = (musicInfo: LX.Music.MusicInfoLocal) => {
    const replaceInList = (list: LX.Music.MusicInfoLocal[]) => {
      const index = list.findIndex(item => item.meta.filePath === musicInfo.meta.filePath || item.id === musicInfo.id)
      if (index < 0) return list
      const next = [...list]
      next[index] = musicInfo
      return next
    }
    state.value.allMusicFiles = replaceInList(state.value.allMusicFiles)
    state.value.musicFiles = replaceInList(state.value.musicFiles)
  }

  return {
    state,
    filteredMusicFiles,
    keywordSearchFieldOptions: KEYWORD_SEARCH_FIELD_OPTIONS,
    toggleKeywordSearchField,
    saveDirectoryConfig,
    updateDirectoryConfig,
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
    getPlaylistDetail,
    readPlaylistText,
    writePlaylistText,
    addMusicsToPlaylist,
    addMusicToPlaylist,
    removeMusicsFromPlaylist,
    removeMusicFromPlaylist,
    reorderPlaylists,
    applyUpdatedMusicInfo,
  }
}
