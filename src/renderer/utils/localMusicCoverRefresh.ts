import { getPicPath } from '@renderer/core/music'
import { setMusicInfo } from '@renderer/store/player/action'
import { playMusicInfo } from '@renderer/store/player/state'
import {
  clearLocalMusicCoverUrlCache,
  clearLocalMusicMetadataCache,
} from '@renderer/utils/music'

export const refreshPlayingLocalMusicPic = async(filePath: string) => {
  const musicInfo = playMusicInfo.musicInfo
  if (!musicInfo || 'progress' in musicInfo || musicInfo.source !== 'local') return
  if (musicInfo.meta.filePath !== filePath) return
  try {
    const url = await getPicPath({
      musicInfo,
      listId: playMusicInfo.listId,
      isRefresh: false,
    })
    if (musicInfo.id !== playMusicInfo.musicInfo?.id) return
    setMusicInfo({ pic: url || null })
    window.app_event.picUpdated()
  } catch (err) {
    console.log(err)
  }
}

export const notifyLocalMusicCoverChanged = async(filePath: string) => {
  clearLocalMusicMetadataCache(filePath)
  clearLocalMusicCoverUrlCache(filePath)
  window.app_event.localMusicCoverUpdated(filePath)
  await refreshPlayingLocalMusicPic(filePath)
}
