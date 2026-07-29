// import { httpFetch } from '../../request'
// import { weapi } from './utils/crypto'
import { sizeFormate, formatPlayTime } from '../../index'
// import musicDetailApi from './musicDetail'
import { eapiRequest } from './utils/index'
import { formatGenre } from '../utils'
import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'

const fetchSongExtraMeta = async(songId) => {
  if (!songId) return { genre: '', language: '' }
  const requestObj = httpFetch('https://music.163.com/weapi/song/play/about/block/page', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      Referer: `https://music.163.com/song?id=${songId}`,
      origin: 'https://music.163.com',
    },
    form: weapi({ songId: `${songId}` }),
  })
  const { body } = await requestObj.promise
  if (body?.code !== 200) return { genre: '', language: '' }
  const blocks = body?.data?.blocks || []
  const basic = blocks.find(block => block?.code === 'SONG_PLAY_ABOUT_SONG_BASIC')
  const creatives = basic?.creatives || []
  const songTag = creatives.find(item => item?.creativeType === 'songTag')
  const languageCreative = creatives.find(item => item?.creativeType === 'language')
  const genre = formatGenre(
    songTag?.resources?.[0]?.uiElement?.mainTitle?.title,
    songTag?.uiElement?.mainTitle?.title,
  )
  const language = formatGenre(
    languageCreative?.uiElement?.textLinks?.[0]?.text,
    languageCreative?.resources?.[0]?.uiElement?.mainTitle?.title,
  )
  return { genre, language }
}

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  musicSearch(str, page, limit) {
    // const searchRequest = eapiRequest('/api/cloudsearch/pc', {
    //   s: str,
    //   type: 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    //   limit,
    //   total: page == 1,
    //   offset: limit * (page - 1),
    // })
    const searchRequest = eapiRequest('/api/search/song/list/page', {
      keyword: str,
      needCorrect: '1',
      channel: 'typing',
      offset: limit * (page - 1),
      scene: 'normal',
      total: page == 1,
      limit,
    })
    return searchRequest.promise.then(({ body }) => body)
  },
  getSinger(singers) {
    let arr = []
    singers.forEach(singer => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },
  handleResult(rawList) {
    // console.log(rawList)
    if (!rawList) return []
    return rawList.map(item => {
      item = item.baseInfo.simpleSongData
      const types = []
      const _types = {}
      let size

      if (item.privilege.maxBrLevel == 'hires') {
        size = item.hr ? sizeFormate(item.hr.size) : null
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      switch (item.privilege.maxbr) {
        case 999000:
          size = item.sq ? sizeFormate(item.sq.size) : null
          types.push({ type: 'flac', size })
          _types.flac = {
            size,
          }
        case 320000:
          size = item.h ? sizeFormate(item.h.size) : null
          types.push({ type: '320k', size })
          _types['320k'] = {
            size,
          }
        case 192000:
        case 128000:
          size = item.l ? sizeFormate(item.l.size) : null
          types.push({ type: '128k', size })
          _types['128k'] = {
            size,
          }
      }

      types.reverse()

      const publishTime = item.publishTime || item.al?.publishTime
      let year = ''
      if (typeof publishTime == 'number' && publishTime > 0) {
        year = `${new Date(publishTime).getFullYear()}`
      }

      return {
        singer: this.getSinger(item.ar),
        name: item.name,
        albumName: item.al.name,
        albumId: item.al.id,
        source: 'wy',
        interval: formatPlayTime(item.dt / 1000),
        songmid: item.id,
        img: item.al.picUrl,
        lrc: null,
        year,
        track: item.no > 0 ? `${item.no}` : '',
        disc: item.cd && item.cd !== 'null' ? `${item.cd}` : '',
        genre: formatGenre(item.genre, item.al?.genre, item.al?.genres),
        language: formatGenre(item.language, item.lan),
        types,
        _types,
        typeUrl: {},
      }
    })
  },
  async attachExtraMeta(list) {
    if (!Array.isArray(list) || !list.length) return list
    await Promise.all(list.map(async(item) => {
      if (item.genre && item.language) return
      try {
        const { genre, language } = await fetchSongExtraMeta(item.songmid)
        if (!item.genre && genre) item.genre = genre
        if (!item.language && language) item.language = language
      } catch (err) {
        console.log(err)
      }
    }))
    return list
  },
  async search(str, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    const result = await this.musicSearch(str, page, limit)
    if (!result || result.code !== 200) return this.search(str, page, limit, retryNum)
    let list = this.handleResult(result.data.resources || [])
    if (list == null) return this.search(str, page, limit, retryNum)
    list = await this.attachExtraMeta(list)

    this.total = result.data.totalCount || 0
    this.page = page
    this.allPage = Math.ceil(this.total / this.limit)

    return {
      list,
      allPage: this.allPage,
      limit: this.limit,
      total: this.total,
      source: 'wy',
    }
  },
}
