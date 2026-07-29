import { dateFormat, sizeFormate } from '@common/utils/common'

export type LocalMusicColumnKey =
  | 'index'
  | 'cover'
  | 'fileName'
  | 'filePath'
  | 'title'
  | 'artist'
  | 'albumName'
  | 'duration'
  | 'year'
  | 'track'
  | 'disc'
  | 'genre'
  | 'language'
  | 'comment'
  | 'customTag'
  | 'createTime'
  | 'modifyTime'
  | 'fileType'
  | 'fileSize'
  | 'sampleRate'
  | 'bitrate'
  | 'channels'
  | 'codec'
  | 'tagTypes'
  | 'bitsPerSample'
  | 'select'

export type SortOrder = 'asc' | 'desc'

export interface LocalMusicColumnDefinition {
  key: LocalMusicColumnKey
  label: string
  width: number
  fixed?: 'left' | 'right'
  sortable?: boolean
  defaultVisible?: boolean
  align?: 'left' | 'center' | 'right'
}

export const LOCAL_MUSIC_COLUMNS: LocalMusicColumnDefinition[] = [
  { key: 'index', label: '#', width: 56, align: 'center', defaultVisible: true, fixed: 'left' },
  { key: 'cover', label: '', fixed: 'left', width: 56, align: 'center' },
  { key: 'fileName', label: '文件名', fixed: 'left', width: 220, sortable: true },
  { key: 'filePath', label: '文件路径', width: 500, sortable: true },
  { key: 'title', label: '标题', width: 220, sortable: true },
  { key: 'artist', label: '艺术家', width: 180, sortable: true, defaultVisible: true },
  { key: 'albumName', label: '专辑名', width: 180, sortable: true, defaultVisible: true },
  { key: 'duration', label: '时长', width: 104, sortable: true, defaultVisible: true, align: 'center' },
  { key: 'year', label: '年代', width: 88, sortable: true, defaultVisible: true, align: 'center' },
  { key: 'track', label: '音轨号', width: 88, sortable: true, align: 'center' },
  { key: 'disc', label: '碟号', width: 88, sortable: true, align: 'center' },
  { key: 'genre', label: '流派', width: 140 },
  { key: 'language', label: '语种', width: 100 },
  { key: 'comment', label: '注释', width: 220 },
  { key: 'customTag', label: '自定义标签', width: 160 },
  { key: 'createTime', label: '创建时间', width: 170, sortable: true },
  { key: 'modifyTime', label: '修改时间', width: 170, sortable: true, defaultVisible: true },
  { key: 'fileType', label: '文件类型', width: 100, sortable: true, align: 'center' },
  { key: 'fileSize', label: '文件大小', width: 120, sortable: true, align: 'right' },
  { key: 'sampleRate', label: '采样率', width: 120, sortable: true, align: 'right' },
  { key: 'bitrate', label: '比特率', width: 110, sortable: true, align: 'right' },
  { key: 'channels', label: '声道数', width: 96, sortable: true, align: 'center' },
  { key: 'codec', label: '编码方式', width: 140 },
  { key: 'tagTypes', label: '标签类型', width: 130 },
  { key: 'bitsPerSample', label: '位深', width: 88, align: 'center' },
  { key: 'select', label: '', width: 56, fixed: 'right', align: 'center' },
]

export const DEFAULT_VISIBLE_COLUMN_KEYS = LOCAL_MUSIC_COLUMNS
  .filter(column => column.defaultVisible && !column.fixed)
  .map(column => column.key)

export const EMPTY_CELL_VALUE = '-'

export const LOCAL_MUSIC_HEADER_HEIGHT = 38
export const LOCAL_MUSIC_ROW_HEIGHT = 40
export const LOCAL_MUSIC_OVERSCAN = 8

export const SELECTABLE_COLUMNS = LOCAL_MUSIC_COLUMNS.filter(column => !column.fixed)

export const normalizeSelectedColumnKeys = (columnKeys: string[] | null | undefined): LocalMusicColumnKey[] => {
  const allowedColumnKeys = new Set(SELECTABLE_COLUMNS.map(column => column.key))
  const normalized = (columnKeys ?? [])
    .map(key => (key === 'disk' ? 'disc' : key))
    .filter((key): key is LocalMusicColumnKey => {
      return allowedColumnKeys.has(key as LocalMusicColumnKey)
    })
  return normalized.length ? normalized : [...DEFAULT_VISIBLE_COLUMN_KEYS]
}

export const normalizeSortState = (
  value?: LX.LocalMusic.LocalMusicDirectoryConfig['sortState'] | null,
): {
  key: LocalMusicColumnKey | null
  order: SortOrder
} => {
  const rawKey = value?.key === 'disk' ? 'disc' : value?.key
  const key = rawKey
  if (!key) {
    return {
      key: null,
      order: 'asc',
    }
  }
  const targetColumn = LOCAL_MUSIC_COLUMNS.find(column => column.key === key)
  if (!targetColumn?.sortable) {
    return {
      key: null,
      order: 'asc',
    }
  }
  return {
    key: targetColumn.key,
    order: value?.order === 'desc' ? 'desc' : 'asc',
  }
}

export const formatMusicColumnText = (value: string | number | null | undefined) => {
  if (value == null) return EMPTY_CELL_VALUE
  const text = `${value}`.trim()
  return text || EMPTY_CELL_VALUE
}

