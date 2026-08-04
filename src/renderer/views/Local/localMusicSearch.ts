import { EMPTY_CELL_VALUE, getMusicColumnText, getMusicSortValue, type LocalMusicColumnKey } from './localMusicColumns'

type FieldType = 'string' | 'number' | 'time' | 'duration' | 'size' | 'sampleRate' | 'bitrate' | 'bitDepth' | 'presence'
type CompareOp = '>' | '<' | '>=' | '<=' | '=' | '==' | '!=' | '!=='
type CondResult = { kind: 'ok', value: boolean } | { kind: 'invalid' }

interface SearchFieldDefinition {
  key: LocalMusicColumnKey | 'cover' | 'lyrics'
  label: string
  type: FieldType
}

const SEARCH_FIELDS: SearchFieldDefinition[] = [
  { key: 'fileName', label: '文件名', type: 'string' },
  { key: 'filePath', label: '文件路径', type: 'string' },
  { key: 'title', label: '标题', type: 'string' },
  { key: 'artist', label: '艺术家', type: 'string' },
  { key: 'albumName', label: '专辑', type: 'string' },
  { key: 'duration', label: '时长', type: 'duration' },
  { key: 'year', label: '年代', type: 'number' },
  { key: 'track', label: '音轨号', type: 'number' },
  { key: 'disc', label: '碟号', type: 'number' },
  { key: 'genre', label: '流派', type: 'string' },
  { key: 'language', label: '语种', type: 'string' },
  { key: 'comment', label: '注释', type: 'string' },
  { key: 'customTag', label: '标签', type: 'string' },
  { key: 'createTime', label: '创建时间', type: 'time' },
  { key: 'modifyTime', label: '修改时间', type: 'time' },
  { key: 'fileType', label: '文件类型', type: 'string' },
  { key: 'fileSize', label: '文件大小', type: 'size' },
  { key: 'sampleRate', label: '采样率', type: 'sampleRate' },
  { key: 'bitrate', label: '比特率', type: 'bitrate' },
  { key: 'channels', label: '声道数', type: 'number' },
  { key: 'codec', label: '编码方式', type: 'string' },
  { key: 'tagTypes', label: '标签类型', type: 'string' },
  { key: 'bitsPerSample', label: '位深', type: 'bitDepth' },
  { key: 'cover', label: '封面', type: 'presence' },
  { key: 'lyrics', label: '歌词', type: 'presence' },
]

const COMPARE_OPS: CompareOp[] = ['!==', '!=', '==', '>=', '<=', '=', '>', '<']
const NUMERIC_COMPARE_OPS: CompareOp[] = ['>', '<', '>=', '<=']

const FIELD_BY_LABEL = (() => {
  const map = new Map<string, SearchFieldDefinition>()
  const labels = SEARCH_FIELDS.map(field => field.label).sort((a, b) => b.length - a.length)
  for (const label of labels) {
    const field = SEARCH_FIELDS.find(item => item.label === label)
    if (field) map.set(label, field)
  }
  return map
})()

const ok = (value: boolean): CondResult => ({ kind: 'ok', value })
const invalid = (): CondResult => ({ kind: 'invalid' })

const asBool = (result: CondResult, parent: 'and' | 'or'): boolean => {
  if (result.kind === 'invalid') return parent === 'and'
  return result.value
}

const combineAnd = (left: CondResult, right: CondResult): CondResult => {
  return ok(asBool(left, 'and') && asBool(right, 'and'))
}

const combineOr = (left: CondResult, right: CondResult): CondResult => {
  return ok(asBool(left, 'or') || asBool(right, 'or'))
}

