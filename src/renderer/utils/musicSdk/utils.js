import crypto from 'crypto'
import dns from 'dns'
import { decodeName } from '@renderer/utils'

export const toMD5 = str => crypto.createHash('md5').update(str).digest('hex')


const ipMap = new Map()
export const getHostIp = hostname => {
  const result = ipMap.get(hostname)
  if (typeof result === 'object') return result
  if (result === true) return
  ipMap.set(hostname, true)
  // console.log(hostname)
  dns.lookup(hostname, {
    // family: 4,
    all: false,
  }, (err, address, family) => {
    if (err) return console.log(err)
    // console.log(address, family)
    ipMap.set(hostname, { address, family })
  })
}

export const dnsLookup = (hostname, options, callback) => {
  const result = getHostIp(hostname)
  if (result) return callback(null, result.address, result.family)

  dns.lookup(hostname, options, callback)
}


/**
 * 格式化歌手
 * @param singers 歌手数组
 * @param nameKey 歌手名键值
 * @param join 歌手分割字符
 */
export const formatSingerName = (singers, nameKey = 'name', join = '、') => {
  if (Array.isArray(singers)) {
    const singer = []
    singers.forEach(item => {
      let name = item[nameKey]
      if (!name) return
      singer.push(name)
    })
    return decodeName(singer.join(join))
  }
  return decodeName(String(singers ?? ''))
}

/**
 * 从各音源可能出现的字段形态中提取可读流派名
 */
export const formatGenre = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      const text = formatGenre(...value)
      if (text) return text
      continue
    }
    if (typeof value === 'object') {
      const text = formatGenre(
        value.value,
        value.name,
        value.title,
        value.tagName,
        value.genre,
        value.content,
      )
      if (text) return text
      continue
    }
    const text = `${value}`.trim()
    if (!text || text === '0' || text === 'null' || text === 'undefined') continue
    // 纯数字多为流派 ID，不适合直接展示
    if (/^\d+$/.test(text)) continue
    // 过滤误当作流派的链接
    if (/^https?:\/\//i.test(text)) continue
    return text
  }
  return ''
}

const LANGUAGE_TAGS = new Set([
  '国语', '粤语', '英语', '日语', '韩语', '闽南语', '小语种', '纯音乐',
  '法语', '西班牙语', '德语', '俄语', '意大利语', '葡萄牙语', '拉丁语',
  '印尼语', '泰语', '越南语', '其他语种', '其他',
])

const GENRE_TAGS = new Set([
  '流行', '摇滚', '民谣', '电子', '说唱', '爵士', '古典', '蓝调', '乡村',
  'R&B', '嘻哈', '轻音乐', '金属', '朋克', '雷鬼', '世界音乐', '新世纪',
  '舞曲', '布鲁斯', '另类', '独立', '节奏布鲁斯', '华语流行', '节奏流行',
  '古风', '戏曲', '儿童', '有声书', '原声带',
])

/**
 * 从咪咕等 tagList 中解析流派与语种
 */
export const parseTagListMeta = (tagList) => {
  const names = (Array.isArray(tagList) ? tagList : [])
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') return `${item.tagName || item.name || item.value || ''}`.trim()
      return ''
    })
    .filter(Boolean)

  const language = names.find(name => LANGUAGE_TAGS.has(name) || /语$/.test(name)) || ''
  const genre = names.find(name => {
    if (LANGUAGE_TAGS.has(name) || /语$/.test(name)) return false
    if (GENRE_TAGS.has(name)) return true
    const head = name.split(/[-/]/)[0]
    return GENRE_TAGS.has(head) || /流行|摇滚|民谣|电子|说唱|爵士|古典|嘻哈|蓝调/.test(name)
  }) || ''

  return { genre, language }
}
