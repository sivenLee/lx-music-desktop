export type BatchImportSaveFieldKey =
  | 'title'
  | 'artist'
  | 'album'
  | 'year'
  | 'track'
  | 'disc'
  | 'genre'
  | 'language'
  | 'comment'
  | 'customTags'
  | 'lyrics'

export type BatchImportColumnKey =
  | 'index'
  | 'filePath'
  | BatchImportSaveFieldKey
  | 'status'
  | 'select'

export type BatchImportWriteStatus = 0 | 1 | 2

export interface BatchImportSaveFieldOption {
  key: BatchImportSaveFieldKey
  label: string
}

export interface BatchImportColumnDefinition {
  key: BatchImportColumnKey
  label: string
  width: number
  fixed?: 'left' | 'right'
  editable?: boolean
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  defaultVisible?: boolean
}

export interface BatchImportMusicFile extends LX.Music.MusicInfoLocal {
  status?: BatchImportWriteStatus
  error?: string
}

export interface BatchImportSongsFile {
  version: number
  dirPath: string
  generatedAt: number
  musicFiles: BatchImportMusicFile[]
}

export interface BatchImportRow {
  id: string
  filePath: string
  selected: boolean
  status: BatchImportWriteStatus | null
  error: string
  title: string
  artist: string
  album: string
  year: string
  track: string
  disc: string
  genre: string
  language: string
  comment: string
  customTags: string
  lyrics: string
  musicInfo: BatchImportMusicFile
}

export const BATCH_IMPORT_SAVE_FIELDS: BatchImportSaveFieldOption[] = [
  { key: 'title', label: '标题' },
  { key: 'artist', label: '艺术家' },
  { key: 'album', label: '专辑' },
  { key: 'year', label: '年代' },
  { key: 'track', label: '音轨号' },
  { key: 'disc', label: '碟号' },
  { key: 'genre', label: '流派' },
  { key: 'language', label: '语种' },
  { key: 'comment', label: '注释' },
  { key: 'customTags', label: '标签' },
  { key: 'lyrics', label: '歌词' },
]

export const DEFAULT_BATCH_IMPORT_SAVE_FIELDS: BatchImportSaveFieldKey[] = [
  'genre',
  'language',
  'customTags',
]

export const BATCH_IMPORT_COLUMNS: BatchImportColumnDefinition[] = [
  { key: 'index', label: '#', width: 56, align: 'center', fixed: 'left' },
  { key: 'filePath', label: '文件路径', width: 360, fixed: 'left', sortable: true },
  { key: 'title', label: '标题', width: 180, editable: true, sortable: true, defaultVisible: true },
  { key: 'artist', label: '艺术家', width: 160, editable: true, sortable: true, defaultVisible: true },
  { key: 'album', label: '专辑', width: 160, editable: true, sortable: true, defaultVisible: true },
  { key: 'year', label: '年代', width: 88, editable: true, sortable: true, defaultVisible: true },
  { key: 'track', label: '音轨号', width: 88, editable: true, sortable: true, align: 'center' },
  { key: 'disc', label: '碟号', width: 88, editable: true, sortable: true, align: 'center' },
  { key: 'genre', label: '流派', width: 140, editable: true, sortable: true, defaultVisible: true },
  { key: 'language', label: '语种', width: 100, editable: true, sortable: true, defaultVisible: true },
  { key: 'comment', label: '注释', width: 180, editable: true, sortable: true },
  { key: 'customTags', label: '标签', width: 700, editable: true, sortable: true, defaultVisible: true },
  { key: 'lyrics', label: '歌词', width: 220, editable: true, sortable: true },
  { key: 'status', label: '状态', width: 80, align: 'center', sortable: true, defaultVisible: true },
  { key: 'select', label: '', width: 56, fixed: 'right', align: 'center' },
]

export const DEFAULT_BATCH_IMPORT_VISIBLE_COLUMNS = BATCH_IMPORT_COLUMNS
  .filter(column => column.defaultVisible && !column.fixed)
  .map(column => column.key)

export const BATCH_IMPORT_SELECTABLE_COLUMNS = BATCH_IMPORT_COLUMNS.filter(column => !column.fixed)

export const BATCH_IMPORT_ROW_HEIGHT = 40
export const BATCH_IMPORT_HEADER_HEIGHT = 38

export type BatchImportSortOrder = 'asc' | 'desc'

const parseSortableNumber = (value: string) => {
  const text = `${value ?? ''}`.trim()
  if (!text) return Number.NEGATIVE_INFINITY
  const matched = text.match(/-?\d+(\.\d+)?/)
  if (!matched) return Number.NEGATIVE_INFINITY
  const num = Number(matched[0])
  return Number.isFinite(num) ? num : Number.NEGATIVE_INFINITY
}