const tokenizeSearchExpression = (expression: string) => {
  const tokens: string[] = []
  let current = ''

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i]
    const nextChar = expression[i + 1]

    if (char === '&' && nextChar === '&') {
      if (current.trim()) tokens.push(current.trim())
      tokens.push('&&')
      current = ''
      i++
      continue
    }
    if (char === '|' && nextChar === '|') {
      if (current.trim()) tokens.push(current.trim())
      tokens.push('||')
      current = ''
      i++
      continue
    }
    if (char === '!' && nextChar === '!') {
      if (current.trim()) tokens.push(current.trim())
      tokens.push('!!')
      current = ''
      i++
      continue
    }
    if (char === '(' || char === ')') {
      if (current.trim()) tokens.push(current.trim())
      tokens.push(char)
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) tokens.push(current.trim())
  return tokens
}

const splitOperator = (token: string): { fieldLabel: string, op: CompareOp, value: string } | 'invalid' | null => {
  for (const [label] of FIELD_BY_LABEL) {
    if (!token.startsWith(label)) continue
    const rest = token.slice(label.length)
    for (const op of COMPARE_OPS) {
      if (!rest.startsWith(op)) continue
      const value = rest.slice(op.length).trim()
      if (!value) return 'invalid'
      return { fieldLabel: label, op, value }
    }
  }
  return null
}

const parseArrayValues = (raw: string): string[] | null => {
  const text = raw.trim()
  if (!text.startsWith('[') || !text.endsWith(']')) return null
  const inner = text.slice(1, -1).trim()
  if (!inner) return []
  return inner.split(',').map(item => item.trim()).filter(Boolean)
}

const parseTimeValue = (raw: string): number | null => {
  const matched = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw.trim())
  if (!matched) return null
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const hour = Number(matched[4] ?? 0)
  const minute = Number(matched[5] ?? 0)
  const second = Number(matched[6] ?? 0)
  const date = new Date(year, month - 1, day, hour, minute, second)
  const time = date.getTime()
  return Number.isFinite(time) ? time : null
}

const parseNumberValue = (raw: string): number | null => {
  const num = Number(raw.trim())
  return Number.isFinite(num) ? num : null
}

const getPresenceValue = (musicInfo: LX.Music.MusicInfoLocal, key: 'cover' | 'lyrics') => {
  if (key === 'cover') return Boolean(musicInfo.meta.hasCover)
  return Boolean(musicInfo.meta.hasLyrics)
}

const getStringValue = (musicInfo: LX.Music.MusicInfoLocal, key: SearchFieldDefinition['key']) => {
  if (key === 'cover' || key === 'lyrics') return ''
  if (key === 'customTag') return `${musicInfo.meta.customTags ?? ''}`
  if (key === 'bitsPerSample') {
    return musicInfo.meta.bitsPerSample == null ? '' : `${musicInfo.meta.bitsPerSample}`
  }
  const text = getMusicColumnText(musicInfo, key)
  if (text === EMPTY_CELL_VALUE) return ''
  return text
}

const isFieldEmpty = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition) => {
  if (field.type === 'presence') {
    return !getPresenceValue(musicInfo, field.key as 'cover' | 'lyrics')
  }
  if (field.type === 'string') {
    const text = getStringValue(musicInfo, field.key).trim()
    return !text || text === EMPTY_CELL_VALUE
  }
  if (field.key === 'cover' || field.key === 'lyrics') return true
  if (field.type === 'time') {
    const value = field.key === 'createTime' ? musicInfo.meta.createTime : musicInfo.meta.modifyTime
    return value == null || !Number.isFinite(value) || value <= 0
  }
  if (field.type === 'duration') {
    return musicInfo.meta.duration == null || !Number.isFinite(musicInfo.meta.duration)
  }
  if (field.type === 'size') {
    return musicInfo.meta.fileSize == null || !Number.isFinite(musicInfo.meta.fileSize)
  }
  if (field.type === 'sampleRate') {
    return musicInfo.meta.sampleRate == null || !Number.isFinite(musicInfo.meta.sampleRate)
  }
  if (field.type === 'bitrate') {
    return musicInfo.meta.bitrate == null || !Number.isFinite(musicInfo.meta.bitrate)
  }
  if (field.type === 'bitDepth') {
    return musicInfo.meta.bitsPerSample == null || !Number.isFinite(musicInfo.meta.bitsPerSample)
  }
  if (field.key === 'year') {
    return musicInfo.meta.year == null || !Number.isFinite(musicInfo.meta.year)
  }
  if (field.key === 'channels') {
    return musicInfo.meta.channels == null || !Number.isFinite(musicInfo.meta.channels)
  }
  if (field.key === 'track') {
    return !`${musicInfo.meta.track ?? ''}`.trim()
  }
  if (field.key === 'disc') {
    return !`${musicInfo.meta.disc ?? ''}`.trim()
  }
  const sortValue = getMusicSortValue(musicInfo, field.key as LocalMusicColumnKey)
  if (typeof sortValue === 'number') return !Number.isFinite(sortValue) || sortValue < 0
  return !`${sortValue ?? ''}`.trim()
}

