import { ref, computed, watch, toRaw, type Ref } from '@common/utils/vueTools'
import { overwriteListMusics, clearListMusics } from '@renderer/store/list/action'
import { playListById, stop } from '@renderer/core/player'
import { setPlayListId, setPlayMusicInfo } from '@renderer/store/player/action'
import { playMusicInfo } from '@renderer/store/player/state'
import type { useLocalMusic } from './useLocalMusic'
import type { LocalMusicColumnKey, SortOrder } from './localMusicColumns'

export const LOCAL_MUSIC_QUEUE_ID = 'local_music_queue'

export interface UseLocalQueueOptions {
  localMusic: ReturnType<typeof useLocalMusic>
  sortMusicFiles: (musicFiles: LX.Music.MusicInfoLocal[]) => LX.Music.MusicInfoLocal[]
  sortState: Ref<{ key: LocalMusicColumnKey | null, order: SortOrder }>
}

export function useLocalQueue({
  localMusic,
  sortMusicFiles,
  sortState,
}: UseLocalQueueOptions) {
  const activeLocalQueueKey = ref('')

  const getLocalQueueKey = (playlistPath = localMusic.state.value.currentPlaylist) => {
    if (playlistPath) return `playlist:${playlistPath}`
    return `all:${localMusic.state.value.currentDirectory?.id ?? ''}`
  }

  const currentQueueKey = computed(() => {
    if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return ''
    return activeLocalQueueKey.value
  })

  const currentPlayingMusicId = computed(() => {
    if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return null
    if (currentQueueKey.value !== getLocalQueueKey()) return null
    return playMusicInfo.musicInfo?.id ?? null
  })

  const isQueueAllFilesActive = computed(() => currentQueueKey.value === getLocalQueueKey(null))

  const isQueuePlaylistActive = (playlistPath: string) => currentQueueKey.value === `playlist:${playlistPath}`

  const getLocalQueueMusicFiles = (
    musicFiles = localMusic.state.value.musicFiles,
  ) => {
    // Search results are only for display; playback always uses the current raw list with sort applied.
    return sortMusicFiles(musicFiles)
  }

  const getCurrentLocalQueue = () => {
    return getLocalQueueMusicFiles()
  }

  const normalizeLocalQueue = (musicFiles: LX.Music.MusicInfoLocal[]) => {
    const addedIds = new Set<string>()
    return musicFiles.filter(musicInfo => {
      if (addedIds.has(musicInfo.id)) return false
      addedIds.add(musicInfo.id)
      return true
    })
  }

  const syncLocalQueue = async(musicFiles: LX.Music.MusicInfoLocal[]) => {
    const queueMusicFiles = normalizeLocalQueue(musicFiles)
    await overwriteListMusics({
      listId: LOCAL_MUSIC_QUEUE_ID,
      musicInfos: queueMusicFiles.map(musicInfo => {
        const rawMusicInfo = toRaw(musicInfo)
        return {
          ...rawMusicInfo,
          meta: { ...toRaw(rawMusicInfo.meta) },
        }
      }),
    })
  }

  const clearLocalQueueAndStop = async() => {
    activeLocalQueueKey.value = ''
    await clearListMusics([LOCAL_MUSIC_QUEUE_ID])
    if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID) {
      stop()
      setPlayMusicInfo(null, null)
      setPlayListId(null)
    }
  }

  const syncPlaylistQueueIfNeeded = async(playlistPath: string, musicFiles?: LX.Music.MusicInfoLocal[]) => {
    if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return
    if (activeLocalQueueKey.value !== `playlist:${playlistPath}`) return
    await syncLocalQueue(getLocalQueueMusicFiles(
      musicFiles ?? await localMusic.getPlaylistMusicFiles(playlistPath),
    ))
  }

  const playLocalMusic = async(musicInfo: LX.Music.MusicInfoLocal) => {
    const queue = getCurrentLocalQueue()
    if (!queue.length) return
    activeLocalQueueKey.value = getLocalQueueKey()
    await syncLocalQueue(queue)
    playListById(LOCAL_MUSIC_QUEUE_ID, musicInfo.id)
  }

  const handlePlaylistRenamed = ({ oldPath, newPath }: { oldPath: string, newPath: string }) => {
    if (activeLocalQueueKey.value === `playlist:${oldPath}`) {
      activeLocalQueueKey.value = `playlist:${newPath}`
    }
  }

  const handlePlaylistDeleted = async(playlistPath: string) => {
    if (activeLocalQueueKey.value === `playlist:${playlistPath}`) {
      await clearLocalQueueAndStop()
    }
  }

  watch([
    () => localMusic.state.value.currentPlaylist,
    () => localMusic.state.value.musicFiles,
    () => sortState.value.key,
    () => sortState.value.order,
  ], () => {
    if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return
    const expectedQueueKey = getLocalQueueKey()
    if (activeLocalQueueKey.value !== expectedQueueKey) return
    void syncLocalQueue(getLocalQueueMusicFiles())
  }, { deep: true })

  return {
    LOCAL_MUSIC_QUEUE_ID,
    activeLocalQueueKey,
    currentQueueKey,
    currentPlayingMusicId,
    isQueueAllFilesActive,
    isQueuePlaylistActive,
    getLocalQueueKey,
    syncLocalQueue,
    playLocalMusic,
    clearLocalQueueAndStop,
    syncPlaylistQueueIfNeeded,
    handlePlaylistRenamed,
    handlePlaylistDeleted,
  }
}
