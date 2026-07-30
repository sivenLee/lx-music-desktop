import { checkPath, dirname, extname, basename } from '@common/utils/nodejs'
import { isLocalMusicMetaEditable } from '@renderer/utils/music'
import { dialog } from '@renderer/plugins/Dialog'

/**
 * 将已完成的下载任务转为本地歌曲信息，供详情/编辑元信息复用
 * @param {LX.Download.ListItem} task
 * @returns {LX.Music.MusicInfoLocal | null}
 */
export const toLocalMusicInfoFromDownloadTask = (task) => {
  if (!task?.isComplate) return null
  const filePath = task.metadata?.filePath
  if (!filePath) return null
  const musicInfo = task.metadata.musicInfo
  const ext = extname(filePath).replace(/^\./, '').toLowerCase()
  return {
    id: filePath,
    name: musicInfo?.name || basename(filePath, extname(filePath)),
    singer: musicInfo?.singer || '',
    source: 'local',
    interval: musicInfo?.interval ?? null,
    meta: {
      songId: filePath,
      albumName: musicInfo?.meta?.albumName || '',
      picUrl: musicInfo?.meta?.picUrl || '',
      filePath,
      ext,
      fileName: task.metadata.fileName || basename(filePath),
    },
  }
}

export default ({ list }) => {
  /**
   * @returns {Promise<{ musicInfo: LX.Music.MusicInfoLocal, musicList: LX.Music.MusicInfoLocal[], dirPath: string } | null>}
   */
  const resolveCompletedLocalMusic = async(index) => {
    const task = list.value[index]
    if (!task?.isComplate) {
      await dialog('仅已完成的下载任务可用')
      return null
    }
    const filePath = task.metadata.filePath
    if (!await checkPath(filePath)) {
      await dialog('本地文件不存在，可能已被移动或删除')
      return null
    }
    const musicInfo = toLocalMusicInfoFromDownloadTask(task)
    if (!musicInfo) return null

    const musicList = list.value
      .map(item => toLocalMusicInfoFromDownloadTask(item))
      .filter(item => item != null && isLocalMusicMetaEditable(item.meta.filePath))

    return {
      musicInfo,
      musicList,
      dirPath: dirname(filePath),
    }
  }

  return {
    toLocalMusicInfoFromDownloadTask,
    resolveCompletedLocalMusic,
  }
}