const getComparableNumber = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition): number | null => {
  switch (field.type) {
    case 'duration': {
      const seconds = musicInfo.meta.duration
      return seconds == null || !Number.isFinite(seconds) ? null : seconds
    }
    case 'size': {
      const bytes = musicInfo.meta.fileSize
      if (bytes == null || !Number.isFinite(bytes)) return null
      return bytes / (1024 * 1024)
    }
    case 'sampleRate': {
      const value = musicInfo.meta.sampleRate
      return value == null || !Number.isFinite(value) ? null : value
    }
    case 'bitrate': {
      const value = musicInfo.meta.bitrate
      if (value == null || !Number.isFinite(value)) return null
      return value / 1000
    }
    case 'bitDepth': {
      const value = musicInfo.meta.bitsPerSample
      return value == null || !Number.isFinite(value) ? null : value
    }
    case 'time': {
      const value = field.key === 'createTime' ? musicInfo.meta.createTime : musicInfo.meta.modifyTime
      return value == null || !Number.isFinite(value) ? null : value
    }
    case 'number': {
      if (field.key === 'year') {
        const value = musicInfo.meta.year
        return value == null || !Number.isFinite(value) ? null : value
      }
      if (field.key === 'channels') {
        const value = musicInfo.meta.channels
        return value == null || !Number.isFinite(value) ? null : value
      }
      if (field.key === 'track' || field.key === 'disc') {
        const raw = field.key === 'track' ? musicInfo.meta.track : musicInfo.meta.disc
        const matched = /^(\d+)/.exec(`${raw ?? ''}`.trim())
        if (!matched) return null
        return Number(matched[1])
      }
      const sortValue = getMusicSortValue(musicInfo, field.key as LocalMusicColumnKey)
      return typeof sortValue === 'number' && Number.isFinite(sortValue) ? sortValue : null
    }
    default:
      return null
  }
}

const parseRightNumber = (field: SearchFieldDefinition, raw: string): number | null => {
  if (field.type === 'time') return parseTimeValue(raw)
  if (field.type === 'duration') {
    const minutes = parseNumberValue(raw)
    return minutes == null ? null : minutes * 60
  }
  return parseNumberValue(raw)
}

const compareNumbers = (left: number, op: CompareOp, right: number) => {
  switch (op) {
    case '>': return left > right
    case '<': return left < right
    case '>=': return left >= right
    case '<=': return left <= right
    case '=':
    case '==':
      return left === right
    case '!=':
    case '!==':
      return left !== right
    default:
      return false
  }
}

const evaluateBooleanRhs = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition, op: CompareOp, rhs: string): CondResult => {
  if (rhs !== 'true' && rhs !== 'false') return invalid()
  if (!['=', '==', '!=', '!=='].includes(op)) return invalid()

  const empty = isFieldEmpty(musicInfo, field)
  const expectNonEmpty = rhs === 'true'
  const matched = expectNonEmpty ? !empty : empty
  if (op === '!=' || op === '!==') return ok(!matched)
  return ok(matched)
}