export const getBatchImportRowSortValue = (row: BatchImportRow, key: BatchImportColumnKey): string | number => {
  switch (key) {
    case 'filePath':
      return row.filePath
    case 'title':
      return row.title
    case 'artist':
      return row.artist
    case 'album':
      return row.album
    case 'year':
      return parseSortableNumber(row.year)
    case 'track':
      return parseSortableNumber(row.track)
    case 'disc':
      return parseSortableNumber(row.disc)
    case 'genre':
      return row.genre
    case 'language':
      return row.language
    case 'comment':
      return row.comment
    case 'customTags':
      return row.customTags
    case 'lyrics':
      return row.lyrics
    case 'status':
      return row.status == null ? -1 : row.status
    default:
      return ''
  }
}

export const getBatchImportColumnSortMark = (
  key: BatchImportColumnKey,
  sortState: { key: BatchImportColumnKey | null, order: BatchImportSortOrder },
) => {
  if (sortState.key !== key) return '↕'
  return sortState.order === 'asc' ? '↑' : '↓'
}

export const sortBatchImportRows = (
  list: BatchImportRow[],
  sortState: { key: BatchImportColumnKey | null, order: BatchImportSortOrder },
) => {
  const { key, order } = sortState
  if (!key) return [...list]
  return [...list].sort((left, right) => {
    const leftValue = getBatchImportRowSortValue(left, key)
    const rightValue = getBatchImportRowSortValue(right, key)
    if (typeof leftValue == 'number' && typeof rightValue == 'number') {
      return order === 'asc' ? leftValue - rightValue : rightValue - leftValue
    }
    const result = `${leftValue}`.localeCompare(`${rightValue}`, 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base',
    })
    return order === 'asc' ? result : -result
  })
}

export const getBatchImportStatusText = (status: BatchImportWriteStatus | null, error = '') => {
  if (status == null) return '-'
  if (status === 0) return '写入中'
  if (status === 1) return '成功'
  return error ? `失败：${error}` : '失败'
}

export const createBatchImportRow = (musicInfo: BatchImportMusicFile, index: number): BatchImportRow => {
  const filePath = musicInfo.meta?.filePath || musicInfo.id || `row_${index}`
  const lyrics = `${(musicInfo.meta as LX.Music.MusicInfoMeta_local & { lyrics?: string }).lyrics ?? musicInfo.meta?.lyricsPreview ?? ''}`.trim()
  return {
    id: filePath,
    filePath,
    selected: true,
    // status 仅存在于内存，不从 JSON 恢复
    status: null,
    error: '',
    title: musicInfo.name ?? '',
    artist: musicInfo.singer ?? '',
    album: musicInfo.meta?.albumName ?? '',
    year: musicInfo.meta?.year == null ? '' : `${musicInfo.meta.year}`,
    track: musicInfo.meta?.track ?? '',
    disc: musicInfo.meta?.disc ?? '',
    genre: musicInfo.meta?.genre ?? '',
    language: musicInfo.meta?.language ?? '',
    comment: musicInfo.meta?.comment ?? '',
    customTags: musicInfo.meta?.customTags ?? '',
    lyrics,
    musicInfo,
  }
}

export const parseBatchImportSongsFile = (data: unknown): BatchImportSongsFile => {
  if (!data || typeof data != 'object') throw new Error('JSON 格式无效')
  const cache = data as Partial<BatchImportSongsFile>
  if (!Array.isArray(cache.musicFiles)) throw new Error('JSON 缺少 musicFiles 列表')
  return {
    version: typeof cache.version == 'number' ? cache.version : 1,
    dirPath: `${cache.dirPath ?? ''}`,
    generatedAt: typeof cache.generatedAt == 'number' ? cache.generatedAt : Date.now(),
    musicFiles: cache.musicFiles.filter(Boolean) as BatchImportMusicFile[],
  }
}

export const syncBatchImportSongsFile = (
  fileData: BatchImportSongsFile,
  rows: BatchImportRow[],
): BatchImportSongsFile => {
  const rowMap = new Map(rows.map(row => [row.id, row]))
  return {
    ...fileData,
    generatedAt: Date.now(),
    musicFiles: fileData.musicFiles.map((item, index) => {
      const filePath = item.meta?.filePath || item.id || `row_${index}`
      const row = rowMap.get(filePath)
      if (!row) return item
      const yearText = row.year.trim()
      const yearNumber = Number(yearText)
      const next: BatchImportMusicFile = {
        ...item,
        name: row.title,
        singer: row.artist,
        meta: {
          ...item.meta,
          albumName: row.album,
          year: yearText ? (Number.isFinite(yearNumber) ? yearNumber : null) : null,
          track: row.track || null,
          disc: row.disc || null,
          genre: row.genre,
          language: row.language,
          comment: row.comment,
          customTags: row.customTags,
          lyricsPreview: row.lyrics.slice(0, 100),
        },
      }
      // status / error 仅内存使用，不同步回 JSON
      delete next.status
      delete next.error
      return next
    }),
  }
}