export const getMusicSortValue = (musicInfo: LX.Music.MusicInfoLocal, key: LocalMusicColumnKey) => {
  switch (key) {
    case 'fileName':
      return musicInfo.meta.fileName ?? ''
    case 'filePath':
      return musicInfo.meta.filePath ?? ''
    case 'title':
      return musicInfo.name
    case 'artist':
      return musicInfo.singer
    case 'albumName':
      return musicInfo.meta.albumName
    case 'duration':
      return musicInfo.meta.duration ?? -1
    case 'year':
      return musicInfo.meta.year ?? -1
    case 'track':
      return musicInfo.meta.track ?? ''
    case 'disc':
      return musicInfo.meta.disc ?? ''
    case 'createTime':
      return musicInfo.meta.createTime ?? -1
    case 'modifyTime':
      return musicInfo.meta.modifyTime ?? -1
    case 'fileType':
      return (musicInfo.meta.ext ?? '').toLowerCase()
    case 'fileSize':
      return musicInfo.meta.fileSize ?? -1
    case 'sampleRate':
      return musicInfo.meta.sampleRate ?? -1
    case 'bitrate':
      return musicInfo.meta.bitrate ?? -1
    case 'channels':
      return musicInfo.meta.channels ?? -1
    default:
      return ''
  }
}

export const getMusicColumnText = (musicInfo: LX.Music.MusicInfoLocal, key: LocalMusicColumnKey) => {
  switch (key) {
    case 'fileName':
      return formatMusicColumnText(musicInfo.meta.fileName)
    case 'filePath':
      return formatMusicColumnText(musicInfo.meta.filePath)
    case 'title':
      return formatMusicColumnText(musicInfo.name)
    case 'artist':
      return formatMusicColumnText(musicInfo.singer)
    case 'albumName':
      return formatMusicColumnText(musicInfo.meta.albumName)
    case 'duration':
      return formatMusicColumnText(musicInfo.interval ?? '--/--')
    case 'year':
      return formatMusicColumnText(musicInfo.meta.year)
    case 'track':
      return formatMusicColumnText(musicInfo.meta.track)
    case 'disc':
      return formatMusicColumnText(musicInfo.meta.disc)
    case 'genre':
      return formatMusicColumnText(musicInfo.meta.genre)
    case 'language':
      return formatMusicColumnText(musicInfo.meta.language)
    case 'comment':
      return formatMusicColumnText(musicInfo.meta.comment)
    case 'customTag':
      return formatMusicColumnText(musicInfo.meta.customTags)
    case 'createTime':
      return musicInfo.meta.createTime ? dateFormat(musicInfo.meta.createTime) : EMPTY_CELL_VALUE
    case 'modifyTime':
      return musicInfo.meta.modifyTime ? dateFormat(musicInfo.meta.modifyTime) : EMPTY_CELL_VALUE
    case 'fileType':
      return formatMusicColumnText(musicInfo.meta.ext?.toUpperCase())
    case 'fileSize':
      return musicInfo.meta.fileSize ? sizeFormate(musicInfo.meta.fileSize) : EMPTY_CELL_VALUE
    case 'sampleRate':
      return musicInfo.meta.sampleRate ? `${musicInfo.meta.sampleRate} Hz` : EMPTY_CELL_VALUE
    case 'bitrate':
      return musicInfo.meta.bitrate ? `${Math.round(musicInfo.meta.bitrate / 1000)} kbps` : EMPTY_CELL_VALUE
    case 'channels':
      return formatMusicColumnText(musicInfo.meta.channels)
    case 'codec':
      return formatMusicColumnText(musicInfo.meta.codec)
    case 'tagTypes':
      return formatMusicColumnText(musicInfo.meta.tagTypes?.join(', '))
    case 'bitsPerSample':
      return musicInfo.meta.bitsPerSample ? `${musicInfo.meta.bitsPerSample} bit` : EMPTY_CELL_VALUE
    default:
      return EMPTY_CELL_VALUE
  }
}

export const getColumnStyle = (
  column: LocalMusicColumnDefinition,
  visibleColumns: LocalMusicColumnDefinition[],
) => {
  const style: Record<string, string> = {
    width: `${column.width}px`,
    minWidth: `${column.width}px`,
    maxWidth: `${column.width}px`,
  }
  if (column.fixed === 'left') {
    const currentIndex = visibleColumns.findIndex(item => item.key === column.key)
    const leftOffset = visibleColumns
      .slice(0, currentIndex)
      .filter(item => item.fixed === 'left')
      .reduce((total, item) => total + item.width, 0)
    style.left = `${leftOffset}px`
  }
  if (column.fixed === 'right') {
    const currentIndex = visibleColumns.findIndex(item => item.key === column.key)
    const rightOffset = visibleColumns
      .slice(currentIndex + 1)
      .filter(item => item.fixed === 'right')
      .reduce((total, item) => total + item.width, 0)
    style.right = `${rightOffset}px`
  }
  return style
}

export const getColumnSortMark = (
  key: LocalMusicColumnKey,
  sortState: { key: LocalMusicColumnKey | null, order: SortOrder },
) => {
  if (sortState.key !== key) return '↕'
  return sortState.order === 'asc' ? '↑' : '↓'
}