const evaluateStringCompare = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition, op: CompareOp, rhs: string): CondResult => {
  if (NUMERIC_COMPARE_OPS.includes(op)) return invalid()
  const left = getStringValue(musicInfo, field.key).trim().toLowerCase()
  const right = rhs.trim().toLowerCase()
  switch (op) {
    case '=':
      return ok(left.includes(right))
    case '!=':
      return ok(!left.includes(right))
    case '==':
      return ok(left === right)
    case '!==':
      return ok(left !== right)
    default:
      return invalid()
  }
}

const evaluateNumberCompare = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition, op: CompareOp, rhs: string): CondResult => {
  const left = getComparableNumber(musicInfo, field)
  const right = parseRightNumber(field, rhs)
  if (left == null || right == null) return invalid()
  return ok(compareNumbers(left, op, right))
}

const evaluatePresenceCompare = (musicInfo: LX.Music.MusicInfoLocal, field: SearchFieldDefinition, op: CompareOp, rhs: string): CondResult => {
  if (rhs !== 'true' && rhs !== 'false') return invalid()
  return evaluateBooleanRhs(musicInfo, field, op, rhs)
}

const evaluateSingleComparison = (
  musicInfo: LX.Music.MusicInfoLocal,
  field: SearchFieldDefinition,
  op: CompareOp,
  rhs: string,
): CondResult => {
  if (rhs === 'true' || rhs === 'false') {
    return evaluateBooleanRhs(musicInfo, field, op, rhs)
  }
  if (field.type === 'presence') {
    return evaluatePresenceCompare(musicInfo, field, op, rhs)
  }
  if (field.type === 'string') {
    return evaluateStringCompare(musicInfo, field, op, rhs)
  }
  return evaluateNumberCompare(musicInfo, field, op, rhs)
}

const evaluateComparisonToken = (token: string, musicInfo: LX.Music.MusicInfoLocal): CondResult | null => {
  const parsed = splitOperator(token)
  if (parsed == null) return null
  if (parsed === 'invalid') return invalid()

  const field = FIELD_BY_LABEL.get(parsed.fieldLabel)
  if (!field) return invalid()

  const arrayValues = parseArrayValues(parsed.value)
  if (arrayValues) {
    if (!arrayValues.length) return invalid()
    let result = invalid()
    for (const item of arrayValues) {
      result = combineOr(result, evaluateSingleComparison(musicInfo, field, parsed.op, item))
    }
    return result
  }

  return evaluateSingleComparison(musicInfo, field, parsed.op, parsed.value)
}

export type KeywordSearchFieldKey =
  | 'fileName'
  | 'filePath'
  | 'title'
  | 'artist'
  | 'albumName'
  | 'customTag'
  | 'genre'
  | 'language'
  | 'comment'
  | 'lyrics'

export interface KeywordSearchFieldOption {
  key: KeywordSearchFieldKey
  label: string
}

export const KEYWORD_SEARCH_FIELD_OPTIONS: KeywordSearchFieldOption[] = [
  { key: 'fileName', label: '文件名' },
  { key: 'filePath', label: '文件路径' },
  { key: 'title', label: '标题' },
  { key: 'artist', label: '艺术家' },
  { key: 'albumName', label: '专辑' },
  { key: 'customTag', label: '标签' },
  { key: 'genre', label: '流派' },
  { key: 'language', label: '语种' },
  { key: 'comment', label: '注释' },
  { key: 'lyrics', label: '歌词' },
]

export const DEFAULT_KEYWORD_SEARCH_FIELDS: KeywordSearchFieldKey[] =
  KEYWORD_SEARCH_FIELD_OPTIONS.map(item => item.key)

const KEYWORD_SEARCH_FIELD_KEY_SET = new Set<string>(DEFAULT_KEYWORD_SEARCH_FIELDS)

