import { ref, computed } from 'vue'
import {
  localMusicGetDirectories,
  localMusicAddDirectory,
  localMusicRemoveDirectory,
  localMusicScanDirectory,
  localMusicParsePlaylist,
  showSelectDialog,
} from '@renderer/utils/ipc'
import path from 'node:path'

export interface LocalMusicState {
  directories: LX.LocalMusic.LocalMusicDirectory[]
  currentDirectory: LX.LocalMusic.LocalMusicDirectory | null
  musicFiles: LX.Music.MusicInfoLocal[]
  playlistFiles: string[]
  currentPlaylist: string | null
  searchText: string
  isLoading: boolean
}

export function useLocalMusic() {
  const state = ref<LocalMusicState>({
    directories: [],
    currentDirectory: null,
    musicFiles: [],
    playlistFiles: [],
    currentPlaylist: null,
    searchText: '',
    isLoading: false,
  })

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

  const init = async() => {
    state.value.isLoading = true
    try {
      const directories = await localMusicGetDirectories()
      state.value.directories = directories
      if (directories.length > 0) {
        await selectDirectory(directories[0])
      }
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
      state.value.musicFiles = result.musicFiles
      state.value.playlistFiles = result.playlistFiles
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
        state.value.musicFiles = []
        state.value.playlistFiles = []
        state.value.currentPlaylist = null
      }
    }
  }

  const selectPlaylist = async(playlistPath: string) => {
    state.value.currentPlaylist = playlistPath
    state.value.isLoading = true
    try {
      const musicFiles = await localMusicParsePlaylist(playlistPath)
      state.value.musicFiles = musicFiles
    } catch (err) {
      console.error('Failed to parse playlist:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  const showAllFiles = async() => {
    if (state.value.currentDirectory) {
      await selectDirectory(state.value.currentDirectory)
    }
  }

  const getPlaylistName = (playlistPath: string) => {
    return path.basename(playlistPath, path.extname(playlistPath))
  }

  return {
    state,
    filteredMusicFiles,
    init,
    selectDirectory,
    refreshDirectory,
    addDirectory,
    removeDirectory,
    selectPlaylist,
    showAllFiles,
    getPlaylistName,
  }
}