export const normalizeKeywordSearchFields = (fields?: string[] | null): KeywordSearchFieldKey[] => {
  if (!Array.isArray(fields)) return [...DEFAULT_KEYWORD_SEARCH_FIELDS]
  return fields.filter((key): key is KeywordSearchFieldKey => KEYWORD_SEARCH_FIELD_KEY_SET.has(key))
}

const getKeywordFieldValue = (musicInfo: LX.Music.MusicInfoLocal, key: KeywordSearchFieldKey) => {
  switch (key) {
    case 'fileName':
      return musicInfo.meta.fileName
    case 'filePath':
      return musicInfo.meta.filePath
    case 'title':
      return musicInfo.name
    case 'artist':
      return musicInfo.singer
    case 'albumName':
      return musicInfo.meta.albumName
    case 'customTag':
      return musicInfo.meta.customTags
    case 'genre':
      return musicInfo.meta.genre
    case 'language':
      return musicInfo.meta.language
    case 'comment':
      return musicInfo.meta.comment
    case 'lyrics':
      return musicInfo.meta.lyricsPreview
    default:
      return ''
  }
}

const getKeywordSearchFields = (
  musicInfo: LX.Music.MusicInfoLocal,
  enabledFields: KeywordSearchFieldKey[],
) => {
  return enabledFields
    .map(key => `${getKeywordFieldValue(musicInfo, key) ?? ''}`.toLowerCase())
}

const matchSearchKeyword = (
  keyword: string,
  musicInfo: LX.Music.MusicInfoLocal,
  enabledFields: KeywordSearchFieldKey[],
) => {
  const text = keyword.trim().toLowerCase()
  if (!text) return true
  if (!enabledFields.length) return false
  return getKeywordSearchFields(musicInfo, enabledFields).some(field => field.includes(text))
}

export const matchLocalMusicSearchExpression = (
  expression: string,
  musicInfo: LX.Music.MusicInfoLocal,
  enabledKeywordFields: KeywordSearchFieldKey[] = DEFAULT_KEYWORD_SEARCH_FIELDS,
) => {
  const text = expression.trim()
  if (!text) return true
  const keywordFields = normalizeKeywordSearchFields(enabledKeywordFields)

  const tokens = tokenizeSearchExpression(text)
  let index = 0

  const parsePrimary = (): CondResult | null => {
    const token = tokens[index]
    if (!token) return null
    if (token === '(') {
      index++
      const value = parseOr()
      if (value == null || tokens[index] !== ')') return null
      index++
      return value
    }
    if (token === ')' || token === '&&' || token === '||' || token === '!!') return null
    index++

    const compared = evaluateComparisonToken(token, musicInfo)
    if (compared) return compared
    return ok(matchSearchKeyword(token, musicInfo, keywordFields))
  }

  const parseUnary = (): CondResult | null => {
    const token = tokens[index]
    if (token === '!!') {
      index++
      const value = parseUnary()
      if (value == null) return null
      if (value.kind === 'invalid') return value
      return ok(!value.value)
    }
    return parsePrimary()
  }

  const parseAnd = (): CondResult | null => {
    let value = parseUnary()
    if (value == null) return null
    while (tokens[index] === '&&') {
      index++
      const rightValue = parseUnary()
      if (rightValue == null) return null
      value = combineAnd(value, rightValue)
    }
    return value
  }

  const parseOr = (): CondResult | null => {
    let value = parseAnd()
    if (value == null) return null
    while (tokens[index] === '||') {
      index++
      const rightValue = parseAnd()
      if (rightValue == null) return null
      value = combineOr(value, rightValue)
    }
    return value
  }

  const result = parseOr()
  if (result == null || index < tokens.length) {
    return matchSearchKeyword(text, musicInfo, keywordFields)
  }
  if (result.kind === 'invalid') return true
  return result.value
}
